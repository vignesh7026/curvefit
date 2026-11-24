import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { CustomerLoginForm } from "@/components/auth/CustomerLoginForm";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in"
      intro="See your orders, keep your details, and start an exchange without retyping anything. You never need an account to buy."
    >
      <Suspense>
        <CustomerLoginForm />
      </Suspense>
    </AuthShell>
  );
}
