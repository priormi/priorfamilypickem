import type { PickOptionsResponse } from "../types";
import { callFunction } from "./api";

export function getPickOptions(token: string) {
  return callFunction<PickOptionsResponse>("get-pick-options", {}, token);
}

export function submitPicks(token: string, picks: Array<{ gameId: string; teamId: string }>) {
  return callFunction<{ saved: number }>("submit-picks", { picks }, token);
}
