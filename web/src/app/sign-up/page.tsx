import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SignInForm } from "@/components/prolink/sign-in-form";
import { siteConfig } from "@/config/site";

const pageTitle = `Sign Up | ${siteConfig.name}`;
const pageDescription = `Create an account on ${siteConfig.name} to post household repair jobs and compare quotes in ${siteConfig.city}.`;

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    siteName: siteConfig.name,
    locale: "en_PK",
  },
};

export default async function SignUpPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_suspended")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.is_suspended) {
      await supabase.auth.signOut();
      redirect("/sign-in?error=Your+account+has+been+suspended");
    }

    if (profile?.role === "admin") {
      redirect("/admin");
    }
    redirect("/user");
  }

  return (
    <Suspense fallback={null}>
      <SignInForm defaultMode="signup" />
    </Suspense>
  );
}
