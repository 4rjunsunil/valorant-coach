import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

const coachRequestSchema = z.object({
  name: z.string().trim().min(1).max(32),
  tag: z.string().trim().min(1).max(16),
  region: z.enum(["na", "eu", "ap", "kr", "latam", "br"]),
  matchCount: z.coerce.number().int().min(5).max(20).default(10),
});

export const validateCoachRequest = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const parsed = coachRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: "Enter a valid Riot ID, region, and match count.",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }
  response.locals.coachRequest = parsed.data;
  next();
};
