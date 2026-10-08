import type { CoachRequest } from "./matches.js";

declare global {
  namespace Express {
    interface Locals {
      coachRequest?: CoachRequest;
    }
  }
}

export {};
