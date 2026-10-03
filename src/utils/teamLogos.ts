const ESPN_LOGO_CODES: Record<string, string> = {
  WAS: "wsh"
};

export function teamLogoUrl(abbreviation: string) {
  const code = ESPN_LOGO_CODES[abbreviation] ?? abbreviation.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${code}.png`;
}
