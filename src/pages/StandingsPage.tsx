import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getDashboard } from "../services/dashboard";
import type { DashboardResponse } from "../types";

function recordText(record: { wins: number; losses: number; ties: number }) {
  return record.ties ? `${record.wins}-${record.losses}-${record.ties}` : `${record.wins}-${record.losses}`;
}

export function StandingsPage() {
  const auth = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.token) return;
    getDashboard(auth.token).then(setDashboard).catch((err) => setError(err instanceof Error ? err.message : "Unable to load standings."));
  }, [auth.token]);

  if (!auth.token) return <Navigate to="/login" replace />;
  if (error) return <section className="rounded-lg border border-red-200 bg-red-50 p-5 font-semibold text-red-800">{error}</section>;
  if (!dashboard) return <section className="rounded-lg border border-slate-200 bg-white p-5">Loading standings...</section>;

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold">Season Standings</h2>
        <div className="mt-3 divide-y divide-slate-100">
          {dashboard.standings.map((standing, index) => (
            <div className="flex items-center justify-between gap-3 py-3" key={standing.id}>
              <div>
                <p className="font-bold">{index + 1}. {standing.displayName}</p>
                <p className="text-sm text-slate-500">{standing.record.pending} pending</p>
              </div>
              <p className="text-lg font-black text-slate-900">{recordText(standing.record)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold">Weekly Results</h2>
        <div className="mt-4 grid gap-3">
          {dashboard.weeklyResults.map((week) => (
            <article className="rounded-lg border border-slate-200 p-4" key={week.id}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold">{week.displayName}</h3>
                <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold uppercase text-slate-600">{week.complete ? "Visible" : "Hidden"}</span>
              </div>
              <div className="mt-3 divide-y divide-slate-100 text-sm">
                {week.complete
                  ? week.players.map((player) => <p className="flex justify-between py-2" key={player.id}><span>{player.displayName}</span><span className="font-bold">{recordText(player)}</span></p>)
                  : <p className="py-2 font-semibold text-slate-500">Waiting on all picks</p>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
