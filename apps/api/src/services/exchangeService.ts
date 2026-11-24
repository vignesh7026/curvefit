import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { ExchangeInput } from "@curvefit/shared";
import { ExchangeRequestModel } from "../models/ExchangeRequest";
import { OtpChallengeModel } from "../models/OtpChallenge";
import { HttpError, badRequest, notFound } from "../utils/httpError";
import { alert } from "../utils/alerts";
import { logger } from "../utils/logger";
import type { CourierService } from "./courierService";
import type { Notifier } from "./notifier";
import { type ShopifyOrder, type ShopifyService, samePhone } from "./shopifyService";

const OTP_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const last10 = (p: string) => p.replace(/\D/g, "").slice(-10);

export interface ExchangeResult {
  id: string;
  status: string;
  replacementOrder: string | null;
  courierReference: string | null;
}

export interface ExchangeService {
  requestOtp(orderNumber: string, phone: string): Promise<void>;
  create(input: ExchangeInput): Promise<ExchangeResult>;
  list(status?: string): Promise<unknown[]>;
  setStatus(id: string, status: string, courierReference?: string): Promise<void>;
  /** Staff retry when automatic pickup booking failed. */
  bookPickup(id: string): Promise<string>;
}

function phoneMatchesOrder(order: ShopifyOrder, phone: string): boolean {
  // Dev fake orders carry no phone; real orders always must match.
  return !order.phone || samePhone(order.phone, phone);
}

export function createExchangeService(
  shopify: ShopifyService,
  notifier: Notifier,
  courier: CourierService,
): ExchangeService {
  async function bookPickupFor(
    id: string,
    order: ShopifyOrder,
    item: string,
    size: string,
  ): Promise<string> {
    const reference = await courier.bookReversePickup({ exchangeId: id, order, item, size });
    await ExchangeRequestModel.findByIdAndUpdate(id, {
      status: "pickup_booked",
      courierReference: reference,
    });
    return reference;
  }

  return {
    async requestOtp(orderNumber, phone) {
      const order = await shopify.findOrder(orderNumber);
      // Same response whether or not the order exists, so order numbers cannot be probed.
      if (!order || !phoneMatchesOrder(order, phone)) return;
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      const salt = randomBytes(16).toString("hex");
      await OtpChallengeModel.deleteMany({ orderNumber });
      await OtpChallengeModel.create({
        orderNumber,
        phoneHash: sha(last10(phone)),
        salt,
        codeHash: sha(salt + code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      });
      await notifier.send({ phone }, "otp", { code });
    },

    async create(input) {
      const challenge = await OtpChallengeModel.findOne({ orderNumber: input.orderNumber });
      const invalid = badRequest("Invalid or expired code", "INVALID_OTP");
      if (!challenge || challenge.attempts >= MAX_ATTEMPTS) throw invalid;
      if (challenge.phoneHash !== sha(last10(input.phone))) throw invalid;

      const expected = Buffer.from(challenge.codeHash);
      const given = Buffer.from(sha(challenge.salt + input.otp));
      if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
        challenge.attempts += 1;
        await challenge.save();
        throw invalid;
      }
      await challenge.deleteOne(); // one-time use

      const order = await shopify.findOrder(input.orderNumber);
      if (!order || !phoneMatchesOrder(order, input.phone)) throw notFound("Order not found");

      const isExchange = input.kind === "exchange";
      if (isExchange) {
        // One free size exchange per order protects the returns target.
        const existing = await ExchangeRequestModel.exists({
          orderId: order.id,
          kind: "exchange",
          status: { $ne: "cancelled" },
        });
        if (existing) {
          throw new HttpError(409, "ALREADY_EXCHANGED", "This order already has an exchange");
        }
        if (!(await shopify.hasStock(input.item, input.toSize as string))) {
          throw badRequest("That size is out of stock", "OUT_OF_STOCK");
        }
      }

      const doc = await ExchangeRequestModel.create({
        kind: input.kind,
        orderId: order.id,
        orderNumber: order.orderNumber,
        item: input.item,
        fromSize: input.fromSize,
        toSize: input.toSize ?? null,
        reason: input.reason ?? "",
        sizeFinderUsed: input.sizeFinderUsed,
      });
      const id = String(doc._id);
      const to = { phone: input.phone, email: order.email };
      const vars = { order: `#${order.orderNumber}`, kind: input.kind };

      let replacementOrder: string | null = null;
      let courierReference: string | null = null;
      let status = "requested";

      // Automatic steps may fail (courier down, Shopify error): the request is kept and staff
      // can retry from the admin panel, so the customer is never told "failed" after we saved it.
      try {
        if (isExchange) {
          replacementOrder = await shopify.createReplacementOrder(
            order,
            input.item,
            input.toSize as string,
          );
          await ExchangeRequestModel.findByIdAndUpdate(id, { replacementOrder });
        }
        courierReference = await bookPickupFor(id, order, input.item, input.fromSize);
        status = "pickup_booked";
      } catch (err) {
        logger.error("exchange automation failed", { id, message: (err as Error).message });
        void alert(
          "exchange-automation",
          `Exchange ${id} needs manual follow-up (pickup or replacement failed)`,
        );
      }

      await notifier.send(to, "exchange_requested", vars);
      if (courierReference) {
        await notifier.send(to, "pickup_booked", { ...vars, reference: courierReference });
      }
      return { id, status, replacementOrder, courierReference };
    },

    async list(status) {
      return ExchangeRequestModel.find(status ? { status } : {})
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    },

    async setStatus(id, status, courierReference) {
      const doc = await ExchangeRequestModel.findByIdAndUpdate(id, {
        status,
        ...(courierReference ? { courierReference } : {}),
      });
      if (!doc) throw notFound("Exchange request not found");
    },

    async bookPickup(id) {
      const doc = await ExchangeRequestModel.findById(id);
      if (!doc) throw notFound("Exchange request not found");
      const order = await shopify.findOrder(doc.orderNumber);
      if (!order) throw notFound("Order not found");
      const ref = await bookPickupFor(id, order, doc.item, doc.fromSize);
      await notifier.send({ phone: order.phone, email: order.email }, "pickup_booked", {
        order: `#${order.orderNumber}`,
        kind: doc.kind,
        reference: ref,
      });
      return ref;
    },
  };
}
