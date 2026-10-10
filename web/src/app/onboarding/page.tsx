import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { OnboardingForm } from "@/components/prolink/onboarding-form";

export const metadata: Metadata = {
  title: "Complete Your Profile | ProLink",
  description: "Select your role on ProLink to complete your account setup.",
};

export default async function OnboardingPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated visitors to sign in
  if (!user) {
    redirect("/sign-in");
  }

  // Fetch user profile to check onboarding state
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarding_completed, full_name")
    .eq("id", user.id)
    .single();

  // If onboarding has already been completed, redirect directly to dashboard
  if (profile?.onboarding_completed) {
    redirect("/");
  }

  return <OnboardingForm userFullName={profile?.full_name} />;
}
