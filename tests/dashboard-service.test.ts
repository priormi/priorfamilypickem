import { describe, expect, it, vi } from "vitest";
import { getDashboard } from "../src/services/dashboard";
import { callFunction } from "../src/services/api";

vi.mock("../src/services/api", () => ({ callFunction: vi.fn() }));

describe("dashboard compatibility with older backend deployments", () => {
  it.each([true, false])("removes Week 4 with complete=%s and only subtracts revealed scores", async (complete) => {
    const standings = [
      { id: "a", displayName: "A", isAdmin: false, record: { wins: 3, losses: 1, ties: 1, correct: 3, wrong: 1, pending: 1 } },
      { id: "b", displayName: "B", isAdmin: false, record: { wins: 2, losses: 2, ties: 0, correct: 2, wrong: 2, pending: 0 } }
    ];
    const weeklyResults = [
      { id: "4", displayName: "Week 4", complete, players: [{ id: "a", wins: 3, losses: 1, ties: 1, pending: 1 }] },
      { id: "5", displayName: "Week 5", complete: true, players: [] },
      { id: "14", displayName: "Week 14", complete: true, players: [] }
    ];
    vi.mocked(callFunction).mockResolvedValue({ standings, weeklyResults });

    const dashboard = await getDashboard("token");
    expect(dashboard.weeklyResults.map((week) => week.displayName)).toEqual(["Week 5", "Week 14"]);
    expect(dashboard.standings.map((player) => player.id)).toEqual(complete ? ["b", "a"] : ["a", "b"]);
    expect(dashboard.standings.find((player) => player.id === "a")?.record).toEqual(complete
      ? { wins: 0, losses: 0, ties: 0, correct: 0, wrong: 0, pending: 0 }
      : standings[0].record);
    expect(standings[0].record.wins).toBe(3);
    expect(weeklyResults).toHaveLength(3);
  });

  it("preserves responses that already exclude Week 4", async () => {
    const response = { standings: [], weeklyResults: [] };
    vi.mocked(callFunction).mockResolvedValue(response);
    expect(await getDashboard("token")).toBe(response);
  });
});
