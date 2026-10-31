"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FileText, MapPin, ShieldCheck } from "lucide-react";
import { Brand, Icon } from "./brand";
import { siteConfig } from "@/config/site";
import { createClient } from "@/utils/supabase/client";
import { getSignInDestination } from "@/utils/auth-destination";
import {
  clearOAuthDestination,
  rememberOAuthDestination,
} from "@/utils/oauth-navigation";
import { resolvePostLoginAction } from "@/app/sign-in/actions";

export function SignInForm({
  defaultMode,
}: {
  defaultMode?: "signin" | "signup";
} = {}) {
  const searchParams = useSearchParams();

  const queryMode = searchParams.get("mode");
  const hasRoleParam = searchParams.get("role") === "professional";
  const initialMode =
    defaultMode === "signup" || queryMode === "signup" || hasRoleParam
      ? "signup"
      : "signin";

  const queryError = searchParams.get("error") || "";

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const displayMessage = message || queryError;
  const safeNext = getSignInDestination(
    searchParams.get("next"),
    searchParams.get("role"),
  );

  async function handleGoogleSignIn() {
    try {
      setMessage("");
      setLoading(true);
      const supabase = createClient();
      document.cookie = `prolink_oauth_next=${encodeURIComponent(safeNext)}; path=/; max-age=900; SameSite=Lax`;
      rememberOAuthDestination(safeNext);

      const callbackUrl = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
        },
      });
      if (error) {
        clearOAuthDestination();
        document.cookie = "prolink_oauth_next=; path=/; max-age=0";
        setMessage(error.message);
      }
    } catch (err) {
      clearOAuthDestination();
      document.cookie = "prolink_oauth_next=; path=/; max-age=0";
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
          const check = await resolvePostLoginAction(safeNext);
          if (check.status === "suspended") {
            await supabase.auth.signOut();
            setMessage(check.message);
          } else {
            window.location.replace(check.destination);
          }
        }
      } else {
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
          const check = await resolvePostLoginAction(safeNext);
          if (check.status === "suspended") {
            await supabase.auth.signOut();
            setMessage(check.message);
          } else {
            window.location.replace(check.destination);
          }
        } else if (data.user) {
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
          <Link href="/" className="text-link">
            Back to home <Icon name="arrow" />
          </Link>
        </div>

        <div className="auth-content">
          <div className="auth-heading-stage">
            <div
              className={`auth-heading-layer ${
                mode === "signin" ? "is-active" : "is-inactive"
              }`}
              aria-hidden={mode !== "signin"}
            >
              <h1>Sign in to your account</h1>
              <p className="auth-intro">
                Access your jobs, review offers, and manage your ProLink
                activity.
              </p>
            </div>
            <div
              className={`auth-heading-layer ${
                mode === "signup" ? "is-active" : "is-inactive"
              }`}
              aria-hidden={mode !== "signup"}
            >
              <h1>Create your account</h1>
              <p className="auth-intro">
                Set up your ProLink profile in seconds to get started.
              </p>
            </div>
          </div>

          <div
            className="social-buttons"
            style={{ gridTemplateColumns: "1fr" }}
          >
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
            <div
              className={`auth-expandable-field ${
                mode === "signup" ? "is-open" : ""
              }`}
              aria-hidden={mode !== "signup"}
            >
              <div className="auth-expandable-inner">
                <div className="field" style={{ marginTop: 0 }}>
                  <label htmlFor="fullName">Full name</label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    required={mode === "signup"}
                    disabled={mode !== "signup"}
                    tabIndex={mode === "signup" ? 0 : -1}
                  />
                </div>
              </div>
            </div>

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
          <ShieldCheck className="h-4 w-4 text-[var(--forest)]" aria-hidden="true" />
          <span>{siteConfig.name} · {siteConfig.city} Pilot</span>
          <Link href="/">Back to home</Link>
        </footer>
      </main>

      <aside
        className="auth-visual"
        data-mode={mode}
        aria-label="Welcome to ProLink"
        aria-live="polite"
      >
        <div className="auth-ambient-orb orb-primary" aria-hidden="true" />
        <div className="auth-ambient-orb orb-secondary" aria-hidden="true" />

        <div className="auth-welcome-stage">
          <div className="auth-welcome-layers">
            <div
              className={`auth-welcome-layer ${
                mode === "signin" ? "is-active" : "is-inactive-up"
              }`}
              aria-hidden={mode !== "signin"}
            >
              <span className="auth-welcome-eyebrow">Household &amp; Pro Access</span>
              <h2 className="auth-welcome-heading">Welcome Back to {siteConfig.name}!</h2>
              <p className="auth-welcome-description">
                Sign in to manage your household repair requests, compare itemised
                offers, and message local trades in {siteConfig.city}.
              </p>
            </div>

            <div
              className={`auth-welcome-layer ${
                mode === "signup" ? "is-active" : "is-inactive-down"
              }`}
              aria-hidden={mode !== "signup"}
            >
              <span className="auth-welcome-eyebrow">Get Started</span>
              <h2 className="auth-welcome-heading">Welcome to {siteConfig.name}!</h2>
              <p className="auth-welcome-description">
                Post repair jobs, receive itemised offers from local trades, and keep
                your phone number private until you choose to hire.
              </p>
            </div>
          </div>

          <div className="auth-photo-card">
            <Image
              src="/images/auth-craft.webp"
              alt="Hands-on trade repair work in progress"
              fill
              sizes="(min-width: 1024px) 420px, 320px"
              style={{ objectFit: "cover" }}
            />
          </div>

          <ul className="auth-benefits-list">
            <li className="auth-benefit-item">
              <span className="auth-benefit-icon">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>Compare itemised offers before you hire</span>
            </li>
            <li className="auth-benefit-item">
              <span className="auth-benefit-icon">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>Your phone number stays private until you accept</span>
            </li>
            <li className="auth-benefit-item">
              <span className="auth-benefit-icon">
                <MapPin className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>Local tradespeople in {siteConfig.city}</span>
            </li>
          </ul>
        </div>

        <div className="auth-welcome-bottom">
          <span>{siteConfig.city} pilot · University semester project</span>
          <span>{siteConfig.name}</span>
        </div>
      </aside>
    </div>
  );
}
