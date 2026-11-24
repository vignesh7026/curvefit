"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/analytics";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/catalogue";

const DEMO = process.env.NEXT_PUBLIC_DEMO_CHECKOUT === "1";

/** Stand-in for Shopify's hosted checkout while no store is connected. Takes no payment. */
export default function DemoCheckout() {
  const cart = useCart();
  const [placed, setPlaced] = useState<string | null>(null);

  if (!DEMO) {
    return (
      <div>
        <h1 className="text-3xl">Checkout is not available</h1>
        <p className="mt-2 text-muted">This page is only used for demonstrations.</p>
        <Link href="/cart" className="mt-4 inline-block font-semibold text-brand underline">
          Back to your cart
        </Link>
      </div>
    );
  }

  if (placed) {
    return (
      <div role="status">
        <h1 className="text-3xl">Demo order placed</h1>
        <p className="mt-2 text-muted">
          Reference {placed}. No payment was taken and nothing will be shipped.
        </p>
        <Link href="/shop" className="mt-4 inline-block font-semibold text-brand underline">
          Back to the shop
        </Link>
      </div>
    );
  }

  function place() {
    const id = `DEMO-${Date.now()}`;
    track("purchase", { transaction_id: id, value: cart.subtotal, currency: "INR" });
    cart.clear();
    setPlaced(id);
  }

  return (
    <div className="max-w-xl">
      <p
        role="note"
        className="mb-4 rounded-sm border border-line bg-card p-3 text-sm font-semibold"
      >
        Demo checkout: no payment is taken.
      </p>
      <h1 className="mb-4 text-3xl">Review your order</h1>
      {cart.lines.length === 0 ? (
        <p className="text-muted">Your cart is empty.</p>
      ) : (
        <>
          <ul className="divide-y divide-line rounded-sm border border-line bg-card">
            {cart.lines.map((l) => (
              <li key={l.key} className="flex justify-between gap-3 p-4 text-sm">
                <span>
                  {l.quantity} × {l.title} ({l.size})
                </span>
                <span>{formatINR(l.price * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-lg font-semibold">Total: {formatINR(cart.subtotal)}</p>
          <Button className="mt-4" onClick={place}>
            Place demo order
          </Button>
        </>
      )}
    </div>
  );
}
