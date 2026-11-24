import type { Request, Response } from "express";
import type { SizeChart } from "@curvefit/shared";
import type { Env } from "../config/env";
import type { Services } from "../services";
import { unauthorized } from "../utils/httpError";

const REFRESH_COOKIE = "cf_refresh";

export const adminController = (s: Services, env: Env) => ({
  async login(req: Request, res: Response) {
    const { email, password } = req.body as { email: string; password: string };
    const { access, refresh, user, name } = await s.auth.login(email, password);
    res.cookie(REFRESH_COOKIE, refresh, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/admin",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ data: { accessToken: access, role: user.role, name, email } });
  },
  async refresh(req: Request, res: Response) {
    const token = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
    if (!token) throw unauthorized();
    const { access, role, name, email } = await s.auth.refresh(token);
    res.json({ data: { accessToken: access, role, name, email } });
  },
  logout(_req: Request, res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: "/api/admin" });
    res.status(204).end();
  },
  async stats(_req: Request, res: Response) {
    res.json({ data: await s.stats.get() });
  },
  async listExchanges(req: Request, res: Response) {
    const { status } = req.query as { status?: string };
    res.json({ data: await s.exchange.list(status) });
  },
  async updateExchange(req: Request, res: Response) {
    const { status, courierReference } = req.body as { status: string; courierReference?: string };
    await s.exchange.setStatus(String(req.params.id), status, courierReference);
    res.status(204).end();
  },
  async bookPickup(req: Request, res: Response) {
    const reference = await s.exchange.bookPickup(String(req.params.id));
    res.json({ data: { courierReference: reference } });
  },
  async listReviews(req: Request, res: Response) {
    const { status } = req.query as { status?: "pending" | "approved" | "rejected" };
    res.json({ data: await s.reviews.listByStatus(status ?? "pending") });
  },
  async moderateReview(req: Request, res: Response) {
    const { status } = req.body as { status: "approved" | "rejected" };
    await s.reviews.setStatus(String(req.params.id), status);
    res.status(204).end();
  },
  async listWaitlist(_req: Request, res: Response) {
    res.json({ data: await s.waitlist.list() });
  },
  async notifyRestock(req: Request, res: Response) {
    const { productId, size, productUrl } = req.body as {
      productId: string;
      size: string;
      productUrl: string;
    };
    res.json({ data: { notified: await s.waitlist.notifyRestock(productId, size, productUrl) } });
  },
  async invite(req: Request, res: Response) {
    const { email, role } = req.body as { email: string; role: "admin" | "support" };
    res.status(201).json({ data: await s.identity.invite(String(req.user?.id), email, role) });
  },
  async listInvites(_req: Request, res: Response) {
    res.json({ data: await s.identity.listInvites() });
  },
  async revokeInvite(req: Request, res: Response) {
    await s.identity.revokeInvite(String(req.params.id));
    res.status(204).end();
  },
  async inviteInfo(req: Request, res: Response) {
    res.json({ data: await s.identity.inviteInfo((req.body as { token: string }).token) });
  },
  async acceptInvite(req: Request, res: Response) {
    const { token, name, password } = req.body as { token: string; name: string; password: string };
    const r = await s.identity.acceptInvite(token, name, password);
    res.cookie(REFRESH_COOKIE, r.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/admin",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(201).json({ data: { accessToken: r.accessToken, role: r.role, name } });
  },
  async team(_req: Request, res: Response) {
    res.json({ data: await s.identity.team() });
  },
  async upsertChart(req: Request, res: Response) {
    await s.size.upsertChart(req.body as SizeChart);
    res.status(204).end();
  },
});
