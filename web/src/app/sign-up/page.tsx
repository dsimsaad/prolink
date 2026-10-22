import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/prolink/sign-in-form";

export const metadata: Metadata = {
  title: "Sign Up | ProLink",
  description: "Create your ProLink account to hire professionals or offer your services.",
};

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm defaultMode="signup" />
    </Suspense>
  );
}
