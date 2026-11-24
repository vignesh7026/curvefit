"use client";

import Link from "next/link";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/catalogue";
import { RestockAlertForm } from "./RestockAlertForm";
import { SizeFinder } from "./SizeFinder";
import { Button } from "./ui/Button";
import { SizeSelector } from "./ui/SizeSelector";

export function ProductPurchase({ product }: { product: Product }) {
  const cart = useCart();
  const [size, setSize] = useState<string | null>(null);
  const [recommended, setRecommended] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const soldOut = product.sizes.filter((s) => !s.available).map((s) => s.label);

  function addToCart() {
    const variant = product.sizes.find((s) => s.label === size);
    if (!variant) return;
    cart.add({
      handle: product.handle,
      title: product.title,
      size: variant.label,
      price: product.price,
      variantId: variant.variantId,
    });
    track("add_to_cart", {
      item_id: product.handle,
      size: variant.label,
      value: product.price,
      currency: "INR",
    });
    setAdded(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <SizeSelector
        sizes={product.sizes}
        value={size}
        onChange={(s) => {
          setSize(s);
          setAdded(false);
        }}
        recommended={recommended}
      />
      <Button onClick={addToCart} disabled={!size}>
        {size ? `Add ${size} to cart` : "Choose a size"}
      </Button>
      <div role="status" aria-live="polite">
        {added ? (
          <p className="text-sm">
            Added to your cart.{" "}
            <Link href="/cart" className="font-semibold underline">
              View cart
            </Link>
          </p>
        ) : null}
      </div>
      <SizeFinder
        productId={product.handle}
        onRecommended={(s) => {
          setRecommended(s);
          setSize(s);
          setAdded(false);
        }}
      />
      <RestockAlertForm productId={product.handle} sizes={soldOut} />
    </div>
  );
}
