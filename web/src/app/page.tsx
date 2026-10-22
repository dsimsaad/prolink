import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getProfessionalState } from "@/utils/professional";
import { LandingPage } from "@/components/prolink/landing-page";

export default async function Home() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const proInfo = await getProfessionalState(supabase);

  const userName =
    proInfo.profile?.full_name ||
    proInfo.user?.user_metadata?.full_name ||
    proInfo.user?.user_metadata?.name ||
    (proInfo.user?.email ? proInfo.user.email.split("@")[0] : "User");

  return (
    <LandingPage
      initialIsLoggedIn={proInfo.state !== "logged_out"}
      initialProState={proInfo.state}
      initialUserName={userName}
      initialReviewNote={proInfo.reviewNote}
    />
  );
}
