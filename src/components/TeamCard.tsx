import { TeamLogo } from "./TeamLogo";
import type { Team } from "../types";

export function TeamCard({
  team,
  disabled,
  selected,
  onSelect
}: {
  team: Team;
  disabled?: boolean;
  selected?: boolean;
  onSelect?: (team: Team) => void;
}) {
  const cardClass = selected
    ? "border-teal-700 bg-teal-50 ring-2 ring-teal-100"
    : disabled
      ? "border-slate-200 bg-slate-100 text-slate-500"
      : "border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect?.(team)}
      className={`w-full rounded-lg border p-4 text-left transition disabled:cursor-not-allowed ${cardClass}`}
    >
      <div className="flex items-center gap-3">
        <TeamLogo abbreviation={team.abbreviation} name={`${team.city} ${team.name}`} />
        <div className="min-w-0">
          <p className="font-bold leading-tight">
            {team.city} {team.name}
          </p>
        </div>
      </div>
    </button>
  );
}
