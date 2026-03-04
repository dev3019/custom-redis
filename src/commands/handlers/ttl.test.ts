import { describe, test, expect, beforeEach } from "bun:test";
import { ExpireCommand } from "./ttl";
import { SetCommand, GetCommand } from "./string";
import { Engine, ValueEntry } from "../../engine";
import { CommandContext } from "../context";
import { InvalidArgumentError } from "../errors";

describe("ExpireCommand", () => {
  let cmd: ExpireCommand;
  let engine: Engine;
  let ctx: CommandContext;

  beforeEach(() => {
    cmd = new ExpireCommand();
    engine = new Engine();
    ctx = new CommandContext({ dbIndex: 0 });
  });

  describe("metadata", () => {
    test("name is EXPIRE", () => {
      expect(cmd.name).toBe("EXPIRE");
    });

    test("arity is min=2, max=2", () => {
      expect(cmd.arity).toEqual({ min: 2, max: 2 });
    });

    test("isWrite is true", () => {
      expect(cmd.isWrite).toBe(true);
    });
  });

  describe("parse()", () => {
    test("returns parsed args for valid key and positive integer seconds", () => {
      const result = cmd.parse(["mykey", 60]);
      expect(result).toEqual({ key: "mykey", seconds: 60 });
    });

    test("accepts large seconds value", () => {
      const result = cmd.parse(["k", 999999]);
      expect(result).toEqual({ key: "k", seconds: 999999 });
    });

    test("accepts empty string key", () => {
      const result = cmd.parse(["", 10]);
      expect(result).toEqual({ key: "", seconds: 10 });
    });

    test("accepts special characters in key", () => {
      const result = cmd.parse(["key:with:colons/and-dashes", 30]);
      expect(result).toEqual({ key: "key:with:colons/and-dashes", seconds: 30 });
    });

    test("accepts zero seconds", () => {
      const result = cmd.parse(["k", 0]);
      expect(result).toEqual({ key: "k", seconds: 0 });
    });

    test("accepts negative seconds", () => {
      const result = cmd.parse(["k", -5]);
      expect(result).toEqual({ key: "k", seconds: -5 });
    });

    describe("invalid key", () => {
      test("throws InvalidArgumentError when key is a number", () => {
        expect(() => cmd.parse([123, 60])).toThrow(InvalidArgumentError);
      });

      test("throws InvalidArgumentError when key is null", () => {
        expect(() => cmd.parse([null, 60])).toThrow(InvalidArgumentError);
      });

      test("throws InvalidArgumentError when key is undefined", () => {
        expect(() => cmd.parse([undefined, 60])).toThrow(InvalidArgumentError);
      });

      test("throws InvalidArgumentError when key is a boolean", () => {
        expect(() => cmd.parse([true, 60])).toThrow(InvalidArgumentError);
      });

      test("throws InvalidArgumentError when key is an object", () => {
        expect(() => cmd.parse([{}, 60])).toThrow(InvalidArgumentError);
      });

      test("throws InvalidArgumentError when key is an array", () => {
        expect(() => cmd.parse([[1, 2], 60])).toThrow(InvalidArgumentError);
      });
    });

    describe("invalid seconds", () => {
      test("throws InvalidArgumentError when seconds is a string", () => {
        expect(() => cmd.parse(["k", "abc"])).toThrow(InvalidArgumentError);
      });

      test("throws InvalidArgumentError when seconds is a numeric string", () => {
        expect(() => cmd.parse(["k", "60"])).toThrow(InvalidArgumentError);
      });

      test("throws InvalidArgumentError when seconds is a float", () => {
        expect(() => cmd.parse(["k", 3.5])).toThrow(InvalidArgumentError);
      });

      test("throws InvalidArgumentError when seconds is null", () => {
        expect(() => cmd.parse(["k", null])).toThrow(InvalidArgumentError);
      });

      test("throws InvalidArgumentError when seconds is undefined", () => {
        expect(() => cmd.parse(["k", undefined])).toThrow(InvalidArgumentError);
      });

      test("throws InvalidArgumentError when seconds is a boolean", () => {
        expect(() => cmd.parse(["k", true])).toThrow(InvalidArgumentError);
      });

      test("throws InvalidArgumentError when seconds is an object", () => {
        expect(() => cmd.parse(["k", {}])).toThrow(InvalidArgumentError);
      });

      test("throws InvalidArgumentError when seconds is an array", () => {
        expect(() => cmd.parse(["k", [60]])).toThrow(InvalidArgumentError);
      });

      test("throws InvalidArgumentError when seconds is NaN", () => {
        expect(() => cmd.parse(["k", NaN])).toThrow(InvalidArgumentError);
      });

      test("throws InvalidArgumentError when seconds is Infinity", () => {
        expect(() => cmd.parse(["k", Infinity])).toThrow(InvalidArgumentError);
      });

      test("throws InvalidArgumentError when seconds is -Infinity", () => {
        expect(() => cmd.parse(["k", -Infinity])).toThrow(InvalidArgumentError);
      });

      test("throws InvalidArgumentError when seconds is a Number object", () => {
        expect(() => cmd.parse(["k", new Number(60)])).toThrow(InvalidArgumentError);
      });
    });

    test("error includes command meta", () => {
      try {
        cmd.parse([123, 60]);
        throw new Error("Expected InvalidArgumentError");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidArgumentError);
        expect((e as InvalidArgumentError).meta.command).toBe("EXPIRE");
      }
    });

    test("seconds error includes command meta", () => {
      try {
        cmd.parse(["k", "abc"]);
        throw new Error("Expected InvalidArgumentError");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidArgumentError);
        expect((e as InvalidArgumentError).meta.command).toBe("EXPIRE");
      }
    });

    test("fails fast on invalid key before checking seconds", () => {
      try {
        cmd.parse([123, "abc"]);
        throw new Error("Expected InvalidArgumentError");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidArgumentError);
        expect((e as InvalidArgumentError).message).toBe("Key must be a string");
      }
    });
  });

  describe("execute()", () => {
    describe("core behavior", () => {
      test("returns 1 when key exists", () => {
        engine.getDatabase(0).set("k", new ValueEntry("string", "v"));
        const result = cmd.execute(engine, ctx, { key: "k", seconds: 60 });
        expect(result).toBe(1);
      });

      test("returns 0 when key does not exist", () => {
        const result = cmd.execute(engine, ctx, { key: "missing", seconds: 60 });
        expect(result).toBe(0);
      });

      test("key becomes inaccessible after expiry", () => {
        const db = engine.getDatabase(0);
        db.set("k", new ValueEntry("string", "v"));
        db.setExpiry("k", Date.now() - 1000);

        expect(db.get("k")).toBeNull();
      });

      test("key remains accessible before expiry", () => {
        const db = engine.getDatabase(0);
        db.set("k", new ValueEntry("string", "v"));
        cmd.execute(engine, ctx, { key: "k", seconds: 60 });

        const entry = db.get("k");
        expect(entry).not.toBeNull();
        expect(entry!.value).toBe("v");
      });

      test("overwrites an existing TTL with a new one", () => {
        const db = engine.getDatabase(0);
        db.set("k", new ValueEntry("string", "v"));
        cmd.execute(engine, ctx, { key: "k", seconds: 10 });
        cmd.execute(engine, ctx, { key: "k", seconds: 3600 });

        expect(db.get("k")).not.toBeNull();
        expect(db.isExpired("k")).toBe(false);
      });

      test("works with non-default database index", () => {
        const ctx5 = new CommandContext({ dbIndex: 5 });
        engine.getDatabase(5).set("k", new ValueEntry("string", "v"));

        const result = cmd.execute(engine, ctx5, { key: "k", seconds: 60 });
        expect(result).toBe(1);

        expect(cmd.execute(engine, ctx, { key: "k", seconds: 60 })).toBe(0);
      });

      test("supports context.withDatabase() without mutating the original context", () => {
        engine.getDatabase(1).set("k", new ValueEntry("string", "v1"));
        engine.getDatabase(0).set("k", new ValueEntry("string", "v0"));

        const db1Context = ctx.withDatabase(1);
        expect(ctx.dbIndex).toBe(0);
        expect(db1Context.dbIndex).toBe(1);

        expect(cmd.execute(engine, db1Context, { key: "k", seconds: 0 })).toBe(1);
        expect(engine.getDatabase(1).get("k")).toBeNull();
        expect(engine.getDatabase(0).get("k")!.value).toBe("v0");
      });
    });

    describe("zero and negative seconds", () => {
      test("zero seconds deletes the key immediately", () => {
        const db = engine.getDatabase(0);
        db.set("k", new ValueEntry("string", "v"));

        const result = cmd.execute(engine, ctx, { key: "k", seconds: 0 });
        expect(result).toBe(1);
        expect(db.get("k")).toBeNull();
      });

      test("negative seconds deletes the key immediately", () => {
        const db = engine.getDatabase(0);
        db.set("k", new ValueEntry("string", "v"));

        const result = cmd.execute(engine, ctx, { key: "k", seconds: -5 });
        expect(result).toBe(1);
        expect(db.get("k")).toBeNull();
      });

      test("zero seconds on non-existent key returns 0", () => {
        const result = cmd.execute(engine, ctx, { key: "missing", seconds: 0 });
        expect(result).toBe(0);
      });
    });

    describe("edge cases", () => {
      test("returns 0 for an already-expired key (lazy expiry triggers)", () => {
        const db = engine.getDatabase(0);
        db.set("k", new ValueEntry("string", "v"));
        db.setExpiry("k", Date.now() - 1000);

        const result = cmd.execute(engine, ctx, { key: "k", seconds: 60 });
        expect(result).toBe(0);
      });

      test("works on a key holding a list", () => {
        engine.getDatabase(0).set("k", new ValueEntry("list", ["a", "b"]));
        expect(cmd.execute(engine, ctx, { key: "k", seconds: 60 })).toBe(1);
      });

      test("works on a key holding a set", () => {
        engine.getDatabase(0).set("k", new ValueEntry("set", new Set(["a"])));
        expect(cmd.execute(engine, ctx, { key: "k", seconds: 60 })).toBe(1);
      });

      test("works on a key holding a hash", () => {
        engine.getDatabase(0).set("k", new ValueEntry("hash", { field: "val" }));
        expect(cmd.execute(engine, ctx, { key: "k", seconds: 60 })).toBe(1);
      });

      test("multiple consecutive EXPIREs — last one wins", () => {
        const db = engine.getDatabase(0);
        db.set("k", new ValueEntry("string", "v"));
        cmd.execute(engine, ctx, { key: "k", seconds: 1 });
        cmd.execute(engine, ctx, { key: "k", seconds: 99999 });

        expect(db.get("k")).not.toBeNull();
        expect(db.isExpired("k")).toBe(false);
      });

      test("expired key is lazily deleted and EXPIRE on re-inserted key works normally", () => {
        const db = engine.getDatabase(0);
        db.set("k", new ValueEntry("string", "v1"));
        db.setExpiry("k", Date.now() - 1_000);

        // Touch the key to trigger lazy delete.
        expect(db.get("k")).toBeNull();

        db.set("k", new ValueEntry("string", "v2"));
        expect(cmd.execute(engine, ctx, { key: "k", seconds: 60 })).toBe(1);
        expect(db.get("k")!.value).toBe("v2");
        expect(db.isExpired("k")).toBe(false);
      });
    });

    describe("integration with SET and GET", () => {
      test("SET + EXPIRE + GET: key accessible before expiry", () => {
        const set = new SetCommand();
        const get = new GetCommand();

        set.execute(engine, ctx, { key: "k", value: "hello" });
        cmd.execute(engine, ctx, { key: "k", seconds: 3600 });

        expect(get.execute(engine, ctx, { key: "k" })).toBe("hello");
      });

      test("SET + EXPIRE(past) + GET: key gone after expiry", () => {
        const set = new SetCommand();
        const get = new GetCommand();
        const db = engine.getDatabase(0);

        set.execute(engine, ctx, { key: "k", value: "hello" });
        db.setExpiry("k", Date.now() - 1000);

        expect(get.execute(engine, ctx, { key: "k" })).toBeNull();
      });

      test("SET + EXPIRE + SET (overwrite) + GET: TTL preserved after SET overwrite", () => {
        const set = new SetCommand();
        const get = new GetCommand();
        const db = engine.getDatabase(0);

        set.execute(engine, ctx, { key: "k", value: "v1" });
        cmd.execute(engine, ctx, { key: "k", seconds: 3600 });
        set.execute(engine, ctx, { key: "k", value: "v2" });

        expect(get.execute(engine, ctx, { key: "k" })).toBe("v2");
        expect(db.isExpired("k")).toBe(false);
      });

      test("SET + EXPIRE(0) + GET: key deleted immediately", () => {
        const set = new SetCommand();
        const get = new GetCommand();

        set.execute(engine, ctx, { key: "k", value: "hello" });
        cmd.execute(engine, ctx, { key: "k", seconds: 0 });

        expect(get.execute(engine, ctx, { key: "k" })).toBeNull();
      });
    });
  });
});
