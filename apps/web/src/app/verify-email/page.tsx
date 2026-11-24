import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmail } from "@/components/auth/VerifyEmail";

export const metadata: Metadata = { title: "Confirm your email" };

export default function Page() {
  return (
    <div className="mx-auto max-w-xl py-10">
      <Suspense>
        <VerifyEmail />
      </Suspense>
    </div>
  );
}
