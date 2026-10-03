import { apiError, jsonResponse, optionsResponse } from "../_shared/errors.ts";
import { randomToken, serviceClient, sha256 } from "../_shared/supabase.ts";

async function verifySaltedPin(pinHash: string, pin: string) {
  const [scheme, salt, expectedHash] = pinHash.split(":");
  if (scheme !== "sha256" || !salt || !expectedHash) return false;
  return (await sha256(`${salt}:${pin}`)) === expectedHash;
}

async function listActivePlayers(leagueSlug: string) {
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("players")
    .select("display_name, league:leagues!inner(slug)")
    .eq("league.slug", leagueSlug)
    .eq("active", true)
    .order("display_name", { ascending: true });

  if (error) return { error: apiError("PLAYERS_LOOKUP_FAILED", error.message, 500) };
  return { players: (data ?? []).map((player: any) => ({ displayName: player.display_name })) };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return apiError("METHOD_NOT_ALLOWED", "Use POST.", 405);

  const { command, leagueSlug, displayName, playerId, pin } = await request.json().catch(() => ({}));
  const league = String(leagueSlug ?? "").trim();

  if (command === "list-players") {
    if (!league) return apiError("MISSING_LEAGUE", "Choose a league.", 400);
    const result = await listActivePlayers(league);
    if ("error" in result) return result.error;
    return jsonResponse(result);
  }

  const loginName = String(displayName ?? playerId ?? "").trim();
  const loginPin = String(pin ?? "");
  if (!league || !loginName || !loginPin) return apiError("MISSING_LOGIN", "Choose a player and enter a PIN.", 400);

  const supabase = serviceClient();
  const { data: verifiedPlayer, error } = await supabase.rpc("verify_player_pin", {
    league_slug_input: league,
    display_name_input: loginName,
    pin_input: loginPin
  }).maybeSingle();
  if (error) return apiError("LOGIN_FAILED", error.message, 500);

  let player = verifiedPlayer;
  if (!player) {
    const { data: fallbackPlayer, error: fallbackError } = await supabase
      .from("players")
      .select("id, display_name, is_admin, pin_hash, league:leagues!inner(slug)")
      .eq("league.slug", league)
      .eq("active", true)
      .ilike("display_name", loginName)
      .maybeSingle();
    if (fallbackError) return apiError("LOGIN_FAILED", fallbackError.message, 500);
    if (fallbackPlayer && await verifySaltedPin(fallbackPlayer.pin_hash, loginPin)) {
      player = { id: fallbackPlayer.id, display_name: fallbackPlayer.display_name, is_admin: fallbackPlayer.is_admin };
    }
  }

  if (!player) return apiError("INVALID_LOGIN", "Player or PIN was not recognized.", 401);

  const token = randomToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  const { error: sessionError } = await supabase.from("player_sessions").insert({
    player_id: player.id,
    token_hash: await sha256(token),
    expires_at: expiresAt
  });
  if (sessionError) return apiError("SESSION_CREATE_FAILED", sessionError.message, 500);

  return jsonResponse({ token, player: { id: player.id, displayName: player.display_name, isAdmin: player.is_admin } });
});
