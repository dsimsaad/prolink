import "./services.css";
import { Metadata } from "next";
import { ServicesClient } from "@/components/prolink/services-client";
import { SiteFooter } from "@/components/prolink/site-footer";
import { ScrollToTop } from "@/components/prolink/scroll-to-top";

export const metadata: Metadata = {
  title: "Professional Services Directory | ProLink Pakistan",
  description:
    "Browse verified professional services across Pakistan including Electrical, Plumbing, AC Repair & HVAC, Carpentry, Appliance Repair, Deep Cleaning, Painting, Home Tutoring, and more.",
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
