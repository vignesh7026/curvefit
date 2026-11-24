import { tmpdir } from "node:os";
import { createLocalStorage } from "./services/photoStorage";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleLegging } from "@curvefit/shared";
import { OtpChallengeModel } from "./models/OtpChallenge";
import { ExchangeRequestModel } from "./models/ExchangeRequest";
import { ReviewModel } from "./models/Review";
import { SizeFinderLogModel } from "./models/SizeFinderLog";
import { WaitlistModel } from "./models/Waitlist";
import type { CourierService } from "./services/courierService";
import { createExchangeService } from "./services/exchangeService";
import type { Notifier, Template } from "./services/notifier";
import { createOrderService } from "./services/orderService";
import { createReviewService } from "./services/reviewService";
import type { ShopifyOrder, ShopifyService } from "./services/shopifyService";
import { createSizeService } from "./services/sizeService";
import { createStatsService } from "./services/statsService";
import { createWaitlistService } from "./services/waitlistService";
import { createWebhookService } from "./services/webhookService";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
  await mongoose.connect(mongod.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({})));
});

const order: ShopifyOrder = {
  id: "gid://shopify/Order/1",
  orderNumber: "1001",
  phone: "+91 98765 43210",
  email: "a@example.com",
  status: "FULFILLED",
  trackingUrl: "https://track.example/1",
  address: {
    name: "Asha",
    address1: "1 Road",
    address2: "",
    city: "Pune",
    province: "MH",
    zip: "411001",
    phone: "9876543210",
  },
  items: [{ title: "Legging", size: "2XL", quantity: 1 }],
};

function fakes(opts: { stock?: boolean; courierFails?: boolean } = {}) {
  const sent: Array<{ template: Template; vars: Record<string, string> }> = [];
  const notifier: Notifier = {
    async send(_to, template, vars = {}) {
      sent.push({ template, vars });
      return true;
    },
  };
  const shopify: ShopifyService = {
    findOrder: async (n) => (n.replace("#", "") === "1001" ? order : null),
    findOrdersByEmail: async () => [order],
    hasStock: async () => opts.stock ?? true,
    createReplacementOrder: vi.fn(async () => "#1042"),
  };
  const courier: CourierService = {
    bookReversePickup: vi.fn(async () => {
      if (opts.courierFails) throw new Error("courier down");
      return "SHIP-1";
    }),
  };
  return { sent, notifier, shopify, courier };
}

/** Requests an OTP and reads it back from what the notifier "sent". */
async function otpFor(f: ReturnType<typeof fakes>, svc: ReturnType<typeof createExchangeService>) {
  await svc.requestOtp("1001", "9876543210");
  return f.sent.filter((s) => s.template === "otp").at(-1)?.vars.code ?? "";
}

const exchangeInput = (otp: string) => ({
  kind: "exchange" as const,
  orderNumber: "1001",
  phone: "9876543210",
  otp,
  item: "Legging",
  fromSize: "2XL",
  toSize: "3XL",
  sizeFinderUsed: true,
});

describe("size service", () => {
  it("stores nothing without consent", async () => {
    const svc = createSizeService();
    const r = await svc.recommend({
      productId: sampleLegging.productId,
      measurements: { heightCm: 165, bustCm: 112, waistCm: 100, hipCm: 120 },
      consentToStore: false,
    });
    expect(r.deleteToken).toBeUndefined();
    expect(await SizeFinderLogModel.countDocuments()).toBe(0);
  });

  it("stores with consent and the token deletes it", async () => {
    const svc = createSizeService();
    const r = await svc.recommend({
      productId: sampleLegging.productId,
      measurements: { heightCm: 165, bustCm: 112, waistCm: 100, hipCm: 120 },
      consentToStore: true,
    });
    expect(r.deleteToken).toMatch(/^[a-f0-9]{48}$/);
    expect(await SizeFinderLogModel.countDocuments()).toBe(1);
    await svc.deleteLog("0".repeat(48)); // wrong token deletes nothing
    expect(await SizeFinderLogModel.countDocuments()).toBe(1);
    await svc.deleteLog(r.deleteToken as string);
    expect(await SizeFinderLogModel.countDocuments()).toBe(0);
  });

  it("prefers a database chart over the sample and 404s for unknown products", async () => {
    const svc = createSizeService();
    await svc.upsertChart({ ...sampleLegging, stretchNote: "custom note" });
    expect((await svc.getChart(sampleLegging.productId)).stretchNote).toBe("custom note");
    await expect(svc.getChart("nope")).rejects.toThrow(/No size chart/);
  });
});

