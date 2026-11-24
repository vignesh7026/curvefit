import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/RecoveryForms";

export const metadata: Metadata = { title: "Choose a new password" };

export default function Page() {
  return (
    <AuthShell eyebrow="Account" title="Choose a new password">
      <Suspense>
        <ResetForm type="customer" />
      </Suspense>
    </AuthShell>
  );
}
