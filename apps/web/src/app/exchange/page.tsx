"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ApiError,
  type ExchangeResult,
  type TrackedOrder,
  requestExchangeOtp,
  submitExchange,
  trackOrder,
} from "@/lib/api";
import { track } from "@/lib/analytics";
import { usedSizeFinder } from "@/lib/storage";

type Step = "order" | "code" | "done";

export default function ExchangePage() {
  const [step, setStep] = useState<Step>("order");
  const [kind, setKind] = useState<"exchange" | "return">("exchange");
  const [f, setF] = useState({
    orderNumber: "",
    phone: "",
    otp: "",
    item: "",
    fromSize: "",
    toSize: "",
    reason: "",
  });
  const [items, setItems] = useState<TrackedOrder["items"]>([]);
  const [result, setResult] = useState<ExchangeResult | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((v) => ({ ...v, [k]: e.target.value }));

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await requestExchangeOtp({ orderNumber: f.orderNumber, phone: f.phone });
      // Offer the items on the order, so the name and size always match the store.
      // Same details as order tracking, so this reveals nothing extra. Falls back to typing.
      trackOrder({ orderNumber: f.orderNumber, phone: f.phone })
        .then((o) => {
          setItems(o.items);
          const first = o.items[0];
          if (first) setF((v) => ({ ...v, item: first.title, fromSize: first.size }));
        })
        .catch(() => undefined);
      setStep("code");
    } catch {
      setMsg("Please check your order number and phone number.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await submitExchange({
        kind,
        orderNumber: f.orderNumber,
        phone: f.phone,
        otp: f.otp,
        item: f.item,
        fromSize: f.fromSize,
        toSize: kind === "exchange" ? f.toSize : undefined,
        reason: f.reason || undefined,
        sizeFinderUsed: usedSizeFinder(),
      });
      track("exchange_request", { kind });
      setResult(res);
      setStep("done");
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setMsg(
        code === "OUT_OF_STOCK"
          ? "That size is out of stock right now. Try another size."
          : code === "ALREADY_EXCHANGED"
            ? "This order already has a free exchange. You can still request a return."
            : code === "INVALID_OTP"
              ? "That code is wrong or has expired."
              : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return (
      <div role="status">
        <h1 className="text-3xl">
          {kind === "exchange" ? "Exchange requested" : "Return requested"}
        </h1>
        <p className="mt-2 text-muted">
          {result?.courierReference
            ? `Pickup is booked (reference ${result.courierReference}).`
            : "We will confirm your pickup by WhatsApp and email."}
        </p>
        {result?.replacementOrder ? (
          <p className="mt-1 text-muted">Your replacement is order {result.replacementOrder}.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <h1 className="mb-1 text-3xl">Exchanges and returns</h1>
      <p className="mb-6 text-sm text-muted">
        One free size exchange per order. See our{" "}
        <a href="/returns" className="underline">
          returns policy
        </a>
        .
      </p>

      <fieldset className="mb-4" disabled={step === "code"}>
        <legend className="mb-2 text-sm font-medium">What would you like to do?</legend>
        <div className="flex gap-4">
          {(["exchange", "return"] as const).map((k) => (
            <label key={k} className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="radio"
                name="kind"
                checked={kind === k}
                onChange={() => setKind(k)}
                className="size-5"
              />
              {k === "exchange" ? "Exchange for another size" : "Return"}
            </label>
          ))}
        </div>
      </fieldset>

      <form onSubmit={step === "order" ? sendCode : submit} className="flex flex-col gap-4">
        <Input
          id="order"
          label="Order number"
          required
          value={f.orderNumber}
          onChange={set("orderNumber")}
        />
        <Input
          id="phone"
          label="Phone number"
          type="tel"
          inputMode="tel"
          required
          value={f.phone}
          onChange={set("phone")}
          hint="The number used for the order."
        />
        {step === "code" ? (
          <>
            <Input
              id="otp"
              label="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={f.otp}
              onChange={set("otp")}
            />
            {items.length > 0 ? (
              <div className="flex flex-col gap-1">
                <label htmlFor="item" className="text-sm font-medium">
                  Item
                </label>
                <select
                  id="item"
                  value={f.item}
                  onChange={(e) => {
                    const chosen = items.find((i) => i.title === e.target.value);
                    setF((v) => ({
                      ...v,
                      item: e.target.value,
                      fromSize: chosen?.size ?? v.fromSize,
                    }));
                  }}
                  className="min-h-11 rounded-sm border border-line bg-card px-3"
                >
                  {items.map((i) => (
                    <option key={`${i.title}-${i.size}`} value={i.title}>
                      {i.title}
                      {i.size ? ` (${i.size})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <Input id="item" label="Item" required value={f.item} onChange={set("item")} />
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="from"
                label="Current size"
                required
                value={f.fromSize}
                onChange={set("fromSize")}
              />
              {kind === "exchange" ? (
                <Input
                  id="to"
                  label="New size"
                  required
                  value={f.toSize}
                  onChange={set("toSize")}
                />
              ) : null}
            </div>
            {kind === "return" ? (
              <Input
                id="reason"
                label="Reason (optional)"
                value={f.reason}
                onChange={set("reason")}
              />
            ) : null}
          </>
        ) : null}
        <div role="alert" className="text-sm text-red-700">
          {msg}
        </div>
        <Button type="submit" disabled={busy}>
          {step === "order"
            ? "Send me a code"
            : kind === "exchange"
              ? "Request exchange"
              : "Request return"}
        </Button>
      </form>
    </div>
  );
}
