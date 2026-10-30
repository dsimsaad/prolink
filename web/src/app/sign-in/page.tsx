import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SignInForm } from "@/components/prolink/sign-in-form";
import { siteConfig } from "@/config/site";

const pageTitle = `Sign In | ${siteConfig.name}`;
const pageDescription = `Sign in to your ${siteConfig.name} account to manage household repair jobs and offers in ${siteConfig.city}.`;

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

export default async function SignInPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_suspended, suspended_reason")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.is_suspended) {
      await supabase.auth.signOut();
      const msg = profile.suspended_reason
        ? `Your account has been suspended: ${profile.suspended_reason}`
        : "Your account has been suspended.";
      redirect(`/sign-in?error=${encodeURIComponent(msg)}`);
    }

    if (profile?.role === "admin") {
      redirect("/admin");
    }
    redirect("/user");
  }

  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
