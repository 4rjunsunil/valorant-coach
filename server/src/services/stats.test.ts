import { describe, expect, it } from "vitest";
import { calculatePlayerStats } from "./stats.js";
import type { MatchRecord } from "../types/matches.js";

const sampleMatch: MatchRecord = {
  matchId: "match-1",
  mapName: "Ascent",
  startedAt: "2026-10-08T00:00:00Z",
  queueName: "Competitive",
  roundCount: 20,
  won: true,
  agentName: "Jett",
  score: 4200,
  kills: 24,
  deaths: 18,
  assists: 4,
  headshots: 30,
  bodyshots: 20,
  legshots: 10,
};

describe("calculatePlayerStats", () => {
  it("returns complete zeroed stats for no matches", () => {
    expect(calculatePlayerStats([])).toEqual({
      matches: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      kd: 0,
      averageAcs: 0,
      headshotPercent: 0,
      byAgent: [],
      byMap: [],
      recentMatches: [],
    });
  });

  it("calculates totals and weighted per-round averages", () => {
    const secondMatch = {
      ...sampleMatch,
      matchId: "match-2",
      roundCount: 10,
      won: false,
      agentName: "Sage",
      mapName: "Haven",
      score: 1800,
      kills: 12,
      deaths: 6,
      assists: 8,
      headshots: 9,
      bodyshots: 15,
      legshots: 6,
    };

    const stats = calculatePlayerStats([sampleMatch, secondMatch]);

    expect(stats).toMatchObject({
      matches: 2,
      wins: 1,
      losses: 1,
      winRate: 50,
      kills: 36,
      deaths: 24,
      assists: 12,
      kd: 1.5,
      averageAcs: 200,
      headshotPercent: 43.3,
    });
    expect(stats.byAgent).toHaveLength(2);
    expect(stats.byMap.map((map) => map.name)).toEqual(["Ascent", "Haven"]);
  });

  it("handles partial match data and zero deaths without invalid ratios", () => {
    const partialMatch = {
      ...sampleMatch,
      roundCount: 0,
      deaths: 0,
      headshots: 0,
      bodyshots: 0,
      legshots: 0,
    };

    const stats = calculatePlayerStats([partialMatch]);

    expect(stats.kd).toBe(24);
    expect(stats.averageAcs).toBe(0);
    expect(stats.headshotPercent).toBe(0);
  });
});
