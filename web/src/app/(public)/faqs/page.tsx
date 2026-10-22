import "./faqs.css";
import { SiteFooter } from "@/components/prolink/site-footer";
import { FaqsClient } from "@/components/prolink/faqs-client";

export const metadata = {
  title: "Frequently Asked Questions (FAQs) | ProLink",
  description:
    "Find answers to common questions about hiring skilled professionals, escrow payments, verification, and joining ProLink as a tradesperson.",
};

export default function FaqsPage() {
  return (
    <div className="faqs-page">
      <main id="main">
        <FaqsClient />
      </main>
      <SiteFooter />
    </div>
  );
}
