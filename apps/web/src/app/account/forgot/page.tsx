import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotForm } from "@/components/auth/RecoveryForms";

export const metadata: Metadata = { title: "Forgot your password" };

export default function Page() {
  return (
    <AuthShell
      eyebrow="Account"
      title="Forgot your password?"
      intro="Tell us your email and we will send a link to choose a new one."
    >
      <ForgotForm type="customer" />
    </AuthShell>
  );
}
