"use client";

import { useSearchParams } from "next/navigation";

/** Shown on the home page right after someone deletes their account. */
export function DeletedNote() {
  const deleted = useSearchParams().get("deleted") === "1";
  if (!deleted) return null;
  return (
    <p role="status" className="mb-10 border-l-2 border-sage py-1 pl-4">
      Your account has been deleted. We are sorry to see you go, and you are always welcome back.
    </p>
  );
}
