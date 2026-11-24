import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotForm } from "@/components/auth/RecoveryForms";

export const metadata: Metadata = { title: "Team: forgot password", robots: { index: false } };

export default function Page() {
  return (
    <AuthShell
      eyebrow="Team"
      title="Forgot your password?"
      intro="Enter your work email and we will send a reset link."
      tone="ink"
    >
      <ForgotForm type="staff" />
    </AuthShell>
  );
}
