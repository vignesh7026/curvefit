"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

export function ViewItemTracker({ handle, price }: { handle: string; price: number }) {
  useEffect(() => {
    track("view_item", { item_id: handle, value: price, currency: "INR" });
  }, [handle, price]);
  return null;
}
