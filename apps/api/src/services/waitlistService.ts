import { randomBytes } from "node:crypto";
import type { RestockAlertInput, WaitlistInput } from "@curvefit/shared";
import { RestockAlertModel } from "../models/RestockAlert";
import { WaitlistModel } from "../models/Waitlist";
import type { Notifier } from "./notifier";

// No 0/1/O/I so codes are easy to read out loud.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeCode = () => Array.from(randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join("");

export interface WaitlistService {
  join(input: WaitlistInput): Promise<{ referralCode: string }>;
  list(): Promise<unknown[]>;
  addRestockAlert(input: RestockAlertInput): Promise<void>;
  notifyRestock(productId: string, size: string, productUrl: string): Promise<number>;
}

export function createWaitlistService(notifier: Notifier): WaitlistService {
  return {
    async join(input) {
      const or = [
        ...(input.email ? [{ email: input.email.toLowerCase() }] : []),
        ...(input.phone ? [{ phone: input.phone }] : []),
      ];
      // Joining twice returns the same code, so signups cannot be used to probe who is listed.
      const existing = await WaitlistModel.findOne({ $or: or });
      if (existing) return { referralCode: existing.referralCode };

      const referralCode = makeCode();
      await WaitlistModel.create({
        email: input.email?.toLowerCase(),
        phone: input.phone,
        interestedSizes: input.interestedSizes,
        referralCode,
        referredBy: input.referredBy ?? null,
        consentAt: new Date(),
      });
      if (input.referredBy) {
        await WaitlistModel.updateOne(
          { referralCode: input.referredBy },
          { $inc: { referrals: 1 } },
        );
      }
      await notifier.send({ email: input.email, phone: input.phone }, "waitlist_welcome", {
        code: referralCode,
      });
      return { referralCode };
    },

    async list() {
      return WaitlistModel.find().sort({ referrals: -1, createdAt: 1 }).limit(500).lean();
    },

    async addRestockAlert(input) {
      await RestockAlertModel.create({
        productId: input.productId,
        size: input.size,
        email: input.email,
        phone: input.phone,
      });
    },

    async notifyRestock(productId, size, productUrl) {
      const pending = await RestockAlertModel.find({ productId, size, notifiedAt: null });
      let sent = 0;
      for (const alert of pending) {
        const ok = await notifier.send(
          { email: alert.email, phone: alert.phone },
          "back_in_stock",
          { item: productId, size, url: productUrl },
        );
        if (ok) {
          alert.notifiedAt = new Date();
          await alert.save();
          sent += 1;
        }
      }
      return sent;
    },
  };
}
