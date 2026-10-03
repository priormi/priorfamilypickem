import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { apiError } from "./errors.ts";

export function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    throw new Error("Supabase service credentials are not configured.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function requireSession(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { error: apiError("UNAUTHORIZED", "Missing session token.", 401) };
  }

  const supabase = serviceClient();
  const tokenHash = await sha256(token);
  const { data, error } = await supabase
    .from("player_sessions")
    .select("id, expires_at, player:players(id, league_id, display_name, is_admin, active)")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    return { error: apiError("SESSION_LOOKUP_FAILED", error.message, 500) };
  }

  if (!data || new Date(data.expires_at).getTime() <= Date.now()) {
    return { error: apiError("UNAUTHORIZED", "Session expired. Please log in again.", 401) };
  }

  await supabase.from("player_sessions").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);

  const player = Array.isArray(data.player) ? data.player[0] : data.player;
  if (!player) {
    return { error: apiError("UNAUTHORIZED", "Player not found for session.", 401) };
  }

  if (!player.active) {
    return { error: apiError("UNAUTHORIZED", "This account is inactive.", 401) };
  }

  return { supabase, player };
}
