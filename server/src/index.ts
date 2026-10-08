import mongoose from "mongoose";
import { app } from "./app.js";
import { env } from "./config/env.js";

const startServer = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI);
  app.listen(env.PORT, () => {
    console.log(`Valorant Coach API listening on port ${env.PORT}`);
  });
};

startServer().catch((error: unknown) => {
  console.error(
    "Could not start the API server. Check MONGODB_URI and confirm MongoDB is running.",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
