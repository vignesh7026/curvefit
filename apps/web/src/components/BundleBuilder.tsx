"use client";

import Link from "next/link";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { useCart } from "@/lib/cart";
import { type Product, formatINR } from "@/lib/catalogue";
import { Button } from "./ui/Button";

/** Pick a bra and a legging size and add both together. No bundle discount is implied. */
export function BundleBuilder({ bra, legging }: { bra: Product; legging: Product }) {
  const cart = useCart();
  const [braSize, setBraSize] = useState("");
  const [legSize, setLegSize] = useState("");
  const [added, setAdded] = useState(false);

  const pick = (
    id: string,
    label: string,
    product: Product,
    value: string,
    set: (v: string) => void,
  ) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}: {product.title} ({formatINR(product.price)})
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          set(e.target.value);
          setAdded(false);
        }}
        className="min-h-11 rounded-sm border border-line bg-card px-3"
      >
        <option value="">Choose a size</option>
        {product.sizes
          .filter((s) => s.available)
          .map((s) => (
            <option key={s.label}>{s.label}</option>
          ))}
      </select>
    </div>
  );

  function addBoth() {
    for (const [product, size] of [
      [bra, braSize],
      [legging, legSize],
    ] as const) {
      const v = product.sizes.find((s) => s.label === size);
      cart.add({
        handle: product.handle,
        title: product.title,
        size,
        price: product.price,
        variantId: v?.variantId,
      });
      track("add_to_cart", {
        item_id: product.handle,
        size,
        value: product.price,
        currency: "INR",
      });
    }
    setAdded(true);
  }

  return (
    <section aria-labelledby="bundle" className="rounded-sm border border-line bg-card p-4">
      <h2 id="bundle" className="text-xl font-semibold">
        Build a set
      </h2>
      <p className="mt-1 text-sm text-muted">Bra and legging, sized separately.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {pick("bundle-bra", "Bra", bra, braSize, setBraSize)}
        {pick("bundle-leg", "Legging", legging, legSize, setLegSize)}
      </div>
      <Button className="mt-4" onClick={addBoth} disabled={!braSize || !legSize}>
        Add both to cart
      </Button>
      <div role="status" aria-live="polite" className="mt-2 text-sm">
        {added ? (
          <>
            Added.{" "}
            <Link href="/cart" className="font-semibold underline">
              View cart
            </Link>
          </>
        ) : null}
      </div>
    </section>
  );
}