describe("review service", () => {
  const base = {
    productId: "legging",
    rating: 5,
    fit: "true_to_size" as const,
    body: "",
    photoUrls: [],
  };

  it("holds new reviews for moderation and filters people like me", async () => {
    const svc = createReviewService(createLocalStorage(tmpdir(), "http://api.test"));
    const a = await svc.create({ ...base, sizeWorn: "3XL", heightCm: 165, hipCm: 127 });
    const b = await svc.create({ ...base, sizeWorn: "XL", heightCm: 190, hipCm: 100 });
    expect(await svc.list("legging", {})).toHaveLength(0); // pending
    await svc.setStatus(a.id, "approved");
    await svc.setStatus(b.id, "approved");
    expect(await svc.list("legging", {})).toHaveLength(2);
    expect(await svc.list("legging", { size: "3XL" })).toHaveLength(1);
    const alike = await svc.list("legging", { heightCm: 168, hipCm: 125 });
    expect(alike).toHaveLength(1);
    expect(await svc.listByStatus("approved")).toHaveLength(2);
    await expect(svc.setStatus("aaaaaaaaaaaaaaaaaaaaaaaa", "approved")).rejects.toThrow();
    expect(await ReviewModel.countDocuments({ status: "approved" })).toBe(2);
  });
});

describe("exchange service", () => {
  it("runs the full exchange: OTP, replacement order, pickup, notifications", async () => {
    const f = fakes();
    const svc = createExchangeService(f.shopify, f.notifier, f.courier);
    const result = await svc.create(exchangeInput(await otpFor(f, svc)));
    expect(result).toMatchObject({
      status: "pickup_booked",
      replacementOrder: "#1042",
      courierReference: "SHIP-1",
    });
    expect(f.sent.map((s) => s.template)).toEqual(["otp", "exchange_requested", "pickup_booked"]);
    const doc = await ExchangeRequestModel.findById(result.id);
    expect(doc?.sizeFinderUsed).toBe(true);
  });

  it("does not send an OTP for an unknown order or a wrong phone", async () => {
    const f = fakes();
    const svc = createExchangeService(f.shopify, f.notifier, f.courier);
    await svc.requestOtp("9999", "9876543210");
    await svc.requestOtp("1001", "9000000000");
    expect(f.sent).toHaveLength(0);
  });

  it("rejects a wrong code and locks out after 5 attempts", async () => {
    const f = fakes();
    const svc = createExchangeService(f.shopify, f.notifier, f.courier);
    const code = await otpFor(f, svc);
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) {
      await expect(svc.create(exchangeInput(wrong))).rejects.toMatchObject({ code: "INVALID_OTP" });
    }
    // Even the right code is refused after too many failures.
    await expect(svc.create(exchangeInput(code))).rejects.toMatchObject({ code: "INVALID_OTP" });
  });

  it("makes a code single-use", async () => {
    const f = fakes();
    const svc = createExchangeService(f.shopify, f.notifier, f.courier);
    const code = await otpFor(f, svc);
    await svc.create(exchangeInput(code));
    expect(await OtpChallengeModel.countDocuments()).toBe(0);
    await expect(svc.create(exchangeInput(code))).rejects.toMatchObject({ code: "INVALID_OTP" });
  });

  it("allows only one free exchange per order, but a return is still possible", async () => {
    const f = fakes();
    const svc = createExchangeService(f.shopify, f.notifier, f.courier);
    await svc.create(exchangeInput(await otpFor(f, svc)));
    await expect(svc.create(exchangeInput(await otpFor(f, svc)))).rejects.toMatchObject({
      status: 409,
      code: "ALREADY_EXCHANGED",
    });
    const ret = await svc.create({
      ...exchangeInput(await otpFor(f, svc)),
      kind: "return",
      toSize: undefined,
    });
    expect(ret.replacementOrder).toBeNull();
  });

  it("refuses an out-of-stock size before saving anything", async () => {
    const f = fakes({ stock: false });
    const svc = createExchangeService(f.shopify, f.notifier, f.courier);
    await expect(svc.create(exchangeInput(await otpFor(f, svc)))).rejects.toMatchObject({
      code: "OUT_OF_STOCK",
    });
    expect(await ExchangeRequestModel.countDocuments()).toBe(0);
  });

  it("keeps the request when the courier is down and lets staff retry", async () => {
    const f = fakes({ courierFails: true });
    const svc = createExchangeService(f.shopify, f.notifier, f.courier);
    const r = await svc.create(exchangeInput(await otpFor(f, svc)));
    expect(r.status).toBe("requested");
    expect(r.replacementOrder).toBe("#1042");
    expect(f.sent.map((s) => s.template)).not.toContain("pickup_booked");

    f.courier.bookReversePickup = vi.fn(async () => "SHIP-2");
    expect(await svc.bookPickup(r.id)).toBe("SHIP-2");
    expect((await ExchangeRequestModel.findById(r.id))?.status).toBe("pickup_booked");
  });

  it("lets staff update status and rejects unknown ids", async () => {
    const f = fakes();
    const svc = createExchangeService(f.shopify, f.notifier, f.courier);
    const r = await svc.create(exchangeInput(await otpFor(f, svc)));
    await svc.setStatus(r.id, "received", "X");
    expect(await svc.list("received")).toHaveLength(1);
    await expect(svc.setStatus("aaaaaaaaaaaaaaaaaaaaaaaa", "received")).rejects.toThrow();
  });
});

