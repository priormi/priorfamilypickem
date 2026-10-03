import { callFunction } from "./api";

export function getStandings(token: string) {
  return callFunction("get-standings", {}, token);
}
