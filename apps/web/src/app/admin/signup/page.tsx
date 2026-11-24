import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { StaffSignupForm } from "@/components/auth/StaffForms";

export const metadata: Metadata = { title: "Join the team", robots: { index: false } };

export default function Page() {
  return (
    <AuthShell
      eyebrow="Team"
      title="Join the team"
      intro="Set up your staff account using the invitation an admin sent you."
      art={{ kind: "short", colour: "ink" }}
      tone="ink"
    >
      <Suspense>
        <StaffSignupForm />
      </Suspense>
    </AuthShell>
  );
}
