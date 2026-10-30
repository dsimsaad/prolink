import "./faqs.css";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/prolink/site-footer";
import { FaqsClient } from "@/components/prolink/faqs-client";
import { siteConfig } from "@/config/site";

const pageTitle = `FAQs | ${siteConfig.name} ${siteConfig.city}`;
const pageDescription = `Answers to common questions about posting jobs, comparing itemised quotes, private phone numbers, and applying to offer services on ${siteConfig.name} in ${siteConfig.city}.`;

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    siteName: siteConfig.name,
    locale: "en_PK",
    type: "website",
  },
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
