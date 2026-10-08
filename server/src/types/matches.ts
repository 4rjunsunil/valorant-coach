export interface MatchRecord {
  matchId: string;
  mapName: string;
  startedAt: string;
  queueName: string | null;
  roundCount: number;
  won: boolean;
  agentName: string;
  score: number;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  bodyshots: number;
  legshots: number;
}

export interface GroupStats {
  name: string;
  matches: number;
  wins: number;
  winRate: number;
  kd: number;
  averageAcs: number;
  headshotPercent: number;
}

export interface PlayerStats {
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  kills: number;
  deaths: number;
  assists: number;
  kd: number;
  averageAcs: number;
  headshotPercent: number;
  byAgent: GroupStats[];
  byMap: GroupStats[];
  recentMatches: MatchRecord[];
}

export interface CoachingReport {
  strengths: string[];
  focusAreas: string[];
  tip: string;
}

export interface CoachRequest {
  name: string;
  tag: string;
  region: string;
  matchCount: number;
}
