import "./faqs.css";
import { HomeNavbar } from "@/components/prolink/home-navbar";
import { getProfessionalState } from "@/utils/professional";
import { SiteFooter } from "@/components/prolink/site-footer";
import { FaqsClient } from "@/components/prolink/faqs-client";

export const metadata = {
  title: "Frequently Asked Questions (FAQs) | ProLink",
  description:
    "Find answers to common questions about hiring skilled professionals, escrow payments, verification, and joining ProLink as a tradesperson.",
};

export default async function FaqsPage() {
  const account = await getProfessionalState();
  return (
    <div className="faqs-page">
      <HomeNavbar
        initialIsLoggedIn={account.state !== "logged_out"}
        initialProState={account.state}
        initialUserName={account.profile?.full_name || account.user?.email?.split("@")[0] || "User"}
      />
      <main id="main">
        <FaqsClient />
      </main>
      <SiteFooter />
    </div>
  );
}
