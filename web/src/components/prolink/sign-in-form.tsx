"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Brand, Icon } from "./brand";

/** Replace these UI-only actions with your authentication adapter when integrating. */
export function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(
      "Sign-in is not connected yet. Connect your authentication provider to enable account access.",
    );
  }
  return (
    <div className="sign-in-page">
      <main className="auth-column">
        <div className="auth-top">
          <Brand />
          <Link href="/#how-it-works" className="text-link">
            Explore ProLink <Icon name="arrow" />
          </Link>
        </div>
        <div className="auth-content">
          <h1>Sign in to your account</h1>
          <p className="auth-intro">
            Access your jobs, verify real-time offers, or manage your service
            business.
          </p>
          <div className="social-buttons">
            {["Google", "Apple", "Facebook"].map((provider) => (
              <button
                key={provider}
                type="button"
                className="social-button"
                onClick={() =>
                  setMessage(
                    `${provider} sign-in is not connected yet. Enable this provider in your authentication integration.`,
                  )
                }
              >
                <span
                  aria-hidden="true"
                  className={`social-symbol ${provider.toLowerCase()}`}
                >
                  {provider === "Google" ? (
                    "G"
                  ) : provider === "Apple" ? (
                    <svg viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8.93-2.85-.9.04-2 .6-2.65 1.35-.56.64-1.06 1.7-.92 2.73 1.01.08 2.02-.48 2.64-1.23z"
                      />
                    </svg>
                  ) : (
                    "f"
                  )}
                </span>
                {provider}
              </button>
            ))}
          </div>
          <div className="divider">
            <span>Or with email</span>
          </div>
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="name@example.com"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div className="form-options">
              <label className="remember">
                <input type="checkbox" name="remember" defaultChecked />
                Remember me
              </label>
              <a
                href="#auth-status"
                className="text-link"
                onClick={() =>
                  setMessage(
                    "Password recovery is not connected yet. Connect your authentication provider to enable reset emails.",
                  )
                }
              >
                Forgot password?
              </a>
            </div>
            <button className="button submit-button" type="submit">
              Sign In <Icon name="arrow" />
            </button>
          </form>
          <div
            id="auth-status"
            role="status"
            aria-live="polite"
            className={message ? "auth-message" : ""}
          >
            {message}
          </div>
        </div>
        <footer className="auth-footer">
          <Icon name="shield" />
          <span>Protected by ProLink Escrow & Trust</span>
          <Link href="/">Back to home</Link>
        </footer>
      </main>
      <aside className="auth-visual" aria-label="Customer testimonial">
        <Image
          src="/images/hero-technician.jpg"
          alt=""
          fill
          sizes="50vw"
          priority
        />
        <div className="auth-overlay" />
        <div className="auth-panel-top">
          <span className="badge">Pakistan&apos;s #1 Service Marketplace</span>
          <span className="panel-rating">
            <Icon name="star" className="gold" />
            4.92 / 5
          </span>
        </div>
        <div className="testimonial">
          <div className="stars" aria-label="5 out of 5 stars">
            ★★★★★
          </div>
          <blockquote>
            “ProLink changed how our family handles home maintenance in
            Islamabad. Instead of hunting through phone contacts, we posted an
            inverter fault and received 3 verified quotes in 15 minutes.”
          </blockquote>
          <div className="testimonial-person">
            <span className="avatar" aria-hidden="true">
              MH
            </span>
            <div>
              <strong>Mustafa Hashmi</strong>
              <span>Homeowner · Sector F-7, Islamabad</span>
            </div>
          </div>
          <div className="auth-metrics">
            <div>
              <strong>2,400+</strong>
              <span>Verified Pros</span>
            </div>
            <div>
              <strong>14 mins</strong>
              <span>Avg First Offer</span>
            </div>
            <div>
              <strong>PKR 0</strong>
              <span>Inspection Scams</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
