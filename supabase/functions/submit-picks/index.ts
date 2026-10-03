import { apiError, jsonResponse, optionsResponse } from "../_shared/errors.ts";
import { requireSession } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return apiError("METHOD_NOT_ALLOWED", "Use POST.", 405);
  const session = await requireSession(request);
  if ("error" in session) return session.error;
  const { supabase, player } = session;
  const { picks } = await request.json().catch(() => ({}));
  if (!Array.isArray(picks)) return apiError("MISSING_PICKS", "Choose winners before submitting.", 400);

  const gameIds = [...new Set(picks.map((pick: any) => String(pick.gameId ?? "").trim()).filter(Boolean))];
  if (!gameIds.length) return apiError("MISSING_PICKS", "Choose winners before submitting.", 400);

  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("id, kickoff_at, home_team_id, away_team_id, season:seasons!inner(league_id)")
    .in("id", gameIds);
  if (gamesError) return apiError("GAMES_LOOKUP_FAILED", gamesError.message, 500);
  const gameById = new Map((games ?? []).map((game: any) => [game.id, game]));
  const now = Date.now();
  const rows = [];

  for (const pick of picks) {
    const gameId = String(pick.gameId ?? "").trim();
    const teamId = String(pick.teamId ?? "").trim();
    const game = gameById.get(gameId);
    const season = Array.isArray(game?.season) ? game?.season[0] : game?.season;
    if (!game || season?.league_id !== player.league_id) return apiError("GAME_NOT_FOUND", "Game was not found.", 404);
    if (new Date(game.kickoff_at).getTime() <= now) return apiError("GAME_LOCKED", "One or more games have already started.", 403);
    if (![game.home_team_id, game.away_team_id].includes(teamId)) return apiError("INVALID_TEAM", "Pick a team from that game.", 400);
    rows.push({ player_id: player.id, game_id: gameId, team_id: teamId, source: "PLAYER", updated_at: new Date().toISOString() });
  }

  const { error: saveError } = await supabase.from("picks").upsert(rows, { onConflict: "player_id,game_id" });
  if (saveError) return apiError("PICKS_SAVE_FAILED", saveError.message, 500);
  return jsonResponse({ saved: rows.length });
});
