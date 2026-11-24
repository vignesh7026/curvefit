import type { Env } from "../config/env";
import { HttpError } from "../utils/httpError";

export interface ShopifyAddress {
  name: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  zip: string;
  phone: string;
}

export interface ShopifyOrder {
  id: string;
  orderNumber: string;
  /** Phone on the order; empty string when unknown. */
  phone: string;
  email: string;
  /** Human-readable fulfilment status, e.g. "FULFILLED". */
  status: string;
  trackingUrl: string | null;
  address: ShopifyAddress | null;
  items: Array<{ title: string; size: string; quantity: number }>;
}

/**
 * The only module that talks to the Shopify Admin API. Everything else depends on this
 * interface. Real adapter: createAdminShopifyService. Without credentials, development uses an
 * in-memory fake and production fails loudly.
 */
export interface ShopifyService {
  findOrder(orderNumber: string): Promise<ShopifyOrder | null>;
  /** Most recent orders placed with this email, newest first. */
  findOrdersByEmail(email: string): Promise<ShopifyOrder[]>;
  hasStock(item: string, size: string): Promise<boolean>;
  /** Creates a zero-value replacement order and returns its name, e.g. "#1042". */
  createReplacementOrder(order: ShopifyOrder, item: string, size: string): Promise<string>;
}

type FetchLike = typeof fetch;

export function createDevShopifyService(): ShopifyService {
  return {
    async findOrdersByEmail() {
      return [await this.findOrder("1001")].filter((o): o is ShopifyOrder => o !== null);
    },
    async findOrder(orderNumber) {
      return {
        id: `dev-${orderNumber}`,
        orderNumber,
        phone: "",
        email: "",
        status: "FULFILLED",
        trackingUrl: null,
        address: null,
        items: [{ title: "High-rise ankle legging", size: "2XL", quantity: 1 }],
      };
    },
    async hasStock() {
      return true;
    },
    async createReplacementOrder(_order, _item, size) {
      return `#DEV-${size}`;
    },
  };
}

