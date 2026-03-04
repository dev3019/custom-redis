import { describe, test, expect, beforeEach } from "bun:test";
import { CommandRegistry } from "./registry";
import { DuplicateCommandError, CommandError } from "./errors";
import { Command } from "./command";
import { Engine } from "../engine";
import { CommandContext } from "./context";

class StubCommand extends Command<unknown, string> {
  readonly name: string;
  readonly arity = { min: 0, max: 0 };
  readonly isWrite = false;

  constructor(name: string) {
    super();
    this.name = name;
  }

  execute(_engine: Engine, _context: CommandContext): string {
    return "stub";
  }
}

describe("CommandRegistry", () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe("register()", () => {
    test("registers a new command without throwing", () => {
      expect(() => registry.register(new StubCommand("PING"))).not.toThrow();
    });

    test("registered command is retrievable via get()", () => {
      const cmd = new StubCommand("PING");
      registry.register(cmd);
      expect(registry.get("PING")).toBe(cmd);
    });

    test("throws DuplicateCommandError on duplicate name", () => {
      registry.register(new StubCommand("SET"));
      expect(() => registry.register(new StubCommand("SET"))).toThrow(
        DuplicateCommandError
      );
    });

    test("DuplicateCommandError is instanceof CommandError", () => {
      registry.register(new StubCommand("SET"));
      try {
        registry.register(new StubCommand("SET"));
        throw new Error("Expected DuplicateCommandError");
      } catch (e) {
        expect(e).toBeInstanceOf(DuplicateCommandError);
        expect(e).toBeInstanceOf(CommandError);
      }
    });

    test("DuplicateCommandError message includes uppercase command name", () => {
      registry.register(new StubCommand("set"));
      try {
        registry.register(new StubCommand("SET"));
        throw new Error("Expected DuplicateCommandError");
      } catch (e) {
        expect((e as DuplicateCommandError).message).toBe(
          "Command 'SET' is already registered"
        );
      }
    });

    test("DuplicateCommandError meta contains command name", () => {
      registry.register(new StubCommand("GET"));
      try {
        registry.register(new StubCommand("GET"));
        throw new Error("Expected DuplicateCommandError");
      } catch (e) {
        expect((e as DuplicateCommandError).meta.command).toBe("GET");
      }
    });

    test("is case-insensitive — 'set' and 'SET' collide", () => {
      registry.register(new StubCommand("set"));
      expect(() => registry.register(new StubCommand("SET"))).toThrow(
        DuplicateCommandError
      );
    });

    test("different commands can coexist", () => {
      registry.register(new StubCommand("SET"));
      registry.register(new StubCommand("GET"));
      expect(registry.get("SET")).not.toBeNull();
      expect(registry.get("GET")).not.toBeNull();
    });
  });

  describe("get()", () => {
    test("returns null for unregistered command", () => {
      expect(registry.get("NONEXISTENT")).toBeNull();
    });

    test("returns the command for a registered name", () => {
      const cmd = new StubCommand("PING");
      registry.register(cmd);
      expect(registry.get("PING")).toBe(cmd);
    });

    test("is case-insensitive — 'get' resolves 'GET'", () => {
      const cmd = new StubCommand("GET");
      registry.register(cmd);
      expect(registry.get("get")).toBe(cmd);
      expect(registry.get("Get")).toBe(cmd);
    });

    test("returns null for empty string", () => {
      expect(registry.get("")).toBeNull();
    });
  });

  describe("list()", () => {
    test("returns empty array when no commands registered", () => {
      expect(registry.list()).toEqual([]);
    });

    test("returns all registered commands", () => {
      const set = new StubCommand("SET");
      const get = new StubCommand("GET");
      registry.register(set);
      registry.register(get);

      const listed = registry.list();
      expect(listed).toHaveLength(2);
      expect(listed).toContain(set);
      expect(listed).toContain(get);
    });

    test("returns a new array each call (no internal leak)", () => {
      registry.register(new StubCommand("SET"));
      const a = registry.list();
      const b = registry.list();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });
});
