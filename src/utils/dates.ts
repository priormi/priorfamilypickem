export const LEAGUE_TIMEZONE = "America/Chicago";

export function formatCentralDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: LEAGUE_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(new Date(value));
}

export function hasDeadlinePassed(deadlineAt: string, now = new Date()): boolean {
  return now.getTime() >= new Date(deadlineAt).getTime();
}
