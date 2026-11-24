"use client";

import { useEffect, useState } from "react";
import { deleteSizeLog } from "@/lib/api";
import { clearDeleteTokens, getDeleteTokens } from "@/lib/storage";
import { Button } from "./ui/Button";

/** Erases the measurements this browser agreed to save, using the tokens kept locally. */
export function DeleteMeasurements() {
  const [count, setCount] = useState(0);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  useEffect(() => setCount(getDeleteTokens().length), []);

  async function erase() {
    setState("busy");
    try {
      await Promise.all(getDeleteTokens().map((t) => deleteSizeLog(t)));
      clearDeleteTokens();
      setCount(0);
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="mt-3 rounded-sm border border-line bg-card p-4">
      <p className="text-sm">
        {count > 0
          ? `This browser has ${count} saved size-finder record${count === 1 ? "" : "s"}.`
          : "This browser has no saved size-finder records."}
      </p>
      <Button
        className="mt-3"
        variant="secondary"
        onClick={erase}
        disabled={count === 0 || state === "busy"}
      >
        Delete my saved measurements
      </Button>
      <div role="status" aria-live="polite" className="mt-2 text-sm">
        {state === "done" ? "Deleted." : null}
        {state === "error" ? "Something went wrong. Please try again." : null}
      </div>
    </div>
  );
}
