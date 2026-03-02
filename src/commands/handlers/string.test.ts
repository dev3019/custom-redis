import { describe, test, expect, beforeEach } from "bun:test";
import { GetCommand, SetCommand } from "./string";
import { Engine, ValueEntry } from "../../engine";
import { CommandContext } from "../context";
import { InvalidArgumentError, WrongTypeError } from "../errors";

describe("SetCommand", () => {
  let cmd: SetCommand;
  let engine: Engine;
  let ctx: CommandContext;

  beforeEach(() => {
    cmd = new SetCommand();
    engine = new Engine();
    ctx = new CommandContext({ dbIndex: 0 });
  });

  describe("metadata", () => {
    test("name is SET", () => {
      expect(cmd.name).toBe("SET");
    });

    test("arity is min=2, max=2", () => {
      expect(cmd.arity).toEqual({ min: 2, max: 2 });
    });

    test("isWrite is true", () => {
      expect(cmd.isWrite).toBe(true);
    });
  });

  describe("parse()", () => {
    test("returns parsed args for valid key and value", () => {
      const result = cmd.parse(["mykey", "myvalue"]);
      expect(result).toEqual({ key: "mykey", value: "myvalue" });
    });

    test("allows empty string as value", () => {
      const result = cmd.parse(["mykey", ""]);
      expect(result).toEqual({ key: "mykey", value: "" });
    });

    test("allows empty string as key", () => {
      const result = cmd.parse(["", "myvalue"]);
      expect(result).toEqual({ key: "", value: "myvalue" });
    });

    test("allows special characters in key and value", () => {
      const result = cmd.parse(["key:with:colons", "value with spaces & symbols!"]);
      expect(result).toEqual({ key: "key:with:colons", value: "value with spaces & symbols!" });
    });

    test("allows very long strings", () => {
      const longKey = "k".repeat(10_000);
      const longVal = "v".repeat(10_000);
      const result = cmd.parse([longKey, longVal]);
      expect(result).toEqual({ key: longKey, value: longVal });
    });

    test("throws InvalidArgumentError when key is a number", () => {
      expect(() => cmd.parse([123, "val"])).toThrow(InvalidArgumentError);
    });

    test("throws InvalidArgumentError when value is a number", () => {
      expect(() => cmd.parse(["key", 456])).toThrow(InvalidArgumentError);
    });

    test("throws InvalidArgumentError when key is null", () => {
      expect(() => cmd.parse([null, "val"])).toThrow(InvalidArgumentError);
    });

    test("throws InvalidArgumentError when key is undefined", () => {
      expect(() => cmd.parse([undefined, "val"])).toThrow(InvalidArgumentError);
    });

    test("throws InvalidArgumentError when key is a boolean", () => {
      expect(() => cmd.parse([true, "val"])).toThrow(InvalidArgumentError);
    });

    test("throws InvalidArgumentError when key is an object", () => {
      expect(() => cmd.parse([{}, "val"])).toThrow(InvalidArgumentError);
    });

    test("throws InvalidArgumentError when value is an array", () => {
      expect(() => cmd.parse(["key", [1, 2]])).toThrow(InvalidArgumentError);
    });

    test("error includes command meta", () => {
      try {
        cmd.parse([123, "val"]);
        throw new Error("Expected InvalidArgumentError");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidArgumentError);
        expect((e as InvalidArgumentError).meta.command).toBe("SET");
      }
    });

    test("fails fast on invalid key before checking value", () => {
      try {
        cmd.parse([123, 456]);
        throw new Error("Expected InvalidArgumentError");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidArgumentError);
        expect((e as InvalidArgumentError).message).toBe("Key must be a string");
      }
    });
  });

  describe("execute()", () => {
    test("returns 'OK'", () => {
      const result = cmd.execute(engine, ctx, { key: "k", value: "v" });
      expect(result).toBe("OK");
    });

    test("stores the value in the database", () => {
      cmd.execute(engine, ctx, { key: "mykey", value: "myvalue" });
      const entry = engine.getDatabase(0).get("mykey");
      expect(entry).not.toBeNull();
      expect(entry!.type).toBe("string");
      expect(entry!.value).toBe("myvalue");
    });

    test("overwrites an existing key", () => {
      cmd.execute(engine, ctx, { key: "k", value: "first" });
      cmd.execute(engine, ctx, { key: "k", value: "second" });
      const entry = engine.getDatabase(0).get("k");
      expect(entry!.value).toBe("second");
    });

    test("preserves TTL when overwriting a key", () => {
      const db = engine.getDatabase(0);
      cmd.execute(engine, ctx, { key: "k", value: "v1" });
      const futureMs = Date.now() + 60_000;
      db.setExpiry("k", futureMs);

      cmd.execute(engine, ctx, { key: "k", value: "v2" });

      const entry = db.get("k");
      expect(entry!.value).toBe("v2");
      expect(db.isExpired("k")).toBe(false);
    });

    test("creates a ValueEntry with type 'string'", () => {
      cmd.execute(engine, ctx, { key: "k", value: "v" });
      const entry = engine.getDatabase(0).get("k");
      expect(entry).toBeInstanceOf(ValueEntry);
      expect(entry!.type).toBe("string");
    });

    test("works with non-default database index", () => {
      const ctx5 = new CommandContext({ dbIndex: 5 });
      cmd.execute(engine, ctx5, { key: "k", value: "v" });

      expect(engine.getDatabase(5).get("k")!.value).toBe("v");
      expect(engine.getDatabase(0).get("k")).toBeNull();
    });

    test("stores empty string value", () => {
      cmd.execute(engine, ctx, { key: "k", value: "" });
      const entry = engine.getDatabase(0).get("k");
      expect(entry!.value).toBe("");
    });

    test("sets createdAt and updatedAt timestamps", () => {
      const before = Date.now();
      cmd.execute(engine, ctx, { key: "k", value: "v" });
      const after = Date.now();
      const entry = engine.getDatabase(0).get("k")!;
      expect(entry.createdAt).toBeGreaterThanOrEqual(before);
      expect(entry.createdAt).toBeLessThanOrEqual(after);
      expect(entry.updatedAt).toBeGreaterThanOrEqual(before);
      expect(entry.updatedAt).toBeLessThanOrEqual(after);
    });
  });
});

