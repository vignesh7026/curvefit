import { exchangeStatusSchema } from "@curvefit/shared";
import { z } from "zod";

export const productIdParams = z.object({ productId: z.string().min(1).max(100) }).strict();

export const idParams = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/) }).strict();

export const tokenParams = z.object({ token: z.string().regex(/^[a-f0-9]{48}$/) }).strict();

export const exchangeListQuery = z.object({ status: exchangeStatusSchema.optional() }).strict();

export const reviewStatusQuery = z
  .object({ status: z.enum(["pending", "approved", "rejected"]).optional() })
  .strict();

export const exchangeUpdateBody = z
  .object({
    status: exchangeStatusSchema,
    courierReference: z.string().max(100).optional(),
  })
  .strict();

export const reviewModerationBody = z.object({ status: z.enum(["approved", "rejected"]) }).strict();

export const restockNotifyBody = z
  .object({
    productId: z.string().min(1).max(100),
    size: z.string().min(1).max(10),
    productUrl: z.string().url(),
  })
  .strict();
