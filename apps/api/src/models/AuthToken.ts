import { Schema, model } from "mongoose";

/**
 * One-time tokens for email verification, password reset and staff invitations. Only the hash is
 * stored, so a database leak does not hand out working links.
 */
const authTokenSchema = new Schema(
  {
    purpose: { type: String, enum: ["verify", "reset", "invite"], required: true },
    subjectType: { type: String, enum: ["customer", "staff"], default: null },
    subjectId: { type: String, default: null },
    email: { type: String, required: true, lowercase: true },
    role: { type: String, enum: ["admin", "support"], default: null },
    invitedBy: { type: String, default: null },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const AuthTokenModel = model("AuthToken", authTokenSchema);
