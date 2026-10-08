import { Router } from "express";
import { coachController } from "../controllers/coachController.js";
import { validateCoachRequest } from "../middleware/validate.js";

export const coachRoutes = Router();

coachRoutes.post("/", validateCoachRequest, coachController);
