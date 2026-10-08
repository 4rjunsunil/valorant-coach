import { createHash } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { env } from "../config/env.js";
import { ReportCache } from "../models/ReportCache.js";
import type {
  CoachingReport,
  PlayerStats,
} from "../types/matches.js";

const reportSchema = z.object({
  strengths: z.array(z.string()).length(3),
  focusAreas: z.array(z.string()).length(3),
  tip: z.string(),
});

const unavailableReport = (message: string) => ({
  available: false,
  message,
  report: null,
});

export type CoachingResult = {
  available: boolean;
  message: string | null;
  report: CoachingReport | null;
};

const cacheKeyForStats = (stats: PlayerStats): string =>
  createHash("sha256").update(JSON.stringify(stats)).digest("hex");

const coachingSummary = (stats: PlayerStats) => ({
  matches: stats.matches,
  wins: stats.wins,
  losses: stats.losses,
  winRate: stats.winRate,
  kills: stats.kills,
  deaths: stats.deaths,
  assists: stats.assists,
  kd: stats.kd,
  averageAcs: stats.averageAcs,
  headshotPercent: stats.headshotPercent,
  byAgent: stats.byAgent,
  byMap: stats.byMap,
});

const geminiErrorStatus = (error: unknown): number | undefined => {
  if (
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }
  return undefined;
};

const geminiRetryDelay = (error: unknown, retryIndex: number): number => {
  if (
    error instanceof Error &&
    "headers" in error &&
    error.headers instanceof Headers
  ) {
    const retryAfter = Number(error.headers.get("retry-after"));
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      return Math.min(retryAfter * 1000, 5000);
    }
  }
  return Math.min(500 * 2 ** retryIndex, 5000);
};

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const generateCoaching = async (
  stats: PlayerStats,
): Promise<CoachingResult> => {
  if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL) {
    return unavailableReport(
      "Add GEMINI_API_KEY and GEMINI_MODEL to the server environment to enable coaching.",
    );
  }

  const cacheKey = cacheKeyForStats(stats);
  const cached = await ReportCache.findOne({
    cacheKey,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (cached) {
    return { available: true, message: null, report: cached.report };
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  let text: string | undefined;
  let requestError: unknown;
  for (let attempt = 0; attempt <= 2; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: env.GEMINI_MODEL,
        config: { responseMimeType: "application/json" },
        contents: [
          "You are a concise Valorant match coach. Use only the JSON stats below; do not calculate, estimate, or invent stats. Return exactly valid JSON with this shape: {\"strengths\":[3 short strings],\"focusAreas\":[3 short strings],\"tip\":\"one specific actionable tip\"}. Keep feedback grounded in the supplied values.",
          JSON.stringify(coachingSummary(stats)),
        ].join("\n\n"),
      });
      text = response.text;
      requestError = undefined;
      break;
    } catch (error) {
      requestError = error;
      const status = geminiErrorStatus(error);
      if ((status !== 429 && status !== 503) || attempt === 2) {
        break;
      }
      await wait(geminiRetryDelay(error, attempt));
    }
  }

  if (requestError) {
    const detail =
      requestError instanceof Error
        ? requestError.message
        : "Unknown Gemini API error";
    const status = geminiErrorStatus(requestError);
    console.error(
      "Gemini request failed:",
      detail.split(env.GEMINI_API_KEY).join("[redacted]"),
    );
    return unavailableReport(
      status === 503
        ? "Gemini is temporarily busy. Your match stats are ready; try generating coaching again shortly."
        : status === 429
          ? "Gemini is rate limited right now. Your match stats are ready; try again shortly."
          : status === 404
            ? "The configured Gemini model is unavailable to this account. Check GEMINI_MODEL in the server environment."
          : "Gemini could not generate coaching. Check the backend logs for the API error.",
    );
  }

  if (!text) {
    console.error("Gemini returned an empty coaching response.");
    return unavailableReport(
      "Gemini returned an empty response. Your match stats are still ready.",
    );
  }

  let report: CoachingReport;
  try {
    report = reportSchema.parse(JSON.parse(text));
  } catch (error) {
    console.error(
      "Gemini response did not match the coaching format:",
      error instanceof Error ? error.message : "Invalid response",
    );
    return unavailableReport(
      "Gemini returned coaching in an unexpected format. Your match stats are still ready.",
    );
  }

  await ReportCache.findOneAndUpdate(
    { cacheKey },
    {
      cacheKey,
      report,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { available: true, message: null, report };
};
