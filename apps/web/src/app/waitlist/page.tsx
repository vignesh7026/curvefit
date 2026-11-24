import type { Metadata } from "next";
import { WaitlistForm } from "@/components/WaitlistForm";

export const metadata: Metadata = { title: "Join the list" };

export default function WaitlistPage() {
  return (
    <div>
      <h1 className="mb-2 text-3xl">Be first in line</h1>
      <p className="mb-6 max-w-xl text-muted">
        Join the waitlist for launch news and first pick of every size. Friends who join with your
        link move you up.
      </p>
      <WaitlistForm />
    </div>
  );
}
