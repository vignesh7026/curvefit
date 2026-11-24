import { z } from "zod";

const phone = z.string().regex(/^\+?[0-9]{10,13}$/);
const fitEnum = z.enum(["runs_small", "true_to_size", "runs_large"]);
const exchangeStatus = z.enum([
  "requested",
  "pickup_booked",
  "received",
  "replacement_shipped",
  "cancelled",
]);

export const measurementsSchema = z
  .object({
    heightCm: z.number().min(120).max(230),
    bustCm: z.number().min(60).max(220),
    waistCm: z.number().min(50).max(220),
    hipCm: z.number().min(70).max(240),
  })
  .strict();

export const sizeRequestSchema = z
  .object({
    productId: z.string().min(1).max(100),
    measurements: measurementsSchema,
    /** Must be true before anything is stored; measurements are personal data. */
    consentToStore: z.boolean().default(false),
  })
  .strict();

const rangeSchema = z
  .object({ min: z.number().positive(), max: z.number().positive() })
  .strict()
  .refine((r) => r.min <= r.max, "min must not exceed max");

export const sizeChartSchema = z
  .object({
    productId: z.string().min(1).max(100),
    category: z.enum(["bottom", "bra", "top"]),
    stretchNote: z.string().min(1).max(300),
    bands: z
      .array(
        z
          .object({
            label: z.string().min(1).max(10),
            uk: z.string().max(10).optional(),
            bust: rangeSchema,
            waist: rangeSchema,
            hip: rangeSchema,
            rise: rangeSchema.optional(),
            inseam: rangeSchema.optional(),
          })
          .strict(),
      )
      .min(1)
      .max(12),
  })
  .strict()
  .refine(
    (c) =>
      c.bands.every((b, i) => {
        const prev = c.bands[i - 1];
        return (
          !prev ||
          (b.hip.min > prev.hip.min && b.waist.min > prev.waist.min && b.bust.min > prev.bust.min)
        );
      }),
    "bands must be ordered smallest to largest",
  );

export const reviewInputSchema = z
  .object({
    productId: z.string().min(1).max(100),
    rating: z.number().int().min(1).max(5),
    sizeWorn: z.string().min(1).max(10),
    heightCm: z.number().min(120).max(230),
    hipCm: z.number().min(70).max(240),
    fit: fitEnum,
    body: z.string().max(2000).default(""),
    photoUrls: z.array(z.string().url()).max(4).default([]),
  })
  .strict();

/** "People like me" filter: same size, or similar height and hip. */
export const reviewListQuerySchema = z
  .object({
    size: z.string().max(10).optional(),
    fit: fitEnum.optional(),
    heightCm: z.coerce.number().min(120).max(230).optional(),
    hipCm: z.coerce.number().min(70).max(240).optional(),
  })
  .strict();

export const otpRequestSchema = z
  .object({ orderNumber: z.string().min(1).max(40), phone })
  .strict();

export const exchangeRequestSchema = z
  .object({
    kind: z.enum(["exchange", "return"]).default("exchange"),
    orderNumber: z.string().min(1).max(40),
    phone,
    otp: z.string().regex(/^[0-9]{6}$/),
    item: z.string().min(1).max(100),
    fromSize: z.string().min(1).max(10),
    toSize: z.string().min(1).max(10).optional(),
    reason: z.string().max(500).optional(),
    /** Whether the customer used the size finder; lets us compare exchange rates. */
    sizeFinderUsed: z.boolean().default(false),
  })
  .strict()
  .refine((v) => v.kind === "return" || Boolean(v.toSize), {
    message: "toSize is required for an exchange",
    path: ["toSize"],
  });

export const trackRequestSchema = otpRequestSchema;

export const loginSchema = z
  .object({ email: z.string().email(), password: z.string().min(8).max(200) })
  .strict();

const contact = {
  email: z.string().email().max(200).optional(),
  phone: phone.optional(),
};

export const waitlistSchema = z
  .object({
    ...contact,
    interestedSizes: z.array(z.string().max(10)).max(6).default([]),
    referredBy: z
      .string()
      .regex(/^[A-Z2-9]{8}$/)
      .optional(),
    consent: z.literal(true),
  })
  .strict()
  .refine((v) => v.email || v.phone, { message: "email or phone is required" });

export const restockAlertSchema = z
  .object({
    ...contact,
    productId: z.string().min(1).max(100),
    size: z.string().min(1).max(10),
    consent: z.literal(true),
  })
  .strict()
  .refine((v) => v.email || v.phone, { message: "email or phone is required" });

export const exchangeStatusSchema = exchangeStatus;

export type SizeRequest = z.infer<typeof sizeRequestSchema>;
export type ReviewInput = z.infer<typeof reviewInputSchema>;
export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;
export type ExchangeInput = z.infer<typeof exchangeRequestSchema>;
export type WaitlistInput = z.infer<typeof waitlistSchema>;
export type RestockAlertInput = z.infer<typeof restockAlertSchema>;

export const fitSessionSchema = z
  .object({
    productId: z.string().min(1).max(100),
    sizeTried: z.string().min(1).max(10),
    heightCm: z.number().min(120).max(230),
    bustCm: z.number().min(60).max(220),
    waistCm: z.number().min(50).max(220),
    hipCm: z.number().min(70).max(240),
    fit: z.enum(["too_small", "good", "too_large"]),
    opacityOk: z.boolean().nullable().optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();

export type FitSessionInput = z.infer<typeof fitSessionSchema>;

// ---------- Accounts ----------

export const PASSWORD_MIN = 10;

/** Same rules for customers and staff. Length matters more than symbols. */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(128);

const nameSchema = z.string().trim().min(1).max(80);

export const signupSchema = z
  .object({
    name: nameSchema,
    email: z.string().trim().email().max(200),
    password: passwordSchema,
    phone: phone.optional(),
  })
  .strict();

export const profileUpdateSchema = z
  .object({ name: nameSchema.optional(), phone: phone.nullable().optional() })
  .strict();

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema })
  .strict();

export const deleteAccountSchema = z.object({ password: z.string().min(1).max(128) }).strict();

export const accountTypeSchema = z.enum(["customer", "staff"]);

export const forgotPasswordSchema = z
  .object({ type: accountTypeSchema, email: z.string().trim().email().max(200) })
  .strict();

export const resetPasswordSchema = z
  .object({
    type: accountTypeSchema,
    token: z.string().regex(/^[a-f0-9]{64}$/),
    password: passwordSchema,
  })
  .strict();

export const tokenOnlySchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).strict();

export const inviteSchema = z
  .object({ email: z.string().trim().email().max(200), role: z.enum(["admin", "support"]) })
  .strict();

export const acceptInviteSchema = z
  .object({
    token: z.string().regex(/^[a-f0-9]{64}$/),
    name: nameSchema,
    password: passwordSchema,
  })
  .strict();

export type SignupInput = z.infer<typeof signupSchema>;
