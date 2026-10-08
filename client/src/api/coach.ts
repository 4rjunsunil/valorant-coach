import type {
  CoachResponse,
  GroupStats,
  MatchRecord,
  PlayerStats,
} from "../types";

export interface CoachRequest {
  name: string;
  tag: string;
  region: string;
  matchCount: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isCoachingReport = (
  value: unknown,
): value is NonNullable<CoachResponse["coaching"]["report"]> =>
  isRecord(value) &&
  isStringArray(value.strengths) &&
  isStringArray(value.focusAreas) &&
  typeof value.tip === "string";

const isGroupStats = (value: unknown): value is GroupStats =>
  isRecord(value) &&
  typeof value.name === "string" &&
  isNumber(value.matches) &&
  isNumber(value.wins) &&
  isNumber(value.winRate) &&
  isNumber(value.kd) &&
  isNumber(value.averageAcs) &&
  isNumber(value.headshotPercent);

const isMatchRecord = (value: unknown): value is MatchRecord =>
  isRecord(value) &&
  typeof value.matchId === "string" &&
  typeof value.mapName === "string" &&
  typeof value.startedAt === "string" &&
  (typeof value.queueName === "string" || value.queueName === null) &&
  isNumber(value.roundCount) &&
  typeof value.won === "boolean" &&
  typeof value.agentName === "string" &&
  isNumber(value.score) &&
  isNumber(value.kills) &&
  isNumber(value.deaths) &&
  isNumber(value.assists) &&
  isNumber(value.headshots) &&
  isNumber(value.bodyshots) &&
  isNumber(value.legshots);

const isPlayerStats = (value: unknown): value is PlayerStats =>
  isRecord(value) &&
  isNumber(value.matches) &&
  isNumber(value.wins) &&
  isNumber(value.losses) &&
  isNumber(value.winRate) &&
  isNumber(value.kills) &&
  isNumber(value.deaths) &&
  isNumber(value.assists) &&
  isNumber(value.kd) &&
  isNumber(value.averageAcs) &&
  isNumber(value.headshotPercent) &&
  Array.isArray(value.byAgent) &&
  value.byAgent.every(isGroupStats) &&
  Array.isArray(value.byMap) &&
  value.byMap.every(isGroupStats) &&
  Array.isArray(value.recentMatches) &&
  value.recentMatches.every(isMatchRecord);

const parseCoachResponse = (value: unknown): CoachResponse | null => {
  if (!isRecord(value)) {
    return null;
  }

  const player = value.player;
  const stats = value.stats;
  const coaching = value.coaching;
  if (
    !isRecord(player) ||
    typeof player.name !== "string" ||
    typeof player.tag !== "string" ||
    typeof player.region !== "string" ||
    !isPlayerStats(stats) ||
    !isRecord(coaching)
  ) {
    return null;
  }

  const available = coaching.available;
  const message = coaching.message;
  const report = coaching.report;
  if (
    typeof available !== "boolean" ||
    !(typeof message === "string" || message === null) ||
    report !== null &&
    !isCoachingReport(report)
  ) {
    return null;
  }

  return {
    player: {
      name: player.name,
      tag: player.tag,
      region: player.region,
    },
    stats,
    coaching: {
      available,
      message,
      report:
        report === null
          ? null
          : {
              strengths: report.strengths,
              focusAreas: report.focusAreas,
              tip: report.tip,
            },
    },
  };
};

export const requestCoachReport = async (
  request: CoachRequest,
): Promise<CoachResponse> => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
  const response = await fetch(`${apiBaseUrl}/api/coach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("The server returned an unreadable response.");
  }

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.error === "string"
        ? payload.error
        : "Could not load your match report.";
    throw new Error(message);
  }

  const report = parseCoachResponse(payload);
  if (!report) {
    throw new Error("The server returned match data in an unexpected format.");
  }
  return report;
};
