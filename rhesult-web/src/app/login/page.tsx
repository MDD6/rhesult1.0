import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginPageClient } from "@/features/auth/components/LoginPageClient";

export const metadata: Metadata = {
  title: "Login • Rhesult",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <LoginPageClient />
    </Suspense>
  );
}
