import { describe, test, expect } from "bun:test";
import { Engine } from "./engine";
import { Database } from "./database";
import { DatabaseIndexOutOfRangeError, EngineError } from "./errors";
import { DEFAULT_DB_COUNT } from "../configs";

describe("Engine", () => {
  describe("constructor", () => {
    test("creates with default dbCount (16)", () => {
      const engine = new Engine();
      expect(engine.dbCount).toBe(DEFAULT_DB_COUNT);
      expect(engine.dbCount).toBe(16);
    });

    test("creates with custom dbCount", () => {
      const engine = new Engine(4);
      expect(engine.dbCount).toBe(4);
    });

    test("dbCount matches the value passed to constructor", () => {
      const engine = new Engine(10);
      expect(engine.dbCount).toBe(10);
    });
  });

  describe("getDatabase()", () => {
    test("returns a Database instance for index 0", () => {
      const engine = new Engine();
      const db = engine.getDatabase(0);
      expect(db).toBeInstanceOf(Database);
    });

    test("returns a Database instance for last valid index", () => {
      const engine = new Engine(8);
      const db = engine.getDatabase(7);
      expect(db).toBeInstanceOf(Database);
    });

    test("returns the same instance on repeated calls", () => {
      const engine = new Engine();
      const a = engine.getDatabase(0);
      const b = engine.getDatabase(0);
      expect(a).toBe(b);
    });

    test("different indices return different instances", () => {
      const engine = new Engine();
      expect(engine.getDatabase(0)).not.toBe(engine.getDatabase(1));
    });

    describe("error handling", () => {
      test("throws DatabaseIndexOutOfRangeError for negative index", () => {
        const engine = new Engine();
        expect(() => engine.getDatabase(-1)).toThrow(
          DatabaseIndexOutOfRangeError
        );
      });

      test("throws DatabaseIndexOutOfRangeError for index equal to dbCount", () => {
        const engine = new Engine(4);
        expect(() => engine.getDatabase(4)).toThrow(
          DatabaseIndexOutOfRangeError
        );
      });

      test("throws DatabaseIndexOutOfRangeError for index far above range", () => {
        const engine = new Engine();
        expect(() => engine.getDatabase(100)).toThrow(
          DatabaseIndexOutOfRangeError
        );
      });

      test("error is instanceof EngineError", () => {
        const engine = new Engine();
        try {
          engine.getDatabase(-1);
          throw new Error("Expected DatabaseIndexOutOfRangeError");
        } catch (e) {
          expect(e).toBeInstanceOf(DatabaseIndexOutOfRangeError);
          expect(e).toBeInstanceOf(EngineError);
          expect(e).toBeInstanceOf(Error);
        }
      });

      test("error contains correct index and dbCount in meta", () => {
        const engine = new Engine(8);
        try {
          engine.getDatabase(10);
          throw new Error("Expected DatabaseIndexOutOfRangeError");
        } catch (e) {
          const err = e as DatabaseIndexOutOfRangeError;
          expect(err.meta).toEqual({ index: 10, dbCount: 8 });
        }
      });

      test("error message includes index and valid range", () => {
        const engine = new Engine(4);
        try {
          engine.getDatabase(5);
          throw new Error("Expected DatabaseIndexOutOfRangeError");
        } catch (e) {
          expect((e as DatabaseIndexOutOfRangeError).message).toBe(
            "Database index out of range: 5 (valid range: 0..3)"
          );
        }
      });

      test("error for negative index contains correct meta", () => {
        const engine = new Engine();
        try {
          engine.getDatabase(-3);
          throw new Error("Expected DatabaseIndexOutOfRangeError");
        } catch (e) {
          const err = e as DatabaseIndexOutOfRangeError;
          expect(err.meta).toEqual({ index: -3, dbCount: 16 });
        }
      });
    });
  });
});
