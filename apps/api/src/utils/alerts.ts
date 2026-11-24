import { logger } from "./logger";

type FetchLike = typeof fetch;

export interface Alerter {
  /** Posts a short message to the alert channel; the same key is sent at most once a minute. */
  alert(key: string, message: string): Promise<void>;
}

const DEDUPE_MS = 60_000;

/**
 * Sends alerts to a Slack-compatible incoming webhook. Messages must never contain customer
 * data: pass error names, routes and ids only.
 */
export function createAlerter(
  webhookUrl: string,
  fetchImpl: FetchLike = fetch,
  now: () => number = Date.now,
): Alerter {
  const lastSent = new Map<string, number>();
  return {
    async alert(key, message) {
      const t = now();
      const prev = lastSent.get(key);
      if (prev !== undefined && t - prev < DEDUPE_MS) return;
      lastSent.set(key, t);
      try {
        await fetchImpl(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: `[curvefit] ${message.slice(0, 500)}` }),
        });
      } catch {
        logger.error("alert delivery failed", { key });
      }
    },
  };
}

const noop: Alerter = { alert: async () => {} };
let current: Alerter = noop;

/** Called once at startup; until then (and in tests) alerts are dropped. */
export const setAlerter = (a: Alerter | null) => {
  current = a ?? noop;
};

export const alert = (key: string, message: string) => current.alert(key, message);
