"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { type TrackedOrder, trackOrder } from "@/lib/api";

export default function TrackPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOrder(null);
    try {
      setOrder(await trackOrder({ orderNumber, phone }));
    } catch {
      setError("We could not find an order with those details.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="mb-6 text-3xl">Track your order</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          id="t-order"
          label="Order number"
          required
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
        />
        <Input
          id="t-phone"
          label="Phone number"
          type="tel"
          inputMode="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          hint="The number used for the order."
        />
        <Button type="submit" disabled={busy}>
          {busy ? "Looking…" : "Track order"}
        </Button>
      </form>
      <div role="status" aria-live="polite" className="mt-6">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {order ? (
          <div className="rounded-sm border border-line bg-card p-4">
            <p className="font-semibold">
              Order #{order.orderNumber}: {order.status.replaceAll("_", " ").toLowerCase()}
            </p>
            <ul className="mt-2 text-sm text-muted">
              {order.items.map((i) => (
                <li key={`${i.title}-${i.size}`}>
                  {i.quantity} × {i.title} {i.size ? `(${i.size})` : ""}
                </li>
              ))}
            </ul>
            {order.trackingUrl ? (
              <a
                href={order.trackingUrl}
                className="mt-3 inline-block font-semibold text-brand underline"
                rel="noopener noreferrer"
              >
                Track with the courier
              </a>
            ) : (
              <p className="mt-3 text-sm">Tracking will appear here once your order ships.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