describe("order tracking", () => {
  it("returns status for a matching phone and a generic 404 otherwise", async () => {
    const svc = createOrderService(fakes().shopify);
    const t = await svc.track("#1001", "+919876543210");
    expect(t).toMatchObject({ status: "FULFILLED", trackingUrl: "https://track.example/1" });
    await expect(svc.track("1001", "9000000000")).rejects.toThrow(/could not find/);
    await expect(svc.track("5555", "9876543210")).rejects.toThrow(/could not find/);
  });
});

describe("waitlist and restock alerts", () => {
  it("issues a code, counts referrals and is idempotent per contact", async () => {
    const f = fakes();
    const svc = createWaitlistService(f.notifier);
    const a = await svc.join({ email: "A@x.com", interestedSizes: [], consent: true });
    expect(a.referralCode).toMatch(/^[A-Z2-9]{8}$/);
    const again = await svc.join({ email: "a@x.com", interestedSizes: [], consent: true });
    expect(again.referralCode).toBe(a.referralCode);
    await svc.join({
      phone: "9876543210",
      interestedSizes: ["3XL"],
      referredBy: a.referralCode,
      consent: true,
    });
    expect((await WaitlistModel.findOne({ referralCode: a.referralCode }))?.referrals).toBe(1);
    expect(await WaitlistModel.countDocuments()).toBe(2);
  });

  it("notifies each restock alert once", async () => {
    const f = fakes();
    const svc = createWaitlistService(f.notifier);
    await svc.addRestockAlert({
      productId: "legging",
      size: "4XL",
      email: "a@x.com",
      consent: true,
    });
    await svc.addRestockAlert({
      productId: "legging",
      size: "XL",
      email: "b@x.com",
      consent: true,
    });
    expect(await svc.notifyRestock("legging", "4XL", "https://shop.test/legging")).toBe(1);
    expect(await svc.notifyRestock("legging", "4XL", "https://shop.test/legging")).toBe(0);
  });
});

describe("webhook service", () => {
  it("notifies on order events and ignores a retried delivery", async () => {
    const f = fakes();
    const svc = createWebhookService(f.notifier);
    const payload = {
      name: "#1050",
      email: "a@x.com",
      fulfillments: [{ tracking_url: "https://t/1" }],
    };
    expect(await svc.handle("orders/create", "wh-1", payload)).toBe(true);
    expect(await svc.handle("orders/create", "wh-1", payload)).toBe(false);
    expect(await svc.handle("orders/fulfilled", "wh-2", payload)).toBe(true);
    expect(await svc.handle("products/update", "wh-3", payload)).toBe(true);
    expect(f.sent.map((s) => s.template)).toEqual(["order_confirmed", "order_shipped"]);
    expect(f.sent[1]?.vars.tracking).toBe("https://t/1");
  });
});

describe("stats service", () => {
  it("compares exchange counts with and without the size finder", async () => {
    const f = fakes();
    const ex = createExchangeService(f.shopify, f.notifier, f.courier);
    await ex.create(exchangeInput(await otpFor(f, ex)));
    await ExchangeRequestModel.create({
      orderId: "o2",
      orderNumber: "2",
      item: "x",
      fromSize: "XL",
      toSize: "2XL",
      sizeFinderUsed: false,
    });
    const s = await createStatsService().get();
    expect(s.exchanges.total).toBe(2);
    expect(s.exchanges.withSizeFinder).toBe(1);
    expect(s.exchanges.withoutSizeFinder).toBe(1);
    expect(s.exchanges.byKind.exchange).toBe(2);
  });
});
