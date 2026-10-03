import { useState } from "react";
import { teamLogoUrl } from "../utils/teamLogos";

export function TeamLogo({ abbreviation, name, size = "md" }: { abbreviation: string; name: string; size?: "sm" | "md" | "lg" }) {
  const [failed, setFailed] = useState(false);
  const sizeClass = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-11 w-11";

  return (
    <span className={`${sizeClass} inline-grid shrink-0 place-items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm`}>
      {failed ? (
        <span className="text-xs font-black text-teal-800">{abbreviation}</span>
      ) : (
        <img
          alt={`${name} logo`}
          className="h-full w-full object-contain"
          loading="lazy"
          src={teamLogoUrl(abbreviation)}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
