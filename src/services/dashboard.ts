import type { DashboardResponse } from "../types";
import { callFunction } from "./api";

export async function getDashboard(token: string) {
  const dashboard = await callFunction<DashboardResponse>("get-dashboard", {}, token);
  const excludedWeeks = dashboard.weeklyResults.filter((week) => week.displayName === "Week 4");
  if (!excludedWeeks.length) return dashboard;

  // Keep older backend deployments consistent with the league's excluded week.
  return {
    ...dashboard,
    weeklyResults: dashboard.weeklyResults.filter((week) => week.displayName !== "Week 4"),
    standings: dashboard.standings.map((standing) => {
      const record = { ...standing.record };
      for (const week of excludedWeeks) {
        if (!week.complete) continue;
        const result = week.players.find((player) => player.id === standing.id);
        if (!result) continue;
        record.wins -= result.wins;
        record.losses -= result.losses;
        record.ties -= result.ties;
        record.correct -= result.wins;
        record.wrong -= result.losses;
        record.pending -= result.pending;
      }
      return { ...standing, record };
    }).sort((a, b) => b.record.wins - a.record.wins || a.record.losses - b.record.losses || a.displayName.localeCompare(b.displayName))
  };
}
