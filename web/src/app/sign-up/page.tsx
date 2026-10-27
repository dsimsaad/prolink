import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SignInForm } from "@/components/prolink/sign-in-form";

export const metadata: Metadata = {
  title: "Sign Up | ProLink",
  description:
    "Create your ProLink account to hire professionals or offer your services.",
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
