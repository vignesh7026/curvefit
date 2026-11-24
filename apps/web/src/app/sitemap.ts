import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/catalogue";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const products = await getProducts();
  const fixed = [
    "",
    "/shop",
    "/size-guide",
    "/track",
    "/exchange",
    "/returns",
    "/privacy",
    "/waitlist",
  ];
  return [
    ...fixed.map((p) => ({ url: `${base}${p}` })),
    ...products.map((p) => ({ url: `${base}/products/${p.handle}` })),
  ];
}
