import type { ReactNode } from "react";

export function PlayerCard({ name, children }: { name: string; children: ReactNode }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-bold">{name}</h3>
      <div className="mt-2 text-sm text-slate-600">{children}</div>
    </article>
  );
}
