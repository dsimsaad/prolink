"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Clock,
  Compass,
  Flame,
  Lock,
  ReceiptText,
  SlidersHorizontal,
  UserCheck,
  Wrench,
  Zap,
} from "lucide-react";
import { BecomeProfessionalCta } from "./become-professional-cta";
import { CategoryIcon } from "./category-icon";
import { Reveal } from "./reveal";
import { SiteFooter } from "./site-footer";
import { useNavigationAccount } from "./use-navigation-account";
import { ScrollToTop } from "./scroll-to-top";
import { siteConfig } from "@/config/site";
import {
  heroSampleOffer,
  howItWorksSampleDispatch,
  howItWorksSampleQuotes,
} from "@/data/sample";

const steps = [
  {
    number: "01",
    circleTone: "",
    title: "Post your job request",
    description: `Choose a trade category, describe what needs attention, and share your area in ${siteConfig.city}.`,
  },
  {
    number: "02",
    circleTone: "step-circle-secondary",
    title: "Receive custom offers",
    description:
      "Professionals send transparent pricing, arrival times, and inspection fees.",
  },
  {
    number: "03",
    circleTone: "step-circle-accent",
    title: "Compare & hire",
    description: "Compare itemised quotes and accept the best match.",
  },
  {
    number: "04",
    circleTone: "",
    title: "Track & complete job",
    description:
      "Coordinate directly with your hired professional until the job is done.",
  },
];

const trustItems = [
  {
    title: "Reviewed before they offer services",
    description:
      "Professionals are reviewed by our team before they can offer services on ProLink.",
    tileHue: "tile-hue-emerald",
    IconComponent: UserCheck,
  },
  {
    title: "Transparent Pricing",
    description:
      "Compare clear, upfront itemised quotes and inspection fees before work begins.",
    tileHue: "tile-hue-amber",
    IconComponent: ReceiptText,
  },
  {
    title: "Private by default",
    description:
      "Your phone number is shared only after you accept an offer from the professional you choose.",
    tileHue: "tile-hue-teal",
    IconComponent: Lock,
  },
];

