import { PropsWithChildren } from "react";
import { useAuth } from "../hooks/useAuth";
import { Navigation } from "./Navigation";

export function AppShell({ children }: PropsWithChildren) {
  const auth = useAuth();

  return (
    <div className="min-h-screen bg-teal-50 text-slate-900">
      <header className="bg-teal-900 px-4 py-4 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-2xl font-black sm:text-3xl">Prior Family Pick'em</h1>
          {auth.player ? <p className="text-sm font-semibold text-teal-100">Logged in as: {auth.player.displayName}</p> : null}
        </div>
      </header>
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>
    </div>
  );
}
