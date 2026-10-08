import type { GroupStats, MatchRecord, PlayerStats } from "../types/matches.js";

const percentage = (part: number, total: number): number =>
  total === 0 ? 0 : Math.round((part / total) * 1000) / 10;

const ratio = (kills: number, deaths: number): number =>
  Math.round((kills / Math.max(deaths, 1)) * 100) / 100;

const summarizeGroup = (
  name: string,
  matches: MatchRecord[],
): GroupStats => {
  const wins = matches.filter((match) => match.won).length;
  const totalKills = matches.reduce((total, match) => total + match.kills, 0);
  const totalDeaths = matches.reduce((total, match) => total + match.deaths, 0);
  const totalRounds = matches.reduce(
    (total, match) => total + match.roundCount,
    0,
  );
  const totalScore = matches.reduce(
    (total, match) => total + match.score,
    0,
  );
  const totalShots = matches.reduce(
    (total, match) => total + match.headshots + match.bodyshots + match.legshots,
    0,
  );
  const headshots = matches.reduce(
    (total, match) => total + match.headshots,
    0,
  );

  return {
    name,
    matches: matches.length,
    wins,
    winRate: percentage(wins, matches.length),
    kd: ratio(totalKills, totalDeaths),
    averageAcs:
      totalRounds === 0 ? 0 : Math.round(totalScore / totalRounds),
    headshotPercent: percentage(headshots, totalShots),
  };
};

const groupMatches = (
  matches: MatchRecord[],
  getName: (match: MatchRecord) => string,
): GroupStats[] => {
  const groups = new Map<string, MatchRecord[]>();

  for (const match of matches) {
    const name = getName(match);
    const group = groups.get(name) ?? [];
    group.push(match);
    groups.set(name, group);
  }

  return [...groups.entries()]
    .map(([name, group]) => summarizeGroup(name, group))
    .sort((left, right) => right.matches - left.matches);
};

export const calculatePlayerStats = (matches: MatchRecord[]): PlayerStats => {
  const aggregate = summarizeGroup("Overall", matches);

  return {
    matches: aggregate.matches,
    wins: aggregate.wins,
    losses: aggregate.matches - aggregate.wins,
    winRate: aggregate.winRate,
    kills: matches.reduce((total, match) => total + match.kills, 0),
    deaths: matches.reduce((total, match) => total + match.deaths, 0),
    assists: matches.reduce((total, match) => total + match.assists, 0),
    kd: aggregate.kd,
    averageAcs: aggregate.averageAcs,
    headshotPercent: aggregate.headshotPercent,
    byAgent: groupMatches(matches, (match) => match.agentName),
    byMap: groupMatches(matches, (match) => match.mapName),
    recentMatches: matches,
  };
};
