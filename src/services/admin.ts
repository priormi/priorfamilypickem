import { callFunction } from "./api";

export interface AdminParticipant {
  id: string;
  displayName: string;
  isAdmin: boolean;
  active: boolean;
  joinedAt: string;
}

export interface AdminState {
  season: { id: string; year: number; name: string; status: string };
  week: { id: string; displayName: string; status: string } | null;
  counts: { activePlayers: number };
  participants: AdminParticipant[];
}

export function getAdminState(token: string) {
  return callFunction<AdminState>("admin", { command: "get-state", payload: {} }, token);
}

export function addParticipant(token: string, displayName: string, pin: string) {
  return callFunction<AdminState>("admin", { command: "add-participant", payload: { displayName, pin } }, token);
}

export function removeParticipant(token: string, playerId: string) {
  return callFunction<AdminState>("admin", { command: "remove-participant", payload: { playerId } }, token);
}

export function resetParticipantPin(token: string, playerId: string, pin: string) {
  return callFunction<AdminState>("admin", { command: "reset-pin", payload: { playerId, pin } }, token);
}
