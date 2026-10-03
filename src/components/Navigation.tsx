import { LogOut } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const links = [
  ["/", "Home"],
  ["/pick", "Pick"],
  ["/standings", "Standings"],
  ["/history", "History"],
  ["/admin", "Admin"]
];

export function Navigation() {
  const auth = useAuth();
  const navigate = useNavigate();
  const visibleLinks = links.filter(([to]) => to !== "/admin" || auth.player?.isAdmin);

  function handleLogout() {
    auth.clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 gap-1 overflow-x-auto">
          {visibleLinks.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `border-b-2 px-4 py-3 text-sm font-semibold ${isActive ? "border-teal-700 text-teal-700" : "border-transparent text-slate-600"}`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
        {auth.token ? (
          <button
            aria-label="Log out"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            onClick={handleLogout}
            type="button"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Logout
          </button>
        ) : null}
      </div>
    </nav>
  );
}
