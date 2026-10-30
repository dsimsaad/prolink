import "./about.css";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Lock,
  MapPin,
  ReceiptText,
  SlidersHorizontal,
  UserCheck,
  Wrench,
} from "lucide-react";
import { SiteFooter } from "@/components/prolink/site-footer";
import { siteConfig } from "@/config/site";

const pageTitle = `About Us | ${siteConfig.name} ${siteConfig.city}`;
const pageDescription = `Learn how ${siteConfig.name} connects households in ${siteConfig.city} with local tradespeople through itemised offers and private contact sharing.`;

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

const honestFacts = [
  {
    label: `Pilot city: ${siteConfig.city}`,
    detail: "Focused on neighbourhood-to-neighbourhood home maintenance in our active pilot hub.",
    tileHue: "tile-hue-emerald",
    IconComponent: MapPin,
  },
  {
    label: "Offers you can compare",
    detail: "Review itemised quotes, inspection fees, and estimated arrival times before choosing.",
    tileHue: "tile-hue-amber",
    IconComponent: SlidersHorizontal,
  },
  {
    label: "Phone numbers stay private until you accept",
    detail: "Your contact number is revealed only to the professional whose offer you accept.",
    tileHue: "tile-hue-teal",
    IconComponent: Lock,
  },
];

const coreValues = [
  {
    title: "Reviewed before they work",
    description:
      "Professionals submit an application and are reviewed by our team before they can send offers to homeowners on ProLink.",
    tileHue: "tile-hue-emerald",
    IconComponent: UserCheck,
  },
  {
    title: "Complete Transparency",
    description:
      "Clear, upfront itemised quotes and inspection fees help remove guesswork from hiring local technicians and tradespeople.",
    tileHue: "tile-hue-amber",
    IconComponent: ReceiptText,
  },
  {
    title: "Supporting Local Trades",
    description:
      "We give electricians, plumbers, painters, carpenters, and technicians a direct way to connect with nearby households.",
    tileHue: "tile-hue-sky",
    IconComponent: Wrench,
  },
];

export default function AboutPage() {
  return (
    <div className="about-page">
      <main id="main">
        <section className="about-hero">
          <div className="container">
            <span className="eyebrow-pill">
              <Compass className="h-4 w-4 text-[var(--forest)]" aria-hidden="true" />
              Our Mission &amp; Story
            </span>
            <h1>About {siteConfig.name}</h1>
            <p>
              Connecting households in {siteConfig.city} with local skilled
              professionals through clear offers, private contact sharing, and
              straightforward coordination.
            </p>
          </div>
        </section>

        <section className="about-story-section">
          <div className="about-main-container">
            <div className="about-story-grid">
              <div className="about-story-copy">
                <span className="eyebrow">Why We Built ProLink</span>
                <h2>A clearer way to find and hire local tradespeople</h2>
                <p>
                  Finding an electrician, plumber, painter, or AC technician often
                  means calling through old phone numbers, waiting without updates,
                  and negotiating unclear prices at the door.
                </p>
                <p>
                  {siteConfig.name} is a university semester project built to make
                  everyday home maintenance more structured in {siteConfig.city}.
                  Customers describe their repair and compare itemised offers from
                  local professionals, while tradespeople reach nearby jobs
                  without middlemen.
                </p>
              </div>

              <div className="about-facts-panel" aria-label="How ProLink works today">
                {honestFacts.map((fact) => (
                  <div key={fact.label} className="about-fact-item">
                    <span className={`icon-tile ${fact.tileHue}`}>
                      <fact.IconComponent className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <strong>{fact.label}</strong>
                      <span>{fact.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="about-values-section">
          <div className="about-main-container">
            <div className="about-values-header">
              <span className="eyebrow-pill eyebrow-pill-warm">Our Principles</span>
              <h2>What guides {siteConfig.name}</h2>
              <p>
                Practical design choices focused on clear expectations for
                households and fair opportunity for local tradespeople.
              </p>
            </div>

            <div className="about-values-grid">
              {coreValues.map((val) => (
                <article key={val.title} className="about-value-card">
                  <span className={`icon-tile ${val.tileHue}`}>
                    <val.IconComponent className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3>{val.title}</h3>
                  <p>{val.description}</p>
                </article>
              ))}
            </div>

            <div className="about-cta-banner">
              <div>
                <h2>Connect with local professionals near you.</h2>
                <p>
                  Post a household repair in {siteConfig.city} or apply to offer
                  your trade skills to nearby customers.
                </p>
              </div>
              <div className="about-cta-buttons">
                <Link href="/sign-in" className="button">
                  Post a Job <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/become-professional/sign-in"
                  className="button outline"
                >
                  Apply as a Professional
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
