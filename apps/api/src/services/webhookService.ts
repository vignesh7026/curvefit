import { ProcessedWebhookModel } from "../models/ProcessedWebhook";
import { logger } from "../utils/logger";
import type { Notifier } from "./notifier";

interface ShopifyOrderPayload {
  name?: string;
  email?: string | null;
  phone?: string | null;
  shipping_address?: { phone?: string | null } | null;
  fulfillments?: Array<{ tracking_url?: string | null }>;
}

export interface WebhookService {
  /** Returns false when this delivery was already processed. */
  handle(topic: string, webhookId: string | undefined, payload: unknown): Promise<boolean>;
}

export function createWebhookService(notifier: Notifier): WebhookService {
  return {
    async handle(topic, webhookId, payload) {
      if (webhookId) {
        try {
          await ProcessedWebhookModel.create({ webhookId });
        } catch {
          return false; // duplicate key: Shopify retried a delivery we already handled
        }
      }
      const o = (payload ?? {}) as ShopifyOrderPayload;
      const to = { email: o.email, phone: o.phone ?? o.shipping_address?.phone };

      if (topic === "orders/create") {
        await notifier.send(to, "order_confirmed", { order: o.name ?? "" });
      } else if (topic === "orders/fulfilled") {
        await notifier.send(to, "order_shipped", {
          order: o.name ?? "",
          tracking: o.fulfillments?.[0]?.tracking_url ?? "",
        });
      } else {
        logger.info("webhook topic ignored", { topic });
      }
      return true;
    },
  };
}
