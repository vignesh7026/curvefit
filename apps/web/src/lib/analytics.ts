export type AnalyticsEvent =
  | "view_item"
  | "quiz_start"
  | "quiz_complete"
  | "size_recommended"
  | "add_to_cart"
  | "begin_checkout"
  | "purchase"
  | "exchange_request"
  | "review_submitted";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

// Meta Pixel standard events for the ones that map to an ad-optimisation signal.
const META_EVENT: Partial<Record<AnalyticsEvent, string>> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
};

/**
 * Sends a GA4 event (and the matching Meta Pixel event). Never pass measurements or other
 * personal data in params.
 */
export function track(event: AnalyticsEvent, params: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", event, params);
  const meta = META_EVENT[event];
  if (meta) window.fbq?.("track", meta, params);
}
