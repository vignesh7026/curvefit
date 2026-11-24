import { NextResponse } from "next/server";

interface Line {
  variantId: string;
  quantity: number;
}

const MUTATION = `mutation($lines:[CartLineInput!]!){
  cartCreate(input:{ lines:$lines }){
    cart{ checkoutUrl }
    userErrors{ message }
  }
}`;

/**
 * Creates a Shopify cart and returns its hosted checkout URL, so card data never touches our
 * servers. Needs SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN.
 */
export async function POST(req: Request) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
  if (!domain || !token) {
    // Opt-in demo so the whole shopping path can be tried before a store exists. It takes no
    // payment and creates no order, and is never available once Shopify is configured.
    if (process.env.DEMO_CHECKOUT === "1") {
      return NextResponse.json({ data: { checkoutUrl: "/checkout/demo" } });
    }
    return NextResponse.json(
      { error: { code: "SHOPIFY_NOT_CONFIGURED", message: "Checkout is not available yet" } },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as { lines?: Line[] } | null;
  const lines = body?.lines;
  const valid =
    Array.isArray(lines) &&
    lines.length > 0 &&
    lines.length <= 20 &&
    lines.every(
      (l) =>
        typeof l.variantId === "string" &&
        l.variantId.startsWith("gid://shopify/ProductVariant/") &&
        Number.isInteger(l.quantity) &&
        l.quantity >= 1 &&
        l.quantity <= 10,
    );
  if (!valid) {
    return NextResponse.json(
      { error: { code: "INVALID_CART", message: "Your cart could not be read" } },
      { status: 400 },
    );
  }

  const version = process.env.SHOPIFY_API_VERSION ?? "2025-01";
  const res = await fetch(`https://${domain}/api/${version}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({
      query: MUTATION,
      variables: {
        lines: lines.map((l) => ({ merchandiseId: l.variantId, quantity: l.quantity })),
      },
    }),
  });
  const json = (await res.json().catch(() => null)) as {
    data?: { cartCreate: { cart: { checkoutUrl: string } | null; userErrors: unknown[] } };
  } | null;
  const url = json?.data?.cartCreate.cart?.checkoutUrl;
  if (!res.ok || !url || json?.data?.cartCreate.userErrors.length) {
    return NextResponse.json(
      {
        error: {
          code: "CHECKOUT_FAILED",
          message: "We could not start checkout. Please try again.",
        },
      },
      { status: 502 },
    );
  }
  return NextResponse.json({ data: { checkoutUrl: url } });
}
