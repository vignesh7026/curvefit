import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/RecoveryForms";

export const metadata: Metadata = { title: "Team: new password", robots: { index: false } };

export default function Page() {
  return (
    <AuthShell eyebrow="Team" title="Choose a new password" tone="ink">
      <Suspense>
        <ResetForm type="staff" />
      </Suspense>
    </AuthShell>
  );
}
