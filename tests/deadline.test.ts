import { describe, expect, it } from "vitest";
import { hasDeadlinePassed } from "../src/utils/dates";

describe("deadline handling", () => {
  it("compares actual timestamps rather than client timezone labels", () => {
    const deadline = "2026-09-17T17:00:00.000Z";

    expect(hasDeadlinePassed(deadline, new Date("2026-09-17T16:59:59.000Z"))).toBe(false);
    expect(hasDeadlinePassed(deadline, new Date("2026-09-17T17:00:00.000Z"))).toBe(true);
  });
});
