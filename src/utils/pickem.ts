export function pickResult(pickedTeamId: string, winnerTeamId: string | null, isTie = false) {
  if (isTie) return "tie";
  if (!winnerTeamId) return "pending";
  return pickedTeamId === winnerTeamId ? "win" : "loss";
}
