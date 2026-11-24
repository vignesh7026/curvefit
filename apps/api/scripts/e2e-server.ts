/**
 * API server for end-to-end tests only. Same app as production, but the notifier records the
 * last OTP so a test can read it from GET /__test/last-otp. Never deploy this file.
 */
import express from "express";
import mongoose from "mongoose";
import { createApp } from "../src/app";
import { loadEnv } from "../src/config/env";
import { createServices } from "../src/services";
import type { Notifier } from "../src/services/notifier";

async function main() {
  const env = loadEnv();
  if (env.NODE_ENV === "production") throw new Error("e2e-server must not run in production");
  await mongoose.connect(env.MONGODB_URI);

  let lastOtp = "";
  // The most recent message of each kind, so tests can follow emailed links.
  const lastMessage: Record<string, Record<string, string>> = {};
  const notifier: Notifier = {
    async send(_to, template, vars = {}) {
      if (template === "otp") lastOtp = vars.code ?? "";
      lastMessage[template] = vars;
      return true;
    },
  };

  const outer = express();
  outer.get("/__test/last-otp", (_req, res) => {
    res.json({ otp: lastOtp });
  });
  outer.get("/__test/last-message/:template", (req, res) => {
    res.json(lastMessage[String(req.params.template)] ?? {});
  });
  outer.use(createApp(env, createServices(env, { notifier })));
  outer.listen(env.PORT, () => console.warn(`e2e api on ${env.PORT}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
