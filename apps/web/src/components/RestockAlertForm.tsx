"use client";

import { useState } from "react";
import { createRestockAlert } from "@/lib/api";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

/** Lets a shopper ask to be told when a sold-out size is back. */
export function RestockAlertForm({ productId, sizes }: { productId: string; sizes: string[] }) {
  const [size, setSize] = useState(sizes[0] ?? "");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  if (sizes.length === 0) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      await createRestockAlert({ productId, size, email, consent: true });
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="rounded-sm border border-line bg-card p-4 text-sm">
        Thanks. We will email you when {size} is back.
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-sm border border-line bg-card p-4"
    >
      <h2 className="text-base font-semibold">Sold out in your size?</h2>
      <div className="flex flex-col gap-1">
        <label htmlFor="restock-size" className="text-sm font-medium">
          Size
        </label>
        <select
          id="restock-size"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="min-h-11 rounded-sm border border-line bg-card px-3"
        >
          {sizes.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <Input
        id="restock-email"
        label="Email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 size-5"
        />
        <span>Email me once about this size. See our privacy policy.</span>
      </label>
      <Button type="submit" variant="secondary" disabled={state === "busy"}>
        {state === "busy" ? "Saving…" : "Notify me"}
      </Button>
      {state === "error" ? (
        <p role="alert" className="text-sm text-red-700">
          Something went wrong. Please try again.
        </p>
      ) : null}
    </form>
  );
}
