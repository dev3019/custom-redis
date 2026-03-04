import { describe, test, expect, beforeEach } from "bun:test";
import { Database } from "./database";
import { ValueEntry } from "./valueEntry";

describe("Database", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database();
  });

  describe("basic keyspace operations", () => {
    test("set() stores a ValueEntry and get() retrieves it", () => {
      const entry = new ValueEntry("string", "hello");
      db.set("k", entry);
      expect(db.get("k")).toBe(entry);
    });

    test("get() returns null for non-existent key", () => {
      expect(db.get("missing")).toBeNull();
    });

    test("set() overwrites an existing key", () => {
      db.set("k", new ValueEntry("string", "v1"));
      const v2 = new ValueEntry("string", "v2");
      db.set("k", v2);
      expect(db.get("k")).toBe(v2);
    });

    test("delete() removes a key from the keyspace", () => {
      db.set("k", new ValueEntry("string", "v"));
      db.delete("k");
      expect(db.get("k")).toBeNull();
    });

    test("delete() on non-existent key does not throw", () => {
      expect(() => db.delete("nonexistent")).not.toThrow();
    });

    test("stores entries of different data types", () => {
      db.set("s", new ValueEntry("string", "text"));
      db.set("l", new ValueEntry("list", ["a", "b"]));
      db.set("h", new ValueEntry("hash", { f: "v" }));

      expect(db.get("s")!.type).toBe("string");
      expect(db.get("l")!.type).toBe("list");
      expect(db.get("h")!.type).toBe("hash");
    });

    test("independent keys do not interfere with each other", () => {
      db.set("a", new ValueEntry("string", "1"));
      db.set("b", new ValueEntry("string", "2"));
      db.delete("a");

      expect(db.get("a")).toBeNull();
      expect(db.get("b")!.value).toBe("2");
    });
  });

  describe("setExpiry()", () => {
    test("stores absolute timestamp for an existing key", () => {
      db.set("k", new ValueEntry("string", "v"));
      db.setExpiry("k", Date.now() - 1000);
      expect(db.isExpired("k")).toBe(true);
    });

    test("is a no-op when key does not exist in keyspace", () => {
      db.setExpiry("missing", Date.now() - 1000);
      expect(db.isExpired("missing")).toBe(false);
    });

    test("overwrites a previous expiry", () => {
      db.set("k", new ValueEntry("string", "v"));
      db.setExpiry("k", Date.now() + 60_000);
      expect(db.isExpired("k")).toBe(false);

      db.setExpiry("k", Date.now() - 1000);
      expect(db.isExpired("k")).toBe(true);
    });

    test("is a no-op after delete() — no phantom expiry on re-creation", () => {
      db.set("k", new ValueEntry("string", "v"));
      db.delete("k");
      db.setExpiry("k", Date.now() - 1000);

      db.set("k", new ValueEntry("string", "v2"));
      expect(db.isExpired("k")).toBe(false);
      expect(db.get("k")!.value).toBe("v2");
    });
  });

  describe("isExpired()", () => {
    test("returns true when Date.now() >= expiry (past timestamp)", () => {
      db.set("k", new ValueEntry("string", "v"));
      db.setExpiry("k", Date.now() - 1000);
      expect(db.isExpired("k")).toBe(true);
    });

    test("returns false when Date.now() < expiry (future timestamp)", () => {
      db.set("k", new ValueEntry("string", "v"));
      db.setExpiry("k", Date.now() + 60_000);
      expect(db.isExpired("k")).toBe(false);
    });

    test("returns false for a key with no expiry set", () => {
      db.set("k", new ValueEntry("string", "v"));
      expect(db.isExpired("k")).toBe(false);
    });

    test("returns false for a non-existent key", () => {
      expect(db.isExpired("nonexistent")).toBe(false);
    });

    test("boundary: returns true when timestamp equals Date.now() (>= contract)", () => {
      db.set("k", new ValueEntry("string", "v"));
      const now = Date.now();
      db.setExpiry("k", now);
      expect(db.isExpired("k")).toBe(true);
    });

    test("does NOT delete the key — check-only contract", () => {
      db.set("k", new ValueEntry("string", "v"));
      db.setExpiry("k", Date.now() - 1000);

      expect(db.isExpired("k")).toBe(true);
      expect(db.isExpired("k")).toBe(true);
    });
  });

  describe("lazy expiration in get()", () => {
    test("returns null for an expired key", () => {
      db.set("k", new ValueEntry("string", "v"));
      db.setExpiry("k", Date.now() - 1000);
      expect(db.get("k")).toBeNull();
    });

    test("deletes expired key from keyspace on access", () => {
      db.set("k", new ValueEntry("string", "v"));
      db.setExpiry("k", Date.now() - 1000);

      db.get("k");

      expect(db.isExpired("k")).toBe(false);
    });

    test("cleans up expiration entry on lazy deletion — no stale TTL on re-creation", () => {
      db.set("k", new ValueEntry("string", "v"));
      db.setExpiry("k", Date.now() - 1000);

      db.get("k");

      db.set("k", new ValueEntry("string", "fresh"));
      expect(db.get("k")!.value).toBe("fresh");
      expect(db.isExpired("k")).toBe(false);
    });

    test("returns the ValueEntry for a non-expired key with TTL", () => {
      const entry = new ValueEntry("string", "v");
      db.set("k", entry);
      db.setExpiry("k", Date.now() + 60_000);
      expect(db.get("k")).toBe(entry);
    });

    test("returns the ValueEntry for a key with no TTL", () => {
      const entry = new ValueEntry("string", "v");
      db.set("k", entry);
      expect(db.get("k")).toBe(entry);
    });

    test("only the expired key is affected — others remain accessible", () => {
      db.set("expired", new ValueEntry("string", "gone"));
      db.set("alive", new ValueEntry("string", "here"));
      db.setExpiry("expired", Date.now() - 1000);
      db.setExpiry("alive", Date.now() + 60_000);

      expect(db.get("expired")).toBeNull();
      expect(db.get("alive")!.value).toBe("here");
    });
  });

  describe("TTL preservation on set()", () => {
    test("set() does NOT remove existing TTL", () => {
      db.set("k", new ValueEntry("string", "v1"));
      db.setExpiry("k", Date.now() - 1000);

      db.set("k", new ValueEntry("string", "v2"));

      expect(db.get("k")).toBeNull();
    });

    test("set() does NOT modify the TTL value", () => {
      db.set("k", new ValueEntry("string", "v1"));
      db.setExpiry("k", Date.now() + 60_000);

      db.set("k", new ValueEntry("string", "v2"));

      expect(db.isExpired("k")).toBe(false);
      expect(db.get("k")!.value).toBe("v2");
    });

    test("set() on a key without TTL does NOT create a TTL", () => {
      db.set("k", new ValueEntry("string", "v1"));
      db.set("k", new ValueEntry("string", "v2"));

      expect(db.isExpired("k")).toBe(false);
      expect(db.get("k")!.value).toBe("v2");
    });
  });

  describe("TTL removal on delete()", () => {
    test("delete() removes key from both keyspace and expirations", () => {
      db.set("k", new ValueEntry("string", "v"));
      db.setExpiry("k", Date.now() + 60_000);
      db.delete("k");

      expect(db.get("k")).toBeNull();
      expect(db.isExpired("k")).toBe(false);
    });

    test("after delete(), isExpired() returns false", () => {
      db.set("k", new ValueEntry("string", "v"));
      db.setExpiry("k", Date.now() - 1000);

      expect(db.isExpired("k")).toBe(true);
      db.delete("k");
      expect(db.isExpired("k")).toBe(false);
    });

    test("after delete(), get() returns null", () => {
      db.set("k", new ValueEntry("string", "v"));
      db.setExpiry("k", Date.now() + 60_000);
      db.delete("k");
      expect(db.get("k")).toBeNull();
    });
  });

  describe("edge cases", () => {
    test("multiple keys with different expiry times are independent", () => {
      db.set("a", new ValueEntry("string", "1"));
      db.set("b", new ValueEntry("string", "2"));
      db.set("c", new ValueEntry("string", "3"));

      db.setExpiry("a", Date.now() - 1000);
      db.setExpiry("b", Date.now() + 60_000);

      expect(db.get("a")).toBeNull();
      expect(db.get("b")!.value).toBe("2");
      expect(db.get("c")!.value).toBe("3");
    });

    test("expired key re-set has no stale TTL bleed-through", () => {
      db.set("k", new ValueEntry("string", "v1"));
      db.setExpiry("k", Date.now() - 1000);

      expect(db.get("k")).toBeNull();

      db.set("k", new ValueEntry("string", "v2"));

      expect(db.get("k")!.value).toBe("v2");
      expect(db.isExpired("k")).toBe(false);
    });

    test("setExpiry() with timestamp in the past — immediately expired", () => {
      db.set("k", new ValueEntry("string", "v"));
      db.setExpiry("k", Date.now() - 1);
      expect(db.isExpired("k")).toBe(true);
      expect(db.get("k")).toBeNull();
    });

    test("setExpiry() with 0 as timestamp — effectively expired", () => {
      db.set("k", new ValueEntry("string", "v"));
      db.setExpiry("k", 0);
      expect(db.isExpired("k")).toBe(true);
      expect(db.get("k")).toBeNull();
    });

    test("overwrite value via set(), TTL remains intact", () => {
      db.set("k", new ValueEntry("string", "v1"));
      db.setExpiry("k", Date.now() + 60_000);

      db.set("k", new ValueEntry("string", "v2"));

      expect(db.get("k")!.value).toBe("v2");
      expect(db.isExpired("k")).toBe(false);
    });

    test("delete key, setExpiry on deleted key is no-op, re-create has no phantom TTL", () => {
      db.set("k", new ValueEntry("string", "v1"));
      db.setExpiry("k", Date.now() - 1000);
      db.delete("k");

      db.setExpiry("k", Date.now() - 1000);

      db.set("k", new ValueEntry("string", "v2"));

      expect(db.get("k")!.value).toBe("v2");
      expect(db.isExpired("k")).toBe(false);
    });

    test("rapid set/expire/get cycle preserves correctness", () => {
      for (let i = 0; i < 100; i++) {
        db.set("k", new ValueEntry("string", `v${i}`));
        db.setExpiry("k", Date.now() + 60_000);
        expect(db.get("k")!.value).toBe(`v${i}`);
      }
      expect(db.get("k")!.value).toBe("v99");
    });

    test("empty string key works for set/get/delete", () => {
      db.set("", new ValueEntry("string", "empty-key"));
      expect(db.get("")!.value).toBe("empty-key");
      db.delete("");
      expect(db.get("")).toBeNull();
    });

    test("TTL on empty string key works correctly", () => {
      db.set("", new ValueEntry("string", "v"));
      db.setExpiry("", Date.now() - 1000);
      expect(db.get("")).toBeNull();
    });
  });

  describe("integration sanity (database-level)", () => {
    test("full lifecycle: set -> setExpiry -> get (valid) -> simulate expiry -> get (null)", () => {
      db.set("k", new ValueEntry("string", "v"));
      db.setExpiry("k", Date.now() + 60_000);

      expect(db.get("k")!.value).toBe("v");

      db.setExpiry("k", Date.now() - 1);

      expect(db.get("k")).toBeNull();
    });

    test("set -> setExpiry -> set (overwrite) -> get (new value) -> simulate expiry -> get (null)", () => {
      db.set("k", new ValueEntry("string", "v1"));
      db.setExpiry("k", Date.now() + 60_000);

      db.set("k", new ValueEntry("string", "v2"));
      expect(db.get("k")!.value).toBe("v2");

      db.setExpiry("k", Date.now() - 1);
      expect(db.get("k")).toBeNull();
    });

    test("delete -> re-set -> setExpiry -> verify full clean lifecycle", () => {
      db.set("k", new ValueEntry("string", "v1"));
      db.setExpiry("k", Date.now() + 60_000);
      db.delete("k");

      db.set("k", new ValueEntry("string", "v2"));
      expect(db.get("k")!.value).toBe("v2");
      expect(db.isExpired("k")).toBe(false);

      db.setExpiry("k", Date.now() - 1);
      expect(db.get("k")).toBeNull();
    });
  });
});
