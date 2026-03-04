import { describe, test, expect } from "bun:test";
import { CommandContext } from "./context";

describe("CommandContext", () => {
  test("withDatabase returns a new context with updated dbIndex", () => {
    const ctx = new CommandContext({ dbIndex: 0, clientId: "client-1" });
    const ctx2 = ctx.withDatabase(7);

    expect(ctx2).not.toBe(ctx);
    expect(ctx.dbIndex).toBe(0);
    expect(ctx2.dbIndex).toBe(7);
  });

  test("withDatabase preserves clientId", () => {
    const ctx = new CommandContext({ dbIndex: 2, clientId: "client-42" });
    const next = ctx.withDatabase(5);

    expect(next.clientId).toBe("client-42");
  });
});
