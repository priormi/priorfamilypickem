export function StrikeBadge({ strikes }: { strikes: number }) {
  return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">{strikes} of 2 strikes</span>;
}
