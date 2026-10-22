"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Brand, Icon } from "./brand";
import { createClient } from "@/utils/supabase/client";
import { BecomeProfessionalCta } from "./become-professional-cta";
import type { ProfessionalState } from "@/utils/professional";

const services = [
  "Plumbing",
  "Electrical",
  "AC Repair & HVAC",
  "Carpentry",
  "Appliance Repair",
  "Deep Cleaning",
  "Home Tutoring",
];
const steps = [
  [
    "Post your job request",
    "Describe your problem with photos and your preferred time slot in 60 seconds.",
  ],
  [
    "Receive custom offers",
    "Verified artisans send transparent pricing, arrival times, and inspection fees.",
  ],
  [
    "Compare & hire safely",
    "Compare reviews and itemized quotes. Accept your best match with secure escrow.",
  ],
  [
    "Track & release funds",
    "Once the work is complete and you are satisfied, release your payment.",
  ],
];

interface LandingPageProps {
  initialIsLoggedIn?: boolean;
  initialProState?: ProfessionalState;
  initialUserName?: string;
  initialReviewNote?: string | null;
}

export function LandingPage({
  initialIsLoggedIn = false,
  initialProState = "logged_out",
  initialUserName = "User",
  initialReviewNote = null,
}: LandingPageProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn);
  const [proState, setProState] = useState<ProfessionalState>(initialProState);
  const [userName, setUserName] = useState(initialUserName);
  const [reviewNote, setReviewNote] = useState(initialReviewNote);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [announcement, setAnnouncement] = useState(true);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const loggedIn = !!session?.user;
      setIsLoggedIn(loggedIn);
      if (!loggedIn) {
        setProState("logged_out");
        setUserName("User");
        setReviewNote(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setProState("logged_out");
    setUserName("User");
    setReviewNote(null);
    setUserMenuOpen(false);
    router.refresh();
  };

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {announcement && (
        <div className="announcement">
          <span>
            Verified professionals. Transparent offers. Escrow-protected
            payments.
          </span>
          <button
            aria-label="Dismiss announcement"
            onClick={() => setAnnouncement(false)}
          >
            ×
          </button>
        </div>
      )}
      <header className="site-header">
        <div className="container nav-row">
          <Brand />
          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="#services">Find Professionals</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#trust">Trust & Safety</a>
          </nav>
          <div className="nav-actions">
            <BecomeProfessionalCta variant="navbar" state={proState} />
            {isLoggedIn ? (
              <div className="user-menu-container" ref={userMenuRef}>
                <button
                  type="button"
                  className="user-menu-button"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <span className="user-avatar-pill">
                    {userName ? userName.charAt(0).toUpperCase() : "U"}
                  </span>
                  <span className="user-name-text">{userName}</span>
                  <span style={{ fontSize: "9px", opacity: 0.7, marginLeft: "2px" }}>
                    ▼
                  </span>
                </button>
                {userMenuOpen && (
                  <div className="user-dropdown-panel" role="menu">
                    <div className="user-dropdown-header">
                      <strong>{userName}</strong>
                      <small>
                        {proState === "approved"
                          ? "Verified Professional"
                          : proState === "pending"
                            ? "Application Under Review"
                            : proState === "rejected"
                              ? "Application Needs Update"
                              : proState === "suspended"
                                ? "Account On Hold"
                                : "Customer Account"}
                      </small>
                    </div>
                    <BecomeProfessionalCta
                      variant="menu-item"
                      state={proState}
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <button
                      type="button"
                      className="sign-out-btn"
                      role="menuitem"
                      onClick={handleSignOut}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/sign-in" className="text-link">
                Sign In
              </Link>
            )}
            <Link href="/sign-in" className="button small">
              Post a Job
            </Link>
            <button
              className="menu-toggle"
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? "×" : "☰"}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav
            id="mobile-nav"
            className="mobile-nav"
            aria-label="Mobile navigation"
          >
            {isLoggedIn && (
              <div className="mobile-user-banner">
                <div>
                  Signed in as <strong>{userName}</strong>
                </div>
                {proState === "approved" && (
                  <span
                    style={{
                      display: "block",
                      color: "var(--forest)",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    ✓ Verified Professional
                  </span>
                )}
                {proState === "pending" && (
                  <span
                    style={{
                      display: "block",
                      color: "#1d4ed8",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    ⏳ Application Under Review
                  </span>
                )}
              </div>
            )}
            {[
              ["Find Professionals", "#services"],
              ["How It Works", "#how-it-works"],
              ["Trust & Safety", "#trust"],
            ].map(([text, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)}>
                {text}
              </a>
            ))}
            {isLoggedIn ? (
              <>
                <BecomeProfessionalCta
                  variant="mobile"
                  state={proState}
                  onClick={() => setMenuOpen(false)}
                />
                <button
                  type="button"
                  className="mobile-sign-out-btn"
                  onClick={handleSignOut}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-link"
                  style={{ padding: "8px 0" }}
                  onClick={() => setMenuOpen(false)}
                >
                  Sign In
                </Link>
                <BecomeProfessionalCta
                  variant="mobile"
                  state={proState}
                  onClick={() => setMenuOpen(false)}
                />
              </>
            )}
          </nav>
        )}
        <nav className="category-nav" aria-label="Service categories">
          <div className="container">
            {services.map((service) => (
              <a key={service} href="#services">
                {service}
              </a>
            ))}
          </div>
        </nav>
      </header>
      <main id="main">
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="badge">
                <Icon name="shield" />
                Pakistan&apos;s Verified Skilled Artisans Network
              </span>
              <h1>Find the right professional for every job.</h1>
              <p className="hero-description">
                Post your job in 60 seconds. Receive verified offers from
                top-rated electricians, plumbers, HVAC specialists and painters
                nearby. Escrow protected.
              </p>
              <div className="hero-actions">
                <Link className="button" href="/sign-in">
                  Post a Job <Icon name="arrow" />
                </Link>
                <a className="button outline" href="#services">
                  Explore Services
                </a>
              </div>
              <div className="popular">
                <span>Popular:</span>
                {[
                  "AC not cooling",
                  "Water tank leakage",
                  "UPS breaker tripping",
                ].map((item) => (
                  <a href="#services" key={item}>
                    {item}
                  </a>
                ))}
              </div>
              <div className="trust-points">
                <span>
                  <Icon name="check" />
                  CNIC & Biometric Verified
                </span>
                <span>
                  <Icon name="card" />
                  Pay Only on Completion
                </span>
                <span>
                  <Icon name="star" className="gold" />
                  4.9 Avg Client Rating
                </span>
              </div>
            </div>
            <div className="hero-visual">
              <Image
                src="/images/hero-technician.jpg"
                alt="Skilled technician repairing electronic equipment in a workshop"
                fill
                priority
                sizes="(max-width: 900px) 100vw, 42vw"
              />
              <div className="verified-card">
                <span className="icon-tile">
                  <Icon name="shield" />
                </span>
                <div>
                  <strong>Verified Master Artisan</strong>
                  <small>NADRA & Skills Audited</small>
                </div>
              </div>
              <div className="rating-card">
                <Icon name="star" className="gold" />
                <strong>4.94</strong>
                <small>(2,340 jobs)</small>
              </div>
              <div className="activity-card">
                <span className="eyebrow">A better way to hire</span>
                <p>
                  Skilled professionals. Clear quotes.
                  <br />
                  <strong>Peace of mind, from start to finish.</strong>
                </p>
              </div>
            </div>
          </div>
        </section>
        <section id="services" className="section container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Explore Services</span>
              <h2>Popular services in your city</h2>
            </div>
            <Link className="text-link" href="/sign-in">
              Find your professional <Icon name="arrow" />
            </Link>
          </div>
          <div className="service-grid">
            {services.slice(0, 6).map((service, i) => (
              <Link key={service} href="/sign-in" className="service-card">
                <span className="icon-tile">
                  <Icon name={i % 2 === 0 ? "shield" : "check"} />
                </span>
                <h3>{service}</h3>
                <p>Verified local professionals</p>
                <span className="service-link">
                  Explore service <Icon name="arrow" />
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section id="how-it-works" className="section tinted">
          <div className="container">
            <span className="eyebrow">Simple. Safe. Stress-free.</span>
            <h2>How ProLink works</h2>
            <p className="section-intro">
              From a job request to a job well done, in four simple steps.
            </p>
            <div className="steps-grid">
              {steps.map(([title, description], i) => (
                <article className="step-card" key={title}>
                  <span className="step-number">STEP 0{i + 1}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section id="trust" className="section container">
          <span className="eyebrow">Peace of Mind</span>
          <h2>Trust & Safety Framework</h2>
          <div className="feature-grid">
            {[
              [
                "shield",
                "Identity & Police Verification",
                "Hire with confidence. Professionals are checked through identity and skills verification.",
              ],
              [
                "card",
                "Escrow Money Protection",
                "Your payment is held securely until you confirm the job is complete.",
              ],
              [
                "check",
                "Workmanship Guarantee",
                "Clear expectations, transparent quotes, and support when you need it.",
              ],
            ].map(([icon, title, description]) => (
              <article className="feature" key={title}>
                <span className="icon-tile">
                  <Icon name={icon as "shield" | "card" | "check"} />
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="container closing-cta">
          <div>
            <h2>Ready to get your job done?</h2>
            <p>Connect with verified professionals near you.</p>
          </div>
          <Link href="/sign-in" className="button">
            Post a Job <Icon name="arrow" />
          </Link>
        </section>
        <BecomeProfessionalCta
          variant="landing-section"
          state={proState}
          reviewNote={reviewNote}
        />
      </main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Brand variant="footer" />
              <p>
                Pakistan&apos;s verified skilled artisans network.
                <br />
                Hire with confidence.
              </p>
            </div>
            <div>
              <h3>Popular Services</h3>
              {services.slice(0, 4).map((service) => (
                <a key={service} href="#services">
                  {service}
                </a>
              ))}
            </div>
            <div>
              <h3>Discover ProLink</h3>
              <a href="#how-it-works">How It Works</a>
              <a href="#trust">Trust & Safety</a>
              <Link href="/sign-in">Sign In</Link>
            </div>
            <div>
              <h3>Active Hubs</h3>
              {["Islamabad", "Lahore", "Karachi", "Rawalpindi"].map((city) => (
                <span key={city}>{city}</span>
              ))}
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 ProLink Technologies Pakistan (Pvt) Ltd.</span>
            <span>English (Pakistan) · PKR (Rs)</span>
          </div>
        </div>
      </footer>
    </>
  );
}
