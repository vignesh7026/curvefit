import { Schema, model } from "mongoose";

const reviewSchema = new Schema(
  {
    productId: { type: String, required: true, index: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    sizeWorn: { type: String, required: true },
    heightCm: { type: Number, required: true },
    hipCm: { type: Number, required: true },
    fit: { type: String, enum: ["runs_small", "true_to_size", "runs_large"], required: true },
    body: { type: String, default: "", maxlength: 2000 },
    photoUrls: { type: [String], default: [] },
    verifiedPurchase: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true },
);
reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });

export const ReviewModel = model("Review", reviewSchema);
