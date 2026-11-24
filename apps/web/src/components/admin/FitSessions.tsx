"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type FitDraft,
  type FitRow,
  adminAddFit,
  adminDeleteFit,
  adminListFit,
  adminSuggestChart,
} from "@/lib/api-extra";
import { adminSaveChart } from "@/lib/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const VERDICT = { too_small: "Too small", good: "Good fit", too_large: "Too large" } as const;
const blank = {
  sizeTried: "",
  heightCm: "",
  bustCm: "",
  waistCm: "",
  hipCm: "",
  fit: "good" as keyof typeof VERDICT,
  opacity: "untested" as "untested" | "ok" | "sheer",
};

/**
 * Record each fitting (anonymous measurements and a verdict), then draft size-chart ranges from
 * the "good fit" results. A person reviews the draft before it replaces the live chart.
 */
export function FitSessions({ token, canDelete }: { token: string; canDelete: boolean }) {
  const [productId, setProductId] = useState("high-rise-squat-proof-legging");
  const [rows, setRows] = useState<FitRow[]>([]);
  const [draft, setDraft] = useState<FitDraft | null>(null);
  const [draftJson, setDraftJson] = useState("");
  const [f, setF] = useState(blank);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await adminListFit(token, productId));
    } catch {
      setMsg("Could not load entries.");
    }
  }, [token, productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((v) => ({ ...v, [k]: e.target.value }));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await adminAddFit(token, {
        productId,
        sizeTried: f.sizeTried,
        heightCm: Number(f.heightCm),
        bustCm: Number(f.bustCm),
        waistCm: Number(f.waistCm),
        hipCm: Number(f.hipCm),
        fit: f.fit,
        opacityOk: f.opacity === "untested" ? null : f.opacity === "ok",
      });
      // Keep the measurements blank for the next person but remember the size and verdict.
      setF((v) => ({ ...blank, sizeTried: v.sizeTried, fit: v.fit }));
      setMsg("Entry saved.");
      await load();
    } catch {
      setMsg("That entry was rejected. Check the size and the measurements (in cm).");
    }
  }

  async function suggest() {
    setMsg(null);
    try {
      const d = await adminSuggestChart(token, productId);
      setDraft(d);
      setDraftJson(JSON.stringify(d.draftChart, null, 2));
    } catch {
      setMsg("No chart exists for that product yet. Seed or save one first.");
    }
  }

  async function save() {
    setMsg(null);
    try {
      await adminSaveChart(token, JSON.parse(draftJson));
      setMsg("Size chart saved. The finder uses it straight away.");
    } catch {
      setMsg("The chart was rejected. Bands must be ordered smallest to largest.");
    }
  }

  const counts = rows.reduce<Record<string, number>>((m, r) => {
    m[r.sizeTried] = (m[r.sizeTried] ?? 0) + 1;
    return m;
  }, {});

  return (
    <div className="flex flex-col gap-8">
      <div role="status" aria-live="polite" className="text-sm">
        {msg}
      </div>

      <div className="max-w-sm">
        <Input
          id="fit-product"
          label="Product handle"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        />
      </div>

      <form onSubmit={add} className="flex max-w-xl flex-col gap-3">
        <h2 className="text-xl font-semibold">Record a fitting</h2>
        <p className="text-sm text-muted">
          Anonymous: measure the person, note the size they tried and how it fitted. No names.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Input
            id="fit-size"
            label="Size tried"
            required
            value={f.sizeTried}
            onChange={set("sizeTried")}
          />
          <Input
            id="fit-height"
            label="Height (cm)"
            type="number"
            step="0.5"
            required
            value={f.heightCm}
            onChange={set("heightCm")}
          />
          <Input
            id="fit-bust"
            label="Bust (cm)"
            type="number"
            step="0.5"
            required
            value={f.bustCm}
            onChange={set("bustCm")}
          />
          <Input
            id="fit-waist"
            label="Waist (cm)"
            type="number"
            step="0.5"
            required
            value={f.waistCm}
            onChange={set("waistCm")}
          />
          <Input
            id="fit-hip"
            label="Hip (cm)"
            type="number"
            step="0.5"
            required
            value={f.hipCm}
            onChange={set("hipCm")}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="fit-verdict" className="text-sm font-medium">
              How did it fit?
            </label>
            <select
              id="fit-verdict"
              value={f.fit}
              onChange={set("fit")}
              className="min-h-11 rounded-sm border border-line bg-card px-3"
            >
              {Object.entries(VERDICT).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="fit-opacity" className="text-sm font-medium">
              Squat test
            </label>
            <select
              id="fit-opacity"
              value={f.opacity}
              onChange={set("opacity")}
              className="min-h-11 rounded-sm border border-line bg-card px-3"
            >
              <option value="untested">Not tested</option>
              <option value="ok">Stayed opaque</option>
              <option value="sheer">Went sheer</option>
            </select>
          </div>
        </div>
        <Button type="submit">Save entry</Button>
      </form>

      <section aria-labelledby="fit-entries">
        <h2 id="fit-entries" className="mb-2 text-xl font-semibold">
          Entries ({rows.length})
        </h2>
        <p className="mb-3 text-sm text-muted">
          {Object.keys(counts).length === 0
            ? "Nothing recorded yet."
            : Object.entries(counts)
                .map(([s, n]) => `${s}: ${n}`)
                .join(" · ")}
        </p>
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <caption className="sr-only">Fit session entries</caption>
              <thead>
                <tr className="border-b border-line">
                  {["Size", "Height", "Bust", "Waist", "Hip", "Fit", "Squat", ""].map((h, i) => (
                    <th key={`${h}-${i}`} scope="col" className="py-2 pr-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className="border-b border-line">
                    <td className="py-2 pr-3">{r.sizeTried}</td>
                    <td className="py-2 pr-3">{r.heightCm}</td>
                    <td className="py-2 pr-3">{r.bustCm}</td>
                    <td className="py-2 pr-3">{r.waistCm}</td>
                    <td className="py-2 pr-3">{r.hipCm}</td>
                    <td className="py-2 pr-3">{VERDICT[r.fit]}</td>
                    <td className="py-2 pr-3">
                      {r.opacityOk === null || r.opacityOk === undefined
                        ? "–"
                        : r.opacityOk
                          ? "Opaque"
                          : "Sheer"}
                    </td>
                    <td className="py-2">
                      {canDelete ? (
                        <button
                          onClick={() => adminDeleteFit(token, r._id).then(load)}
                          className="min-h-11 px-2 underline"
                        >
                          Delete
                          <span className="sr-only">
                            {" "}
                            entry {r.sizeTried} hip {r.hipCm}
                          </span>
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="fit-draft" className="flex max-w-2xl flex-col gap-3">
        <h2 id="fit-draft" className="text-xl font-semibold">
          Draft a size chart
        </h2>
        <p className="text-sm text-muted">
          Uses people who said a size fitted well (at least 3 per size). Sizes without enough
          entries keep their current ranges. Review the draft before saving.
        </p>
        <Button variant="secondary" className="w-fit" onClick={suggest}>
          Draft from fittings
        </Button>
        {draft ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              Based on {draft.sessionCount} entries.{" "}
              {draft.suggestion.suggestions.length > 0
                ? `Updated: ${draft.suggestion.suggestions.map((s) => `${s.label} (${s.goodCount})`).join(", ")}.`
                : "No size has enough good fits yet."}
            </p>
            {draft.suggestion.insufficient.length > 0 ? (
              <p className="text-sm text-muted">
                Need more good fits:{" "}
                {draft.suggestion.insufficient
                  .map((s) => `${s.label} (${s.goodCount}/3)`)
                  .join(", ")}
                .
              </p>
            ) : null}
            {draft.suggestion.opacityFailures > 0 ? (
              <p className="text-sm font-semibold">
                {draft.suggestion.opacityFailures} fitting(s) went sheer: do not publish a
                squat-proof claim until the lab result is in.
              </p>
            ) : null}
            {draft.suggestion.warnings.length > 0 ? (
              <ul role="alert" className="list-disc pl-5 text-sm">
                {draft.suggestion.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            <label htmlFor="fit-draft-json" className="text-sm font-medium">
              Draft chart (JSON, editable)
            </label>
            <textarea
              id="fit-draft-json"
              rows={12}
              value={draftJson}
              onChange={(e) => setDraftJson(e.target.value)}
              className="rounded-sm border border-line bg-card p-3 font-mono text-xs"
            />
            <Button onClick={save} disabled={!canDelete}>
              {canDelete ? "Save as the live chart" : "Only admins can save charts"}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
