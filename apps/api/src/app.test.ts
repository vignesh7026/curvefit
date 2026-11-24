import { createHmac } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { recommendSize, sampleCharts } from "@curvefit/shared";
import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { signAccessToken } from "./middleware/auth";
import type { Services } from "./services";
import { notFound } from "./utils/httpError";

const env = loadEnv({
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://localhost/test",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  SHOPIFY_WEBHOOK_SECRET: "whsec",
});

const handled: string[] = [];

const services: Services = {
  size: {
    async getChart(productId) {
      const c = sampleCharts.find((x) => x.productId === productId);
      if (!c) throw notFound("No size chart for this product");
      return c;
    },
    async recommend(req) {
      const chart = sampleCharts.find((x) => x.productId === req.productId);
      if (!chart) throw notFound("No size chart for this product");
      return { ...recommendSize(chart, req.measurements), chart };
    },
    upsertChart: async () => {},
    deleteLog: async () => {},
  },
  reviews: {
    list: async () => [],
    listByStatus: async () => [],
    create: async () => ({ id: "1", status: "pending" }),
    setStatus: async () => {},
    uploadPhoto: async () => ({ url: "http://localhost:4000/uploads/" + "a".repeat(32) + ".png" }),
  },
  fit: {
    create: async () => ({ id: "1" }),
    list: async () => [],
    remove: async () => {},
    suggest: async () => ({
      sessionCount: 0,
      suggestion: { suggestions: [], insufficient: [], warnings: [], opacityFailures: 0 },
      draftChart: sampleCharts[0]!,
    }),
  },
  exchange: {
    requestOtp: async () => {},
    create: async () => ({
      id: "1",
      status: "requested",
      replacementOrder: null,
      courierReference: null,
    }),
    list: async () => [],
    setStatus: async () => {},
    bookPickup: async () => "REF",
  },
  orders: {
    track: async () => {
      throw notFound("We could not find an order with those details");
    },
  },
  waitlist: {
    join: async () => ({ referralCode: "ABCDEFGH" }),
    list: async () => [],
    addRestockAlert: async () => {},
    notifyRestock: async () => 0,
  },
  webhooks: {
    handle: async (topic) => {
      handled.push(topic);
      return true;
    },
  },
  stats: {
    get: async () => ({
      exchanges: { total: 0, byStatus: {}, byKind: {}, withSizeFinder: 0, withoutSizeFinder: 0 },
      reviewsPending: 0,
      savedSizeRecords: 0,
      waitlist: { total: 0, referred: 0 },
    }),
  },
  identity: {} as Services["identity"],
  auth: {
    login: async () => {
      throw new Error("not used");
    },
    refresh: async () => ({ access: "x", role: "admin" as const, name: "A", email: "a@x.com" }),
  },
};

const app = createApp(env, services);
const body = {
  productId: "high-rise-squat-proof-legging",
  measurements: { heightCm: 165, bustCm: 112, waistCm: 100, hipCm: 120 },
};
const staffToken = (role: "admin" | "support") =>
  signAccessToken({ id: "u", role }, env.JWT_ACCESS_SECRET);

