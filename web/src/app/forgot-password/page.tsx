import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SignInForm } from "@/components/prolink/sign-in-form";
import { siteConfig } from "@/config/site";

const pageTitle = `Reset Password | ${siteConfig.name}`;
const pageDescription = `Reset your ${siteConfig.name} account password.`;

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    siteName: siteConfig.name,
    locale: "en_PK",
    type: "website",
  },
};

export default async function ForgotPasswordPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <Suspense fallback={null}>
      <SignInForm defaultMode="forgot" />
    </Suspense>
  );
}
