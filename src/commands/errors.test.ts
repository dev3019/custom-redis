import { describe, test, expect } from "bun:test";
import {
  CommandError,
  UnknownCommandError,
  ArityError,
  InvalidArgumentError,
  WrongTypeError,
  DuplicateCommandError,
} from "./errors";

describe("CommandError", () => {
  test("sets message and default empty meta", () => {
    const err = new CommandError("something broke");
    expect(err.message).toBe("something broke");
    expect(err.meta).toEqual({});
  });

  test("sets provided meta", () => {
    const err = new CommandError("fail", { command: "SET", dbIndex: 3 });
    expect(err.meta.command).toBe("SET");
    expect(err.meta.dbIndex).toBe(3);
  });

  test("meta is frozen — mutation throws in strict mode", () => {
    const err = new CommandError("fail", { command: "SET" });
    expect(() => {
      (err.meta as any).command = "GET";
    }).toThrow();
  });

  test("name equals class name", () => {
    const err = new CommandError("fail");
    expect(err.name).toBe("CommandError");
  });

  test("is instanceof Error", () => {
    const err = new CommandError("fail");
    expect(err).toBeInstanceOf(Error);
  });

  test("is instanceof CommandError", () => {
    const err = new CommandError("fail");
    expect(err).toBeInstanceOf(CommandError);
  });

  test("details starts empty", () => {
    const err = new CommandError("fail");
    expect(err.details).toEqual([]);
  });

  test("addDetails with single string detail", () => {
    const err = new CommandError("fail");
    err.addDetails("extra info");
    expect(err.details).toEqual(["extra info"]);
  });

  test("addDetails with single object detail", () => {
    const err = new CommandError("fail");
    err.addDetails({ key: "value" });
    expect(err.details).toEqual([{ key: "value" }]);
  });

  test("addDetails with array of details", () => {
    const err = new CommandError("fail");
    err.addDetails(["one", { two: 2 }]);
    expect(err.details).toEqual(["one", { two: 2 }]);
  });

  test("addDetails accumulates across calls", () => {
    const err = new CommandError("fail");
    err.addDetails("first");
    err.addDetails("second");
    expect(err.details).toEqual(["first", "second"]);
  });
});

describe("UnknownCommandError", () => {
  test("message includes command name", () => {
    const err = new UnknownCommandError("FOO");
    expect(err.message).toBe("Unknown command 'FOO'");
  });

  test("meta.command is set", () => {
    const err = new UnknownCommandError("BAR");
    expect(err.meta.command).toBe("BAR");
  });

  test("inherits from CommandError", () => {
    const err = new UnknownCommandError("X");
    expect(err).toBeInstanceOf(CommandError);
    expect(err).toBeInstanceOf(Error);
  });

  test("name equals UnknownCommandError", () => {
    const err = new UnknownCommandError("X");
    expect(err.name).toBe("UnknownCommandError");
  });

  test("meta is frozen", () => {
    const err = new UnknownCommandError("X");
    expect(() => {
      (err.meta as any).command = "Y";
    }).toThrow();
  });
});

describe("ArityError", () => {
  test("message includes min, max, and actual", () => {
    const err = new ArityError("SET", { min: 2, max: 2, actual: 1 });
    expect(err.message).toBe(
      "Wrong number of arguments for 'SET' (expected 2..2, got 1)"
    );
  });

  test("meta.command and meta.argsCount are set", () => {
    const err = new ArityError("GET", { min: 1, max: 1, actual: 3 });
    expect(err.meta.command).toBe("GET");
    expect(err.meta.argsCount).toBe(3);
  });

  test("defaults to zeros when no meta provided", () => {
    const err = new ArityError("SET");
    expect(err.message).toBe(
      "Wrong number of arguments for 'SET' (expected 0..0, got 0)"
    );
    expect(err.meta.argsCount).toBe(0);
  });

  test("inherits from CommandError", () => {
    const err = new ArityError("SET");
    expect(err).toBeInstanceOf(CommandError);
    expect(err).toBeInstanceOf(Error);
  });

  test("name equals ArityError", () => {
    const err = new ArityError("SET");
    expect(err.name).toBe("ArityError");
  });
});

describe("InvalidArgumentError", () => {
  test("message is passed through", () => {
    const err = new InvalidArgumentError("Key must be a string");
    expect(err.message).toBe("Key must be a string");
  });

  test("meta is passed through", () => {
    const err = new InvalidArgumentError("bad arg", {
      command: "SET",
      dbIndex: 5,
    });
    expect(err.meta.command).toBe("SET");
    expect(err.meta.dbIndex).toBe(5);
  });

  test("default meta is empty", () => {
    const err = new InvalidArgumentError("bad arg");
    expect(err.meta).toEqual({});
  });

  test("inherits from CommandError", () => {
    const err = new InvalidArgumentError("bad");
    expect(err).toBeInstanceOf(CommandError);
    expect(err).toBeInstanceOf(Error);
  });

  test("name equals InvalidArgumentError", () => {
    const err = new InvalidArgumentError("bad");
    expect(err.name).toBe("InvalidArgumentError");
  });

  test("meta is frozen", () => {
    const err = new InvalidArgumentError("bad", { command: "SET" });
    expect(() => {
      (err.meta as any).command = "GET";
    }).toThrow();
  });
});

describe("WrongTypeError", () => {
  test("message matches Redis format", () => {
    const err = new WrongTypeError("GET", "string", "list");
    expect(err.message).toBe(
      "WRONGTYPE Operation against a key holding the wrong kind of value"
    );
  });

  test("meta.command is set", () => {
    const err = new WrongTypeError("GET", "string", "hash");
    expect(err.meta.command).toBe("GET");
  });

  test("details contain expectedType and actualType", () => {
    const err = new WrongTypeError("GET", "string", "set");
    expect(err.details).toEqual([
      { expectedType: "string", actualType: "set" },
    ]);
  });

  test("inherits from CommandError", () => {
    const err = new WrongTypeError("GET", "string", "list");
    expect(err).toBeInstanceOf(CommandError);
    expect(err).toBeInstanceOf(Error);
  });

  test("name equals WrongTypeError", () => {
    const err = new WrongTypeError("GET", "string", "list");
    expect(err.name).toBe("WrongTypeError");
  });

  test("meta is frozen", () => {
    const err = new WrongTypeError("GET", "string", "list");
    expect(() => {
      (err.meta as any).command = "SET";
    }).toThrow();
  });
});

describe("DuplicateCommandError", () => {
  test("message includes command name", () => {
    const err = new DuplicateCommandError("SET");
    expect(err.message).toBe("Command 'SET' is already registered");
  });

  test("meta.command is set", () => {
    const err = new DuplicateCommandError("GET");
    expect(err.meta.command).toBe("GET");
  });

  test("inherits from CommandError", () => {
    const err = new DuplicateCommandError("SET");
    expect(err).toBeInstanceOf(CommandError);
    expect(err).toBeInstanceOf(Error);
  });

  test("name equals DuplicateCommandError", () => {
    const err = new DuplicateCommandError("SET");
    expect(err.name).toBe("DuplicateCommandError");
  });

  test("meta is frozen", () => {
    const err = new DuplicateCommandError("SET");
    expect(() => {
      (err.meta as any).command = "GET";
    }).toThrow();
  });
});
