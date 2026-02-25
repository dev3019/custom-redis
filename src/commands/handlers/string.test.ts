import { beforeEach, describe, expect, test } from "bun:test";
import { Engine } from "../../engine";
import { CommandContext } from "../context";
import { CommandDispatcher } from "../dispatcher";
import { InvalidArgumentError } from "../errors";
import { createDefaultRegistry } from "../register";
import { SetCommand } from "./string";

describe("SetCommand", () => {
  let command: SetCommand;
  let engine: Engine;
  let context: CommandContext;

  beforeEach(() => {
    command = new SetCommand();
    engine = new Engine();
    context = new CommandContext({ dbIndex: 0 });
  });

  describe("parse", () => {
    test("returns structured args for valid strings", () => {
      expect(command.parse(["mykey", "myvalue"])).toEqual({
        key: "mykey",
        value: "myvalue",
      });
    });

    test("allows empty strings", () => {
      expect(command.parse(["", ""])).toEqual({
        key: "",
        value: "",
      });
    });

    test("throws InvalidArgumentError when key is not a string", () => {
      expect(() => command.parse([123, "value"])).toThrow(InvalidArgumentError);
    });

    test("throws InvalidArgumentError when value is not a string", () => {
      expect(() => command.parse(["key", false])).toThrow(InvalidArgumentError);
    });
  });

  describe("execute", () => {
    test("stores value and returns OK", () => {
      const result = command.execute(engine, context, { key: "k1", value: "v1" });
      const entry = engine.getDatabase(context.dbIndex).get("k1");

      expect(result).toBe("OK");
      expect(entry?.type).toBe("string");
      expect(entry?.value).toBe("v1");
    });

    test("overwrites existing value", () => {
      command.execute(engine, context, { key: "k1", value: "v1" });
      command.execute(engine, context, { key: "k1", value: "v2" });

      const entry = engine.getDatabase(context.dbIndex).get("k1");
      expect(entry?.value).toBe("v2");
    });

    test("preserves existing TTL metadata", () => {
      const db = engine.getDatabase(context.dbIndex);
      command.execute(engine, context, { key: "ttl-key", value: "before" });

      db.setExpiry("ttl-key", Date.now() - 1);
      command.execute(engine, context, { key: "ttl-key", value: "after" });

      expect(db.get("ttl-key")).toBeNull();
    });
  });
});

describe("SET dispatcher integration", () => {
  test("dispatches SET through registry wiring", () => {
    const engine = new Engine();
    const registry = createDefaultRegistry();
    const dispatcher = new CommandDispatcher(engine, registry);
    const context = new CommandContext({ dbIndex: 0 });

    const result = dispatcher.dispatch("SET", ["mykey", "myvalue"], context);
    const entry = engine.getDatabase(0).get("mykey");

    expect(result).toBe("OK");
    expect(entry?.value).toBe("myvalue");
  });
});
