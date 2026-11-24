import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import type { Env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { generalLimiter } from "./middleware/rateLimit";
import { buildRouter } from "./routes";
import { buildWebhookRouter } from "./routes/webhooks";
import type { Services } from "./services";
import { uploadDirFor } from "./services/photoStorage";

export function createApp(env: Env, services: Services): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());

  // Review photos saved on local disk (development). Images must be embeddable by the storefront,
  // which is on a different origin, and must never be sniffed as anything else.
  app.use(
    "/uploads",
    (_req, res, next) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      next();
    },
    express.static(uploadDirFor(env), { index: false, dotfiles: "deny", maxAge: "7d" }),
  );

  const allowed = env.CORS_ORIGINS.split(",").map((o) => o.trim());
  app.use(cors({ origin: allowed, credentials: true }));
  app.use(generalLimiter);

  app.use("/api/webhooks", buildWebhookRouter(env, services)); // raw body, before express.json
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use("/api", buildRouter(services, env));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
