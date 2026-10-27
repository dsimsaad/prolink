import "./about.css";
import Link from "next/link";
import { SiteFooter } from "@/components/prolink/site-footer";
import { Icon } from "@/components/prolink/brand";

export const metadata = {
  title: "About Us | ProLink",
  description:
    "Learn about ProLink's mission to connect households and businesses in Lahore with verified, trusted local service professionals.",
};

const coreValues = [
  {
    icon: "shield" as const,
    title: "Verified Trust",
    description:
      "Every professional on ProLink goes through identity and trade skill verification before offering services to homeowners.",
  },
  {
    icon: "card" as const,
    title: "Complete Transparency",
    description:
      "Clear, upfront itemized quotes and diagnostic fees remove the guesswork from hiring local technicians and artisans.",
  },
  {
    icon: "star" as const,
    title: "Empowering Artisans",
    description:
      "We help skilled electricians, plumbers, HVAC specialists, and technicians build sustainable businesses through verified reviews.",
  },
];

export default function AboutPage() {
  return (
    <div className="about-page">
      <main id="main">
        <section className="about-hero">
          <div className="container">
            <span className="about-hero-badge">
              <Icon name="shield" />
              Our Mission &amp; Story
            </span>
            <h1>About ProLink</h1>
            <p>
              Connecting households and businesses with verified, dependable local
              service professionals through speed, transparency, and trust.
            </p>
          </div>
        </section>

        <section className="about-main-container">
          <div className="about-story-grid">
            <div className="about-story-copy">
              <span className="eyebrow">Why We Built ProLink</span>
              <h2>A better way to find and hire skilled professionals</h2>
              <p>
                Finding a reliable electrician, plumber, or HVAC technician used to
                mean calling through outdated phone contacts, waiting hours without
                updates, and dealing with unclear pricing at the door.
              </p>
              <p>
                ProLink was built to modernize home and commercial maintenance.
                Homeowners can post a job request in 60 seconds and receive
                transparent, itemized offers from verified professionals in their
                neighborhood, while skilled tradespeople gain direct access to
                local customers without middlemen.
              </p>
            </div>

            <div className="about-stats-panel" aria-label="Platform highlights">
              <div className="about-stat-item">
                <strong>Lahore</strong>
                <span>Active Service Hub</span>
              </div>
              <div className="about-stat-item">
                <strong>60 sec</strong>
                <span>Fast Job Posting</span>
              </div>
              <div className="about-stat-item">
                <strong>100%</strong>
                <span>Verified Professionals</span>
              </div>
              <div className="about-stat-item">
                <strong>4.9 / 5</strong>
                <span>Average Client Rating</span>
              </div>
            </div>
          </div>

          <div className="about-values-header">
            <span className="eyebrow">Our Principles</span>
            <h2>What sets ProLink apart</h2>
            <p>
              Every decision we make is guided by reliability for customers and fair
              opportunity for professionals.
            </p>
          </div>

          <div className="about-values-grid">
            {coreValues.map((val) => (
              <article key={val.title} className="about-value-card">
                <span className="about-value-icon">
                  <Icon name={val.icon} />
                </span>
                <h3>{val.title}</h3>
                <p>{val.description}</p>
              </article>
            ))}
          </div>

          <div className="about-cta-banner">
            <h2>Join the ProLink community</h2>
            <p>
              Whether you need a trusted professional for a home repair or want to
              grow your trade business, ProLink is built for you.
            </p>
            <div className="about-cta-buttons">
              <Link href="/sign-in" className="button">
                Post a Job <Icon name="arrow" />
              </Link>
              <Link
                href="/sign-in?next=/become-professional"
                className="button outline"
              >
                Become a Professional
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
