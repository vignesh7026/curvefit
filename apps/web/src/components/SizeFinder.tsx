"use client";

import { useRef, useState } from "react";
import { ApiError, type SizeAnswer, requestSize } from "@/lib/api";
import { track } from "@/lib/analytics";
import { addDeleteToken, saveFitProfile } from "@/lib/storage";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

interface Props {
  productId: string;
  onRecommended: (size: string) => void;
}

type Fields = { heightCm: string; bustCm: string; waistCm: string; hipCm: string };

export function SizeFinder({ productId, onRecommended }: Props) {
  const [fields, setFields] = useState<Fields>({
    heightCm: "",
    bustCm: "",
    waistCm: "",
    hipCm: "",
  });
  const [consent, setConsent] = useState(false);
  const [answer, setAnswer] = useState<SizeAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!started.current) {
      started.current = true;
      track("quiz_start", { product: productId });
    }
    setFields((f) => ({ ...f, [k]: e.target.value }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await requestSize({
        productId,
        measurements: {
          heightCm: Number(fields.heightCm),
          bustCm: Number(fields.bustCm),
          waistCm: Number(fields.waistCm),
          hipCm: Number(fields.hipCm),
        },
        consentToStore: consent,
      });
      setAnswer(result);
      // Kept in this browser only: powers "people like me" reviews and the delete option.
      saveFitProfile({ heightCm: Number(fields.heightCm), hipCm: Number(fields.hipCm) });
      if (result.deleteToken) addDeleteToken(result.deleteToken);
      // Events carry the size only, never the measurements.
      track("quiz_complete", { product: productId });
      if (result.size) {
        track("size_recommended", { product: productId, size: result.size });
        onRecommended(result.size);
      }
    } catch (err) {
      setAnswer(null);
      setError(
        err instanceof ApiError && err.status === 404
          ? "The size finder is not available for this product yet. Please check the size chart."
          : err instanceof ApiError && err.code === "VALIDATION_ERROR"
            ? "Please check your measurements: all four are needed, in centimetres."
            : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-sm border border-line bg-card p-4"
    >
      <h2 className="text-lg font-semibold">Find my size</h2>
      <div className="grid grid-cols-2 gap-3">
        <Input
          id="height"
          label="Height (cm)"
          type="number"
          inputMode="decimal"
          step="0.5"
          required
          value={fields.heightCm}
          onChange={set("heightCm")}
        />
        <Input
          id="bust"
          label="Bust (cm)"
          type="number"
          inputMode="decimal"
          step="0.5"
          required
          value={fields.bustCm}
          onChange={set("bustCm")}
        />
        <Input
          id="waist"
          label="Waist (cm)"
          type="number"
          inputMode="decimal"
          step="0.5"
          required
          value={fields.waistCm}
          onChange={set("waistCm")}
        />
        <Input
          id="hip"
          label="Hip (cm)"
          type="number"
          inputMode="decimal"
          step="0.5"
          required
          value={fields.hipCm}
          onChange={set("hipCm")}
        />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 size-5"
        />
        <span>
          Save my measurements to improve our size charts. Optional; you can ask us to delete them
          any time.
        </span>
      </label>
      <Button type="submit" disabled={busy}>
        {busy ? "Checking…" : "Recommend my size"}
      </Button>

      <div role="status" aria-live="polite">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {answer?.status === "ok" && answer.size ? (
          <div className="text-sm">
            <p className="text-base font-semibold">We recommend {answer.size}</p>
            {answer.alternateSize ? <p>You could also consider {answer.alternateSize}.</p> : null}
            {answer.notes.map((n) => (
              <p key={n} className="text-muted">
                {n}
              </p>
            ))}
          </div>
        ) : null}
        {answer?.status === "out_of_range" ? (
          <p className="text-sm">{answer.notes.join(" ")}</p>
        ) : null}
      </div>
    </form>
  );
}
