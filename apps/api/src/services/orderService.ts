import { notFound } from "../utils/httpError";
import { type ShopifyService, samePhone } from "./shopifyService";

export interface TrackedOrder {
  orderNumber: string;
  status: string;
  trackingUrl: string | null;
  items: Array<{ title: string; size: string; quantity: number }>;
}

export interface OrderService {
  track(orderNumber: string, phone: string): Promise<TrackedOrder>;
}

export function createOrderService(shopify: ShopifyService): OrderService {
  return {
    async track(orderNumber, phone) {
      const order = await shopify.findOrder(orderNumber);
      // One generic error for "no such order" and "wrong phone" so orders cannot be probed.
      if (!order || (order.phone && !samePhone(order.phone, phone))) {
        throw notFound("We could not find an order with those details");
      }
      return {
        orderNumber: order.orderNumber,
        status: order.status,
        trackingUrl: order.trackingUrl,
        items: order.items,
      };
    },
  };
}
