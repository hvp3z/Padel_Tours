import { describe, expect, it } from "vitest";
import { cached, clearCache } from "../src/lib/cache";

describe("cache", () => {
  it("returns cached value within TTL", async () => {
    clearCache();
    let calls = 0;
    const fn = async () => {
      calls++;
      return 42;
    };
    const a = await cached("k1", 60, fn);
    const b = await cached("k1", 60, fn);
    expect(a).toBe(42);
    expect(b).toBe(42);
    expect(calls).toBe(1);
  });

  it("refetches after TTL expires", async () => {
    clearCache();
    let calls = 0;
    const fn = async () => {
      calls++;
      return calls;
    };
    const a = await cached("k2", 0, fn);
    await new Promise((r) => setTimeout(r, 10));
    const b = await cached("k2", 0, fn);
    expect(a).toBe(1);
    expect(b).toBe(2);
  });
});
