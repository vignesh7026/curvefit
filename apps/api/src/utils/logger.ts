/**
 * Minimal logger. Callers must pass only non-personal data: never measurements, phone numbers,
 * emails or tokens.
 */
export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(JSON.stringify({ level: "info", msg, ...meta })),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(JSON.stringify({ level: "error", msg, ...meta })),
};
