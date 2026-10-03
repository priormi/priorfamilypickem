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

async function autoPickStartedGames(supabase: any, seasonId: string, leagueId: string) {
  const nowIso = new Date().toISOString();
  const { data: players, error: playersError } = await supabase.from("players").select("id").eq("league_id", leagueId).eq("active", true);
  if (playersError) return { error: playersError };
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("id, home_team_id, away_team_id")
    .eq("season_id", seasonId)
    .lte("kickoff_at", nowIso)
    .in("status", ["SCHEDULED", "IN_PROGRESS", "FINAL"]);
  if (gamesError) return { error: gamesError };
  if (!(players ?? []).length || !(games ?? []).length) return { inserted: 0 };

  const gameIds = (games ?? []).map((game: any) => game.id);
  const playerIds = (players ?? []).map((player: any) => player.id);
  const { data: existing, error: existingError } = await supabase.from("picks").select("player_id, game_id").in("game_id", gameIds).in("player_id", playerIds);
  if (existingError) return { error: existingError };
  const existingKeys = new Set((existing ?? []).map((pick: any) => `${pick.player_id}:${pick.game_id}`));
  const rows = [];
  for (const player of players ?? []) {
    for (const game of games ?? []) {
      if (existingKeys.has(`${player.id}:${game.id}`)) continue;
      const team_id = Math.random() < 0.5 ? game.home_team_id : game.away_team_id;
      rows.push({ player_id: player.id, game_id: game.id, team_id, source: "AUTO" });
    }
  }
  if (!rows.length) return { inserted: 0 };
  const { error: insertError } = await supabase.from("picks").insert(rows);
  if (insertError) return { error: insertError };
  return { inserted: rows.length };
}

function emptyRecord() {
  return { wins: 0, losses: 0, ties: 0, correct: 0, wrong: 0, pending: 0 };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return apiError("METHOD_NOT_ALLOWED", "Use POST.", 405);
  const session = await requireSession(request);
  if ("error" in session) return session.error;
  const { supabase, player } = session;
  const { data: season, error: seasonError } = await getActiveSeason(supabase, player.league_id);
  if (seasonError) return apiError("NO_ACTIVE_SEASON", seasonError.message, 404);

  const auto = await autoPickStartedGames(supabase, season.id, player.league_id);
  if ("error" in auto) return apiError("AUTO_PICK_FAILED", auto.error.message, 500);

  const { data: week, error: weekError } = await getCurrentWeek(supabase, season);
  if (weekError) return apiError("WEEK_LOOKUP_FAILED", weekError.message, 500);
  const { data: players, error: playersError } = await supabase.from("players").select("id, display_name, is_admin, active").eq("league_id", player.league_id).eq("active", true).order("display_name");
  if (playersError) return apiError("PLAYERS_LOOKUP_FAILED", playersError.message, 500);
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("id, week_id, kickoff_at, status, home_score, away_score, winner_team_id, is_tie, week:weeks(id, display_name, sequence_number), home_team:teams!games_home_team_id_fkey(id, abbreviation, city, name), away_team:teams!games_away_team_id_fkey(id, abbreviation, city, name)")
    .eq("season_id", season.id)
    .order("kickoff_at", { ascending: true });
  if (gamesError) return apiError("GAMES_LOOKUP_FAILED", gamesError.message, 500);
  const { data: picks, error: picksError } = await supabase
    .from("picks")
    .select("id, player_id, game_id, team_id, source, submitted_at, team:teams(id, abbreviation, city, name)")
    .in("player_id", (players ?? []).map((p: any) => p.id));
  if (picksError) return apiError("PICKS_LOOKUP_FAILED", picksError.message, 500);

  const currentWeekGames = week ? (games ?? []).filter((game: any) => game.week_id === week.id) : [];
  const expectedCurrentPicks = (players ?? []).length * currentWeekGames.length;
  const currentPickCount = (picks ?? []).filter((pick: any) => currentWeekGames.some((game: any) => game.id === pick.game_id)).length;
  const currentWeekComplete = expectedCurrentPicks > 0 && currentPickCount >= expectedCurrentPicks;
  const pickByPlayerGame = new Map((picks ?? []).map((pick: any) => [`${pick.player_id}:${pick.game_id}`, pick]));

  const standings = (players ?? []).map((participant: any) => {
    const record = emptyRecord();
    for (const game of games ?? []) {
      const pick = pickByPlayerGame.get(`${participant.id}:${game.id}`);
      if (!pick) continue;
      if (game.status !== "FINAL" || !game.winner_team_id && !game.is_tie) {
        record.pending += 1;
      } else if (game.is_tie) {
        record.ties += 1;
      } else if (pick.team_id === game.winner_team_id) {
        record.wins += 1;
        record.correct += 1;
      } else {
        record.losses += 1;
        record.wrong += 1;
      }
    }
    return { id: participant.id, displayName: participant.display_name, isAdmin: participant.is_admin, record };
  }).sort((a: any, b: any) => b.record.wins - a.record.wins || a.record.losses - b.record.losses || a.displayName.localeCompare(b.displayName));

  const weeks = Array.from(new Map((games ?? []).map((game: any) => {
    const weekRecord = Array.isArray(game.week) ? game.week[0] : game.week;
    return [weekRecord.id, weekRecord];
  })).values()).sort((a: any, b: any) => a.sequence_number - b.sequence_number);

  const weeklyResults = weeks.map((weekRecord: any) => {
    const weekGames = (games ?? []).filter((game: any) => game.week_id === weekRecord.id);
    const expected = (players ?? []).length * weekGames.length;
    const count = (picks ?? []).filter((pick: any) => weekGames.some((game: any) => game.id === pick.game_id)).length;
    const reveal = expected > 0 && count >= expected;
    return {
      id: weekRecord.id,
      displayName: weekRecord.display_name,
      complete: reveal,
      players: (players ?? []).map((participant: any) => {
        let wins = 0, losses = 0, ties = 0, pending = 0;
        for (const game of weekGames) {
          const pick = pickByPlayerGame.get(`${participant.id}:${game.id}`);
          if (!pick) continue;
          if (game.status !== "FINAL" || !game.winner_team_id && !game.is_tie) pending += 1;
          else if (game.is_tie) ties += 1;
          else if (pick.team_id === game.winner_team_id) wins += 1;
          else losses += 1;
        }
        return { id: participant.id, displayName: participant.display_name, wins, losses, ties, pending };
      })
    };
  });

  return jsonResponse({
    season: { id: season.id, year: season.year, name: season.name },
    currentWeek: {
      id: week?.id ?? null,
      displayName: week?.display_name ?? "Schedule not synced yet",
      status: week?.status ?? "UPCOMING",
      complete: currentWeekComplete,
      submittedPicks: currentPickCount,
      expectedPicks: expectedCurrentPicks
    },
    player: { id: player.id, displayName: player.display_name, isAdmin: player.is_admin },
    standings,
    weeklyResults
  });
});
