import { PropsWithChildren } from "react";
import { Navigation } from "./Navigation";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-teal-50 text-slate-900">
      <header className="bg-teal-900 px-4 py-4 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-teal-100">NFL Pick'em</p>
            <h1 className="text-lg font-bold">Prior Family Pick'em</h1>
          </div>
        </div>
      </header>
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>
    </div>
  );
}
