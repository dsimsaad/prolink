import "./features.css";
import Link from "next/link";
import { SiteFooter } from "@/components/prolink/site-footer";
import { Icon } from "@/components/prolink/brand";

export const metadata = {
  title: "Platform Features | ProLink",
  description:
    "Explore the core features that make ProLink the fastest and safest way to hire verified local service professionals.",
};

const platformFeatures = [
  {
    icon: "clock" as const,
    tag: "Speed",
    title: "60-Second Job Posting",
    description:
      "Describe your maintenance or repair task, select your neighborhood area, and set your preferred timing in under a minute.",
  },
  {
    icon: "shield" as const,
    tag: "Trust & Safety",
    title: "Identity & Skill Verification",
    description:
      "Every professional on ProLink undergoes identity verification and trade skill screening before being approved to send offers.",
  },
  {
    icon: "card" as const,
    tag: "Clarity",
    title: "Transparent Itemized Quotes",
    description:
      "Compare clear, upfront quotes with stated arrival times and diagnostic fees so there are never surprise charges.",
  },
  {
    icon: "pin" as const,
    tag: "Hyper-Local",
    title: "Neighborhood Area Matching",
    description:
      "Your job request is matched directly with verified artisans who actively cover your specific sector and neighborhood.",
  },
  {
    icon: "check" as const,
    tag: "Unified Account",
    title: "Dual-Role Account Model",
    description:
      "Use a single ProLink account to post jobs as a homeowner or apply to offer your own trade services as a professional.",
  },
  {
    icon: "star" as const,
    tag: "Quality",
    title: "Verified Customer Reviews",
    description:
      "Only customers who have completed a booked job can rate and review a professional, ensuring authentic feedback.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="features-page">
      <main id="main">
        <section className="features-hero">
          <div className="container">
            <span className="features-hero-badge">
              <Icon name="shield" />
              Built for Homeowners &amp; Skilled Professionals
            </span>
            <h1>Platform Features</h1>
            <p>
              Discover how ProLink connects households and businesses with verified
              local artisans through transparent quotes, area-based matching, and
              rigorous quality standards.
            </p>
          </div>
        </section>

        <section className="features-main-container">
          <div className="features-section-header">
            <span className="eyebrow">Why Choose ProLink</span>
            <h2>Everything you need to hire with confidence</h2>
            <p>
              Designed from the ground up for reliability, speed, and complete pricing transparency.
            </p>
          </div>

          <div className="features-cards-grid">
            {platformFeatures.map((feat) => (
              <article key={feat.title} className="feature-item-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="feature-item-icon">
                    <Icon name={feat.icon} />
                  </span>
                  <span className="feature-item-tag">{feat.tag}</span>
                </div>
                <h3>{feat.title}</h3>
                <p>{feat.description}</p>
              </article>
            ))}
          </div>

          <div className="features-cta-banner">
            <h2>Ready to get started with ProLink?</h2>
            <p>
              Post your job in 60 seconds or explore our full directory of verified professional services.
            </p>
            <div className="features-cta-buttons">
              <Link href="/sign-in" className="button">
                Post a Job <Icon name="arrow" />
              </Link>
              <Link href="/services" className="button outline">
                Explore Services
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
