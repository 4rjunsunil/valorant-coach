import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
});

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  HENRIK_API_KEY: z.string().optional().default(""),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().optional().default(""),
  PORT: z.preprocess(
    (value) => (value === "" || value === undefined ? 4000 : value),
    z.coerce.number().int().positive(),
  ),
  CLIENT_ORIGIN: z.preprocess(
    (value) =>
      value === "" || value === undefined
        ? "http://localhost:5173"
        : value,
    z.string().url(),
  ),
});

export const env = envSchema.parse(process.env);
