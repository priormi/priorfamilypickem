import { formatCentralDateTime } from "../utils/dates";

export function Countdown({ deadlineAt }: { deadlineAt: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
      <span className="font-bold uppercase text-slate-500">Lock</span>
      <span className="font-bold text-slate-900">{formatCentralDateTime(deadlineAt)}</span>
    </div>
  );
}
