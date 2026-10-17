import { describe, expect, it } from "vitest";
import type { WeeklyResult } from "../src/types";
import { showWeekOnHomepage } from "../src/utils/weeklyResults";

function week(kickoffAt: string, status = "FINAL"): WeeklyResult {
  return {
    id: "week", displayName: "Week 6", complete: true,
    players: [{
      id: "player", displayName: "Player", wins: 1, losses: 0, ties: 0, pending: 0,
      picks: [{ gameId: "game", kickoffAt, status, matchup: "A at B", pickedTeam: null, source: "PLAYER", correct: true, finalScore: null }]
    }]
  };
}

describe("homepage weekly results cutoff", () => {
  it.each([
    ["2026-10-13T00:15:00Z", "2026-10-14T04:59:59Z", "2026-10-14T05:00:00Z"],
    ["2026-11-03T01:15:00Z", "2026-11-04T05:59:59Z", "2026-11-04T06:00:00Z"],
    ["2026-12-29T01:15:00Z", "2026-12-30T05:59:59Z", "2026-12-30T06:00:00Z"]
  ])("removes a finished week at Wednesday midnight Central after %s", (kickoff, before, cutoff) => {
    const result = week(kickoff);
    expect(showWeekOnHomepage(result, new Date(before))).toBe(true);
    expect(showWeekOnHomepage(result, new Date(cutoff))).toBe(false);
    expect(showWeekOnHomepage(result, new Date("2027-02-01T12:00:00Z"))).toBe(false);
    expect(result.players[0].picks).toHaveLength(1);
  });

  it.each(["SCHEDULED", "IN_PROGRESS", "POSTPONED"])("keeps weeks with a %s game after Wednesday", (status) => {
    expect(showWeekOnHomepage(week("2026-10-13T00:15:00Z", status), new Date("2026-10-15T12:00:00Z"))).toBe(true);
  });

  it("uses the last game, including a game rescheduled to Thursday", () => {
    const result = week("2026-10-13T00:15:00Z");
    result.players[0].picks.push({ ...result.players[0].picks[0], gameId: "rescheduled", kickoffAt: "2026-10-16T00:15:00Z" });
    expect(showWeekOnHomepage(result, new Date("2026-10-16T12:00:00Z"))).toBe(true);
    expect(showWeekOnHomepage(result, new Date("2026-10-21T05:00:00Z"))).toBe(false);
  });

  it("keeps hidden weeks and weeks without usable game dates", () => {
    const result = week("2026-10-13T00:15:00Z");
    const now = new Date("2026-10-15T12:00:00Z");
    expect(showWeekOnHomepage({ ...result, complete: false }, now)).toBe(true);
    expect(showWeekOnHomepage({ ...result, players: [] }, now)).toBe(true);
    expect(showWeekOnHomepage(week("invalid"), now)).toBe(true);
  });
});
