import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountHome } from "@/components/account/AccountHome";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default function AccountPage() {
  return (
    <Suspense>
      <AccountHome />
    </Suspense>
  );
}
