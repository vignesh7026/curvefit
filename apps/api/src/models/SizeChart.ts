import { Schema, model } from "mongoose";

const range = { min: { type: Number, required: true }, max: { type: Number, required: true } };

const bandSchema = new Schema(
  {
    label: { type: String, required: true },
    uk: String,
    bust: range,
    waist: range,
    hip: range,
    rise: { min: Number, max: Number },
    inseam: { min: Number, max: Number },
  },
  { _id: false },
);

const sizeChartSchema = new Schema(
  {
    productId: { type: String, required: true, unique: true, index: true },
    category: { type: String, enum: ["bottom", "bra", "top"], required: true },
    stretchNote: { type: String, required: true },
    bands: { type: [bandSchema], validate: (v: unknown[]) => v.length > 0 },
  },
  { timestamps: true },
);

export const SizeChartModel = model("SizeChart", sizeChartSchema);
