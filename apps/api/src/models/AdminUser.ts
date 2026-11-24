import { Schema, model } from "mongoose";

const adminUserSchema = new Schema(
  {
    name: { type: String, default: "", trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "support"], required: true },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const AdminUserModel = model("AdminUser", adminUserSchema);
