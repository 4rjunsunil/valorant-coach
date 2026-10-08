import { model, Schema } from "mongoose";
import type { CoachingReport } from "../types/matches.js";

interface ReportCacheDocument {
  cacheKey: string;
  report: CoachingReport;
  expiresAt: Date;
}

const reportCacheSchema = new Schema<ReportCacheDocument>(
  {
    cacheKey: { type: String, required: true, unique: true },
    report: { type: Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

reportCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ReportCache = model<ReportCacheDocument>(
  "ReportCache",
  reportCacheSchema,
);
