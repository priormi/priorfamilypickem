import { describe, expect, it } from "vitest";
import { pickResult } from "../src/utils/pickem";

describe("pickem scoring", () => {
  it("scores wins, losses, ties, and pending games", () => {
    expect(pickResult("det", "det")).toBe("win");
    expect(pickResult("chi", "det")).toBe("loss");
    expect(pickResult("chi", null, true)).toBe("tie");
    expect(pickResult("chi", null)).toBe("pending");
  });
});
