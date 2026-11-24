import { Schema, model } from "mongoose";

/** One person trying one size in a fit session. Anonymous: no name or contact details. */
const fitSessionSchema = new Schema(
  {
    productId: { type: String, required: true, index: true },
    sizeTried: { type: String, required: true },
    heightCm: { type: Number, required: true },
    bustCm: { type: Number, required: true },
    waistCm: { type: Number, required: true },
    hipCm: { type: Number, required: true },
    fit: { type: String, enum: ["too_small", "good", "too_large"], required: true },
    opacityOk: { type: Boolean, default: null },
    notes: { type: String, default: "", maxlength: 500 },
  },
  { timestamps: true },
);

export const FitSessionModel = model("FitSession", fitSessionSchema);
