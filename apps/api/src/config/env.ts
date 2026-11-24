import { z } from "zod";

const optional = z.string().default("");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  /** Public URL of the storefront, used in emailed links (verify, reset, invite). */
  WEB_URL: optional,
  /** Public URL of this API, used to build links to uploaded photos. */
  PUBLIC_API_URL: optional,
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  SHOPIFY_STORE_DOMAIN: optional,
  SHOPIFY_ADMIN_TOKEN: optional,
  SHOPIFY_API_VERSION: z.string().default("2025-01"),
  SHOPIFY_WEBHOOK_SECRET: optional,

  // WhatsApp Business Cloud API (order updates, OTP)
  WHATSAPP_PHONE_NUMBER_ID: optional,
  WHATSAPP_TOKEN: optional,
  WHATSAPP_TEMPLATE_LANG: z.string().default("en"),
  // Email via Resend
  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,

  // Shiprocket reverse pickups
  SHIPROCKET_EMAIL: optional,
  SHIPROCKET_PASSWORD: optional,
  WAREHOUSE_NAME: optional,
  WAREHOUSE_ADDRESS: optional,
  WAREHOUSE_CITY: optional,
  WAREHOUSE_STATE: optional,
  WAREHOUSE_PINCODE: optional,
  WAREHOUSE_PHONE: optional,
  WAREHOUSE_EMAIL: optional,

  // Review photos: local disk in development, S3-compatible storage (S3, R2, ...) in production
  UPLOAD_DIR: optional,
  S3_BUCKET: optional,
  S3_REGION: z.string().default("auto"),
  S3_ENDPOINT: optional,
  S3_ACCESS_KEY_ID: optional,
  S3_SECRET_ACCESS_KEY: optional,
  /** Public base URL that serves the bucket, with no trailing slash. */
  S3_PUBLIC_BASE: optional,

  /** Slack-compatible incoming webhook that receives alerts about server errors. */
  ALERT_WEBHOOK_URL: optional,
});

export type Env = z.infer<typeof envSchema>;

/** Validates environment variables once at startup; fails fast with a readable message. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid environment configuration: ${fields}`);
  }
  return parsed.data;
}
