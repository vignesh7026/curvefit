import type { Request, Response } from "express";
import type { SignupInput } from "@curvefit/shared";
import type { Env } from "../config/env";
import type { Services } from "../services";
import type { Session } from "../services/identityService";
import { unauthorized } from "../utils/httpError";

export const CUSTOMER_COOKIE = "cf_cust";
const COOKIE_PATH = "/api/account";

export const accountController = (s: Services, env: Env) => {
  const setCookie = (res: Response, refreshToken: string) =>
    res.cookie(CUSTOMER_COOKIE, refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      path: COOKIE_PATH,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

  const sessionBody = (session: Session, profile: unknown) => ({
    data: { accessToken: session.accessToken, profile },
  });

  return {
    async signup(req: Request, res: Response) {
      const r = await s.identity.signup(req.body as SignupInput);
      setCookie(res, r.refreshToken);
      res.status(201).json(sessionBody(r, r.profile));
    },
    async login(req: Request, res: Response) {
      const { email, password } = req.body as { email: string; password: string };
      const r = await s.identity.customerLogin(email, password);
      setCookie(res, r.refreshToken);
      res.json(sessionBody(r, r.profile));
    },
    async refresh(req: Request, res: Response) {
      const token = (req.cookies as Record<string, string | undefined>)[CUSTOMER_COOKIE];
      if (!token) throw unauthorized();
      const r = await s.identity.customerRefresh(token);
      setCookie(res, r.refreshToken);
      res.json(sessionBody(r, r.profile));
    },
    logout(_req: Request, res: Response) {
      res.clearCookie(CUSTOMER_COOKIE, { path: COOKIE_PATH });
      res.status(204).end();
    },
    async me(req: Request, res: Response) {
      res.json({ data: await s.identity.me(String(req.customer?.id)) });
    },
    async updateMe(req: Request, res: Response) {
      const patch = req.body as { name?: string; phone?: string | null };
      res.json({ data: await s.identity.updateProfile(String(req.customer?.id), patch) });
    },
    async changePassword(req: Request, res: Response) {
      const { currentPassword, newPassword } = req.body as {
        currentPassword: string;
        newPassword: string;
      };
      const session = await s.identity.changePassword(
        String(req.customer?.id),
        currentPassword,
        newPassword,
      );
      setCookie(res, session.refreshToken); // this device stays signed in; others are signed out
      res.json({ data: { accessToken: session.accessToken } });
    },
    async deleteMe(req: Request, res: Response) {
      const { password } = req.body as { password: string };
      await s.identity.deleteAccount(String(req.customer?.id), password);
      res.clearCookie(CUSTOMER_COOKIE, { path: COOKIE_PATH });
      res.status(204).end();
    },
    async verifyEmail(req: Request, res: Response) {
      await s.identity.verifyEmail((req.body as { token: string }).token);
      res.status(204).end();
    },
    async resendVerification(req: Request, res: Response) {
      await s.identity.resendVerification(String(req.customer?.id));
      res
        .status(202)
        .json({ data: { message: "If your email is not verified, we sent a new link" } });
    },
    async orders(req: Request, res: Response) {
      res.json({ data: await s.identity.orders(String(req.customer?.id)) });
    },
    async forgot(req: Request, res: Response) {
      const { type, email } = req.body as { type: "customer" | "staff"; email: string };
      await s.identity.forgotPassword(type, email);
      res
        .status(202)
        .json({ data: { message: "If that email has an account, a reset link is on its way" } });
    },
    async reset(req: Request, res: Response) {
      const { type, token, password } = req.body as {
        type: "customer" | "staff";
        token: string;
        password: string;
      };
      await s.identity.resetPassword(type, token, password);
      res.status(204).end();
    },
  };
};
