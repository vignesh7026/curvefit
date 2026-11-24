import { Schema, model } from "mongoose";

const restockAlertSchema = new Schema(
  {
    productId: { type: String, required: true },
    size: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true },
    phone: String,
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
restockAlertSchema.index({ productId: 1, size: 1, notifiedAt: 1 });

export const RestockAlertModel = model("RestockAlert", restockAlertSchema);
