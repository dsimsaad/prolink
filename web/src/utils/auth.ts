import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

/**
 * Server-side guard for protected pages and layouts.
 * Ensures the user is logged in, and redirects to /onboarding if
 * onboarding_completed is false.
 */
export async function requireUser() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, onboarding_completed")
    .eq("id", user.id)
    .single();

  // If user has not completed role onboarding, redirect to /onboarding
  if (profile && profile.onboarding_completed === false) {
    redirect("/onboarding");
  }

  return { user, profile, supabase };
}
