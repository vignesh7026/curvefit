/**
 * First-contact check for the live integrations. Run it after filling in credentials:
 *
 *   npm run check:integrations -w @curvefit/api
 *   npm run check:integrations -w @curvefit/api -- --send-test-email you@example.com
 *
 * Every check is read-only except the optional test email. Nothing is created, changed or
 * charged. Exit code is 1 if any configured service fails, so it can gate a deploy.
 */
import mongoose from "mongoose";
import { loadEnv } from "../src/config/env";

type Result = { name: string; status: "PASS" | "FAIL" | "SKIP" | "WARN"; detail: string };
const results: Result[] = [];
const add = (name: string, status: Result["status"], detail: string) =>
  results.push({ name, status, detail });

async function timed<T>(fn: () => Promise<T>): Promise<T> {
  const ctl = AbortSignal.timeout(15_000);
  return Promise.race([
    fn(),
    new Promise<never>((_, rej) =>
      ctl.addEventListener("abort", () => rej(new Error("timed out"))),
    ),
  ]);
}

async function main() {
  const env = loadEnv();
  const testEmail = process.argv.includes("--send-test-email")
    ? process.argv[process.argv.indexOf("--send-test-email") + 1]
    : undefined;

  // ---- MongoDB
  try {
    await timed(() => mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 }));
    add("MongoDB", "PASS", "connected");
    await mongoose.disconnect();
  } catch (e) {
    add("MongoDB", "FAIL", (e as Error).message);
  }

  // ---- Shopify Admin API
  if (!env.SHOPIFY_STORE_DOMAIN || !env.SHOPIFY_ADMIN_TOKEN) {
    add("Shopify Admin API", "SKIP", "SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_TOKEN not set");
  } else {
    const admin = async (query: string) => {
      const res = await timed(() =>
        fetch(
          `https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": env.SHOPIFY_ADMIN_TOKEN,
            },
            body: JSON.stringify({ query }),
          },
        ),
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        data?: Record<string, unknown>;
        errors?: Array<{ message: string }>;
      };
      if (json.errors?.length) throw new Error(json.errors.map((x) => x.message).join("; "));
      return json.data as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    };
    try {
      const shop = await admin("{ shop { name currencyCode } }");
      add("Shopify Admin: connect", "PASS", `${shop.shop.name} (${shop.shop.currencyCode})`);
      if (shop.shop.currencyCode !== "INR") {
        add(
          "Shopify: currency",
          "WARN",
          `store currency is ${shop.shop.currencyCode}, prices assume INR`,
        );
      }
    } catch (e) {
      add("Shopify Admin: connect", "FAIL", (e as Error).message);
    }
    for (const [label, q] of [
      ["orders (read_orders)", "{ orders(first: 1) { nodes { id } } }"],
      [
        "variants + inventory (read_products, read_inventory)",
        "{ productVariants(first: 1) { nodes { id inventoryQuantity } } }",
      ],
      ["draft orders (write_draft_orders)", "{ draftOrders(first: 1) { nodes { id } } }"],
    ] as const) {
      try {
        await admin(q);
        add(`Shopify scope: ${label}`, "PASS", "readable");
      } catch (e) {
        add(`Shopify scope: ${label}`, "FAIL", (e as Error).message);
      }
    }
    try {
      const d = await admin(
        "{ products(first: 50) { nodes { handle title options { name } variants(first: 20) { nodes { title } } } } }",
      );
      const products = d.products.nodes as Array<{
        handle: string;
        options: Array<{ name: string }>;
        variants: { nodes: Array<{ title: string }> };
      }>;
      const sizes = new Set(["XL", "2XL", "3XL", "4XL", "5XL", "6XL"]);
      const bad = products.filter((p) => !p.variants.nodes.every((v) => sizes.has(v.title)));
      add(
        "Shopify catalogue: variant titles",
        bad.length ? "WARN" : "PASS",
        bad.length
          ? `variant titles are not size labels (XL..6XL) on: ${bad.map((p) => p.handle).join(", ")}`
          : `${products.length} products, all variants named XL..6XL`,
      );
      const need = ["high-rise-squat-proof-legging", "high-impact-sports-bra"];
      const missing = need.filter((h) => !products.some((p) => p.handle === h));
      add(
        "Shopify catalogue: handles",
        missing.length ? "WARN" : "PASS",
        missing.length
          ? `no product with handle: ${missing.join(", ")}`
          : "size-chart handles found",
      );
    } catch (e) {
      add("Shopify catalogue", "FAIL", (e as Error).message);
    }
  }
  add(
    "Payments (Razorpay, COD, PayPal)",
    env.SHOPIFY_STORE_DOMAIN ? "WARN" : "SKIP",
    "the Admin API cannot list payment gateways: follow docs/payments.md and place a test order",
  );
  add(
    "Shopify webhook secret",
    env.SHOPIFY_WEBHOOK_SECRET ? "PASS" : env.SHOPIFY_STORE_DOMAIN ? "FAIL" : "SKIP",
    env.SHOPIFY_WEBHOOK_SECRET
      ? "set"
      : "SHOPIFY_WEBHOOK_SECRET is empty: webhooks will be refused",
  );

  // ---- Shopify Storefront API (used by the web app)
  const sfDomain = env.SHOPIFY_STORE_DOMAIN;
  const sfToken = process.env.SHOPIFY_STOREFRONT_TOKEN;
  if (!sfDomain || !sfToken) {
    add("Shopify Storefront API", "SKIP", "SHOPIFY_STOREFRONT_TOKEN not set in this environment");
  } else {
    try {
      const res = await timed(() =>
        fetch(`https://${sfDomain}/api/${env.SHOPIFY_API_VERSION}/graphql.json`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Storefront-Access-Token": sfToken,
          },
          body: JSON.stringify({
            query:
              "{ products(first: 1) { nodes { handle variants(first: 1) { nodes { id availableForSale } } } } }",
          }),
        }),
      );
      const json = (await res.json()) as { errors?: unknown[] };
      add(
        "Shopify Storefront API",
        res.ok && !json.errors ? "PASS" : "FAIL",
        res.ok && !json.errors ? "products readable" : `HTTP ${res.status}`,
      );
    } catch (e) {
      add("Shopify Storefront API", "FAIL", (e as Error).message);
    }
  }

  // ---- Shiprocket
  if (!env.SHIPROCKET_EMAIL || !env.SHIPROCKET_PASSWORD) {
    add("Shiprocket", "SKIP", "SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD not set");
  } else {
    try {
      const res = await timed(() =>
        fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: env.SHIPROCKET_EMAIL, password: env.SHIPROCKET_PASSWORD }),
        }),
      );
      const json = (await res.json()) as { token?: string };
      add(
        "Shiprocket: login",
        res.ok && json.token ? "PASS" : "FAIL",
        res.ok && json.token ? "token issued" : `HTTP ${res.status}`,
      );
    } catch (e) {
      add("Shiprocket: login", "FAIL", (e as Error).message);
    }
    const wh = [
      "WAREHOUSE_NAME",
      "WAREHOUSE_ADDRESS",
      "WAREHOUSE_CITY",
      "WAREHOUSE_STATE",
      "WAREHOUSE_PINCODE",
      "WAREHOUSE_PHONE",
      "WAREHOUSE_EMAIL",
    ] as const;
    const empty = wh.filter((k) => !env[k]);
    add(
      "Shiprocket: warehouse address",
      empty.length ? "FAIL" : "PASS",
      empty.length ? `empty: ${empty.join(", ")}` : "complete",
    );
    add(
      "Shiprocket: reverse pickup",
      "WARN",
      "booking is not tested here (it would create a real pickup): place one test return from the admin panel",
    );
  }

  // ---- WhatsApp Business Cloud API
  if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_TOKEN) {
    add("WhatsApp", "SKIP", "WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_TOKEN not set");
  } else {
    try {
      const res = await timed(() =>
        fetch(
          `https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,quality_rating`,
          { headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` } },
        ),
      );
      const json = (await res.json()) as { display_phone_number?: string; verified_name?: string };
      add(
        "WhatsApp: phone number",
        res.ok ? "PASS" : "FAIL",
        res.ok
          ? `${json.verified_name ?? ""} ${json.display_phone_number ?? ""}`.trim()
          : `HTTP ${res.status}`,
      );
      add(
        "WhatsApp: templates",
        "WARN",
        "approval is not checked here: confirm otp, order_confirmed, order_shipped, exchange_requested, pickup_booked, back_in_stock, waitlist_welcome are approved in Meta Business Manager",
      );
    } catch (e) {
      add("WhatsApp: phone number", "FAIL", (e as Error).message);
    }
  }

  // ---- Email (Resend)
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    add("Email (Resend)", "SKIP", "RESEND_API_KEY / EMAIL_FROM not set");
  } else if (!testEmail) {
    add(
      "Email (Resend)",
      "WARN",
      "keys are set; run with --send-test-email you@example.com to send a real test message",
    );
  } else {
    try {
      const res = await timed(() =>
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: env.EMAIL_FROM,
            to: [testEmail],
            subject: "CurveFit integration check",
            text: "If you can read this, email sending works.",
          }),
        }),
      );
      add(
        "Email (Resend): test send",
        res.ok ? "PASS" : "FAIL",
        res.ok ? `sent to ${testEmail}` : `HTTP ${res.status}`,
      );
    } catch (e) {
      add("Email (Resend): test send", "FAIL", (e as Error).message);
    }
  }

  // ---- Photo storage
  const s3 =
    env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY && env.S3_PUBLIC_BASE;
  add(
    "Photo storage",
    s3 ? "PASS" : env.NODE_ENV === "production" ? "FAIL" : "SKIP",
    s3
      ? "S3-compatible storage configured (upload is not tested here)"
      : "S3_* not set: local disk is used in development; production needs object storage",
  );

  // ---- Alerts
  if (!env.ALERT_WEBHOOK_URL) {
    add(
      "Alert webhook",
      env.NODE_ENV === "production" ? "FAIL" : "SKIP",
      "ALERT_WEBHOOK_URL not set: server errors will not be reported",
    );
  } else {
    try {
      const res = await timed(() =>
        fetch(env.ALERT_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "[curvefit] integration check: alerts are working" }),
        }),
      );
      add(
        "Alert webhook",
        res.ok ? "PASS" : "FAIL",
        res.ok ? "test message sent" : `HTTP ${res.status}`,
      );
    } catch (e) {
      add("Alert webhook", "FAIL", (e as Error).message);
    }
  }

  // ---- Report
  const width = Math.max(...results.map((r) => r.name.length));
  for (const r of results)
    console.warn(`${r.status.padEnd(4)}  ${r.name.padEnd(width)}  ${r.detail}`);
  const failed = results.filter((r) => r.status === "FAIL").length;
  const skipped = results.filter((r) => r.status === "SKIP").length;
  console.warn(
    `\n${results.length - failed - skipped} ok or warning, ${failed} failed, ${skipped} not configured`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