const escapeSearch = (v: string) => v.replace(/["\\']/g, " ").trim();

interface GraphQLResult<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/** Real Admin GraphQL adapter. Not yet exercised against a live store: see README. */
export function createAdminShopifyService(env: Env, fetchImpl: FetchLike = fetch): ShopifyService {
  async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await fetchImpl(
      `https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": env.SHOPIFY_ADMIN_TOKEN,
        },
        body: JSON.stringify({ query, variables }),
      },
    );
    if (!res.ok) throw new HttpError(502, "SHOPIFY_ERROR", "Shopify request failed");
    const json = (await res.json()) as GraphQLResult<T>;
    if (json.errors?.length || !json.data) {
      throw new HttpError(502, "SHOPIFY_ERROR", "Shopify returned an error");
    }
    return json.data;
  }

  async function findVariant(item: string, size: string) {
    const q = `product_title:'${escapeSearch(item)}' AND title:'${escapeSearch(size)}'`;
    const data = await gql<{
      productVariants: {
        nodes: Array<{ id: string; availableForSale: boolean; inventoryQuantity: number | null }>;
      };
    }>(
      `query($q:String!){ productVariants(first:5, query:$q){ nodes{ id availableForSale inventoryQuantity } } }`,
      { q },
    );
    return data.productVariants.nodes.find(
      (v) => v.availableForSale && (v.inventoryQuantity ?? 1) > 0,
    );
  }

  async function searchOrders(q: string, first: number): Promise<ShopifyOrder[]> {
    const data = await gql<{
      orders: {
        nodes: Array<{
          id: string;
          name: string;
          phone: string | null;
          email: string | null;
          displayFulfillmentStatus: string;
          fulfillments: Array<{ trackingInfo: Array<{ url: string | null }> }>;
          shippingAddress: {
            name: string | null;
            address1: string | null;
            address2: string | null;
            city: string | null;
            province: string | null;
            zip: string | null;
            phone: string | null;
          } | null;
          lineItems: {
            nodes: Array<{ title: string; quantity: number; variantTitle: string | null }>;
          };
        }>;
      };
    }>(
      `query($q:String!){ orders(first:${first}, query:$q, sortKey: CREATED_AT, reverse: true){ nodes{
          id name phone email displayFulfillmentStatus
          fulfillments{ trackingInfo{ url } }
          shippingAddress{ name address1 address2 city province zip phone }
          lineItems(first:20){ nodes{ title quantity variantTitle } }
        } } }`,
      { q },
    );
    return data.orders.nodes.map((o) => {
      const a = o.shippingAddress;
      return {
        id: o.id,
        orderNumber: o.name.replace(/^#/, ""),
        phone: o.phone ?? a?.phone ?? "",
        email: o.email ?? "",
        status: o.displayFulfillmentStatus,
        trackingUrl: o.fulfillments.flatMap((f) => f.trackingInfo).find((t) => t.url)?.url ?? null,
        address: a
          ? {
              name: a.name ?? "",
              address1: a.address1 ?? "",
              address2: a.address2 ?? "",
              city: a.city ?? "",
              province: a.province ?? "",
              zip: a.zip ?? "",
              phone: a.phone ?? o.phone ?? "",
            }
          : null,
        items: o.lineItems.nodes.map((l) => ({
          title: l.title,
          size: l.variantTitle ?? "",
          quantity: l.quantity,
        })),
      };
    });
  }

  return {
    async findOrder(orderNumber) {
      const name = `#${orderNumber.replace(/^#/, "")}`;
      return (await searchOrders(`name:${name}`, 1))[0] ?? null;
    },

    async findOrdersByEmail(email) {
      return searchOrders(`email:${escapeSearch(email)}`, 10);
    },

    async hasStock(item, size) {
      return Boolean(await findVariant(item, size));
    },

    async createReplacementOrder(order, item, size) {
      const variant = await findVariant(item, size);
      if (!variant) throw new HttpError(400, "OUT_OF_STOCK", "That size is out of stock");
      const a = order.address;
      const draft = await gql<{
        draftOrderCreate: {
          draftOrder: { id: string } | null;
          userErrors: Array<{ message: string }>;
        };
      }>(
        `mutation($input:DraftOrderInput!){ draftOrderCreate(input:$input){
          draftOrder{ id } userErrors{ message } } }`,
        {
          input: {
            email: order.email || undefined,
            note: `Size exchange for order #${order.orderNumber}`,
            tags: ["exchange"],
            lineItems: [{ variantId: variant.id, quantity: 1 }],
            appliedDiscount: { valueType: "PERCENTAGE", value: 100, title: "Free size exchange" },
            shippingAddress: a
              ? {
                  address1: a.address1,
                  address2: a.address2,
                  city: a.city,
                  province: a.province,
                  zip: a.zip,
                  phone: a.phone,
                  firstName: a.name,
                  countryCode: "IN",
                }
              : undefined,
          },
        },
      );
      const id = draft.draftOrderCreate.draftOrder?.id;
      if (!id || draft.draftOrderCreate.userErrors.length) {
        throw new HttpError(502, "SHOPIFY_ERROR", "Could not create the replacement order");
      }
      const done = await gql<{
        draftOrderComplete: {
          draftOrder: { order: { name: string } | null } | null;
          userErrors: Array<{ message: string }>;
        };
      }>(
        `mutation($id:ID!){ draftOrderComplete(id:$id, paymentPending:false){
          draftOrder{ order{ name } } userErrors{ message } } }`,
        { id },
      );
      const name = done.draftOrderComplete.draftOrder?.order?.name;
      if (!name)
        throw new HttpError(502, "SHOPIFY_ERROR", "Could not complete the replacement order");
      return name;
    },
  };
}

export function createShopifyService(env: Env): ShopifyService {
  if (env.SHOPIFY_STORE_DOMAIN && env.SHOPIFY_ADMIN_TOKEN) return createAdminShopifyService(env);
  if (env.NODE_ENV !== "production") return createDevShopifyService();
  const unavailable = (): never => {
    throw new HttpError(503, "SHOPIFY_NOT_CONFIGURED", "Order lookup is not available yet");
  };
  return {
    findOrder: async () => unavailable(),
    findOrdersByEmail: async () => unavailable(),
    hasStock: async () => unavailable(),
    createReplacementOrder: async () => unavailable(),
  };
}

/** Compares phone numbers by their last 10 digits so +91 and spacing do not matter. */
export function samePhone(a: string, b: string): boolean {
  const last10 = (v: string) => v.replace(/\D/g, "").slice(-10);
  return last10(a).length === 10 && last10(a) === last10(b);
}
