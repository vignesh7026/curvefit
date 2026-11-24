import express, { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import {
  acceptInviteSchema,
  changePasswordSchema,
  deleteAccountSchema,
  exchangeRequestSchema,
  fitSessionSchema,
  forgotPasswordSchema,
  inviteSchema,
  profileUpdateSchema,
  resetPasswordSchema,
  signupSchema,
  tokenOnlySchema,
  loginSchema,
  otpRequestSchema,
  restockAlertSchema,
  reviewInputSchema,
  reviewListQuerySchema,
  sizeChartSchema,
  sizeRequestSchema,
  trackRequestSchema,
  waitlistSchema,
} from "@curvefit/shared";
import type { Env } from "../config/env";
import { accountController } from "../controllers/accountController";
import { adminController } from "../controllers/adminController";
import { exchangeController } from "../controllers/exchangeController";
import { fitController } from "../controllers/fitController";
import { orderController } from "../controllers/orderController";
import { reviewController } from "../controllers/reviewController";
import { sizeController } from "../controllers/sizeController";
import { waitlistController } from "../controllers/waitlistController";
import { requireAuth, requireCustomer, requireRole } from "../middleware/auth";
import {
  clientErrorLimiter,
  loginLimiter,
  otpLimiter,
  recoveryLimiter,
  refreshLimiter,
  signupLimiter,
  sizeLimiter,
  uploadLimiter,
} from "../middleware/rateLimit";
import { validate } from "../middleware/validate";
import type { Services } from "../services";
import { MAX_PHOTO_BYTES } from "../services/photoStorage";
import { alert } from "../utils/alerts";
import { asyncHandler as h } from "../utils/asyncHandler";
import { logger } from "../utils/logger";
import {
  exchangeListQuery,
  exchangeUpdateBody,
  idParams,
  productIdParams,
  restockNotifyBody,
  reviewModerationBody,
  reviewStatusQuery,
  tokenParams,
} from "../validators/params";

const clientErrorBody = z
  .object({
    message: z.string().max(300),
    digest: z.string().max(100).optional(),
    path: z.string().max(200),
  })
  .strict();

export function buildRouter(services: Services, env: Env): Router {
  const router = Router();
  const size = sizeController(services);
  const reviews = reviewController(services);
  const exchange = exchangeController(services);
  const orders = orderController(services);
  const waitlist = waitlistController(services);
  const fit = fitController(services);
  const admin = adminController(services, env);
  const account = accountController(services, env);
  const customer = requireCustomer(env.JWT_ACCESS_SECRET);
  const staff = [requireAuth(env.JWT_ACCESS_SECRET), requireRole("admin", "support")];
  const adminOnly = [requireAuth(env.JWT_ACCESS_SECRET), requireRole("admin")];

  // Uptime checks use this: 503 when the database connection is down.
  router.get("/health", (_req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({ data: { status: dbUp ? "ok" : "degraded", db: dbUp } });
  });

  // Browser error reports from the storefront: a log line and an alert, no personal data.
  router.post(
    "/client-errors",
    clientErrorLimiter,
    validate({ body: clientErrorBody }),
    h(async (req, res) => {
      const { message, digest, path } = req.body as z.infer<typeof clientErrorBody>;
      logger.error("storefront error", { message, digest, path });
      void alert(`client-${path}`, `Storefront error on ${path}: ${message.slice(0, 120)}`);
      res.status(204).end();
    }),
  );

  // Size finder
  router.post("/size", sizeLimiter, validate({ body: sizeRequestSchema }), h(size.recommend));
  router.get("/size/:productId", validate({ params: productIdParams }), h(size.chart));
  router.delete(
    "/size/logs/:token",
    sizeLimiter,
    validate({ params: tokenParams }),
    h(size.deleteLog),
  );

  // Fit-tagged reviews and their photos
  router.get(
    "/reviews/:productId",
    validate({ params: productIdParams, query: reviewListQuerySchema }),
    h(reviews.list),
  );
  router.post("/reviews", sizeLimiter, validate({ body: reviewInputSchema }), h(reviews.create));
  router.post(
    "/reviews/photos",
    uploadLimiter,
    express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: MAX_PHOTO_BYTES }),
    h(reviews.uploadPhoto),
  );

  // Order tracking, exchange and returns (phone + OTP verified)
  router.post("/orders/track", otpLimiter, validate({ body: trackRequestSchema }), h(orders.track));
  router.post(
    "/exchange/otp",
    otpLimiter,
    validate({ body: otpRequestSchema }),
    h(exchange.requestOtp),
  );
  router.post(
    "/exchange",
    otpLimiter,
    validate({ body: exchangeRequestSchema }),
    h(exchange.create),
  );

  // Pre-launch
  router.post("/waitlist", sizeLimiter, validate({ body: waitlistSchema }), h(waitlist.join));
  router.post(
    "/restock-alerts",
    sizeLimiter,
    validate({ body: restockAlertSchema }),
    h(waitlist.restock),
  );

  // Customer accounts
  router.post(
    "/account/signup",
    signupLimiter,
    validate({ body: signupSchema }),
    h(account.signup),
  );
  router.post("/account/login", loginLimiter, validate({ body: loginSchema }), h(account.login));
  router.post("/account/refresh", refreshLimiter, h(account.refresh));
  router.post("/account/logout", account.logout);
  router.get("/account/me", customer, h(account.me));
  router.patch(
    "/account/me",
    customer,
    validate({ body: profileUpdateSchema }),
    h(account.updateMe),
  );
  router.delete(
    "/account/me",
    customer,
    loginLimiter,
    validate({ body: deleteAccountSchema }),
    h(account.deleteMe),
  );
  router.post(
    "/account/password",
    customer,
    loginLimiter,
    validate({ body: changePasswordSchema }),
    h(account.changePassword),
  );
  router.post(
    "/account/verify-email",
    recoveryLimiter,
    validate({ body: tokenOnlySchema }),
    h(account.verifyEmail),
  );
  router.post(
    "/account/resend-verification",
    customer,
    recoveryLimiter,
    h(account.resendVerification),
  );
  router.get("/account/orders", customer, h(account.orders));

  // Password recovery (customers and staff)
  router.post(
    "/auth/forgot",
    recoveryLimiter,
    validate({ body: forgotPasswordSchema }),
    h(account.forgot),
  );
  router.post(
    "/auth/reset",
    recoveryLimiter,
    validate({ body: resetPasswordSchema }),
    h(account.reset),
  );

  // Staff
  router.post("/admin/login", loginLimiter, validate({ body: loginSchema }), h(admin.login));
  router.post("/admin/refresh", refreshLimiter, h(admin.refresh));
  router.post("/admin/logout", admin.logout);
  // Staff accounts are created by invitation only: nobody can sign themselves up as staff.
  router.post(
    "/admin/invite-info",
    recoveryLimiter,
    validate({ body: tokenOnlySchema }),
    h(admin.inviteInfo),
  );
  router.post(
    "/admin/accept-invite",
    signupLimiter,
    validate({ body: acceptInviteSchema }),
    h(admin.acceptInvite),
  );
  router.get("/admin/team", ...adminOnly, h(admin.team));
  router.get("/admin/invites", ...adminOnly, h(admin.listInvites));
  router.post("/admin/invites", ...adminOnly, validate({ body: inviteSchema }), h(admin.invite));
  router.delete(
    "/admin/invites/:id",
    ...adminOnly,
    validate({ params: idParams }),
    h(admin.revokeInvite),
  );
  router.get("/admin/stats", ...staff, h(admin.stats));
  router.get(
    "/admin/exchanges",
    ...staff,
    validate({ query: exchangeListQuery }),
    h(admin.listExchanges),
  );
  router.patch(
    "/admin/exchanges/:id",
    ...staff,
    validate({ params: idParams, body: exchangeUpdateBody }),
    h(admin.updateExchange),
  );
  router.post(
    "/admin/exchanges/:id/book-pickup",
    ...staff,
    validate({ params: idParams }),
    h(admin.bookPickup),
  );
  router.get(
    "/admin/reviews",
    ...staff,
    validate({ query: reviewStatusQuery }),
    h(admin.listReviews),
  );
  router.patch(
    "/admin/reviews/:id",
    ...adminOnly,
    validate({ params: idParams, body: reviewModerationBody }),
    h(admin.moderateReview),
  );
  router.get("/admin/waitlist", ...adminOnly, h(admin.listWaitlist));
  router.post(
    "/admin/restock/notify",
    ...adminOnly,
    validate({ body: restockNotifyBody }),
    h(admin.notifyRestock),
  );
  router.put(
    "/admin/size-charts",
    ...adminOnly,
    validate({ body: sizeChartSchema }),
    h(admin.upsertChart),
  );

  // Fit sessions: record fittings, then draft a size chart from them
  router.post("/admin/fit-sessions", ...staff, validate({ body: fitSessionSchema }), h(fit.create));
  router.get(
    "/admin/fit-sessions/:productId",
    ...staff,
    validate({ params: productIdParams }),
    h(fit.list),
  );
  router.get(
    "/admin/fit-sessions/:productId/suggest",
    ...staff,
    validate({ params: productIdParams }),
    h(fit.suggest),
  );
  router.delete(
    "/admin/fit-sessions/:id",
    ...adminOnly,
    validate({ params: idParams }),
    h(fit.remove),
  );

  return router;
}
