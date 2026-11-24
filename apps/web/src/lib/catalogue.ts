/**
 * Catalogue access. Reads from Shopify's Storefront API when configured, otherwise from the
 * sample catalogue below so the storefront can be developed before the store exists.
 * All Shopify calls from the web app live in this file.
 */
import type { Colourway, GarmentKind } from "@/components/art/Garment";

export interface OpacityTest {
  method: string;
  lab: string;
  result: string;
}

export interface ProductImage {
  url: string;
  alt: string;
}

export interface Product {
  handle: string;
  title: string;
  description: string;
  /** Price in INR. */
  price: number;
  /** Real photos from Shopify. When empty, the illustration in `art` is shown instead. */
  images: ProductImage[];
  /** Which illustration to draw while there are no photos. */
  art: { kind: GarmentKind; colour: Colourway };
  sizes: Array<{ label: string; available: boolean; variantId?: string }>;
  support?: string;
  /** Short spec lines shown on the product page, kept to facts we can stand behind. */
  specs: Array<{ label: string; value: string }>;
  /** "Squat-proof" may only be claimed when a lab result exists. */
  opacityTest?: OpacityTest;
}

const SIZES = ["XL", "2XL", "3XL", "4XL", "5XL", "6XL"].map((label) => ({
  label,
  available: true,
}));

/** Picks an illustration from the product handle or title when Shopify has no art mapping. */
export function artFor(handle: string, title = ""): Product["art"] {
  const h = `${handle} ${title}`.toLowerCase();
  if (h.includes("longline")) return { kind: "longline", colour: "sage" };
  if (h.includes("bra")) return { kind: "bra", colour: "clay" };
  if (h.includes("short")) return { kind: "short", colour: "ink" };
  if (h.includes("tee") || h.includes("shirt") || h.includes("top")) {
    return { kind: "tee", colour: "sand" };
  }
  return { kind: "legging", colour: "plum" };
}

// SAMPLE DATA: prices are the PRD's starting hypotheses, not final.
const sampleProducts: Product[] = [
  {
    handle: "high-rise-squat-proof-legging",
    title: "High-rise ankle legging",
    description:
      "A high, no-roll waistband, a side pocket and four-way stretch that stays opaque. Cut on its own pattern for UK 14 to 28, not scaled up from a smaller size.",
    price: 1799,
    images: [],
    art: { kind: "legging", colour: "plum" },
    sizes: SIZES,
    specs: [
      { label: "Rise", value: "High, with a no-roll waistband" },
      { label: "Fabric", value: "Four-way stretch, opaque" },
      { label: "Pocket", value: "Side pocket" },
      { label: "Length", value: "Ankle" },
    ],
  },
  {
    handle: "bike-short",
    title: "Mid-thigh bike short",
    description:
      "Anti-chafe seams and enough inner-thigh coverage that you can stop thinking about it.",
    price: 1499,
    images: [],
    art: { kind: "short", colour: "ink" },
    sizes: SIZES,
    specs: [
      { label: "Rise", value: "High" },
      { label: "Fabric", value: "Four-way stretch, opaque" },
      { label: "Length", value: "Mid-thigh" },
    ],
  },
  {
    handle: "high-impact-sports-bra",
    title: "High-impact sports bra",
    description:
      "A wide band, adjustable straps and real bounce control. Alpha sizes with an adjustable band, so one size is not a guess.",
    price: 1599,
    images: [],
    art: { kind: "bra", colour: "clay" },
    sizes: SIZES,
    support: "High impact",
    specs: [
      { label: "Support", value: "High impact" },
      { label: "Band", value: "Wide, adjustable" },
      { label: "Straps", value: "Adjustable" },
    ],
  },
  {
    handle: "longline-medium-support-bra",
    title: "Longline medium-support bra",
    description:
      "Everyday support for the gym, yoga or a long walk, with a longer band that stays put.",
    price: 1399,
    images: [],
    art: { kind: "longline", colour: "sage" },
    sizes: SIZES,
    support: "Medium impact",
    specs: [
      { label: "Support", value: "Medium impact" },
      { label: "Length", value: "Longline" },
    ],
  },
  {
    handle: "oversized-training-tee",
    title: "Oversized training tee",
    description: "Breathable, roomy and long enough to cover your hips.",
    price: 1199,
    images: [],
    art: { kind: "tee", colour: "sand" },
    sizes: SIZES,
    specs: [
      { label: "Fit", value: "Oversized, covers the hips" },
      { label: "Fabric", value: "Breathable" },
    ],
  },
];

interface ShopifyProductNode {
  handle: string;
  title: string;
  description: string;
  priceRange: { minVariantPrice: { amount: string } };
  images: { nodes: Array<{ url: string; altText: string | null }> };
  variants: { nodes: Array<{ id: string; title: string; availableForSale: boolean }> };
}

const QUERY = `{
  products(first: 50) {
    nodes {
      handle title description
      priceRange { minVariantPrice { amount } }
      images(first: 6) { nodes { url altText } }
      variants(first: 20) { nodes { id title availableForSale } }
    }
  }
}`;

function shopifyConfigured(): boolean {
  return Boolean(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_STOREFRONT_TOKEN);
}

async function fetchShopifyProducts(): Promise<Product[]> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const version = process.env.SHOPIFY_API_VERSION ?? "2025-01";
  const res = await fetch(`https://${domain}/api/${version}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": process.env.SHOPIFY_STOREFRONT_TOKEN ?? "",
    },
    body: JSON.stringify({ query: QUERY }),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Shopify request failed with status ${res.status}`);
  const json = (await res.json()) as { data?: { products: { nodes: ShopifyProductNode[] } } };
  const nodes = json.data?.products.nodes ?? [];
  return nodes.map((n) => ({
    handle: n.handle,
    title: n.title,
    description: n.description,
    price: Number(n.priceRange.minVariantPrice.amount),
    images: n.images.nodes.map((i) => ({ url: i.url, alt: i.altText ?? n.title })),
    art: artFor(n.handle, n.title),
    sizes: n.variants.nodes.map((v) => ({
      label: v.title,
      available: v.availableForSale,
      variantId: v.id,
    })),
    specs: [],
  }));
}

export async function getProducts(): Promise<Product[]> {
  return shopifyConfigured() ? fetchShopifyProducts() : sampleProducts;
}

export async function getProduct(handle: string): Promise<Product | null> {
  const all = await getProducts();
  return all.find((p) => p.handle === handle) ?? null;
}

export const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
