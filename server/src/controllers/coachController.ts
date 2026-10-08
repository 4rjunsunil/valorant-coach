import type { RequestHandler } from "express";
import { createCoachReport } from "../services/coach.js";
import { HttpError } from "../errors/HttpError.js";
import type { CoachRequest } from "../types/matches.js";

export const coachController: RequestHandler = async (
  _request,
  response,
  next,
) => {
  try {
    const input = response.locals.coachRequest;
    if (!input) {
      throw new HttpError("Coach request validation was not completed.", 500);
    }
    const result = await createCoachReport(input);
    response.json(result);
  } catch (error) {
    next(error);
  }
};
