import { describe, expect, it, vi } from "vitest";
import { loadEnv } from "./config/env";
import { createShiprocketService } from "./services/courierService";
import { createProviderNotifier } from "./services/notifier";
import { createAdminShopifyService, samePhone } from "./services/shopifyService";

const base = {
  NODE_ENV: "test",
  MONGODB_URI: "x",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
};

const bodyOf = (m: { mock: { calls: unknown[][] } }, i: number) =>
  JSON.parse(((m.mock.calls[i] as unknown[])[1] as RequestInit).body as string);

const json = (body: unknown, ok = true) =>
  ({ ok, status: ok ? 200 : 500, json: async () => body }) as Response;

describe("samePhone", () => {
  it("ignores country code, spaces and punctuation", () => {
    expect(samePhone("+91 98765-43210", "9876543210")).toBe(true);
    expect(samePhone("9876543210", "9876543211")).toBe(false);
    expect(samePhone("123", "123")).toBe(false); // too short to trust
  });
});

describe("Shopify Admin adapter (mocked responses)", () => {
  const env = loadEnv({
    ...base,
    SHOPIFY_STORE_DOMAIN: "shop.myshopify.com",
    SHOPIFY_ADMIN_TOKEN: "tok",
  });

  it("maps an order and sends the access token", async () => {
    const fetchMock = vi.fn(async () =>
      json({
        data: {
          orders: {
            nodes: [
              {
                id: "gid://shopify/Order/1",
                name: "#1001",
                phone: null,
                email: "a@x.com",
                displayFulfillmentStatus: "FULFILLED",
                fulfillments: [{ trackingInfo: [{ url: "https://t/1" }] }],
                shippingAddress: {
                  name: "Asha",
                  address1: "1 Road",
                  address2: null,
                  city: "Pune",
                  province: "MH",
                  zip: "411001",
                  phone: "9876543210",
                },
                lineItems: { nodes: [{ title: "Legging", quantity: 1, variantTitle: "2XL" }] },
              },
            ],
          },
        },
      }),
    );
    const svc = createAdminShopifyService(env, fetchMock as unknown as typeof fetch);
    const order = await svc.findOrder("#1001");
    expect(order).toMatchObject({
      orderNumber: "1001",
      phone: "9876543210", // falls back to the shipping phone
      trackingUrl: "https://t/1",
      items: [{ title: "Legging", size: "2XL", quantity: 1 }],
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://shop.myshopify.com/admin/api/2025-01/graphql.json");
    expect((init.headers as Record<string, string>)["X-Shopify-Access-Token"]).toBe("tok");
  });

  it("returns null when no order matches", async () => {
    const svc = createAdminShopifyService(env, (async () =>
      json({ data: { orders: { nodes: [] } } })) as unknown as typeof fetch);
    expect(await svc.findOrder("404")).toBeNull();
  });

  it("reports stock only for available variants and strips quotes from the search", async () => {
    const fetchMock = vi.fn(async () =>
      json({
        data: {
          productVariants: {
            nodes: [
              { id: "v1", availableForSale: false, inventoryQuantity: 0 },
              { id: "v2", availableForSale: true, inventoryQuantity: 3 },
            ],
          },
        },
      }),
    );
    const svc = createAdminShopifyService(env, fetchMock as unknown as typeof fetch);
    expect(await svc.hasStock("Leg' OR title:'x", "3XL")).toBe(true);
    const sent = bodyOf(fetchMock, 0);
    expect(sent.variables.q).not.toMatch(/'\s*OR/);
  });

  it("creates then completes a free draft order for a replacement", async () => {
    const responses = [
      json({
        data: {
          productVariants: { nodes: [{ id: "v2", availableForSale: true, inventoryQuantity: 3 }] },
        },
      }),
      json({ data: { draftOrderCreate: { draftOrder: { id: "d1" }, userErrors: [] } } }),
      json({
        data: { draftOrderComplete: { draftOrder: { order: { name: "#1042" } }, userErrors: [] } },
      }),
    ];
    const fetchMock = vi.fn(async () => responses.shift() as Response);
    const svc = createAdminShopifyService(env, fetchMock as unknown as typeof fetch);
    const name = await svc.createReplacementOrder(
      {
        id: "o",
        orderNumber: "1001",
        phone: "",
        email: "a@x.com",
        status: "",
        trackingUrl: null,
        address: null,
        items: [],
      },
      "Legging",
      "3XL",
    );
    expect(name).toBe("#1042");
    const create = bodyOf(fetchMock, 1);
    expect(create.variables.input.appliedDiscount.value).toBe(100);
  });

  it("surfaces Shopify errors as a 502", async () => {
    const svc = createAdminShopifyService(env, (async () =>
      json({ errors: [{ message: "boom" }] })) as unknown as typeof fetch);
    await expect(svc.findOrder("1")).rejects.toMatchObject({ status: 502 });
  });
});

describe("Shiprocket adapter (mocked responses)", () => {
  const env = loadEnv({
    ...base,
    SHIPROCKET_EMAIL: "e@x.com",
    SHIPROCKET_PASSWORD: "pw",
    WAREHOUSE_NAME: "WH",
  });
  const order = {
    id: "o",
    orderNumber: "1001",
    phone: "",
    email: "a@x.com",
    status: "",
    trackingUrl: null,
    address: {
      name: "Asha",
      address1: "1 Road",
      address2: "",
      city: "Pune",
      province: "MH",
      zip: "411001",
      phone: "9876543210",
    },
    items: [],
  };

  it("logs in once, then books a return and returns the shipment id", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith("/auth/login") ? json({ token: "T" }) : json({ shipment_id: 777 }),
    );
    const svc = createShiprocketService(env, fetchMock as unknown as typeof fetch);
    const req = { exchangeId: "aaaaaaaaaaaaaaaaaaaa1234", order, item: "Legging", size: "2XL" };
    expect(await svc.bookReversePickup(req)).toBe("777");
    await svc.bookReversePickup(req);
    expect(fetchMock.mock.calls.filter((c) => String(c[0]).endsWith("/auth/login"))).toHaveLength(
      1,
    );
  });

  it("refuses when the order has no address", async () => {
    const svc = createShiprocketService(env, vi.fn() as unknown as typeof fetch);
    await expect(
      svc.bookReversePickup({
        exchangeId: "x".repeat(24),
        order: { ...order, address: null },
        item: "a",
        size: "b",
      }),
    ).rejects.toMatchObject({ code: "NO_ADDRESS" });
  });
});

describe("provider notifier (mocked responses)", () => {
  it("sends WhatsApp and email, but never emails an OTP", async () => {
    const env = loadEnv({
      ...base,
      WHATSAPP_PHONE_NUMBER_ID: "123",
      WHATSAPP_TOKEN: "wt",
      RESEND_API_KEY: "rk",
      EMAIL_FROM: "hi@curvefit.test",
    });
    const fetchMock = vi.fn(async () => json({}));
    const n = createProviderNotifier(env, fetchMock as unknown as typeof fetch);

    expect(await n.send({ phone: "9876543210", email: "a@x.com" }, "otp", { code: "123456" })).toBe(
      true,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const wa = bodyOf(fetchMock, 0);
    expect(wa.to).toBe("919876543210");
    expect(wa.template.name).toBe("otp");

    fetchMock.mockClear();
    await n.send({ phone: "9876543210", email: "a@x.com" }, "order_confirmed", { order: "#1" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports false when nothing is configured or a send throws", async () => {
    const none = createProviderNotifier(loadEnv(base), vi.fn() as unknown as typeof fetch);
    expect(await none.send({ phone: "9876543210" }, "otp", { code: "1" })).toBe(false);

    const env = loadEnv({ ...base, RESEND_API_KEY: "rk", EMAIL_FROM: "a@b.c" });
    const boom = createProviderNotifier(env, (async () => {
      throw new Error("network");
    }) as unknown as typeof fetch);
    expect(await boom.send({ email: "a@x.com" }, "order_confirmed", { order: "#1" })).toBe(false);
  });
});
