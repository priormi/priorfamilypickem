import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { TeamLogo } from "../components/TeamLogo";
import { useAuth } from "../hooks/useAuth";
import { getPickOptions, submitPicks } from "../services/picks";
import type { PickGame, PickOptionsResponse } from "../types";

function formatKickoff(kickoffAt: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago", timeZoneName: "short" }).format(new Date(kickoffAt));
}

function recordText(record: { wins: number; losses: number; ties: number }) {
  return record.ties ? `${record.wins}-${record.losses}-${record.ties}` : `${record.wins}-${record.losses}`;
}

function GameCard({ game, selectedTeamId, onPick }: { game: PickGame; selectedTeamId?: string; onPick: (gameId: string, teamId: string) => void }) {
  const teams = [game.awayTeam, game.homeTeam];
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-700">{formatKickoff(game.kickoffAt)}</p>
        <span className="rounded bg-white px-2 py-1 text-xs font-bold uppercase text-slate-500">{game.locked ? "Locked" : game.status}</span>
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-center">
        {teams.map((team, index) => {
          const selected = selectedTeamId === team.id;
          return (
            <button
              className={`flex items-center gap-3 rounded-lg border p-3 text-left transition disabled:cursor-not-allowed ${selected ? "border-teal-700 bg-teal-50 ring-2 ring-teal-100" : game.locked ? "border-slate-200 bg-slate-100 text-slate-500" : "border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50"}`}
              disabled={game.locked}
              key={team.id}
              onClick={() => onPick(game.id, team.id)}
              type="button"
            >
              <TeamLogo abbreviation={team.abbreviation} name={`${team.city} ${team.name}`} />
              <div className="min-w-0">
                <p className="font-bold leading-tight">{team.city} {team.name}</p>
                <p className="text-sm font-semibold text-slate-500">{recordText(team.record)}</p>
              </div>
            </button>
          );
        }).flatMap((node, index) => index === 0 ? [node, <span className="self-center px-2 text-center text-sm font-black text-slate-400" key="at">AT</span>] : [node])}
      </div>
    </article>
  );
}

export function MakePickPage() {
  const auth = useAuth();
  const [options, setOptions] = useState<PickOptionsResponse | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedDialogOpen, setSavedDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.token) return;
    getPickOptions(auth.token).then((result) => {
      setOptions(result);
      setSelected(Object.fromEntries(result.games.filter((game) => game.selectedTeamId).map((game) => [game.id, game.selectedTeamId as string])));
    }).catch((err) => setError(err instanceof Error ? err.message : "Unable to load games."));
  }, [auth.token]);

  const unlockedGames = useMemo(() => options?.games.filter((game) => !game.locked) ?? [], [options]);
  const ready = unlockedGames.every((game) => selected[game.id]);

  async function save() {
    if (!auth.token || !options) return;
    setSaving(true);
    setError(null);
    setSavedDialogOpen(false);
    try {
      const picks = unlockedGames.map((game) => ({ gameId: game.id, teamId: selected[game.id] })).filter((pick) => pick.teamId);
      await submitPicks(auth.token, picks);
      const refreshed = await getPickOptions(auth.token);
      setOptions(refreshed);
      setSavedDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save picks.");
    } finally {
      setSaving(false);
    }
  }

  if (!auth.token) return <Navigate to="/login" replace />;
  if (error && !options) return <section className="rounded-lg border border-red-200 bg-red-50 p-5 font-semibold text-red-800">{error}</section>;
  if (!options) return <section className="rounded-lg border border-slate-200 bg-white p-5">Loading games...</section>;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-2xl font-bold">Make Picks</h2><p className="mt-1 text-slate-600">{options.week.displayName}</p></div>
        <Link className="rounded-lg border border-slate-300 px-4 py-2 font-bold text-slate-700" to="/">Dashboard</Link>
      </div>
      {error ? <p className="mt-4 rounded-md bg-red-50 p-3 font-semibold text-red-800">{error}</p> : null}
      <div className="mt-4 grid gap-3">
        {options.games.map((game) => <GameCard game={game} key={game.id} selectedTeamId={selected[game.id]} onPick={(gameId, teamId) => setSelected((current) => ({ ...current, [gameId]: teamId }))} />)}
      </div>
      <div className="sticky bottom-0 -mx-5 mt-5 border-t border-slate-200 bg-white p-5">
        <button className="w-full rounded-lg bg-teal-700 px-4 py-3 font-bold text-white hover:bg-teal-800 disabled:opacity-60" disabled={saving || !ready || !unlockedGames.length} onClick={save}>{saving ? "Saving..." : "Save Picks"}</button>
      </div>
      {savedDialogOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4" role="dialog" aria-modal="true" aria-labelledby="picks-saved-title">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl">
            <h3 className="text-2xl font-black text-slate-900" id="picks-saved-title">Picks Saved</h3>
            <p className="mt-2 text-slate-600">Your picks have been saved.</p>
            <button
              autoFocus
              className="mt-5 w-full rounded-lg bg-teal-700 px-4 py-3 text-lg font-bold text-white hover:bg-teal-800"
              onClick={() => setSavedDialogOpen(false)}
              type="button"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