describe("POST /api/size", () => {
  it("returns a recommendation", async () => {
    const res = await request(app).post("/api/size").send(body);
    expect(res.status).toBe(200);
    expect(res.body.data.size).toBe("2XL");
  });

  it("rejects unknown fields with a consistent error shape", async () => {
    const res = await request(app)
      .post("/api/size")
      .send({ ...body, admin: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects out-of-bounds measurements", async () => {
    const res = await request(app)
      .post("/api/size")
      .send({ ...body, measurements: { ...body.measurements, hipCm: 5 } });
    expect(res.status).toBe(400);
  });

  it("returns 404 in the standard shape for an unknown product", async () => {
    const res = await request(app)
      .post("/api/size")
      .send({ ...body, productId: "nope" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for malformed JSON and never leaks a stack trace", async () => {
    const res = await request(app)
      .post("/api/size")
      .set("Content-Type", "application/json")
      .send("{bad");
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.ts/);
  });

  it("validates the delete token format", async () => {
    const res = await request(app).delete("/api/size/logs/not-a-token");
    expect(res.status).toBe(400);
  });
});

describe("customer routes validation", () => {
  it("requires toSize for an exchange but not for a return", async () => {
    const base = {
      orderNumber: "1001",
      phone: "9876543210",
      otp: "123456",
      item: "Legging",
      fromSize: "2XL",
    };
    const ex = await request(app).post("/api/exchange").send(base);
    expect(ex.status).toBe(400);
    const ret = await request(app)
      .post("/api/exchange")
      .send({ ...base, kind: "return" });
    expect(ret.status).toBe(201);
  });

  it("requires consent to join the waitlist", async () => {
    const res = await request(app).post("/api/waitlist").send({ email: "a@b.com" });
    expect(res.status).toBe(400);
    const ok = await request(app).post("/api/waitlist").send({ email: "a@b.com", consent: true });
    expect(ok.status).toBe(201);
  });

  it("requires an email or phone for a waitlist signup", async () => {
    const res = await request(app).post("/api/waitlist").send({ consent: true });
    expect(res.status).toBe(400);
  });

  it("returns a generic 404 when tracking finds nothing", async () => {
    const res = await request(app)
      .post("/api/orders/track")
      .send({ orderNumber: "1", phone: "9876543210" });
    expect(res.status).toBe(404);
  });

  it("rejects review filter values that are out of bounds", async () => {
    const res = await request(app).get("/api/reviews/legging?hipCm=3");
    expect(res.status).toBe(400);
  });
});

describe("admin access control", () => {
  it("rejects requests without a token", async () => {
    const res = await request(app).get("/api/admin/exchanges");
    expect(res.status).toBe(401);
  });

  it("rejects a token signed with the wrong secret", async () => {
    const token = signAccessToken({ id: "u", role: "admin" }, "z".repeat(32));
    const res = await request(app)
      .get("/api/admin/exchanges")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("lets support read exchanges, stats and pending reviews", async () => {
    const auth = { Authorization: `Bearer ${staffToken("support")}` };
    for (const path of ["/api/admin/exchanges", "/api/admin/stats", "/api/admin/reviews"]) {
      const res = await request(app).get(path).set(auth);
      expect(res.status, path).toBe(200);
    }
  });

  it("blocks support from admin-only routes", async () => {
    const auth = { Authorization: `Bearer ${staffToken("support")}` };
    const id = "aaaaaaaaaaaaaaaaaaaaaaaa";
    const calls = [
      request(app).patch(`/api/admin/reviews/${id}`).set(auth).send({ status: "approved" }),
      request(app).get("/api/admin/waitlist").set(auth),
      request(app)
        .post("/api/admin/restock/notify")
        .set(auth)
        .send({ productId: "p", size: "XL", productUrl: "https://x.test/p" }),
      request(app).put("/api/admin/size-charts").set(auth).send({}),
    ];
    for (const res of await Promise.all(calls)) expect(res.status).toBe(403);
  });

  it("validates an uploaded size chart for admins", async () => {
    const auth = { Authorization: `Bearer ${staffToken("admin")}` };
    const bad = await request(app)
      .put("/api/admin/size-charts")
      .set(auth)
      .send({ ...sampleCharts[0], bands: [...(sampleCharts[0]?.bands ?? [])].reverse() });
    expect(bad.status).toBe(400);
    const good = await request(app).put("/api/admin/size-charts").set(auth).send(sampleCharts[0]);
    expect(good.status).toBe(204);
  });
});

describe("POST /api/webhooks/shopify", () => {
  const payload = JSON.stringify({ id: 1 });
  const sign = (secret: string) => createHmac("sha256", secret).update(payload).digest("base64");

  it("accepts a correctly signed webhook and passes the topic on", async () => {
    const res = await request(app)
      .post("/api/webhooks/shopify")
      .set("Content-Type", "application/json")
      .set("X-Shopify-Topic", "orders/create")
      .set("X-Shopify-Hmac-Sha256", sign("whsec"))
      .send(payload);
    expect(res.status).toBe(200);
    expect(handled).toContain("orders/create");
  });

  it("rejects a bad signature", async () => {
    const res = await request(app)
      .post("/api/webhooks/shopify")
      .set("Content-Type", "application/json")
      .set("X-Shopify-Hmac-Sha256", sign("wrong"))
      .send(payload);
    expect(res.status).toBe(401);
  });
});

describe("loadEnv", () => {
  it("fails fast on a short secret", () => {
    expect(() =>
      loadEnv({ MONGODB_URI: "x", JWT_ACCESS_SECRET: "short", JWT_REFRESH_SECRET: "b".repeat(32) }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });
});
