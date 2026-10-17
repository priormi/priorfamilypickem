import { afterEach, describe, expect, it, vi } from "vitest";

const { requireSession } = vi.hoisted(() => ({ requireSession: vi.fn() }));
vi.mock("../supabase/functions/_shared/supabase.ts", () => ({ requireSession }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("dashboard league weeks", () => {
  it("excludes Week 4 from history and standings while keeping Week 14", async () => {
    const player = { id: "player", league_id: "league", display_name: "Player", active: true };
    const games = [4, 5, 14].map((number) => ({
      id: `game-${number}`, season_id: "season", week_id: `week-${number}`, status: "FINAL",
      kickoff_at: "2026-01-01T00:00:00Z", home_team_id: "home", away_team_id: "away",
      winner_team_id: number === 5 ? "away" : "home", is_tie: false,
      week: { id: `week-${number}`, week_code: `WEEK_${number}`, display_name: `Week ${number}`, sequence_number: number },
      home_team: { id: "home", abbreviation: "H" }, away_team: { id: "away", abbreviation: "A" }
    }));
    const picks = games.map((game) => ({ player_id: player.id, game_id: game.id, team_id: "home", source: "PLAYER" }));
    const tables: Record<string, any[]> = {
      seasons: [{ id: "season", year: 2026, name: "Season", league_id: "league", status: "ACTIVE", current_week_id: "week-14" }],
      weeks: games.map((game) => ({ ...game.week, status: "FINAL" })),
      players: [player], games, picks
    };
    const supabase = {
      from(table: string) {
        let rows = [...tables[table]];
        let single = false;
        const value = (row: any, column: string) => column.split(".").reduce((entry, key) => entry?.[key], row);
        const query = {
          select() { return query; },
          eq(column: string, expected: unknown) { rows = rows.filter((row) => value(row, column) === expected); return query; },
          neq(column: string, excluded: unknown) { rows = rows.filter((row) => value(row, column) !== excluded); return query; },
          in(column: string, values: unknown[]) { rows = rows.filter((row) => values.includes(value(row, column))); return query; },
          lte() { return query; },
          order() { return query; },
          single() { single = true; return query; },
          then(resolve: (result: { data: any; error: null }) => unknown) { return Promise.resolve(resolve({ data: single ? rows[0] : rows, error: null })); }
        };
        return query;
      }
    };
    requireSession.mockResolvedValue({ supabase, player });
    let handler!: (request: Request) => Promise<Response>;
    vi.stubGlobal("Deno", { serve: (callback: typeof handler) => { handler = callback; } });
    const endpoint = "../supabase/functions/get-dashboard/index.ts";
    await import(endpoint);

    const response = await handler(new Request("https://example.com", { method: "POST" }));
    expect(response.status).toBe(200);
    const dashboard = await response.json();
    expect(dashboard.weeklyResults.map((week: any) => week.displayName)).toEqual(["Week 5", "Week 14"]);
    expect(dashboard.standings[0].record).toMatchObject({ wins: 1, losses: 1, correct: 1, wrong: 1 });
  });
});
