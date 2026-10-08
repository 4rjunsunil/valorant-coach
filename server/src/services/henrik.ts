import { z } from "zod";
import { env } from "../config/env.js";
import { HttpError } from "../errors/HttpError.js";
import type { MatchRecord } from "../types/matches.js";

const playerSchema = z.object({
  name: z.string(),
  tag: z.string(),
  team_id: z.string(),
  agent: z.object({ name: z.string() }),
  stats: z.object({
    score: z.number().default(0),
    kills: z.number().default(0),
    deaths: z.number().default(0),
    assists: z.number().default(0),
    headshots: z.number().default(0),
    bodyshots: z.number().default(0),
    legshots: z.number().default(0),
  }),
});

const matchSchema = z.object({
  metadata: z.object({
    match_id: z.string(),
    map: z.object({ name: z.string() }),
    started_at: z.string(),
    queue: z.object({ name: z.string().nullable().optional() }).optional(),
  }),
  players: z.array(playerSchema),
  teams: z.array(z.object({ team_id: z.string(), won: z.boolean() })),
  rounds: z.array(z.unknown()).default([]),
});

const responseSchema = z.object({
  status: z.number(),
  data: z.array(matchSchema),
});

const retryDelay = (response: Response, retryIndex: number): number => {
  const retryAfter = Number(response.headers.get("retry-after"));
  const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
    ? retryAfter * 1000
    : 500 * 2 ** retryIndex;
  return Math.min(delayMs, 5000);
};

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const fetchMatchHistory = async (
  name: string,
  tag: string,
  region: string,
  size: number,
): Promise<MatchRecord[]> => {
  if (!env.HENRIK_API_KEY) {
    throw new HttpError(
      "Match history is unavailable until HENRIK_API_KEY is configured.",
      503,
    );
  }

  const path = [
    "valorant",
    "v4",
    "matches",
    encodeURIComponent(region),
    "pc",
    encodeURIComponent(name),
    encodeURIComponent(tag),
  ].join("/");
  const url = new URL(path, "https://api.henrikdev.xyz/");
  url.searchParams.set("size", String(size));

  let response: Response | undefined;
  for (let attempt = 0; attempt <= 2; attempt += 1) {
    try {
      response = await fetch(url, {
        headers: { Authorization: env.HENRIK_API_KEY },
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new HttpError("Could not connect to the match history service.", 502);
    }

    if (response.status !== 429 || attempt === 2) {
      break;
    }
    await wait(retryDelay(response, attempt));
  }

  if (!response) {
    throw new HttpError("The match history service returned no response.", 502);
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new HttpError(
        "No match history was found for that Riot ID and region.",
        404,
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new HttpError(
        "The HenrikDev API key was rejected. Check HENRIK_API_KEY.",
        502,
      );
    }
    if (response.status === 429) {
      throw new HttpError(
        "The match history service is rate limited. Please try again shortly.",
        503,
      );
    }
    throw new HttpError(
      "The match history service could not complete the request.",
      502,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new HttpError("The match history service returned invalid JSON.", 502);
  }
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new HttpError(
      "The match history service returned data in an unexpected format.",
      502,
    );
  }

  return parsed.data.data.flatMap((match): MatchRecord[] => {
    const player = match.players.find(
      (candidate) =>
        candidate.name.toLocaleLowerCase() === name.toLocaleLowerCase() &&
        candidate.tag.toLocaleLowerCase() === tag.toLocaleLowerCase(),
    );
    if (!player) {
      return [];
    }

    const result = match.teams.find(
      (team) => team.team_id === player.team_id,
    );
    return [{
      matchId: match.metadata.match_id,
      mapName: match.metadata.map.name,
      startedAt: match.metadata.started_at,
      queueName: match.metadata.queue?.name ?? null,
      roundCount: match.rounds.length,
      won: result?.won ?? false,
      agentName: player.agent.name,
      score: player.stats.score,
      kills: player.stats.kills,
      deaths: player.stats.deaths,
      assists: player.stats.assists,
      headshots: player.stats.headshots,
      bodyshots: player.stats.bodyshots,
      legshots: player.stats.legshots,
    }];
  });
};
