import { describe, test, expect, beforeEach } from "bun:test";
import { CommandDispatcher } from "./dispatcher";
import { CommandRegistry } from "./registry";
import { CommandContext } from "./context";
import { Engine, ValueEntry } from "../engine";
import {
  UnknownCommandError,
  ArityError,
  InvalidArgumentError,
  WrongTypeError,
} from "./errors";
import { SetCommand, GetCommand } from "./handlers/string";

describe("CommandDispatcher", () => {
  let engine: Engine;
  let registry: CommandRegistry;
  let dispatcher: CommandDispatcher;
  let ctx: CommandContext;

  beforeEach(() => {
    engine = new Engine();
    registry = new CommandRegistry();
    registry.register(new SetCommand());
    registry.register(new GetCommand());
    dispatcher = new CommandDispatcher(engine, registry);
    ctx = new CommandContext({ dbIndex: 0 });
  });

  describe("unknown command", () => {
    test("throws UnknownCommandError for unregistered command", () => {
      expect(() => dispatcher.dispatch("FOO", [], ctx)).toThrow(
        UnknownCommandError
      );
    });

    test("error contains the command name", () => {
      try {
        dispatcher.dispatch("ZADD", ["key"], ctx);
        throw new Error("Expected UnknownCommandError");
      } catch (e) {
        expect(e).toBeInstanceOf(UnknownCommandError);
        expect((e as UnknownCommandError).meta.command).toBe("ZADD");
      }
    });

    test("error message includes the command name", () => {
      try {
        dispatcher.dispatch("BLPOP", [], ctx);
        throw new Error("Expected UnknownCommandError");
      } catch (e) {
        expect((e as UnknownCommandError).message).toBe(
          "Unknown command 'BLPOP'"
        );
      }
    });
  });

  describe("arity validation", () => {
    test("throws ArityError when too few args for SET", () => {
      expect(() => dispatcher.dispatch("SET", ["key"], ctx)).toThrow(
        ArityError
      );
    });

    test("throws ArityError when too many args for SET", () => {
      expect(() =>
        dispatcher.dispatch("SET", ["key", "val", "extra"], ctx)
      ).toThrow(ArityError);
    });

    test("throws ArityError when too many args for GET", () => {
      expect(() =>
        dispatcher.dispatch("GET", ["key1", "key2"], ctx)
      ).toThrow(ArityError);
    });

    test("throws ArityError when no args for GET", () => {
      expect(() => dispatcher.dispatch("GET", [], ctx)).toThrow(ArityError);
    });

    test("ArityError contains correct min, max, actual for too few args", () => {
      try {
        dispatcher.dispatch("SET", ["key"], ctx);
        throw new Error("Expected ArityError");
      } catch (e) {
        expect(e).toBeInstanceOf(ArityError);
        const err = e as ArityError;
        expect(err.meta.command).toBe("SET");
        expect(err.meta.argsCount).toBe(1);
        expect(err.message).toBe(
          "Wrong number of arguments for 'SET' (expected 2..2, got 1)"
        );
      }
    });

    test("ArityError contains correct min, max, actual for too many args", () => {
      try {
        dispatcher.dispatch("GET", ["k1", "k2"], ctx);
        throw new Error("Expected ArityError");
      } catch (e) {
        expect(e).toBeInstanceOf(ArityError);
        const err = e as ArityError;
        expect(err.meta.command).toBe("GET");
        expect(err.meta.argsCount).toBe(2);
        expect(err.message).toBe(
          "Wrong number of arguments for 'GET' (expected 1..1, got 2)"
        );
      }
    });
  });

  describe("parse error propagation", () => {
    test("bubbles InvalidArgumentError from SET parse (non-string key)", () => {
      expect(() =>
        dispatcher.dispatch("SET", [123, "val"], ctx)
      ).toThrow(InvalidArgumentError);
    });

    test("bubbles InvalidArgumentError from SET parse (non-string value)", () => {
      expect(() =>
        dispatcher.dispatch("SET", ["key", 456], ctx)
      ).toThrow(InvalidArgumentError);
    });

    test("bubbles InvalidArgumentError from GET parse (non-string key)", () => {
      expect(() => dispatcher.dispatch("GET", [42], ctx)).toThrow(
        InvalidArgumentError
      );
    });
  });

  describe("execute error propagation", () => {
    test("bubbles WrongTypeError from GET on non-string type", () => {
      engine.getDatabase(0).set("k", new ValueEntry("list", ["a", "b"]));
      expect(() => dispatcher.dispatch("GET", ["k"], ctx)).toThrow(
        WrongTypeError
      );
    });

    test("WrongTypeError contains correct details", () => {
      engine.getDatabase(0).set("k", new ValueEntry("hash", { f: "v" }));
      try {
        dispatcher.dispatch("GET", ["k"], ctx);
        throw new Error("Expected WrongTypeError");
      } catch (e) {
        expect(e).toBeInstanceOf(WrongTypeError);
        const err = e as WrongTypeError;
        expect(err.meta.command).toBe("GET");
        expect(err.details).toEqual([
          { expectedType: "string", actualType: "hash" },
        ]);
      }
    });
  });

  describe("happy path", () => {
    test("SET returns 'OK'", () => {
      const result = dispatcher.dispatch("SET", ["key", "value"], ctx);
      expect(result).toBe("OK");
    });

    test("GET returns the stored value", () => {
      dispatcher.dispatch("SET", ["key", "hello"], ctx);
      const result = dispatcher.dispatch("GET", ["key"], ctx);
      expect(result).toBe("hello");
    });

    test("GET returns null for missing key", () => {
      const result = dispatcher.dispatch("GET", ["missing"], ctx);
      expect(result).toBeNull();
    });

    test("command name lookup is case-insensitive", () => {
      const result = dispatcher.dispatch("set", ["k", "v"], ctx);
      expect(result).toBe("OK");
    });
  });
});
