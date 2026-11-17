import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { LandingPage } from "@/components/prolink/landing-page";

export default async function Home() {
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
    redirect("/dashboard");
  }

  return <LandingPage />;
}
