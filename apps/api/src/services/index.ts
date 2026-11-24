import type { Env } from "../config/env";
import { type AuthService, createAuthService } from "./authService";
import { createCourierService } from "./courierService";
import { type ExchangeService, createExchangeService } from "./exchangeService";
import { type FitService, createFitService } from "./fitService";
import { type IdentityService, createIdentityService } from "./identityService";
import { type Notifier, createNotifier } from "./notifier";
import { type OrderService, createOrderService } from "./orderService";
import { type PhotoStorage, createPhotoStorage } from "./photoStorage";
import { type ReviewService, createReviewService } from "./reviewService";
import { type ShopifyService, createShopifyService } from "./shopifyService";
import { type SizeService, createSizeService } from "./sizeService";
import { type StatsService, createStatsService } from "./statsService";
import { type WaitlistService, createWaitlistService } from "./waitlistService";
import { type WebhookService, createWebhookService } from "./webhookService";

export interface Services {
  size: SizeService;
  fit: FitService;
  reviews: ReviewService;
  exchange: ExchangeService;
  orders: OrderService;
  waitlist: WaitlistService;
  webhooks: WebhookService;
  stats: StatsService;
  auth: AuthService;
  identity: IdentityService;
}

export function createServices(
  env: Env,
  overrides: { notifier?: Notifier; photoStorage?: PhotoStorage; shopify?: ShopifyService } = {},
): Services {
  const shopify = overrides.shopify ?? createShopifyService(env);
  const notifier = overrides.notifier ?? createNotifier(env);
  const courier = createCourierService(env);
  const size = createSizeService();
  return {
    size,
    fit: createFitService(size),
    reviews: createReviewService(overrides.photoStorage ?? createPhotoStorage(env)),
    exchange: createExchangeService(shopify, notifier, courier),
    orders: createOrderService(shopify),
    waitlist: createWaitlistService(notifier),
    webhooks: createWebhookService(notifier),
    stats: createStatsService(),
    auth: createAuthService(env),
    identity: createIdentityService(env, notifier, shopify),
  };
}
