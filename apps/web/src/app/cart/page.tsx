"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/analytics";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/catalogue";

export default function CartPage() {
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demo = process.env.NEXT_PUBLIC_DEMO_CHECKOUT === "1";
  const checkable = demo || cart.lines.every((l) => l.variantId);

  async function checkout() {
    setError(null);
    setBusy(true);
    track("begin_checkout", { value: cart.subtotal, currency: "INR", items: cart.count });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        }),
      });
      const json = (await res.json()) as {
        data?: { checkoutUrl: string };
        error?: { message: string };
      };
      if (!res.ok || !json.data) {
        setError(json.error?.message ?? "We could not start checkout.");
        return;
      }
      window.location.assign(json.data.checkoutUrl);
    } catch {
      setError("We could not start checkout. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (cart.lines.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold">Your cart</h1>
        <p className="mt-3 text-muted">Your cart is empty.</p>
        <Link href="/shop" className="mt-4 inline-block font-semibold text-brand underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold">Your cart</h1>
      <ul className="flex flex-col divide-y divide-line rounded-sm border border-line bg-card">
        {cart.lines.map((l) => (
          <li key={l.key} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <Link href={`/products/${l.handle}`} className="font-semibold hover:underline">
                {l.title}
              </Link>
              <p className="text-sm text-muted">
                Size {l.size} · {formatINR(l.price)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label={`Decrease quantity of ${l.title} ${l.size}`}
                onClick={() => cart.setQuantity(l.key, l.quantity - 1)}
                className="size-11 rounded-sm border border-line"
              >
                −
              </button>
              <span aria-live="polite" className="w-6 text-center">
                {l.quantity}
              </span>
              <button
                aria-label={`Increase quantity of ${l.title} ${l.size}`}
                onClick={() => cart.setQuantity(l.key, l.quantity + 1)}
                className="size-11 rounded-sm border border-line"
              >
                +
              </button>
              <button
                onClick={() => cart.remove(l.key)}
                className="ml-2 min-h-11 px-2 text-sm underline"
              >
                Remove
                <span className="sr-only">
                  {" "}
                  {l.title} {l.size}
                </span>
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-3">
        <p className="text-lg font-semibold">Subtotal: {formatINR(cart.subtotal)}</p>
        <p className="text-sm text-muted">
          Shipping and taxes are shown at checkout. You can pay by UPI, card, wallet or cash on
          delivery where available.
        </p>
        {!checkable ? (
          <p role="status" className="rounded-sm border border-line bg-card p-3 text-sm">
            This is a preview catalogue, so checkout opens once the store is connected.
          </p>
        ) : null}
        {demo ? (
          <p role="note" className="rounded-sm border border-line bg-card p-3 text-sm">
            Demo mode: checkout is a stand-in and takes no payment.
          </p>
        ) : null}
        <Button onClick={checkout} disabled={busy || !checkable}>
          {busy ? "Starting checkout…" : "Checkout"}
        </Button>
        <div role="alert" className="text-sm text-red-700">
          {error}
        </div>
      </div>
    </div>
  );
}
