import { apiError, jsonResponse, optionsResponse } from "../_shared/errors.ts";
import { requireSession } from "../_shared/supabase.ts";

async function getActiveSeason(supabase: any, leagueId: string) {
  return await supabase.from("seasons").select("id, year, name, status, current_week_id").eq("league_id", leagueId).eq("status", "ACTIVE").single();
}

async function getCurrentWeek(supabase: any, season: any) {
  if (season.current_week_id) {
    return await supabase.from("weeks").select("id, display_name, status").eq("id", season.current_week_id).single();
  }
  return await supabase
    .from("weeks")
    .select("id, display_name, status")
    .eq("season_id", season.id)
    .order("sequence_number", { ascending: true })
    .limit(1)
    .maybeSingle();
}

function teamRecord(teamId: string, games: any[]) {
  let wins = 0, losses = 0, ties = 0;
  for (const game of games) {
    if (game.status !== "FINAL" || (game.home_team_id !== teamId && game.away_team_id !== teamId)) continue;
    if (game.is_tie) ties += 1;
    else if (game.winner_team_id === teamId) wins += 1;
    else losses += 1;
  }
  return { wins, losses, ties };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return apiError("METHOD_NOT_ALLOWED", "Use POST.", 405);
  const session = await requireSession(request);
  if ("error" in session) return session.error;
  const { supabase, player } = session;
  const { data: season, error: seasonError } = await getActiveSeason(supabase, player.league_id);
  if (seasonError) return apiError("NO_ACTIVE_SEASON", seasonError.message, 404);

  const { data: week, error: weekError } = await getCurrentWeek(supabase, season);
  if (weekError) return apiError("WEEK_LOOKUP_FAILED", weekError.message, 500);

  if (!week) {
    return jsonResponse({
      season: { id: season.id, year: season.year, name: season.name },
      week: { id: null, displayName: "Schedule not synced yet", status: "UPCOMING" },
      games: []
    });
  }

  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("id, kickoff_at, status, home_team_id, away_team_id, home_team:teams!games_home_team_id_fkey(id, abbreviation, city, name), away_team:teams!games_away_team_id_fkey(id, abbreviation, city, name)")
    .eq("week_id", week.id)
    .order("kickoff_at", { ascending: true });
  if (gamesError) return apiError("GAMES_LOOKUP_FAILED", gamesError.message, 500);

  const { data: seasonGames, error: seasonGamesError } = await supabase
    .from("games")
    .select("id, status, home_team_id, away_team_id, winner_team_id, is_tie")
    .eq("season_id", season.id);
  if (seasonGamesError) return apiError("RECORDS_LOOKUP_FAILED", seasonGamesError.message, 500);

  const { data: picks, error: picksError } = await supabase
    .from("picks")
    .select("id, game_id, team_id, source")
    .eq("player_id", player.id)
    .in("game_id", (games ?? []).map((game: any) => game.id));
  if (picksError) return apiError("PICKS_LOOKUP_FAILED", picksError.message, 500);
  const pickByGame = new Map((picks ?? []).map((pick: any) => [pick.game_id, pick]));
  const now = Date.now();

  return jsonResponse({
    season: { id: season.id, year: season.year, name: season.name },
    week: { id: week.id, displayName: week.display_name, status: week.status },
    games: (games ?? []).map((game: any) => {
      const homeTeam = Array.isArray(game.home_team) ? game.home_team[0] : game.home_team;
      const awayTeam = Array.isArray(game.away_team) ? game.away_team[0] : game.away_team;
      const pick = pickByGame.get(game.id);
      return {
        id: game.id,
        kickoffAt: game.kickoff_at,
        status: game.status,
        locked: new Date(game.kickoff_at).getTime() <= now,
        selectedTeamId: pick?.team_id ?? null,
        source: pick?.source ?? null,
        homeTeam: { ...homeTeam, record: teamRecord(homeTeam.id, seasonGames ?? []) },
        awayTeam: { ...awayTeam, record: teamRecord(awayTeam.id, seasonGames ?? []) }
      };
    })
  });
});
