import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { HttpError } from "./errors/HttpError.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { coachRoutes } from "./routes/coachRoutes.js";

export const app = express();

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  env.CLIENT_ORIGIN,
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new HttpError("Origin is not allowed by CORS.", 403));
    },
  }),
);
app.use(express.json({ limit: "10kb" }));
app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});
app.use(
  "/api/coach",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many coach requests. Please wait a minute." },
  }),
  coachRoutes,
);
app.use(errorHandler);
