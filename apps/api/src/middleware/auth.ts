import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { forbidden, unauthorized } from "../utils/httpError";

export type Role = "admin" | "support";
export type Audience = "customer" | "staff";

export interface AuthUser {
  id: string;
  role: Role;
}

export interface CustomerPrincipal {
  id: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
    customer?: CustomerPrincipal;
  }
}

type AccessSubject = AuthUser | { id: string; role: "customer" };

export function signAccessToken(user: AccessSubject, secret: string): string {
  return jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: "15m" });
}

/**
 * Refresh tokens carry an audience so a customer token can never refresh a staff session, and a
 * version so changing a password logs out every other device.
 */
export function signRefreshToken(
  subject: { id: string; tokenVersion: number },
  audience: Audience,
  secret: string,
): string {
  return jwt.sign({ sub: subject.id, tv: subject.tokenVersion }, secret, {
    expiresIn: "7d",
    audience,
  });
}

export function verifyRefreshToken(
  token: string,
  audience: Audience,
  secret: string,
): { id: string; tokenVersion: number } {
  const p = jwt.verify(token, secret, { audience }) as jwt.JwtPayload;
  if (typeof p.sub !== "string") throw new Error("bad token");
  return { id: p.sub, tokenVersion: typeof p.tv === "number" ? p.tv : 0 };
}

/** Verifies the bearer access token for staff routes. Customer tokens are refused. */
export const requireAuth =
  (secret: string): RequestHandler =>
  (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return next(unauthorized());
    try {
      const payload = jwt.verify(header.slice(7), secret) as jwt.JwtPayload;
      if (
        typeof payload.sub !== "string" ||
        (payload.role !== "admin" && payload.role !== "support")
      ) {
        return next(unauthorized("Invalid token"));
      }
      req.user = { id: payload.sub, role: payload.role };
      next();
    } catch {
      next(unauthorized("Invalid or expired token"));
    }
  };

/** Verifies the bearer access token for customer account routes. Staff tokens are refused. */
export const requireCustomer =
  (secret: string): RequestHandler =>
  (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return next(unauthorized());
    try {
      const payload = jwt.verify(header.slice(7), secret) as jwt.JwtPayload;
      if (typeof payload.sub !== "string" || payload.role !== "customer") {
        return next(unauthorized("Invalid token"));
      }
      req.customer = { id: payload.sub };
      next();
    } catch {
      next(unauthorized("Invalid or expired token"));
    }
  };

/** Role-based access control; use after requireAuth. */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
