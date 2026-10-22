import { getProfessionalState } from "@/utils/professional";
import { LandingPage } from "@/components/prolink/landing-page";

export default async function Home() {
  const proInfo = await getProfessionalState();

  const userName =
    proInfo.profile?.full_name ||
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
