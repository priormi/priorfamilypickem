import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getDashboard } from "../services/dashboard";
import type { DashboardResponse } from "../types";

function recordText(record: { wins: number; losses: number; ties: number }) {
  return record.ties ? `${record.wins}-${record.losses}-${record.ties}` : `${record.wins}-${record.losses}`;
}

export function HomePage() {
  const auth = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.token) return;
    getDashboard(auth.token).then(setDashboard).catch((err) => setError(err instanceof Error ? err.message : "Unable to load dashboard."));
  }, [auth.token]);

  if (!auth.token) return <Navigate to="/login" replace />;
  if (error) return <section className="rounded-lg border border-red-200 bg-red-50 p-5 font-semibold text-red-800">{error}</section>;
  if (!dashboard) return <section className="rounded-lg border border-slate-200 bg-white p-5">Loading league...</section>;

  const remaining = Math.max(0, dashboard.currentWeek.expectedPicks - dashboard.currentWeek.submittedPicks);
  const myPickProgress = dashboard.currentWeek.pickProgress.find((participant) => participant.id === dashboard.player.id);
  const pickButtonText = myPickProgress && myPickProgress.expectedPicks > 0 && myPickProgress.submittedPicks >= myPickProgress.expectedPicks ? "Change Picks" : "Make Picks";
  const lastCompletedWeek = [...dashboard.weeklyResults].reverse().find((week) => week.complete);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{dashboard.season.name}</p>
        <h2 className="mt-1 text-2xl font-bold">{dashboard.currentWeek.displayName}</h2>
        <p className="mt-3 font-semibold text-teal-700">
          {dashboard.currentWeek.complete ? "All picks are in. Picks are visible." : `${remaining} picks still out. Picks stay hidden until everyone is in.`}
        </p>
        <div className="mt-5">
          <Link className="block rounded-lg bg-teal-700 px-4 py-3 text-center font-bold text-white hover:bg-teal-800" to="/pick">{pickButtonText}</Link>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold">Who has made their picks</h2>
        <div className="mt-4 grid gap-3">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-500">Picks Submitted</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{dashboard.currentWeek.submittedPicks} / {dashboard.currentWeek.expectedPicks}</p>
            <div className="mt-4 divide-y divide-slate-200">
              {dashboard.currentWeek.pickProgress.map((participant) => (
                <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0" key={participant.id}>
                  <span className="min-w-0 truncate font-semibold text-slate-700">{participant.displayName}</span>
                  <span className="shrink-0 rounded bg-white px-2 py-1 text-sm font-black text-slate-900">
                    {participant.submittedPicks} / {participant.expectedPicks}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:col-span-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
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
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-bold">Season Standings</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Through {lastCompletedWeek?.displayName ?? "no completed weeks"}</p>
          <div className="mt-3 divide-y divide-slate-100">
            {dashboard.standings.map((standing, index) => (
              <div className="flex items-center justify-between gap-3 py-3" key={standing.id}>
                <Link className="font-bold text-teal-700 hover:text-teal-800 hover:underline" to={`/history?player=${standing.id}`}>
                  {index + 1}. {standing.displayName}
                </Link>
                <p className="text-lg font-black text-slate-900">{recordText(standing.record)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
