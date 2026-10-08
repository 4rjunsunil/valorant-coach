import { createHash } from "node:crypto";
import { HttpError } from "../errors/HttpError.js";
import { MatchCache } from "../models/MatchCache.js";
import type { CoachingResult } from "./gemini.js";
import { generateCoaching } from "./gemini.js";
import { fetchMatchHistory } from "./henrik.js";
import { calculatePlayerStats } from "./stats.js";
import type {
  CoachRequest,
  MatchRecord,
  PlayerStats,
} from "../types/matches.js";

export interface CoachResponse {
  player: { name: string; tag: string; region: string };
  stats: PlayerStats;
  coaching: CoachingResult;
}

const matchCacheKey = (input: CoachRequest): string =>
  createHash("sha256")
    .update(
      [
        input.region.toLowerCase(),
        input.name.toLocaleLowerCase(),
        input.tag.toLocaleLowerCase(),
        String(input.matchCount),
      ].join(":"),
    )
    .digest("hex");

const getMatches = async (input: CoachRequest): Promise<MatchRecord[]> => {
  const cacheKey = matchCacheKey(input);
  const cached = await MatchCache.findOne({
    cacheKey,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (cached) {
    return cached.matches;
  }

  const matches = await fetchMatchHistory(
    input.name,
    input.tag,
    input.region,
    input.matchCount,
  );
  await MatchCache.findOneAndUpdate(
    { cacheKey },
    {
      cacheKey,
      matches,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return matches;
};

export const createCoachReport = async (
  input: CoachRequest,
): Promise<CoachResponse> => {
  const matches = await getMatches(input);
  if (matches.length === 0) {
    throw new HttpError("No recent matches were found for that Riot ID.", 404);
  }

  const stats = calculatePlayerStats(matches);
  const coaching = await generateCoaching(stats);
  return {
    player: { name: input.name, tag: input.tag, region: input.region },
    stats,
    coaching,
  };
};
