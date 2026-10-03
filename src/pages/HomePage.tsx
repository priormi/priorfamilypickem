import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getDashboard } from "../services/dashboard";
import type { DashboardResponse } from "../types";

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

  const leader = dashboard.standings[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{dashboard.season.name}</p>
        <h2 className="mt-1 text-2xl font-bold">{dashboard.currentWeek.displayName}</h2>
        <p className="mt-3 font-semibold text-teal-700">
          {dashboard.currentWeek.complete ? "All picks are in. Picks are visible." : `${remaining} picks still out. Picks stay hidden until everyone is in.`}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link className="rounded-lg bg-teal-700 px-4 py-3 text-center font-bold text-white hover:bg-teal-800" to="/pick">Make Picks</Link>
          <Link className="rounded-lg border border-slate-300 px-4 py-3 text-center font-bold text-slate-700" to="/standings">View Standings</Link>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold">League Snapshot</h2>
        <div className="mt-4 grid gap-3">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-500">Current Leader</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{leader?.displayName ?? "No leader yet"}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-500">Picks Submitted</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{dashboard.currentWeek.submittedPicks} / {dashboard.currentWeek.expectedPicks}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
