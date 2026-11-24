import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { alert } from "../utils/alerts";
import { HttpError } from "../utils/httpError";
import { logger } from "../utils/logger";

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
};

/** One error shape for every failure: { error: { code, message, details? } }. No stack traces. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
    return;
  }
  if (err instanceof HttpError) {
    // 5xx we raised on purpose (provider down, not configured) are worth knowing about.
    if (err.status >= 500) {
      void alert(`http-${err.code}`, `${err.code} on ${req.method} ${req.path}`);
    }
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  // Malformed JSON from body-parser
  if (err && typeof err === "object" && (err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: { code: "INVALID_JSON", message: "Malformed JSON body" } });
    return;
  }
  // Body too large (raw image uploads and JSON both end up here)
  if (err && typeof err === "object" && (err as { type?: string }).type === "entity.too.large") {
    res.status(413).json({ error: { code: "TOO_LARGE", message: "Request is too large" } });
    return;
  }
  const name = (err as Error)?.name ?? "Error";
  logger.error("unhandled error", { name, message: (err as Error)?.message, path: req.path });
  // Route and error name only: never the message, which could echo customer input.
  void alert("unhandled", `Unhandled ${name} on ${req.method} ${req.path}`);
  res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong" } });
};
