import { apiError, jsonResponse, optionsResponse } from "../_shared/errors.ts";
import { randomToken, requireSession, sha256 } from "../_shared/supabase.ts";

async function getLeagueSeason(supabase: any, leagueId: string) {
  return await supabase
    .from("seasons")
    .select("id, year, name, status, current_week_id")
    .eq("league_id", leagueId)
    .in("status", ["ACTIVE", "DRAFT"])
    .order("year", { ascending: false })
    .limit(1)
    .single();
}

async function getAdminState(supabase: any, leagueId: string) {
  const { data: season, error: seasonError } = await getLeagueSeason(supabase, leagueId);
  if (seasonError) return { error: apiError("SEASON_LOOKUP_FAILED", seasonError.message, 500) };

  const { data: week } = season.current_week_id
    ? await supabase.from("weeks").select("id, display_name, status").eq("id", season.current_week_id).maybeSingle()
    : { data: null };

  const { data: participants, error: participantsError } = await supabase
    .from("players")
    .select("id, display_name, is_admin, active, created_at")
    .eq("league_id", leagueId)
    .order("created_at", { ascending: true });
  if (participantsError) return { error: apiError("PARTICIPANTS_LOOKUP_FAILED", participantsError.message, 500) };

  return {
    state: {
      season: { id: season.id, year: season.year, name: season.name, status: season.status },
      week: week ? { id: week.id, displayName: week.display_name, status: week.status } : null,
      counts: { activePlayers: (participants ?? []).filter((p: any) => p.active).length },
      participants: (participants ?? []).map((p: any) => ({
        id: p.id,
        displayName: p.display_name,
        isAdmin: Boolean(p.is_admin),
        active: Boolean(p.active),
        joinedAt: p.created_at
      }))
    }
  };
}

function cleanName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function cleanPin(value: unknown) {
  return String(value ?? "").trim();
}

async function addParticipant(supabase: any, leagueId: string, payload: Record<string, unknown>) {
  const displayName = cleanName(payload.displayName);
  const pin = cleanPin(payload.pin);
  if (!displayName) return { error: apiError("MISSING_DISPLAY_NAME", "Enter a participant name.", 400) };
  if (displayName.length > 40) return { error: apiError("DISPLAY_NAME_TOO_LONG", "Participant names must be 40 characters or less.", 400) };
  if (!/^\d{4,8}$/.test(pin)) return { error: apiError("INVALID_PIN", "PIN must be 4 to 8 digits.", 400) };

  const { data: existingPlayer, error: existingError } = await supabase
    .from("players")
    .select("id")
    .eq("league_id", leagueId)
    .eq("active", true)
    .ilike("display_name", displayName)
    .maybeSingle();
  if (existingError) return { error: apiError("PLAYER_LOOKUP_FAILED", existingError.message, 500) };
  if (existingPlayer) return { error: apiError("PLAYER_ALREADY_EXISTS", "A participant with that name already exists.", 409) };

  const salt = randomToken();
  const pinHash = `sha256:${salt}:${await sha256(`${salt}:${pin}`)}`;
  const { error } = await supabase.from("players").insert({ league_id: leagueId, display_name: displayName, pin_hash: pinHash, is_admin: false, active: true });
  if (error) return { error: apiError("PLAYER_CREATE_FAILED", error.message, 500) };
  return await getAdminState(supabase, leagueId);
}

async function resetPin(supabase: any, leagueId: string, payload: Record<string, unknown>) {
  const playerId = String(payload.playerId ?? "").trim();
  const pin = cleanPin(payload.pin);
  if (!playerId) return { error: apiError("MISSING_PLAYER", "Choose a participant.", 400) };
  if (!/^\d{4,8}$/.test(pin)) return { error: apiError("INVALID_PIN", "PIN must be 4 to 8 digits.", 400) };

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, league_id, active")
    .eq("id", playerId)
    .maybeSingle();
  if (playerError) return { error: apiError("PLAYER_LOOKUP_FAILED", playerError.message, 500) };
  if (!player || player.league_id !== leagueId || player.active === false) return { error: apiError("PLAYER_NOT_FOUND", "Participant was not found.", 404) };

  const salt = randomToken();
  const now = new Date().toISOString();
  const pinHash = `sha256:${salt}:${await sha256(`${salt}:${pin}`)}`;
  const { error } = await supabase.from("players").update({ pin_hash: pinHash, updated_at: now }).eq("id", playerId);
  if (error) return { error: apiError("PIN_RESET_FAILED", error.message, 500) };
  await supabase.from("player_sessions").update({ revoked_at: now }).eq("player_id", playerId).is("revoked_at", null);
  return await getAdminState(supabase, leagueId);
}

async function removeParticipant(supabase: any, leagueId: string, adminPlayerId: string, payload: Record<string, unknown>) {
  const playerId = String(payload.playerId ?? "").trim();
  if (!playerId) return { error: apiError("MISSING_PLAYER", "Choose a participant to remove.", 400) };
  if (playerId === adminPlayerId) return { error: apiError("CANNOT_REMOVE_SELF", "You cannot remove your own admin account.", 400) };

  const { data: player, error: lookupError } = await supabase.from("players").select("id, league_id, is_admin").eq("id", playerId).maybeSingle();
  if (lookupError) return { error: apiError("PLAYER_LOOKUP_FAILED", lookupError.message, 500) };
  if (!player || player.league_id !== leagueId) return { error: apiError("PLAYER_NOT_FOUND", "Participant was not found.", 404) };
  if (player.is_admin) return { error: apiError("CANNOT_REMOVE_ADMIN", "Admin accounts cannot be removed here.", 400) };

  const now = new Date().toISOString();
  const { error } = await supabase.from("players").update({ active: false, updated_at: now }).eq("id", playerId);
  if (error) return { error: apiError("PLAYER_REMOVE_FAILED", error.message, 500) };
  await supabase.from("player_sessions").update({ revoked_at: now }).eq("player_id", playerId).is("revoked_at", null);
  return await getAdminState(supabase, leagueId);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return apiError("METHOD_NOT_ALLOWED", "Use POST.", 405);
  const session = await requireSession(request);
  if ("error" in session) return session.error;
  const { supabase, player } = session;
  if (!player.is_admin) return apiError("ADMIN_REQUIRED", "Commissioner access is required.", 403);

  const body = await request.json().catch(() => ({}));
  const command = String(body.command ?? "get-state");
  const payload = (body.payload && typeof body.payload === "object" ? body.payload : {}) as Record<string, unknown>;
  const result = command === "add-participant"
    ? await addParticipant(supabase, player.league_id, payload)
    : command === "remove-participant"
      ? await removeParticipant(supabase, player.league_id, player.id, payload)
      : command === "reset-pin"
        ? await resetPin(supabase, player.league_id, payload)
        : await getAdminState(supabase, player.league_id);
  if ("error" in result) return result.error;
  return jsonResponse(result.state);
});
