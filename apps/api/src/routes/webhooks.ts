import { createHmac, timingSafeEqual } from "node:crypto";
import express, { Router } from "express";
import type { Env } from "../config/env";
import type { Services } from "../services";
import { asyncHandler } from "../utils/asyncHandler";
import { logger } from "../utils/logger";

export function verifyShopifyHmac(rawBody: Buffer, header: string | undefined, secret: string) {
  if (!header || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const given = Buffer.from(header, "base64");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Must be mounted before express.json(): HMAC verification needs the raw body. */
export function buildWebhookRouter(env: Env, services: Services): Router {
  const router = Router();
  router.post(
    "/shopify",
    express.raw({ type: "application/json", limit: "1mb" }),
    asyncHandler(async (req, res) => {
      const raw = req.body as Buffer;
      if (!verifyShopifyHmac(raw, req.get("x-shopify-hmac-sha256"), env.SHOPIFY_WEBHOOK_SECRET)) {
        res
          .status(401)
          .json({ error: { code: "INVALID_SIGNATURE", message: "Invalid signature" } });
        return;
      }
      let payload: unknown;
      try {
        payload = JSON.parse(raw.toString("utf8"));
      } catch {
        res.status(400).json({ error: { code: "INVALID_JSON", message: "Malformed JSON body" } });
        return;
      }
      const topic = req.get("x-shopify-topic") ?? "";
      const fresh = await services.webhooks.handle(topic, req.get("x-shopify-webhook-id"), payload);
      logger.info("shopify webhook", { topic, duplicate: !fresh });
      res.status(200).json({ data: { received: true } });
    }),
  );
  return router;
}
