import { Schema, model } from "mongoose";

const waitlistSchema = new Schema(
  {
    email: { type: String, lowercase: true, trim: true, index: true, sparse: true },
    phone: { type: String, index: true, sparse: true },
    interestedSizes: { type: [String], default: [] },
    referralCode: { type: String, required: true, unique: true },
    referredBy: { type: String, default: null },
    referrals: { type: Number, default: 0 },
    consentAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export const WaitlistModel = model("Waitlist", waitlistSchema);
