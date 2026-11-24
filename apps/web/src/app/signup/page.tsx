import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { CustomerSignupForm } from "@/components/auth/CustomerSignupForm";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Join us"
      title="Create an account"
      intro="Keep your orders and details in one place. It takes a minute, and you can delete the account whenever you like."
      art={{ kind: "bra", colour: "clay" }}
    >
      <Suspense>
        <CustomerSignupForm />
      </Suspense>
    </AuthShell>
  );
}
