import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { StaffLoginForm } from "@/components/auth/StaffForms";

export const metadata: Metadata = { title: "Team sign in", robots: { index: false } };

export default function Page() {
  return (
    <AuthShell
      eyebrow="Team"
      title="Sign in"
      intro="For the people running CurveFit: exchanges, reviews, fittings and size charts."
      art={{ kind: "tee", colour: "sand" }}
      tone="ink"
    >
      <StaffLoginForm />
    </AuthShell>
  );
}
