import "./services.css";
import type { Metadata } from "next";
import { ServicesClient } from "@/components/prolink/services-client";
import { SiteFooter } from "@/components/prolink/site-footer";
import { ScrollToTop } from "@/components/prolink/scroll-to-top";
import { siteConfig } from "@/config/site";

const pageTitle = `Services in ${siteConfig.city} | ${siteConfig.name}`;
const pageDescription = `Browse household trade categories in ${siteConfig.city} including Plumbing, Electrical, Painting, Carpentry, AC repair and installation, Masonry, Home cleaning, and Appliance repair.`;

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

export default function ServicesPage() {
  return (
    <div className="services-page">
      <main id="main">
        <ServicesClient />
      </main>
      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}
