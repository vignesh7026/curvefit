/*
 * Purchase tracking for CurveFit: Shopify Customer Events custom pixel.
 *
 * Why this exists: the checkout and thank-you pages are hosted by Shopify, so the storefront code
 * in this repo cannot see a completed purchase. This pixel runs there and sends the `purchase`
 * event to Google Analytics 4 and Meta.
 *
 * How to use it:
 *   1. Shopify admin > Settings > Customer events > Add custom pixel > name it "CurveFit purchase".
 *   2. Paste this whole file, replace the two IDs below, then Save and Connect.
 *   3. Check it: use the pixel's Test option, place a test order, and watch GA4 DebugView
 *      (Admin > DebugView) and Meta Events Manager > Test events for a `purchase` / `Purchase`.
 *   4. Make sure the storefront (this repo) also has NEXT_PUBLIC_GA_ID and
 *      NEXT_PUBLIC_META_PIXEL_ID set to the same IDs, so the funnel and the purchase join up.
 *
 * Consent: if you sell to visitors who require cookie consent, set the pixel's "Customer privacy"
 * options in Shopify (Settings > Customer events) so it only fires after consent. This file does
 * not collect names, emails, phone numbers or addresses.
 *
 * NOT YET RUN against a live store: written to Shopify's documented Web Pixels API
 * (analytics.subscribe, checkout_completed). Expect to adjust field names if Shopify changes them.
 */

const GA4_MEASUREMENT_ID = "G-XXXXXXXXXX"; // replace
const META_PIXEL_ID = "000000000000000"; // replace

// --- Google Analytics 4 (standard gtag loader) ---
const gaScript = document.createElement("script");
gaScript.async = true;
gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
document.head.appendChild(gaScript);
window.dataLayer = window.dataLayer || [];
function gtag() {
  window.dataLayer.push(arguments);
}
gtag("js", new Date());
// send_page_view false: the storefront already reports page views; this pixel only adds purchases.
gtag("config", GA4_MEASUREMENT_ID, { send_page_view: false });

// --- Meta Pixel (standard loader) ---
!(function (f, b, e, v, n, t, s) {
  if (f.fbq) return;
  n = f.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  };
  if (!f._fbq) f._fbq = n;
  n.push = n;
  n.loaded = !0;
  n.version = "2.0";
  n.queue = [];
  t = b.createElement(e);
  t.async = !0;
  t.src = v;
  s = b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t, s);
})(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
fbq("init", META_PIXEL_ID);

// --- The purchase ---
analytics.subscribe("checkout_completed", (event) => {
  const checkout = event.data.checkout;
  const currency = checkout.totalPrice.currencyCode;
  const value = Number(checkout.totalPrice.amount);
  const items = (checkout.lineItems || []).map((line) => ({
    item_id: (line.variant && line.variant.sku) || (line.variant && line.variant.id) || line.title,
    item_name: line.title,
    quantity: line.quantity,
    price: Number(line.finalLinePrice ? line.finalLinePrice.amount : 0) / (line.quantity || 1),
  }));

  // Same event name the storefront uses for its funnel, so GA4 reports line up.
  gtag("event", "purchase", {
    transaction_id: (checkout.order && checkout.order.id) || checkout.token,
    value,
    currency,
    items,
  });

  fbq("track", "Purchase", {
    value,
    currency,
    content_type: "product",
    contents: items.map((i) => ({ id: i.item_id, quantity: i.quantity })),
  });
});
