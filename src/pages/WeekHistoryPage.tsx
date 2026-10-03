import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getDashboard } from "../services/dashboard";
import type { DashboardResponse, WeeklyPickHistory } from "../types";

function pickResult(pick: WeeklyPickHistory) {
  if (pick.correct === true) return "Correct";
  if (pick.correct === false) return "Missed";
  if (pick.status === "FINAL") return "Tie";
  return "Pending";
}

export function WeekHistoryPage() {
  const auth = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [expandedWeekIds, setExpandedWeekIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.token) return;
    getDashboard(auth.token).then(setDashboard).catch((err) => setError(err instanceof Error ? err.message : "Unable to load history."));
  }, [auth.token]);

  if (!auth.token) return <Navigate to="/login" replace />;
  if (error) return <section className="rounded-lg border border-red-200 bg-red-50 p-5 font-semibold text-red-800">{error}</section>;
  if (!dashboard) return <section className="rounded-lg border border-slate-200 bg-white p-5">Loading history...</section>;

  function toggleWeek(weekId: string) {
    setExpandedWeekIds((current) => {
      const next = new Set(current);
      if (next.has(weekId)) next.delete(weekId);
      else next.add(weekId);
      return next;
    });
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-2xl font-bold">Pick History</h2>
      <div className="mt-4 grid gap-4">
        {dashboard.weeklyResults.map((week) => {
          const expanded = expandedWeekIds.has(week.id);
          const WeekIcon = expanded ? ChevronDown : ChevronRight;
          return (
            <article className="rounded-lg border border-slate-200" key={week.id}>
              <button
                aria-expanded={expanded}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
                onClick={() => toggleWeek(week.id)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <WeekIcon aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-500" />
                  <span className="truncate text-lg font-bold">{week.displayName}</span>
                </span>
                <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-bold uppercase text-slate-600">{week.complete ? "Visible" : "Hidden"}</span>
              </button>
              {expanded && week.complete ? (
                <div className="grid gap-4 px-4 pb-4 xl:grid-cols-2">
                  {week.players.map((player) => (
                    <div className="rounded-lg bg-slate-50 p-3" key={player.id}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold">{player.displayName}</p>
                        <p className="text-sm font-black text-slate-700">{player.wins}-{player.losses}{player.ties ? `-${player.ties}` : ""}</p>
                      </div>
                      <div className="mt-2 divide-y divide-slate-200 text-sm">
                        {player.picks.map((pick) => (
                          <div className="grid gap-1 py-2" key={pick.gameId}>
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-slate-700">{pick.matchup}</span>
                              <span className="font-bold text-slate-900">{pick.pickedTeam?.abbreviation ?? "No pick"}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                              <span>{pick.source === "AUTO" ? "Auto-picked" : "Picked"}</span>
                              <span>{pick.finalScore ?? pickResult(pick)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {expanded && !week.complete ? (
                <p className="px-4 pb-4 font-semibold text-slate-500">Picks stay hidden until everyone has picked every game for this week.</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
