"use client";

import { useEffect, useState } from "react";
import { joinWaitlist } from "@/lib/api";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

const SIZES = ["XL", "2XL", "3XL", "4XL", "5XL", "6XL"];

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [sizes, setSizes] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [ref, setRef] = useState<string | undefined>();
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("ref");
    if (r && /^[A-Z2-9]{8}$/.test(r)) setRef(r);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      const res = await joinWaitlist({
        email,
        interestedSizes: sizes,
        referredBy: ref,
        consent: true,
      });
      setCode(res.referralCode);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  if (code) {
    const link = `${window.location.origin}/waitlist?ref=${code}`;
    return (
      <div role="status" className="rounded-sm border border-line bg-card p-4">
        <p className="font-semibold">You are on the list.</p>
        <p className="mt-1 text-sm">
          Share your link with friends: <span className="break-all font-mono">{link}</span>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex max-w-md flex-col gap-4 rounded-sm border border-line bg-card p-4"
    >
      <Input
        id="wl-email"
        label="Email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Sizes you wear (optional)</legend>
        <div className="flex flex-wrap gap-3">
          {SIZES.map((s) => (
            <label key={s} className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-5"
                checked={sizes.includes(s)}
                onChange={(e) =>
                  setSizes((prev) =>
                    e.target.checked ? [...prev, s] : prev.filter((x) => x !== s),
                  )
                }
              />
              {s}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 size-5"
        />
        <span>Email me about the launch. See our privacy policy.</span>
      </label>
      <Button type="submit" disabled={state === "busy"}>
        {state === "busy" ? "Joining…" : "Join the list"}
      </Button>
      {state === "error" ? (
        <p role="alert" className="text-sm text-red-700">
          Something went wrong. Please try again.
        </p>
      ) : null}
    </form>
  );
}
