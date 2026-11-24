import type { Env } from "../config/env";
import { logger } from "../utils/logger";

export type Template =
  | "otp"
  | "order_confirmed"
  | "order_shipped"
  | "exchange_requested"
  | "pickup_booked"
  | "back_in_stock"
  | "waitlist_welcome"
  | "verify_email"
  | "password_reset"
  | "staff_invite";

export interface Recipient {
  phone?: string | null;
  email?: string | null;
}

/** Sends WhatsApp and email messages. Returns true if at least one channel accepted it. */
export interface Notifier {
  send(to: Recipient, template: Template, vars?: Record<string, string>): Promise<boolean>;
}

type FetchLike = typeof fetch;

const COPY: Record<Template, (v: Record<string, string>) => { subject: string; text: string }> = {
  otp: (v) => ({
    subject: "Your CurveFit code",
    text: `Your CurveFit code is ${v.code}. It expires in 10 minutes.`,
  }),
  order_confirmed: (v) => ({
    subject: `Order ${v.order} confirmed`,
    text: `Thanks for your order ${v.order}. We will message you when it ships.`,
  }),
  order_shipped: (v) => ({
    subject: `Order ${v.order} has shipped`,
    text: `Your order ${v.order} is on its way.${v.tracking ? ` Track it: ${v.tracking}` : ""}`,
  }),
  exchange_requested: (v) => ({
    subject: "We got your exchange request",
    text: `We received your ${v.kind} request for order ${v.order}. We will confirm the pickup shortly.`,
  }),
  pickup_booked: (v) => ({
    subject: "Pickup booked",
    text: `Pickup is booked for your ${v.kind} on order ${v.order}. Reference: ${v.reference}.`,
  }),
  back_in_stock: (v) => ({
    subject: `${v.item} is back in stock`,
    text: `${v.item} in ${v.size} is back in stock: ${v.url}`,
  }),
  verify_email: (v) => ({
    subject: "Confirm your email",
    text: `Hi ${v.name}, confirm your email to see your orders in your account: ${v.link} (the link works for 48 hours)`,
  }),
  password_reset: (v) => ({
    subject: "Reset your password",
    text: `Use this link to choose a new password: ${v.link} (it works for one hour). If you did not ask for this, you can ignore this message.`,
  }),
  staff_invite: (v) => ({
    subject: "You have been invited to the CurveFit team",
    text: `You have been invited as ${v.role}. Set up your account here: ${v.link} (the link works for 7 days).`,
  }),
  waitlist_welcome: (v) => ({
    subject: "You are on the CurveFit list",
    text: `You are on the list. Share your code ${v.code} with friends to move up.`,
  }),
};

/** Development notifier: prints to the console. Never used in production. */
export function createConsoleNotifier(): Notifier {
  return {
    async send(_to, template, vars = {}) {
      console.warn(`[dev notify] ${template}: ${COPY[template](vars).text}`);
      return true;
    },
  };
}

/**
 * WhatsApp Business Cloud API plus Resend email. Template names on WhatsApp must be approved in
 * Meta Business Manager and be named like the Template ids above. Not yet tested live.
 */
export function createProviderNotifier(env: Env, fetchImpl: FetchLike = fetch): Notifier {
  async function whatsapp(phone: string, template: Template, vars: Record<string, string>) {
    const digits = phone.replace(/\D/g, "");
    const to = digits.length === 10 ? `91${digits}` : digits;
    const res = await fetchImpl(
      `https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: template,
            language: { code: env.WHATSAPP_TEMPLATE_LANG },
            components: [
              {
                type: "body",
                parameters: Object.values(vars).map((text) => ({ type: "text", text })),
              },
            ],
          },
        }),
      },
    );
    return res.ok;
  }

  async function email(address: string, template: Template, vars: Record<string, string>) {
    const { subject, text } = COPY[template](vars);
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [address], subject, text }),
    });
    return res.ok;
  }

  const waReady = Boolean(env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_TOKEN);
  const mailReady = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);

  return {
    async send(to, template, vars = {}) {
      const results: boolean[] = [];
      try {
        if (to.phone && waReady) results.push(await whatsapp(to.phone, template, vars));
        // OTPs go to the phone only; email is for order and stock updates.
        if (to.email && mailReady && template !== "otp") {
          results.push(await email(to.email, template, vars));
        }
      } catch {
        logger.error("notification send failed", { template });
        return false;
      }
      if (results.length === 0) logger.info("no notification channel configured", { template });
      return results.some(Boolean);
    },
  };
}

export function createNotifier(env: Env): Notifier {
  const configured =
    (env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_TOKEN) || (env.RESEND_API_KEY && env.EMAIL_FROM);
  if (configured) return createProviderNotifier(env);
  if (env.NODE_ENV === "development") return createConsoleNotifier();
  return createProviderNotifier(env); // logs "no channel configured" and sends nothing
}
