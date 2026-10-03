import type { SessionPlayer } from "../types";
import { callFunction } from "./api";

export interface LoginResponse {
  token: string;
  player: SessionPlayer;
}

export interface LoginPlayersResponse {
  players: Array<{ displayName: string }>;
}

export function listLoginPlayers() {
  return callFunction<LoginPlayersResponse>("player-login", { command: "list-players", leagueSlug: "prior-family-pickem" });
}

export function loginPlayer(displayName: string, pin: string) {
  return callFunction<LoginResponse>("player-login", { leagueSlug: "prior-family-pickem", displayName, pin });
}
