import { describe, test, expect } from "bun:test";
import { Database } from "./database";
import { ValueEntry } from "./valueEntry";

describe("Database TTL invariants", () => {
  test("set() preserves existing TTL metadata", () => {
    const db = new Database();
    db.set("k", new ValueEntry("string", "v1"));
    db.setExpiry("k", Date.now() + 60_000);

    db.set("k", new ValueEntry("string", "v2"));

    expect(db.get("k")!.value).toBe("v2");
    expect(db.isExpired("k")).toBe(false);
  });

  test("setExpiry is a no-op for missing keys", () => {
    const db = new Database();

    db.setExpiry("missing", Date.now() - 1_000);

    expect(db.isExpired("missing")).toBe(false);
    expect(db.get("missing")).toBeNull();
  });

  test("lazy expiry removes key and allows clean re-insert", () => {
    const db = new Database();
    db.set("k", new ValueEntry("string", "old"));
    db.setExpiry("k", Date.now() - 1_000);

    expect(db.get("k")).toBeNull();

    db.set("k", new ValueEntry("string", "new"));
    expect(db.get("k")!.value).toBe("new");
    expect(db.isExpired("k")).toBe(false);
  });
});
