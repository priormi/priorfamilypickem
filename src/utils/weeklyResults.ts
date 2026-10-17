import type { WeeklyResult } from "../types";
import { LEAGUE_TIMEZONE } from "./dates";

const centralDate = new Intl.DateTimeFormat("en-US", {
  timeZone: LEAGUE_TIMEZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric"
});

// Compare Central calendar dates independently of browser timezone and DST.
function calendarDate(value: Date) {
  const parts = centralDate.formatToParts(value);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day"));
}

export function showWeekOnHomepage(week: WeeklyResult, now = new Date()): boolean {
  const picks = week.players.flatMap((player) => player.picks);
  if (!week.complete || !picks.length || picks.some((pick) => pick.status !== "FINAL" && pick.status !== "CANCELED")) return true;

  const lastKickoff = Math.max(...picks.map((pick) => new Date(pick.kickoffAt).getTime()));
  if (!Number.isFinite(lastKickoff)) return true;

  const lastGameDate = calendarDate(new Date(lastKickoff));
  const daysUntilWednesday = (3 - new Date(lastGameDate).getUTCDay() + 7) % 7 || 7;
  const removalDate = lastGameDate + daysUntilWednesday * 24 * 60 * 60 * 1000;
  return calendarDate(now) < removalDate;
}
