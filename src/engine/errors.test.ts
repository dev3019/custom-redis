import { describe, test, expect } from "bun:test";
import { EngineError, DatabaseIndexOutOfRangeError } from "./errors";

describe("EngineError", () => {
  test("sets message", () => {
    const err = new EngineError("something broke");
    expect(err.message).toBe("something broke");
  });

  test("default meta is empty", () => {
    const err = new EngineError("fail");
    expect(err.meta).toEqual({});
  });

  test("sets provided meta", () => {
    const err = new EngineError("fail", { index: 5, dbCount: 16 });
    expect(err.meta).toEqual({ index: 5, dbCount: 16 });
  });

  test("meta is frozen — mutation throws in strict mode", () => {
    const err = new EngineError("fail", { key: "value" });
    expect(() => {
      (err.meta as any).key = "other";
    }).toThrow();
  });

  test("name equals EngineError", () => {
    const err = new EngineError("fail");
    expect(err.name).toBe("EngineError");
  });

  test("is instanceof Error", () => {
    const err = new EngineError("fail");
    expect(err).toBeInstanceOf(Error);
  });

  test("is instanceof EngineError", () => {
    const err = new EngineError("fail");
    expect(err).toBeInstanceOf(EngineError);
  });
});

describe("DatabaseIndexOutOfRangeError", () => {
  test("message includes index and valid range", () => {
    const err = new DatabaseIndexOutOfRangeError(20, 16);
    expect(err.message).toBe(
      "Database index out of range: 20 (valid range: 0..15)"
    );
  });

  test("message for negative index", () => {
    const err = new DatabaseIndexOutOfRangeError(-1, 16);
    expect(err.message).toBe(
      "Database index out of range: -1 (valid range: 0..15)"
    );
  });

  test("meta contains index and dbCount", () => {
    const err = new DatabaseIndexOutOfRangeError(99, 16);
    expect(err.meta).toEqual({ index: 99, dbCount: 16 });
  });

  test("meta is frozen", () => {
    const err = new DatabaseIndexOutOfRangeError(5, 16);
    expect(() => {
      (err.meta as any).index = 0;
    }).toThrow();
  });

  test("inherits from EngineError", () => {
    const err = new DatabaseIndexOutOfRangeError(20, 16);
    expect(err).toBeInstanceOf(EngineError);
    expect(err).toBeInstanceOf(Error);
  });

  test("name equals DatabaseIndexOutOfRangeError", () => {
    const err = new DatabaseIndexOutOfRangeError(20, 16);
    expect(err.name).toBe("DatabaseIndexOutOfRangeError");
  });

  test("works with custom dbCount", () => {
    const err = new DatabaseIndexOutOfRangeError(4, 4);
    expect(err.message).toBe(
      "Database index out of range: 4 (valid range: 0..3)"
    );
    expect(err.meta).toEqual({ index: 4, dbCount: 4 });
  });
});
