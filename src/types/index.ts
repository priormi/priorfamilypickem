export interface SessionPlayer {
  id: string;
  displayName: string;
  isAdmin: boolean;
}

export interface Team {
  id: string;
  abbreviation: string;
  city: string;
  name: string;
}

export interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
}

export interface PickGameTeam extends Team {
  record: TeamRecord;
}

export interface PickGame {
  id: string;
  kickoffAt: string;
  status: string;
  locked: boolean;
  selectedTeamId: string | null;
  source: "PLAYER" | "AUTO" | null;
  homeTeam: PickGameTeam;
  awayTeam: PickGameTeam;
}

export interface PickOptionsResponse {
  season: { id: string; year: number; name: string };
  week: { id: string; displayName: string; status: string };
  games: PickGame[];
}

export interface StandingRecord {
  wins: number;
  losses: number;
  ties: number;
  correct: number;
  wrong: number;
  pending: number;
}

export interface DashboardStanding {
  id: string;
  displayName: string;
  isAdmin: boolean;
  record: StandingRecord;
}

export interface WeeklyPickHistory {
  gameId: string;
  kickoffAt: string;
  status: string;
  matchup: string;
  pickedTeam: Team | null;
  source: "PLAYER" | "AUTO" | null;
  correct: boolean | null;
  finalScore: string | null;
}

export interface WeeklyPlayerResult {
  id: string;
  displayName: string;
  wins: number;
  losses: number;
  ties: number;
  pending: number;
  picks: WeeklyPickHistory[];
}

export interface WeeklyResult {
  id: string;
  displayName: string;
  complete: boolean;
  players: WeeklyPlayerResult[];
}

export interface CurrentWeekPickProgress {
  id: string;
  displayName: string;
  submittedPicks: number;
  expectedPicks: number;
}

export interface DashboardResponse {
  season: { id: string; year: number; name: string };
  currentWeek: { id: string | null; displayName: string; status: string; complete: boolean; submittedPicks: number; expectedPicks: number; pickProgress: CurrentWeekPickProgress[] };
  player: SessionPlayer;
  standings: DashboardStanding[];
  weeklyResults: WeeklyResult[];
}
