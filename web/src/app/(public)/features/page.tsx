import "./features.css";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Layers,
  Lock,
  MapPin,
  ReceiptText,
  UserCheck,
} from "lucide-react";
import { SiteFooter } from "@/components/prolink/site-footer";
import { siteConfig } from "@/config/site";

const pageTitle = `Platform Features | ${siteConfig.name} ${siteConfig.city}`;
const pageDescription = `Explore how ${siteConfig.name} helps households in ${siteConfig.city} post repair jobs, compare itemised quotes, and keep phone numbers private until an offer is accepted.`;

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

const platformFeatures = [
  {
    tag: "Simple Posting",
    title: "Structured Job Requests",
    description: `Select a trade category, describe what needs fixing, mark urgent repairs when needed, and pick your area in ${siteConfig.city}.`,
    tileHue: "tile-hue-emerald",
    IconComponent: FileText,
  },
  {
    tag: "Team Review",
    title: "Reviewed Applications",
    description:
      "Professionals apply with their trade categories, coverage areas, and experience and are reviewed by our team before offering services.",
    tileHue: "tile-hue-teal",
    IconComponent: UserCheck,
  },
  {
    tag: "Clarity",
    title: "Transparent Itemised Quotes",
    description:
      "Compare upfront quotes showing estimated service cost, arrival window, and any inspection fee before work begins.",
    tileHue: "tile-hue-amber",
    IconComponent: ReceiptText,
  },
  {
    tag: "Local Dispatch",
    title: "Neighbourhood Area Matching",
    description: `Requests are routed to professionals who cover your sector in ${siteConfig.city}, with priority matching when you mark a job urgent.`,
    tileHue: "tile-hue-sky",
    IconComponent: MapPin,
  },
  {
    tag: "Privacy",
    title: "Private Contact Sharing",
    description:
      "Your phone number stays hidden while you review offers and is shared only with the professional whose offer you accept.",
    tileHue: "tile-hue-rose",
    IconComponent: Lock,
  },
  {
    tag: "Unified Account",
    title: "Dual-Role Account Model",
    description:
      "Use a single ProLink account to post household jobs as a customer or apply to offer your own trade services locally.",
    tileHue: "tile-hue-violet",
    IconComponent: Layers,
  },
];

export default function FeaturesPage() {
  return (
    <div className="features-page">
      <main id="main">
        <section className="features-hero">
          <div className="container">
            <h1>Platform Features</h1>
            <p>
              See how {siteConfig.name} connects households in {siteConfig.city}{" "}
              with local electricians, plumbers, painters, carpenters, and
              technicians through clear quotes and private contact controls.
            </p>
          </div>
        </section>

        <section className="features-body-section">
          <div className="features-main-container">
            <div className="features-section-header">
              <span className="eyebrow">How It Fits Together</span>
              <h2>Practical tools for hiring with clarity</h2>
              <p>
                Designed around upfront quotes, area-aware matching, and
                privacy by default.
              </p>
            </div>

            <div className="features-cards-grid">
              {platformFeatures.map((feat) => (
                <article key={feat.title} className="feature-item-card">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`icon-tile ${feat.tileHue}`}>
                      <feat.IconComponent className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="feature-item-tag">{feat.tag}</span>
                  </div>
                  <h3>{feat.title}</h3>
                  <p>{feat.description}</p>
                </article>
              ))}
            </div>

            <div className="features-cta-banner">
              <div>
                <h2>Connect with local professionals near you.</h2>
                <p>
                  Post a household repair in {siteConfig.city} or browse our{" "}
                  {siteConfig.categories.length} trade categories.
                </p>
              </div>
              <div className="features-cta-buttons">
                <Link href="/sign-in" className="button">
                  Post a Job <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/services" className="button outline">
                  Explore Services
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
