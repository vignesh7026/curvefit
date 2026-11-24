import { Schema, model } from "mongoose";

/** Only written when the customer gave consent to store their measurements. */
const sizeFinderLogSchema = new Schema(
  {
    productId: { type: String, required: true, index: true },
    inputs: {
      heightCm: Number,
      bustCm: Number,
      waistCm: Number,
      hipCm: Number,
    },
    recommendedSize: { type: String, default: null },
    alternateSize: { type: String, default: null },
    outcome: { type: String, enum: ["unknown", "kept", "exchanged"], default: "unknown" },
    consent: { type: Boolean, required: true },
    // Hash of a secret handed to the customer so they can delete this record later.
    deleteTokenHash: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

export const SizeFinderLogModel = model("SizeFinderLog", sizeFinderLogSchema);
