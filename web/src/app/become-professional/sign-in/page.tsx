import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getProfessionalState } from "@/utils/professional";
import { ProfessionalSignInForm } from "@/components/prolink/professional-sign-in-form";

export const metadata: Metadata = {
  title: "Professional Sign In | ProLink",
  description:
    "Sign in to your ProLink account to apply as a verified service professional.",
};

export default async function ProfessionalSignInPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If the user is already authenticated, avoid asking them to sign in again
  // and take them directly to the appropriate next step.
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
      redirect(`/become-professional/sign-in?error=${encodeURIComponent(msg)}`);
    }

    if (profile?.role === "admin") {
      redirect("/admin");
    }

    const proInfo = await getProfessionalState();
    if (proInfo.state === "approved") {
      redirect("/user");
    }

    redirect("/become-professional");
  }

  return (
    <Suspense fallback={null}>
      <ProfessionalSignInForm />
    </Suspense>
  );
}
