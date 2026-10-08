import { model, Schema } from "mongoose";
import type { MatchRecord } from "../types/matches.js";

interface MatchCacheDocument {
  cacheKey: string;
  matches: MatchRecord[];
  expiresAt: Date;
}

const cachedMatchSchema = new Schema<MatchRecord>(
  {
    matchId: { type: String, required: true },
    mapName: { type: String, required: true },
    startedAt: { type: String, required: true },
    queueName: { type: String, default: null },
    roundCount: { type: Number, required: true },
    won: { type: Boolean, required: true },
    agentName: { type: String, required: true },
    score: { type: Number, required: true },
    kills: { type: Number, required: true },
    deaths: { type: Number, required: true },
    assists: { type: Number, required: true },
    headshots: { type: Number, required: true },
    bodyshots: { type: Number, required: true },
    legshots: { type: Number, required: true },
  },
  { _id: false },
);

const matchCacheSchema = new Schema<MatchCacheDocument>(
  {
    cacheKey: { type: String, required: true, unique: true },
    matches: { type: [cachedMatchSchema], required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

matchCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const MatchCache = model<MatchCacheDocument>(
  "MatchCache",
  matchCacheSchema,
);
