import rateLimit from "express-rate-limit";

/**
 * Multiplies every limit. Always 1 in real use; the end-to-end tests raise it because they sign
 * in dozens of times from one machine. Never set it in production.
 */
const SCALE = Math.max(1, Number(process.env.RATE_LIMIT_SCALE) || 1);

const make = (windowMs: number, limit: number) =>
  rateLimit({
    windowMs,
    limit: limit * SCALE,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests" } });
    },
  });

export const sizeLimiter = make(60_000, 30);
export const otpLimiter = make(15 * 60_000, 5);
export const loginLimiter = make(15 * 60_000, 10);
export const generalLimiter = make(60_000, 120);

// Refreshing a session happens on every admin page load, so it must not share the tight
// sign-in limit that guards against password guessing.
export const refreshLimiter = make(15 * 60_000, 60);
export const uploadLimiter = make(60_000, 10);
export const clientErrorLimiter = make(60_000, 10);

// Account creation and recovery are the easiest things to abuse, so they get their own, tighter limits.
export const signupLimiter = make(60 * 60_000, 10);
export const recoveryLimiter = make(15 * 60_000, 6);
