import { Schema, model } from "mongoose";

const exchangeRequestSchema = new Schema(
  {
    kind: { type: String, enum: ["exchange", "return"], default: "exchange", index: true },
    orderId: { type: String, required: true, index: true },
    orderNumber: { type: String, required: true },
    item: { type: String, required: true },
    fromSize: { type: String, required: true },
    toSize: { type: String, default: null },
    reason: { type: String, default: "" },
    sizeFinderUsed: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["requested", "pickup_booked", "received", "replacement_shipped", "cancelled"],
      default: "requested",
      index: true,
    },
    courierReference: { type: String, default: null },
    replacementOrder: { type: String, default: null },
  },
  { timestamps: true },
);

export const ExchangeRequestModel = model("ExchangeRequest", exchangeRequestSchema);
