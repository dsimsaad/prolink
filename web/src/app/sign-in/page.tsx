import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/prolink/sign-in-form";

export const metadata: Metadata = { title: "Sign In | ProLink" };

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
