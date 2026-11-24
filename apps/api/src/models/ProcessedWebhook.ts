import { Schema, model } from "mongoose";

/** Remembers webhook ids so a retried delivery is not processed twice. */
const processedWebhookSchema = new Schema({
  webhookId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 7 * 24 * 60 * 60 },
});

export const ProcessedWebhookModel = model("ProcessedWebhook", processedWebhookSchema);
