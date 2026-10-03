import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { listLoginPlayers, loginPlayer } from "../services/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [players, setPlayers] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listLoginPlayers()
      .then((result) => {
        if (!active) return;
        const names = result.players.map((player) => player.displayName);
        setPlayers(names);
        setDisplayName(names[0] ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load players."))
      .finally(() => active && setLoadingPlayers(false));
    return () => { active = false; };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!displayName) return;
    setLoading(true);
    setError(null);
    try {
      const result = await loginPlayer(displayName, pin);
      auth.setSession(result.token, result.player);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Prior Family Pick'em</p>
      <h2 className="mt-1 text-2xl font-bold">Who's picking?</h2>
      <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Player
          <select className="rounded-lg border border-slate-300 bg-white px-3 py-3" disabled={loadingPlayers || !players.length} value={displayName} onChange={(event) => setDisplayName(event.target.value)}>
            {loadingPlayers ? <option value="">Loading players...</option> : null}
            {!loadingPlayers && !players.length ? <option value="">No players found</option> : null}
            {players.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          PIN
          <input className="rounded-lg border border-slate-300 px-3 py-3 text-lg tracking-widest" inputMode="numeric" type="password" value={pin} onChange={(event) => setPin(event.target.value)} />
        </label>
        {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <button className="rounded-lg bg-teal-700 px-4 py-3 font-bold text-white hover:bg-teal-800 disabled:opacity-60" disabled={loading || loadingPlayers || !displayName}>{loading ? "Signing in..." : "Sign In"}</button>
      </form>
    </section>
  );
}
