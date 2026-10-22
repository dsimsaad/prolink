import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { LandingPage } from "@/components/prolink/landing-page";

export default async function Home() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <LandingPage initialIsLoggedIn={!!user} />;
}
