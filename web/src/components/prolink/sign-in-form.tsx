"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Brand, Icon } from "./brand";
import { createClient } from "@/utils/supabase/client";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const queryError = searchParams.get("error") || "";

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const displayMessage = message || queryError;

  async function handleGoogleSignIn() {
    try {
      setMessage("");
      setLoading(true);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setMessage(error.message);
      }
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during Google sign-in.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setMessage("");
      setLoading(true);
      const formData = new FormData(event.currentTarget);
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;

      const supabase = createClient();

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
        } else {
          router.push("/");
          router.refresh();
        }
      } else {
        // Sign up flow
        const fullName = (formData.get("fullName") as string)?.trim() || "";
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) {
          setMessage(error.message);
        } else if (data.session) {
          // Immediately authenticated (email confirmation disabled in Supabase)
          router.push("/onboarding");
          router.refresh();
        } else if (data.user) {
          // Email confirmation is required by Supabase configuration
          setMessage(
            "Account created! Please check your email inbox to confirm your email address before signing in.",
          );
        }
      }
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : `Failed to ${mode === "signin" ? "sign in" : "sign up"}. Please try again.`,
      );
    } finally {
      setLoading(false);
    }
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
          <h1>
            {mode === "signin" ? "Sign in to your account" : "Create your account"}
          </h1>
          <p className="auth-intro">
            {mode === "signin"
              ? "Access your jobs, verify real-time offers, or manage your service business."
              : "Join ProLink to connect with verified service professionals or offer your trade skills."}
          </p>

          <div className="social-buttons" style={{ gridTemplateColumns: "1fr" }}>
            <button
              type="button"
              className="social-button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              aria-label="Continue with Google"
              style={{ width: "100%" }}
            >
              <span aria-hidden="true" className="social-symbol google">
                G
              </span>
              {loading
                ? "Connecting..."
                : mode === "signin"
                  ? "Continue with Google"
                  : "Sign up with Google"}
            </button>
          </div>

          <div className="divider">
            <span>Or with email</span>
          </div>

          <form onSubmit={submit}>
            {mode === "signup" && (
              <div className="field">
                <label htmlFor="fullName">Full name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Ali Ahmed"
                  required
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
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
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  placeholder={
                    mode === "signin"
                      ? "Enter your password"
                      : "Create a password (min 6 characters)"
                  }
                  minLength={6}
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

            {mode === "signin" && (
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
            )}

            <button
              className="button submit-button"
              type="submit"
              disabled={loading}
              style={{ marginTop: mode === "signup" ? "24px" : undefined }}
            >
              {loading
                ? "Processing..."
                : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}{" "}
              <Icon name="arrow" />
            </button>
          </form>

          <div
            style={{
              marginTop: "20px",
              textAlign: "center",
              fontSize: "13px",
              color: "var(--muted)",
            }}
          >
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setMode("signup");
                    setMessage("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontSize: "inherit",
                    fontWeight: 600,
                  }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setMode("signin");
                    setMessage("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontSize: "inherit",
                    fontWeight: 600,
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          <div
            id="auth-status"
            role="status"
            aria-live="polite"
            className={displayMessage ? "auth-message" : ""}
          >
            {displayMessage}
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
