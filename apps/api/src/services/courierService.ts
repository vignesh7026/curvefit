import type { Env } from "../config/env";
import { HttpError } from "../utils/httpError";
import type { ShopifyOrder } from "./shopifyService";

export interface PickupRequest {
  exchangeId: string;
  order: ShopifyOrder;
  item: string;
  size: string;
}

/** Books a reverse pickup for an exchange or return. Returns the courier reference. */
export interface CourierService {
  bookReversePickup(req: PickupRequest): Promise<string>;
}

type FetchLike = typeof fetch;

export function createDevCourierService(): CourierService {
  return { bookReversePickup: async (r) => `DEV-PICKUP-${r.exchangeId.slice(-6)}` };
}

/**
 * Shiprocket reverse-order adapter. Field names follow Shiprocket's "create return order"
 * API but this has not been run against a live account: confirm in the week-0 checks.
 */
export function createShiprocketService(env: Env, fetchImpl: FetchLike = fetch): CourierService {
  const base = "https://apiv2.shiprocket.in/v1/external";
  let token: { value: string; at: number } | null = null;

  async function auth(): Promise<string> {
    // Shiprocket tokens last days; refresh after 8 hours to be safe.
    if (token && Date.now() - token.at < 8 * 3600_000) return token.value;
    const res = await fetchImpl(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: env.SHIPROCKET_EMAIL, password: env.SHIPROCKET_PASSWORD }),
    });
    if (!res.ok) throw new HttpError(502, "COURIER_ERROR", "Courier login failed");
    const json = (await res.json()) as { token?: string };
    if (!json.token) throw new HttpError(502, "COURIER_ERROR", "Courier login failed");
    token = { value: json.token, at: Date.now() };
    return token.value;
  }

  return {
    async bookReversePickup({ exchangeId, order, item, size }) {
      const a = order.address;
      if (!a) throw new HttpError(400, "NO_ADDRESS", "Order has no pickup address");
      const res = await fetchImpl(`${base}/orders/create/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await auth()}` },
        body: JSON.stringify({
          order_id: `RET-${order.orderNumber}-${exchangeId.slice(-6)}`,
          order_date: new Date().toISOString().slice(0, 10),
          pickup_customer_name: a.name,
          pickup_address: a.address1,
          pickup_address_2: a.address2,
          pickup_city: a.city,
          pickup_state: a.province,
          pickup_country: "India",
          pickup_pincode: a.zip,
          pickup_email: order.email,
          pickup_phone: a.phone,
          shipping_customer_name: env.WAREHOUSE_NAME,
          shipping_address: env.WAREHOUSE_ADDRESS,
          shipping_city: env.WAREHOUSE_CITY,
          shipping_state: env.WAREHOUSE_STATE,
          shipping_country: "India",
          shipping_pincode: env.WAREHOUSE_PINCODE,
          shipping_email: env.WAREHOUSE_EMAIL,
          shipping_phone: env.WAREHOUSE_PHONE,
          order_items: [
            { name: `${item} (${size})`, sku: `${item}-${size}`, units: 1, selling_price: 0 },
          ],
          payment_method: "Prepaid",
          sub_total: 0,
          length: 25,
          breadth: 20,
          height: 5,
          weight: 0.5,
        }),
      });
      if (!res.ok) throw new HttpError(502, "COURIER_ERROR", "Could not book the pickup");
      const json = (await res.json()) as {
        order_id?: number | string;
        shipment_id?: number | string;
      };
      const ref = json.shipment_id ?? json.order_id;
      if (ref === undefined) throw new HttpError(502, "COURIER_ERROR", "Could not book the pickup");
      return String(ref);
    },
  };
}

export function createCourierService(env: Env): CourierService {
  if (env.SHIPROCKET_EMAIL && env.SHIPROCKET_PASSWORD) return createShiprocketService(env);
  if (env.NODE_ENV !== "production") return createDevCourierService();
  return {
    bookReversePickup: async () => {
      throw new HttpError(503, "COURIER_NOT_CONFIGURED", "Pickup booking is not available yet");
    },
  };
}
