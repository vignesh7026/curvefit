import mongoose from "mongoose";
import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { createServices } from "./services";
import { createAlerter, alert, setAlerter } from "./utils/alerts";
import { logger } from "./utils/logger";

async function main() {
  const env = loadEnv();
  if (env.ALERT_WEBHOOK_URL) setAlerter(createAlerter(env.ALERT_WEBHOOK_URL));

  mongoose.connection.on("disconnected", () => {
    logger.error("database disconnected");
    void alert("db-disconnected", "The API lost its database connection");
  });
  await mongoose.connect(env.MONGODB_URI);

  const app = createApp(env, createServices(env));
  app.listen(env.PORT, () => logger.info("api listening", { port: env.PORT }));

  // A crash that nobody sees is the worst kind: report it, then let the host restart us.
  const die = (kind: string) => (err: unknown) => {
    logger.error(kind, { message: (err as Error)?.message });
    void alert(kind, `${kind}: ${(err as Error)?.name ?? "Error"}`).finally(() => process.exit(1));
  };
  process.on("uncaughtException", die("uncaughtException"));
  process.on("unhandledRejection", die("unhandledRejection"));
}

main().catch((err: unknown) => {
  logger.error("failed to start", { message: (err as Error).message });
  process.exit(1);
});
