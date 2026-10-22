"use client";

import Link from "next/link";
import { useState } from "react";
import { Brand } from "./brand";

interface SiteHeaderProps {
  currentPage?: "home" | "faqs" | "contact";
}

export function SiteHeader({ currentPage }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container nav-row">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link
            href="/"
            style={currentPage === "home" ? { color: "var(--forest)", fontWeight: 700 } : undefined}
          >
            Home
          </Link>
          <Link href="/#how-it-works">How It Works</Link>
          <Link href="/#trust">Trust & Safety</Link>
          <Link
            href="/faqs"
            style={currentPage === "faqs" ? { color: "var(--forest)", fontWeight: 700 } : undefined}
          >
            FAQs
          </Link>
          <Link
            href="/contact"
            style={currentPage === "contact" ? { color: "var(--forest)", fontWeight: 700 } : undefined}
          >
            Contact
          </Link>
        </nav>
        <div className="nav-actions">
          <Link href="/sign-in" className="text-link">
            Sign In
          </Link>
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
        <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation">
          <Link href="/" onClick={() => setMenuOpen(false)}>
            Home
          </Link>
          <Link href="/#how-it-works" onClick={() => setMenuOpen(false)}>
            How It Works
          </Link>
          <Link href="/#trust" onClick={() => setMenuOpen(false)}>
            Trust & Safety
          </Link>
          <Link href="/faqs" onClick={() => setMenuOpen(false)}>
            FAQs
          </Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)}>
            Contact Us
          </Link>
          <Link
            href="/sign-in"
            className="text-link"
            style={{ padding: "8px 0" }}
            onClick={() => setMenuOpen(false)}
          >
            Sign In
          </Link>
        </nav>
      )}
    </header>
  );
}
