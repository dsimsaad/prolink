"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Brand } from "./brand";
import { BecomeProfessionalCta } from "./become-professional-cta";
import { useNavigationAccount, type NavigationAccountProps } from "./use-navigation-account";

export const services = [
  "Plumbing",
  "Electrical",
  "AC Repair & HVAC",
  "Carpentry",
  "Appliance Repair",
  "Deep Cleaning",
  "Home Tutoring",
];
export function HomeNavbar(props: NavigationAccountProps) {
  const { isLoggedIn, proState, userName, handleSignOut } = useNavigationAccount(props);
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
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

  return (
      <header className="site-header">
        <div className="container nav-row">
          <Brand />
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link href="/#services">Find Professionals</Link>
            <Link href="/#how-it-works">How It Works</Link>
            <Link href="/#trust">Trust & Safety</Link>
            <Link href="/faqs" aria-current={pathname === "/faqs" ? "page" : undefined}>FAQs</Link>
            <Link href="/contact" aria-current={pathname === "/contact" ? "page" : undefined}>Contact</Link>
          </nav>
          <div className="nav-actions">
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
                    <Link href="/user" role="menuitem" onClick={() => setUserMenuOpen(false)}>My dashboard</Link>
                    <BecomeProfessionalCta
                      variant="menu-item"
                      state={proState}
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <button
                      type="button"
                      className="sign-out-btn"
                      role="menuitem"
                      onClick={async () => { await handleSignOut(); setUserMenuOpen(false); setMenuOpen(false); }}
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
            <Link href={isLoggedIn ? "/user/post-job" : "/sign-in?next=/user"} className="button small">
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
              ["Find Professionals", "/#services"],
              ["How It Works", "/#how-it-works"],
              ["Trust & Safety", "/#trust"],
              ["FAQs", "/faqs"],
              ["Contact", "/contact"],
            ].map(([text, href]) => (
              <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setMenuOpen(false)}>
                {text}
              </Link>
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
                  onClick={async () => { await handleSignOut(); setUserMenuOpen(false); setMenuOpen(false); }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/sign-in"
                className="text-link"
                style={{ padding: "8px 0" }}
                onClick={() => setMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </nav>
        )}
        <nav className="category-nav" aria-label="Service categories">
          <div className="container">
            {services.map((service) => (
              <Link key={service} href="/#services">
                {service}
              </Link>
            ))}
          </div>
        </nav>
      </header>
  );
}
