import { Schema, model } from "mongoose";

const customerUserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: null },
    passwordHash: { type: String, required: true },
    // Orders are only shown once the email is verified, so nobody can read another person's
    // orders by signing up with their address.
    emailVerified: { type: Boolean, default: false },
    // Bumped on password change or reset so older refresh tokens stop working.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const CustomerUserModel = model("CustomerUser", customerUserSchema);