export function LandingPage() {
  const { isAdmin, proState, reviewNote } = useNavigationAccount();
  const popularServices = siteConfig.categories.slice(0, 6);

  return (
    <>
      <main id="main">
        {/* HERO SECTION */}
        <section className="hero">
          {/* Subtle organic decorative SVG blob + dot grid (<= 12% of hero, never covers copy) */}
          <svg
            className="hero-decor-blob -top-16 -right-16 h-64 w-64 text-[var(--mint-border)]"
            viewBox="0 0 240 240"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M189.4,48.6C215.2,76.3,227.5,119.2,211.8,154.9C196.1,190.6,152.4,219.1,109.2,218.8C66,218.5,23.3,189.4,10.2,149.7C-2.9,110,13.6,59.7,47.4,32.7C81.2,5.7,132.3,2,163.6,20.9C173.4,26.8,181.6,40.2,189.4,48.6Z" />
          </svg>
          <svg
            className="hero-decor-blob bottom-6 left-4 hidden h-28 w-28 text-[var(--accent-border)] xl:block"
            viewBox="0 0 120 120"
            fill="currentColor"
            aria-hidden="true"
          >
            {[16, 44, 72, 100].map((cx) =>
              [16, 44, 72, 100].map((cy) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.2" />
              ))
            )}
          </svg>

          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow-pill">
                <Compass className="h-4 w-4 text-[var(--forest)]" aria-hidden="true" />
                Local skilled professionals, in one place
              </span>

              <h1>
                Find the{" "}
                <span className="hero-highlight">
                  right professional
                  <svg
                    className="hero-highlight-svg"
                    viewBox="0 0 260 14"
                    fill="none"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 10.5C68 3.2 182 2.4 257 9.8"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>{" "}
                for every job.
              </h1>

              <p className="hero-description">
                Describe what needs fixing at home and receive custom offers from
                local electricians, plumbers, AC technicians and painters in{" "}
                {siteConfig.city}.
              </p>

              <div className="hero-actions">
                <Link className="button" href="/sign-in">
                  Post a Job <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link className="button outline" href="/services">
                  Explore Services
                </Link>
              </div>

              <div className="popular">
                <span>Popular:</span>
                {[
                  "AC not cooling",
                  "Water tank leakage",
                  "UPS breaker tripping",
                ].map((item) => (
                  <a href="#services" key={item} className="popular-chip">
                    {item}
                  </a>
                ))}
              </div>

              <div className="hero-badges-grid">
                <div className="hero-info-pill">
                  <span className="hero-info-pill-icon tile-hue-emerald">
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>Compare offers before you hire</span>
                </div>
                <div className="hero-info-pill">
                  <span className="hero-info-pill-icon tile-hue-teal">
                    <Lock className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>
                    Your phone number stays private until you accept an offer
                  </span>
                </div>
                <div className="hero-info-pill">
                  <span className="hero-info-pill-icon tile-hue-amber">
                    <Flame className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>Mark a job urgent to be matched first</span>
                </div>
              </div>
            </div>

            {/* Right Column: Home-Service Photo Frame + Floating Trade Chips + Single Labelled Example Offer Card */}
            <div className="hero-stage">
              <div className="hero-offset-shape" aria-hidden="true" />

              <div className="hero-trade-chip hero-trade-chip-top">
                <span className="inline-grid h-6 w-6 place-items-center rounded-full tile-hue-sky">
                  <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span>Plumbing</span>
              </div>

              <div className="hero-trade-chip hero-trade-chip-right">
                <span className="inline-grid h-6 w-6 place-items-center rounded-full tile-hue-amber">
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span>Electrical</span>
              </div>

              <div className="hero-visual">
                <Image
                  src="/images/home-hero.webp"
                  alt="Electrician in a dark t-shirt using a cordless driver to wire an indoor circuit breaker distribution panel"
                  fill
                  preload
                  sizes="(max-width: 960px) 92vw, 42vw"
                />
              </div>

              <aside
                className="hero-example-card"
                aria-label="Example offer card preview"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="sample-pill">{heroSampleOffer.badgeLabel}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)]">
                    <Clock className="h-3.5 w-3.5 text-[var(--forest)]" aria-hidden="true" />
                    {heroSampleOffer.arrivalTime}
                  </span>
                </div>
                <p className="mt-2.5 text-sm font-bold text-[var(--ink)]">
                  {heroSampleOffer.jobTitle}
                </p>
                <div className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-[var(--border)] pt-2.5">
                  <div>
                    <span className="block text-[11px] font-medium text-[var(--muted)]">
                      Sample quote
                    </span>
                    <strong className="text-base font-extrabold text-[var(--forest)]">
                      {heroSampleOffer.pricePkr}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="block text-[11px] font-medium text-[var(--muted)]">
                      Inspection fee
                    </span>
                    <span className="text-xs font-bold text-[var(--ink)]">
                      {heroSampleOffer.inspectionFeePkr}
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* POPULAR SERVICES (3x2 Desktop, 2x3 Tablet, 1x6 Mobile) */}
        <section id="services" className="section section-white">
          <div className="container">
            <Reveal>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Explore Services</span>
                  <h2>Popular services in {siteConfig.city}</h2>
                </div>
                <Link className="text-link" href="/services">
                  View all {siteConfig.categories.length} services{" "}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>

            <div className="service-grid">
              {popularServices.map((category, idx) => (
                <Reveal key={category.slug} delayMs={idx * 40}>
                  <Link href={category.href} className="service-card h-full">
                    <div>
                      <span className={`icon-tile tile-hue-${category.tileHue}`}>
                        <CategoryIcon iconKey={category.iconKey} className="h-5 w-5" />
                      </span>
                      <h3>{category.name}</h3>
                      <p>{category.shortDescription}</p>
                    </div>
                    <span className="service-link">
                      Explore service{" "}
                      <ArrowRight
                        className="service-link-arrow h-4 w-4"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Gentle Curved Section Divider (White -> Pale Cream) */}
        <div className="section-curve bg-[var(--surface-white)]" aria-hidden="true">
          <svg viewBox="0 0 1440 56" preserveAspectRatio="none">
            <path
              d="M0,12 C360,58 1080,-8 1440,36 L1440,56 L0,56 Z"
              fill="var(--surface-cream)"
            />
          </svg>
        </div>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="section section-cream">
          <div className="container">
            <Reveal>
              <span className="eyebrow-pill eyebrow-pill-warm">
                Clear &amp; Straightforward
              </span>
              <h2>How ProLink works</h2>
              <p className="section-intro">
                From posting a household repair to choosing an offer, in four
                clear steps.
              </p>
            </Reveal>

            <div className="steps-grid">
              <div className="steps-connector-line" aria-hidden="true" />

              {steps.map((step, i) => (
                <Reveal key={step.number} delayMs={i * 45}>
                  <article className="step-card h-full">
                    <span className={`step-circle ${step.circleTone}`.trim()}>
                      {step.number}
                    </span>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>

                    {i === 1 && (
                      <div className="step-mock-box">
                        <div className="step-mock-inner">
                          <div className="flex items-center justify-between gap-2">
                            <span className="sample-pill">
                              {howItWorksSampleDispatch.badgeLabel}
                            </span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[var(--forest)]">
                              {howItWorksSampleDispatch.priorityTag}
                            </span>
                          </div>
                          <p className="!mt-2 !text-xs font-bold !text-[var(--ink)]">
                            {howItWorksSampleDispatch.requestSummary}
                          </p>
                          <span className="mt-1 block text-[11px] text-[var(--muted)]">
                            {howItWorksSampleDispatch.category} ·{" "}
                            {howItWorksSampleDispatch.areaLabel}
                          </span>
                        </div>
                      </div>
                    )}

                    {i === 2 && (
                      <div className="step-mock-box">
                        <div className="step-mock-inner space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="sample-pill">
                              {howItWorksSampleQuotes.badgeLabel}
                            </span>
                            <span className="text-[11px] font-semibold text-[var(--muted)]">
                              Itemised quotes
                            </span>
                          </div>
                          {howItWorksSampleQuotes.rows.map((row) => (
                            <div
                              key={row.optionLabel}
                              className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-[11px] ${
                                row.highlighted
                                  ? "bg-white font-bold text-[var(--ink)]"
                                  : "text-[var(--body)]"
                              }`}
                            >
                              <span>
                                {row.optionLabel} · {row.etaLabel}
                              </span>
                              <span className="font-bold text-[var(--forest)]">
                                {row.quotePkr}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Gentle Curved Section Divider (Pale Cream -> Pale Mint) */}
        <div className="section-curve bg-[var(--surface-cream)]" aria-hidden="true">
          <svg viewBox="0 0 1440 56" preserveAspectRatio="none">
            <path
              d="M0,38 C420,-6 980,58 1440,14 L1440,56 L0,56 Z"
              fill="var(--surface-mint)"
            />
          </svg>
        </div>

        {/* TRUST SECTION */}
        <section id="trust" className="section section-mint">
          <div className="container">
            <Reveal>
              <span className="eyebrow-pill eyebrow-pill-cool">
                Built for Clarity
              </span>
              <h2>What to expect when you hire</h2>
            </Reveal>

            <div className="feature-grid">
              {trustItems.map((item, idx) => (
                <Reveal key={item.title} delayMs={idx * 50}>
                  <article className="feature-card h-full">
                    <span className={`icon-tile ${item.tileHue}`}>
                      <item.IconComponent className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CLOSING CALL TO ACTION + UNTOUCHED BECOME PROFESSIONAL CTA BAND */}
        <div className="bg-[var(--surface-white)] pt-16 pb-2">
          <section className="closing-cta">
            <div>
              <h2>Ready to get your job done?</h2>
              <p>Connect with local professionals near you.</p>
            </div>
            <Link href="/sign-in" className="button">
              Post a Job <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>

          {!isAdmin && (
            <BecomeProfessionalCta
              variant="landing-section"
              state={proState}
              reviewNote={reviewNote}
            />
          )}
        </div>
      </main>
      <SiteFooter />
      <ScrollToTop />
    </>
  );
}
