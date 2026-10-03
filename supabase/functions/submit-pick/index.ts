import { apiError, jsonResponse, optionsResponse } from "../_shared/errors.ts";
import { requireSession } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return apiError("METHOD_NOT_ALLOWED", "Use POST.", 405);

  const session = await requireSession(request);
  if ("error" in session) return session.error;

  const { roundId, teamId } = await request.json().catch(() => ({}));
  if (!roundId || !teamId) return apiError("MISSING_PICK", "Choose a team before submitting.", 400);

  const { supabase, player } = session;
  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id")
    .eq("league_id", player.league_id)
    .eq("status", "ACTIVE")
    .order("year", { ascending: false })
    .limit(1)
    .single();

  if (seasonError) return apiError("NO_ACTIVE_SEASON", seasonError.message, 404);

  const { data: seasonPlayer, error: seasonPlayerError } = await supabase
    .from("season_players")
    .select("id, status, season_id")
    .eq("player_id", player.id)
    .eq("season_id", season.id)
    .single();

  if (seasonPlayerError) return apiError("PLAYER_NOT_IN_SEASON", seasonPlayerError.message, 404);
  if (seasonPlayer.status !== "ACTIVE") return apiError("PLAYER_ELIMINATED", "Eliminated players cannot submit picks.", 403);

  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .select("id, deadline_at, status, season_id")
    .eq("id", roundId)
    .single();

  if (roundError) return apiError("ROUND_LOOKUP_FAILED", roundError.message, 500);
  if (round.season_id !== seasonPlayer.season_id) return apiError("ROUND_MISMATCH", "Round is not part of this season.", 400);
  if (round.status === "FINAL" || round.status === "PROCESSING") {
    return apiError("ROUND_CLOSED", "This round is closed.", 403);
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, abbreviation, city, name")
    .eq("id", teamId)
    .eq("active", true)
    .single();

  if (teamError) return apiError("TEAM_NOT_FOUND", "That team is not available.", 404);

  const { data: usedPick, error: usedError } = await supabase
    .from("picks")
    .select("id")
    .eq("season_player_id", seasonPlayer.id)
    .eq("team_id", teamId)
    .neq("round_id", roundId)
    .neq("pick_result", "VOID")
    .maybeSingle();

  if (usedError) return apiError("USED_TEAM_CHECK_FAILED", usedError.message, 500);
  if (usedPick) return apiError("TEAM_ALREADY_USED", "You already used that team this season.", 409);

  const { data: existingPick, error: existingPickError } = await supabase
    .from("picks")
    .select("id, team_id, locked_at")
    .eq("season_player_id", seasonPlayer.id)
    .eq("round_id", roundId)
    .maybeSingle();

  if (existingPickError) return apiError("EXISTING_PICK_LOOKUP_FAILED", existingPickError.message, 500);
  if (existingPick?.locked_at) {
    return apiError("PICK_LOCKED", "Your pick is locked and can no longer be changed.", 403);
  }

  const now = Date.now();
  const { data: selectedGame, error: selectedGameError } = await supabase
    .from("games")
    .select("id, kickoff_at")
    .eq("round_id", roundId)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .maybeSingle();

  if (selectedGameError) return apiError("GAME_LOOKUP_FAILED", selectedGameError.message, 500);
  if (!selectedGame) return apiError("TEAM_NOT_IN_ROUND", "That team is not scheduled for this round.", 400);
  if (new Date(selectedGame.kickoff_at).getTime() <= now) {
    return apiError("TEAM_GAME_STARTED", "That team's game has already started.", 403);
  }

  if (existingPick) {
    const { data: existingGame, error: existingGameError } = await supabase
      .from("games")
      .select("id, kickoff_at")
      .eq("round_id", roundId)
      .or(`home_team_id.eq.${existingPick.team_id},away_team_id.eq.${existingPick.team_id}`)
      .maybeSingle();

    if (existingGameError) return apiError("EXISTING_GAME_LOOKUP_FAILED", existingGameError.message, 500);
    if (existingGame && new Date(existingGame.kickoff_at).getTime() <= now) {
      return apiError("PICK_GAME_STARTED", "Your current pick's game has already started and can no longer be changed.", 403);
    }
  }

  const { data: activeSeasonPlayers, error: activePlayersError } = await supabase
    .from("season_players")
    .select("id")
    .eq("season_id", season.id)
    .eq("status", "ACTIVE");

  if (activePlayersError) return apiError("ACTIVE_PLAYERS_LOOKUP_FAILED", activePlayersError.message, 500);

  const activeSeasonPlayerIds = (activeSeasonPlayers ?? []).map((activePlayer) => activePlayer.id);
  const { data: activeRoundPicks, error: activeRoundPicksError } = activeSeasonPlayerIds.length
    ? await supabase
        .from("picks")
        .select("season_player_id")
        .eq("round_id", roundId)
        .in("season_player_id", activeSeasonPlayerIds)
    : { data: [], error: null };

  if (activeRoundPicksError) return apiError("ROUND_PICK_LOCK_CHECK_FAILED", activeRoundPicksError.message, 500);

  const pickedSeasonPlayerIds = new Set((activeRoundPicks ?? []).map((pick) => pick.season_player_id));
  const allActivePlayersPickedBeforeSubmit =
    activeSeasonPlayerIds.length > 0 && activeSeasonPlayerIds.every((activePlayerId) => pickedSeasonPlayerIds.has(activePlayerId));

  if (existingPick && allActivePlayersPickedBeforeSubmit) {
    return apiError("PICK_LOCKED", "All picks are in. Picks are locked and can no longer be changed.", 403);
  }

  const submittedAt = new Date().toISOString();
  const { data: savedPick, error: saveError } = await supabase
    .from("picks")
    .upsert(
      {
        season_player_id: seasonPlayer.id,
        round_id: roundId,
        team_id: teamId,
        submitted_at: submittedAt,
        updated_at: submittedAt
      },
      { onConflict: "season_player_id,round_id" }
    )
    .select("id")
    .single();

  if (saveError) return apiError("PICK_SAVE_FAILED", saveError.message, 500);

  pickedSeasonPlayerIds.add(seasonPlayer.id);
  const allActivePlayersPickedAfterSubmit =
    activeSeasonPlayerIds.length > 0 && activeSeasonPlayerIds.every((activePlayerId) => pickedSeasonPlayerIds.has(activePlayerId));

  if (allActivePlayersPickedAfterSubmit) {
    const { error: lockError } = await supabase
      .from("picks")
      .update({ locked_at: submittedAt })
      .eq("round_id", roundId)
      .in("season_player_id", activeSeasonPlayerIds)
      .is("locked_at", null);

    if (lockError) return apiError("PICK_LOCK_FAILED", lockError.message, 500);
  }

  await supabase.from("pick_revisions").insert({
    pick_id: savedPick.id,
    previous_team_id: existingPick?.team_id ?? null,
    new_team_id: teamId,
    changed_by_player_id: player.id,
    change_type: existingPick ? "PLAYER_CHANGE" : "PLAYER_SUBMIT"
  });

  return jsonResponse({
    pick: {
      team,
      submittedAt,
      locked: allActivePlayersPickedAfterSubmit
    }
  });
});
