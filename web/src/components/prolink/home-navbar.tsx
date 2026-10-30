"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Brand } from "./brand";
import { BecomeProfessionalCta } from "./become-professional-cta";
import { useNavigationAccount } from "./use-navigation-account";
import { siteConfig } from "@/config/site";

export const services = siteConfig.categories.map((category) => category.name);

const navigation = [
  { href: "/services", label: "Services" },
  { href: "/features", label: "Features" },
  { href: "/about", label: "About" },
  { href: "/faqs", label: "FAQs" },
  { href: "/contact", label: "Contact" },
];

export function HomeNavbar() {
  const { isLoggedIn, isAdmin, proState, userName, handleSignOut } = useNavigationAccount();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 10);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle outside clicks and ESC key for user dropdown
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
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`.trim()}>
      <div className="container flex h-[72px] items-center justify-between gap-6">
        <Brand />

        {/* Desktop Navigation Links */}
        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Main navigation"
        >
          {navigation.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : item.href.startsWith("/#")
                ? false
                : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                href={item.href}
                key={item.href}
                className={`relative inline-flex h-[72px] items-center px-3 text-sm font-semibold transition-[color,font-weight] duration-300 ease-out after:absolute after:bottom-[-1px] after:left-3 after:right-3 after:h-0.5 after:origin-left after:scale-x-0 after:bg-[var(--forest)] after:transition-transform after:duration-300 after:ease-out after:content-[''] ${
                  active
                    ? "font-bold text-[var(--ink)] after:scale-x-100"
                    : "text-[var(--muted)] hover:text-[var(--ink)] hover:after:scale-x-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Action Area */}
        <div className="hidden items-center gap-3 lg:flex">
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
                      {isAdmin
                        ? "Administrator"
                        : proState === "approved"
                        ? "Approved Professional"
                        : proState === "pending"
                        ? "Application Under Review"
                        : proState === "rejected"
                        ? "Application Needs Update"
                        : proState === "suspended"
                        ? "Account On Hold"
                        : "Customer Account"}
                    </small>
                  </div>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                  <Link
                    href="/user"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    My dashboard
                  </Link>
                  {!isAdmin && (
                    <BecomeProfessionalCta
                      variant="menu-item"
                      state={proState}
                      onClick={() => setUserMenuOpen(false)}
                    />
                  )}
                  <button
                    type="button"
                    className="sign-out-btn"
                    role="menuitem"
                    onClick={async () => {
                      await handleSignOut();
                      setUserMenuOpen(false);
                      setMenuOpen(false);
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="relative inline-flex items-center px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition-[color,font-weight] duration-300 ease-out hover:font-bold hover:text-[var(--forest)]"
            >
              <span className="relative after:absolute after:bottom-[-3px] after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-[var(--forest)] after:transition-transform after:duration-300 after:ease-out after:content-[''] hover:after:scale-x-100">
                Sign in
              </span>
            </Link>
          )}

          {/* Become a Professional Button (hidden for admins) */}
          {!isAdmin && (
            <Link
              href={
                isLoggedIn
                  ? proState === "approved"
                    ? "/user"
                    : "/become-professional"
                  : "/become-professional/sign-in?mode=signup"
              }
              style={{ borderRadius: "0px", color: "#ffffff" }}
              className="inline-flex items-center gap-2 rounded-none bg-[var(--forest)] px-4 py-2.5 text-sm font-semibold !text-white shadow-[0_10px_22px_rgba(15,107,62,0.22)] transition-all duration-200 hover:bg-[var(--forest-hover)] hover:!text-white hover:shadow-[0_12px_26px_rgba(15,107,62,0.3)] active:scale-[0.98]"
            >
              <span style={{ color: "#ffffff" }}>
                {isLoggedIn && proState === "approved"
                  ? "Pro Dashboard"
                  : "Become a Professional"}
              </span>
              <ArrowUpRight className="h-4 w-4 text-white" aria-hidden="true" />
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--border)] p-2.5 text-[var(--ink)] transition hover:bg-[var(--surface-mint)] lg:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="max-h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain border-t border-[var(--border)] bg-white/98 backdrop-blur-xl px-4 pb-5 pt-3 lg:hidden">
          <nav
            className="mx-auto grid max-w-7xl gap-1"
            aria-label="Mobile navigation"
          >
            {isLoggedIn && (
              <div className="mb-2 rounded-xl border border-[var(--border)] bg-[var(--surface-mint)] p-3 text-xs">
                <div>
                  Signed in as <strong>{userName}</strong>
                </div>
                {proState === "approved" && (
                  <span className="mt-1 block font-semibold text-[var(--forest)]">
                    ✓ Approved Professional
                  </span>
                )}
                {proState === "pending" && (
                  <span className="mt-1 block font-semibold text-blue-600">
                    ⏳ Application Under Review
                  </span>
                )}
              </div>
            )}
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-h-[44px] items-center rounded-xl px-4 py-3 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-mint)] hover:text-[var(--ink)]"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-4">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/user"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border)] px-4 py-3 text-center text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-mint)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700 transition hover:bg-red-100"
                    onClick={async () => {
                      await handleSignOut();
                      setUserMenuOpen(false);
                      setMenuOpen(false);
                    }}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border)] px-4 py-3 text-center text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-mint)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href={
                      isLoggedIn
                        ? proState === "approved"
                          ? "/user"
                          : "/become-professional"
                        : "/become-professional/sign-in?mode=signup"
                    }
                    style={{ borderRadius: "0px", color: "#ffffff" }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-none bg-[var(--forest)] px-4 py-3 text-center text-sm font-semibold !text-white shadow-[0_10px_22px_rgba(15,107,62,0.22)] transition hover:bg-[var(--forest-hover)] hover:!text-white"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span style={{ color: "#ffffff" }}>
                      {isLoggedIn && proState === "approved"
                        ? "Pro Dashboard"
                        : "Become a Professional"}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-white" />
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
