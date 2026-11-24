import { Schema, model } from "mongoose";

const otpChallengeSchema = new Schema({
  orderNumber: { type: String, required: true, index: true },
  phoneHash: { type: String, required: true },
  codeHash: { type: String, required: true },
  salt: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  // TTL index: Mongo removes the document after it expires.
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export const OtpChallengeModel = model("OtpChallenge", otpChallengeSchema);
