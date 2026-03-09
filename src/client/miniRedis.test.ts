import { describe, test, expect, beforeEach } from "bun:test";
import { MiniRedis } from "./miniRedis";
import { DatabaseIndexOutOfRangeError } from "../engine/errors";
import { WrongTypeError } from "../commands/errors";
import { ValueEntry } from "../engine/valueEntry";

describe("MiniRedis", () => {
  let redis: MiniRedis;

  beforeEach(() => {
    redis = new MiniRedis();
  });

  describe("constructor", () => {
    test("creates a working instance with no arguments", () => {
      const r = new MiniRedis();
      expect(r.set("k", "v")).toBe("OK");
      expect(r.get("k")).toBe("v");
    });

    test("creates a working instance with default options", () => {
      const r = new MiniRedis({});
      expect(r.set("k", "v")).toBe("OK");
    });

    test("respects custom dbCount", () => {
      const r = new MiniRedis({ dbCount: 4 });
      r.select(3);
      r.set("k", "v");
      expect(r.get("k")).toBe("v");

      expect(() => r.select(4)).toThrow(DatabaseIndexOutOfRangeError);
    });

    test("default instance supports 16 databases", () => {
      redis.select(15);
      redis.set("k", "v");
      expect(redis.get("k")).toBe("v");

      expect(() => redis.select(16)).toThrow(DatabaseIndexOutOfRangeError);
    });
  });

  describe("set()", () => {
    test("returns 'OK'", () => {
      expect(redis.set("key", "value")).toBe("OK");
    });

    test("stores value retrievable by get()", () => {
      redis.set("foo", "bar");
      expect(redis.get("foo")).toBe("bar");
    });

    test("overwrites existing key", () => {
      redis.set("k", "first");
      redis.set("k", "second");
      expect(redis.get("k")).toBe("second");
    });

    test("preserves TTL on overwrite", () => {
      redis.set("k", "v1");
      redis.expire("k", 300);
      redis.set("k", "v2");
      expect(redis.get("k")).toBe("v2");
      expect(redis.expire("k", 300)).toBe(1);
    });

    test("handles empty string key", () => {
      redis.set("", "value");
      expect(redis.get("")).toBe("value");
    });

    test("handles empty string value", () => {
      redis.set("k", "");
      expect(redis.get("k")).toBe("");
    });

    test("handles special characters in key and value", () => {
      redis.set("key:with:colons/slashes", "value with spaces & symbols!");
      expect(redis.get("key:with:colons/slashes")).toBe("value with spaces & symbols!");
    });

    test("handles unicode characters", () => {
      redis.set("emoji", "hello world");
      expect(redis.get("emoji")).toBe("hello world");
    });

    test("handles very long strings", () => {
      const longKey = "k".repeat(10_000);
      const longVal = "v".repeat(10_000);
      redis.set(longKey, longVal);
      expect(redis.get(longKey)).toBe(longVal);
    });
  });

  describe("get()", () => {
    test("returns stored string value", () => {
      redis.set("greeting", "hello");
      expect(redis.get("greeting")).toBe("hello");
    });

    test("returns null for non-existent key", () => {
      expect(redis.get("missing")).toBeNull();
    });

    test("returns null for expired key (lazy TTL)", () => {
      redis.set("k", "v");
      redis.expire("k", -1);
      expect(redis.get("k")).toBeNull();
    });

    test("returns value for key with future TTL", () => {
      redis.set("k", "v");
      redis.expire("k", 300);
      expect(redis.get("k")).toBe("v");
    });

    test("returns null after key is deleted by zero-second expire", () => {
      redis.set("k", "v");
      redis.expire("k", 0);
      expect(redis.get("k")).toBeNull();
    });
  });

  describe("expire()", () => {
    test("returns 1 when TTL set on existing key", () => {
      redis.set("k", "v");
      expect(redis.expire("k", 60)).toBe(1);
    });

    test("returns 0 for non-existent key", () => {
      expect(redis.expire("missing", 60)).toBe(0);
    });

    test("zero seconds causes immediate deletion", () => {
      redis.set("k", "v");
      expect(redis.expire("k", 0)).toBe(1);
      expect(redis.get("k")).toBeNull();
    });

    test("negative seconds causes immediate deletion", () => {
      redis.set("k", "v");
      expect(redis.expire("k", -5)).toBe(1);
      expect(redis.get("k")).toBeNull();
    });

    test("overwrites previous TTL", () => {
      redis.set("k", "v");
      redis.expire("k", 10);
      redis.expire("k", 300);
      expect(redis.get("k")).toBe("v");
    });
  });

  describe("select()", () => {
    test("switches database index", () => {
      redis.set("k", "in-db-0");
      redis.select(1);
      redis.set("k", "in-db-1");

      redis.select(0);
      expect(redis.get("k")).toBe("in-db-0");

      redis.select(1);
      expect(redis.get("k")).toBe("in-db-1");
    });

    test("cross-database isolation", () => {
      redis.set("k", "v");
      redis.select(1);
      expect(redis.get("k")).toBeNull();
    });

    test("throws DatabaseIndexOutOfRangeError for index >= dbCount", () => {
      expect(() => redis.select(16)).toThrow(DatabaseIndexOutOfRangeError);
    });

    test("throws DatabaseIndexOutOfRangeError for negative index", () => {
      expect(() => redis.select(-1)).toThrow(DatabaseIndexOutOfRangeError);
    });

    test("respects custom dbCount", () => {
      const r = new MiniRedis({ dbCount: 2 });
      r.select(0);
      r.select(1);
      expect(() => r.select(2)).toThrow(DatabaseIndexOutOfRangeError);
    });

    test("select(0) works after selecting another database", () => {
      redis.set("k", "original");
      redis.select(5);
      redis.set("k", "db5");
      redis.select(0);
      expect(redis.get("k")).toBe("original");
    });

    test("error message contains the invalid index", () => {
      try {
        redis.select(99);
        throw new Error("Expected DatabaseIndexOutOfRangeError");
      } catch (e) {
        expect(e).toBeInstanceOf(DatabaseIndexOutOfRangeError);
        expect((e as DatabaseIndexOutOfRangeError).message).toContain("99");
      }
    });
  });

  describe("listen() / close()", () => {
    test("listen() throws not-implemented error", () => {
      expect(() => redis.listen(6379)).toThrow("not implemented");
    });

    test("close() throws not-implemented error", () => {
      expect(() => redis.close()).toThrow("not implemented");
    });
  });

  describe("error propagation", () => {
    test("get() propagates WrongTypeError for non-string type", () => {
      // Phase 2A only exposes string SET, so we inject a non-string entry
      // via the private engine to verify error propagation through the facade.
      const engine = (redis as any).engine;
      engine.getDatabase(0).set("listkey", new ValueEntry("list", ["a", "b"]));

      expect(() => redis.get("listkey")).toThrow(WrongTypeError);
    });

    test("WrongTypeError contains correct metadata", () => {
      const engine = (redis as any).engine;
      engine.getDatabase(0).set("hashkey", new ValueEntry("hash", { f: "v" }));

      try {
        redis.get("hashkey");
        throw new Error("Expected WrongTypeError");
      } catch (e) {
        expect(e).toBeInstanceOf(WrongTypeError);
        const err = e as WrongTypeError;
        expect(err.meta.command).toBe("GET");
        expect(err.details).toEqual([{ expectedType: "string", actualType: "hash" }]);
      }
    });
  });

  describe("integration / edge cases", () => {
    test("full lifecycle: set -> expire -> get returns null after expiry", () => {
      redis.set("session", "abc123");
      expect(redis.get("session")).toBe("abc123");

      redis.expire("session", -1);
      expect(redis.get("session")).toBeNull();
    });

    test("multiple select round-trips", () => {
      redis.select(5);
      redis.set("a", "db5-a");

      redis.select(0);
      redis.set("a", "db0-a");

      redis.select(5);
      expect(redis.get("a")).toBe("db5-a");

      redis.select(0);
      expect(redis.get("a")).toBe("db0-a");
    });

    test("SET after EXPIRE preserves TTL (Redis semantics)", () => {
      redis.set("k", "v1");
      redis.expire("k", 300);
      redis.set("k", "v2");

      // Key should still exist (TTL preserved, not reset)
      expect(redis.get("k")).toBe("v2");
    });

    test("expire on one database does not affect another", () => {
      redis.set("k", "v");
      redis.expire("k", -1);

      redis.select(1);
      redis.set("k", "v");
      redis.select(0);
      expect(redis.get("k")).toBeNull();

      redis.select(1);
      expect(redis.get("k")).toBe("v");
    });

    test("operations across many databases", () => {
      for (let i = 0; i < 16; i++) {
        redis.select(i);
        redis.set("db", String(i));
      }

      for (let i = 0; i < 16; i++) {
        redis.select(i);
        expect(redis.get("db")).toBe(String(i));
      }
    });

    test("multiple independent MiniRedis instances are isolated", () => {
      const r1 = new MiniRedis();
      const r2 = new MiniRedis();

      r1.set("k", "from-r1");
      r2.set("k", "from-r2");

      expect(r1.get("k")).toBe("from-r1");
      expect(r2.get("k")).toBe("from-r2");
    });

    test("set and get with same key across databases", () => {
      redis.set("shared", "db0");
      redis.select(1);
      redis.set("shared", "db1");
      redis.select(2);

      expect(redis.get("shared")).toBeNull();

      redis.select(0);
      expect(redis.get("shared")).toBe("db0");

      redis.select(1);
      expect(redis.get("shared")).toBe("db1");
    });
  });
});
