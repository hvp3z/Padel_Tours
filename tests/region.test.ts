import { describe, expect, it } from "vitest";
import { isInCentreValDeLoire } from "../src/lib/region";

describe("isInCentreValDeLoire", () => {
  it("accepts Tours", () => {
    expect(isInCentreValDeLoire(47.39414, 0.68484)).toBe(true);
  });

  it("rejects Paris", () => {
    expect(isInCentreValDeLoire(48.8566, 2.3522)).toBe(false);
  });
});
