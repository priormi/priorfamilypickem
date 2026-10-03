import { type FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { addParticipant, getAdminState, removeParticipant, resetParticipantPin, type AdminState } from "../services/admin";

export function AdminPage() {
  const auth = useAuth();
  const [state, setState] = useState<AdminState | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
  const [resetPins, setResetPins] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.token || !auth.player?.isAdmin) return;
    getAdminState(auth.token).then(setState).catch((err) => setError(err instanceof Error ? err.message : "Unable to load admin."));
  }, [auth.player?.isAdmin, auth.token]);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!auth.token) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const next = await addParticipant(auth.token, displayName, pin);
      setState(next); setMessage(`${displayName.trim()} was added.`); setDisplayName(""); setPin("");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to add participant."); }
    finally { setSaving(false); }
  }

  async function resetPin(playerId: string, name: string) {
    if (!auth.token) return;
    const nextPin = resetPins[playerId] ?? "";
    if (!/^\d{4,8}$/.test(nextPin)) { setError("PIN must be 4 to 8 digits."); return; }
    setBusyId(playerId); setError(null); setMessage(null);
    try {
      const next = await resetParticipantPin(auth.token, playerId, nextPin);
      setState(next); setResetPins((current) => ({ ...current, [playerId]: "" })); setMessage(`${name}'s PIN was reset.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to reset PIN."); }
    finally { setBusyId(null); }
  }

  async function remove(playerId: string, name: string) {
    if (!auth.token || !confirm(`Remove ${name}?`)) return;
    setBusyId(playerId); setError(null); setMessage(null);
    try { const next = await removeParticipant(auth.token, playerId); setState(next); setMessage(`${name} was removed.`); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to remove participant."); }
    finally { setBusyId(null); }
  }

  if (!auth.token) return <Navigate to="/login" replace />;
  if (!auth.player?.isAdmin) return <section className="rounded-lg border border-red-200 bg-red-50 p-5 font-semibold text-red-800">Commissioner access is required.</section>;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-2xl font-bold">Admin</h2>
      {error ? <p className="mt-4 rounded-md bg-red-50 p-3 font-semibold text-red-800">{error}</p> : null}
      {message ? <p className="mt-4 rounded-md bg-green-50 p-3 font-semibold text-green-800">{message}</p> : null}
      {!state ? <p className="mt-4">Loading admin...</p> : <div className="mt-5 grid gap-4">
        <div className="rounded-lg border border-slate-200 p-4"><p className="text-sm font-semibold text-slate-500">Season</p><p className="font-bold">{state.season.name}</p><p className="mt-1 text-sm text-slate-600">Active players: {state.counts.activePlayers}</p></div>
        <form className="rounded-lg border border-slate-200 p-4" onSubmit={handleAdd}>
          <h3 className="font-bold">Add Participant</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_10rem_auto]">
            <input className="rounded-lg border border-slate-300 px-3 py-2" maxLength={40} onChange={(event) => setDisplayName(event.target.value)} placeholder="Name" value={displayName} />
            <input className="rounded-lg border border-slate-300 px-3 py-2" inputMode="numeric" maxLength={8} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} placeholder="PIN" type="password" value={pin} />
            <button className="rounded-lg bg-teal-700 px-4 py-2 font-bold text-white disabled:opacity-60" disabled={saving || !displayName.trim() || pin.length < 4}>Add</button>
          </div>
        </form>
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="font-bold">Participants</h3>
          <div className="mt-3 divide-y divide-slate-100">
            {state.participants.map((participant) => <div className="py-3" key={participant.id}>
              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">{participant.displayName}</p><p className="text-sm text-slate-500">{participant.active ? "Active" : "Inactive"}{participant.isAdmin ? " - Admin" : ""}</p></div>{!participant.isAdmin ? <button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700" disabled={busyId === participant.id} onClick={() => remove(participant.id, participant.displayName)}>Delete</button> : null}</div>
              <form className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3" onSubmit={(event) => { event.preventDefault(); resetPin(participant.id, participant.displayName); }}>
                <label className="grid gap-1 text-sm font-semibold text-slate-700">New PIN<input className="w-32 rounded-lg border border-slate-300 px-3 py-2" inputMode="numeric" maxLength={8} onChange={(event) => setResetPins((current) => ({ ...current, [participant.id]: event.target.value.replace(/\D/g, "") }))} placeholder="4-8 digits" type="password" value={resetPins[participant.id] ?? ""} /></label>
                <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold" disabled={busyId === participant.id || (resetPins[participant.id] ?? "").length < 4}>Reset PIN</button>
              </form>
            </div>)}
          </div>
        </div>
      </div>}
    </section>
  );
}