describe("GetCommand", () => {
  let cmd: GetCommand;
  let setCmd: SetCommand;
  let engine: Engine;
  let ctx: CommandContext;

  beforeEach(() => {
    cmd = new GetCommand();
    setCmd = new SetCommand();
    engine = new Engine();
    ctx = new CommandContext({ dbIndex: 0 });
  });

  describe("metadata", () => {
    test("name is GET", () => {
      expect(cmd.name).toBe("GET");
    });

    test("arity is min=1, max=1", () => {
      expect(cmd.arity).toEqual({ min: 1, max: 1 });
    });

    test("isWrite is false", () => {
      expect(cmd.isWrite).toBe(false);
    });
  });

  describe("parse()", () => {
    test("returns parsed args for a valid key", () => {
      const result = cmd.parse(["mykey"]);
      expect(result).toEqual({ key: "mykey" });
    });

    test("allows empty string as key", () => {
      const result = cmd.parse([""]);
      expect(result).toEqual({ key: "" });
    });

    test("allows special characters in key", () => {
      const result = cmd.parse(["key:with:colons and spaces!"]);
      expect(result).toEqual({ key: "key:with:colons and spaces!" });
    });

    test("allows very long keys", () => {
      const longKey = "k".repeat(10_000);
      const result = cmd.parse([longKey]);
      expect(result).toEqual({ key: longKey });
    });

    test("throws InvalidArgumentError when key is a number", () => {
      expect(() => cmd.parse([123])).toThrow(InvalidArgumentError);
    });

    test("throws InvalidArgumentError when key is null", () => {
      expect(() => cmd.parse([null])).toThrow(InvalidArgumentError);
    });

    test("throws InvalidArgumentError when key is undefined", () => {
      expect(() => cmd.parse([undefined])).toThrow(InvalidArgumentError);
    });

    test("throws InvalidArgumentError when key is a boolean", () => {
      expect(() => cmd.parse([true])).toThrow(InvalidArgumentError);
    });

    test("throws InvalidArgumentError when key is an object", () => {
      expect(() => cmd.parse([{}])).toThrow(InvalidArgumentError);
    });

    test("throws InvalidArgumentError when key is an array", () => {
      expect(() => cmd.parse([[1, 2]])).toThrow(InvalidArgumentError);
    });

    test("error includes command meta", () => {
      try {
        cmd.parse([123]);
        throw new Error("Expected InvalidArgumentError");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidArgumentError);
        expect((e as InvalidArgumentError).meta.command).toBe("GET");
      }
    });
  });

  describe("execute()", () => {
    test("returns string value for existing key", () => {
      setCmd.execute(engine, ctx, { key: "k", value: "v" });
      expect(cmd.execute(engine, ctx, { key: "k" })).toBe("v");
    });

    test("returns empty string value when stored value is empty", () => {
      setCmd.execute(engine, ctx, { key: "k", value: "" });
      expect(cmd.execute(engine, ctx, { key: "k" })).toBe("");
    });

    test("returns null for non-existent key", () => {
      expect(cmd.execute(engine, ctx, { key: "missing" })).toBeNull();
    });

    test("returns null for expired key via lazy expiry", () => {
      const db = engine.getDatabase(0);
      db.set("k", new ValueEntry("string", "v"));
      db.setExpiry("k", Date.now() - 1);

      expect(cmd.execute(engine, ctx, { key: "k" })).toBeNull();
      expect(db.get("k")).toBeNull();
    });

    test("returns value for a key with unexpired TTL", () => {
      const db = engine.getDatabase(0);
      db.set("k", new ValueEntry("string", "v"));
      db.setExpiry("k", Date.now() + 60_000);

      expect(cmd.execute(engine, ctx, { key: "k" })).toBe("v");
      expect(db.isExpired("k")).toBe(false);
    });

    test("works with non-default database index and keeps DB isolation", () => {
      const ctx5 = new CommandContext({ dbIndex: 5 });
      setCmd.execute(engine, ctx5, { key: "k", value: "v5" });
      setCmd.execute(engine, ctx, { key: "k", value: "v0" });

      expect(cmd.execute(engine, ctx5, { key: "k" })).toBe("v5");
      expect(cmd.execute(engine, ctx, { key: "k" })).toBe("v0");
    });

    test("throws WrongTypeError for non-string stored type", () => {
      const db = engine.getDatabase(0);
      db.set("listKey", new ValueEntry("list", ["a", "b"]));

      expect(() => cmd.execute(engine, ctx, { key: "listKey" })).toThrow(WrongTypeError);
    });

    test("WrongTypeError includes expected/actual type details", () => {
      const db = engine.getDatabase(0);
      db.set("setKey", new ValueEntry("set", new Set(["a"])));

      try {
        cmd.execute(engine, ctx, { key: "setKey" });
        throw new Error("Expected WrongTypeError");
      } catch (e) {
        expect(e).toBeInstanceOf(WrongTypeError);
        const err = e as WrongTypeError;
        expect(err.message).toBe(
          "WRONGTYPE Operation against a key holding the wrong kind of value"
        );
        expect(err.meta.command).toBe("GET");
        expect(err.details).toContainEqual({ expectedType: "string", actualType: "set" });
      }
    });

    test("returns latest value after overwrites", () => {
      setCmd.execute(engine, ctx, { key: "k", value: "v1" });
      setCmd.execute(engine, ctx, { key: "k", value: "v2" });
      expect(cmd.execute(engine, ctx, { key: "k" })).toBe("v2");
    });

    test("repeated GET calls are idempotent", () => {
      setCmd.execute(engine, ctx, { key: "k", value: "stable" });
      expect(cmd.execute(engine, ctx, { key: "k" })).toBe("stable");
      expect(cmd.execute(engine, ctx, { key: "k" })).toBe("stable");
      expect(cmd.execute(engine, ctx, { key: "k" })).toBe("stable");
    });
  });
});
