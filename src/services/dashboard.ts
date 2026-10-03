import type { DashboardResponse } from "../types";
import { callFunction } from "./api";

export function getDashboard(token: string) {
  return callFunction<DashboardResponse>("get-dashboard", {}, token);
}
