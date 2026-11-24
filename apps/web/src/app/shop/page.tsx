import type { Metadata } from "next";
import { BundleBuilder } from "@/components/BundleBuilder";
import { ProductCard } from "@/components/ui/ProductCard";
import { getProducts } from "@/lib/catalogue";

export const metadata: Metadata = { title: "Shop" };

export default async function Shop() {
  const products = await getProducts();
  const bra = products.find((p) => p.handle === "high-impact-sports-bra");
  const legging = products.find((p) => p.handle === "high-rise-squat-proof-legging");
  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="mb-6 text-3xl">Shop</h1>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.handle} product={p} />
          ))}
        </div>
      </div>
      {bra && legging ? <BundleBuilder bra={bra} legging={legging} /> : null}
    </div>
  );
}
