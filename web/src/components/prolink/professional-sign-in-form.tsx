"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MapPin, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { Brand, Icon } from "./brand";
import { siteConfig } from "@/config/site";
import { createClient } from "@/utils/supabase/client";
import {
  clearOAuthDestination,
  rememberOAuthDestination,
} from "@/utils/oauth-navigation";
import { resolvePostLoginAction } from "@/app/sign-in/actions";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ProfessionalSignInForm() {
  const searchParams = useSearchParams();
  const queryMode = searchParams.get("mode");
  const queryError = searchParams.get("error") || "";

  const [mode, setMode] = useState<"signin" | "signup">(
    queryMode === "signup" ? "signup" : "signin"
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
  }>({});
  const [message, setMessage] = useState("");
  const [isSuccessMessage, setIsSuccessMessage] = useState(false);
  const [loading, setLoading] = useState(false);

  const displayMessage = message || queryError;
  const targetDestination = "/become-professional";

  function validateFields(): boolean {
    const errors: { fullName?: string; email?: string; password?: string } = {};
    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    if (mode === "signup" && trimmedName.length < 3) {
      errors.fullName = "Please enter your full name (at least 3 characters).";
    }

    if (!trimmedEmail) {
      errors.email = "Email address is required.";
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address (e.g. name@example.com).";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters long.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleGoogleSignIn() {
    try {
      setMessage("");
      setIsSuccessMessage(false);
      setFieldErrors({});
      setLoading(true);
      const supabase = createClient();

      document.cookie = `prolink_oauth_next=${encodeURIComponent(targetDestination)}; path=/; max-age=900; SameSite=Lax`;
      rememberOAuthDestination(targetDestination);

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
        setLoading(false);
      }
    } catch (err) {
      clearOAuthDestination();
      document.cookie = "prolink_oauth_next=; path=/; max-age=0";
      setMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during Google sign-in."
      );
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSuccessMessage(false);

    if (!validateFields()) {
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      const cleanEmail = email.trim();

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          setMessage(
            error.message === "Invalid login credentials"
              ? "Invalid email or password. Please check your credentials and try again."
              : error.message
          );
          setLoading(false);
          return;
        }

        const check = await resolvePostLoginAction(targetDestination);
        if (check.status === "suspended") {
          await supabase.auth.signOut();
          setMessage(check.message);
          setLoading(false);
          return;
        }

        window.location.replace(
          check.destination === "/admin" ? "/admin" : targetDestination
        );
      } else {
        const cleanFullName = fullName.trim();
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanFullName,
            },
          },
        });

        if (error) {
          setMessage(error.message);
          setLoading(false);
          return;
        }

        if (data.session) {
          const check = await resolvePostLoginAction(targetDestination);
          if (check.status === "suspended") {
            await supabase.auth.signOut();
            setMessage(check.message);
            setLoading(false);
            return;
          }
          window.location.replace(
            check.destination === "/admin" ? "/admin" : targetDestination
          );
        } else if (data.user) {
          setIsSuccessMessage(true);
          setMessage(
            "Account created! Please check your email inbox to confirm your email address, then sign in to complete your professional application."
          );
          setLoading(false);
        }
      }
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : `Failed to ${mode === "signin" ? "sign in" : "create account"}. Please try again.`
      );
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
          <span
            className="pro-header-badge success"
            style={{ marginBottom: "10px" }}
          >
            <Icon name="shield" /> For Skilled Professionals
          </span>

          <h1>
            {mode === "signin"
              ? "Professional Sign In"
              : "Create a Professional Account"}
          </h1>
          <p className="auth-intro">
            {mode === "signin"
              ? `Sign in to your ${siteConfig.name} account to start or continue your professional application.`
              : `Create your ${siteConfig.name} account first, then complete the 3-step professional application.`}
          </p>

          {/* Step preview strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              marginTop: "18px",
              padding: "10px 14px",
              borderRadius: "10px",
              background: "var(--tint)",
              border: "1px solid var(--border)",
              fontSize: "12px",
              color: "var(--body)",
            }}
          >
            <strong style={{ color: "var(--forest)" }}>1. Sign In</strong>
            <span style={{ color: "var(--muted)" }}>→</span>
            <span>2. Complete 3-Step Application</span>
            <span style={{ color: "var(--muted)" }}>→</span>
            <span>3. Application Review</span>
          </div>

          <div
            className="social-buttons"
            style={{ gridTemplateColumns: "1fr", marginTop: "22px" }}
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
            <span>Or continue with email</span>
          </div>

          {displayMessage && (
            <div
              id="pro-auth-status"
              role="alert"
              aria-live="polite"
              style={{
                background: isSuccessMessage ? "var(--mint)" : "var(--danger-soft)",
                border: isSuccessMessage
                  ? "1px solid var(--success-border)"
                  : "1px solid var(--danger-border)",
                color: isSuccessMessage ? "var(--forest)" : "var(--danger-fg-hover)",
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "16px",
                fontSize: "13px",
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              {displayMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {mode === "signup" && (
              <div className="field">
                <label htmlFor="pro-signin-fullname">Full Name</label>
                <input
                  id="pro-signin-fullname"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName) {
                      setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                    }
                  }}
                  placeholder="e.g. Tariq Mehmood"
                  disabled={loading}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  style={
                    fieldErrors.fullName
                      ? { borderColor: "var(--danger-border-strong)" }
                      : undefined
                  }
                />
                {fieldErrors.fullName && (
                  <p
                    role="alert"
                    style={{
                      color: "var(--danger-border-strong)",
                      fontSize: "12px",
                      marginTop: "6px",
                      fontWeight: 500,
                    }}
                  >
                    {fieldErrors.fullName}
                  </p>
                )}
              </div>
            )}

            <div className="field">
              <label htmlFor="pro-signin-email">Email Address</label>
              <input
                id="pro-signin-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                placeholder="name@example.com"
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.email)}
                style={
                  fieldErrors.email ? { borderColor: "var(--danger-border-strong)" } : undefined
                }
              />
              {fieldErrors.email && (
                <p
                  role="alert"
                  style={{
                    color: "var(--danger-border-strong)",
                    fontSize: "12px",
                    marginTop: "6px",
                    fontWeight: 500,
                  }}
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="pro-signin-password">Password</label>
              <div className="password-field">
                <input
                  id="pro-signin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        password: undefined,
                      }));
                    }
                  }}
                  placeholder={
                    mode === "signin"
                      ? "Enter your password"
                      : "Create a password (min 6 characters)"
                  }
                  disabled={loading}
                  aria-invalid={Boolean(fieldErrors.password)}
                  style={
                    fieldErrors.password
                      ? { borderColor: "var(--danger-border-strong)" }
                      : undefined
                  }
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
              {fieldErrors.password && (
                <p
                  role="alert"
                  style={{
                    color: "var(--danger-border-strong)",
                    fontSize: "12px",
                    marginTop: "6px",
                    fontWeight: 500,
                  }}
                >
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              className="button submit-button"
              type="submit"
              disabled={loading}
              style={{ marginTop: "24px" }}
            >
              {loading
                ? mode === "signin"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "signin"
                  ? "Sign In & Continue to Application"
                  : "Create Account & Continue"}{" "}
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
                New to ProLink?{" "}
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setMode("signup");
                    setMessage("");
                    setFieldErrors({});
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
                  Create a professional account
                </button>
              </>
            ) : (
              <>
                Already have a ProLink account?{" "}
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setMode("signin");
                    setMessage("");
                    setFieldErrors({});
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
                  Sign in instead
                </button>
              </>
            )}
          </div>
        </div>

        <footer className="auth-footer">
          <ShieldCheck className="h-4 w-4 text-[var(--forest)]" aria-hidden="true" />
          <span>{siteConfig.name} · Professional Network</span>
          <Link href="/">Back to home</Link>
        </footer>
      </main>

      <aside
        className="auth-visual"
        data-mode={mode}
        aria-label="Welcome to ProLink Professionals"
        aria-live="polite"
      >
        <div className="auth-ambient-orb orb-primary" aria-hidden="true" />
        <div className="auth-ambient-orb orb-secondary" aria-hidden="true" />

        <div className="auth-panel-top">
          <span className="badge">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Professional Hub · {siteConfig.city}
          </span>
        </div>

        <div className="auth-welcome-stage">
          <div className="auth-welcome-layers">
            <div
              className={`auth-welcome-layer ${
                mode === "signin" ? "is-active" : "is-inactive-up"
              }`}
              aria-hidden={mode !== "signin"}
            >
              <span className="auth-welcome-eyebrow">Professional Sign In</span>
              <h2 className="auth-welcome-heading">Welcome Back, Trade Partner!</h2>
              <p className="auth-welcome-description">
                Sign in to track your trade application, view local service requests,
                and manage your professional profile in {siteConfig.city}.
              </p>
            </div>

            <div
              className={`auth-welcome-layer ${
                mode === "signup" ? "is-active" : "is-inactive-down"
              }`}
              aria-hidden={mode !== "signup"}
            >
              <span className="auth-welcome-eyebrow">Trade Partner Access</span>
              <h2 className="auth-welcome-heading">Grow Your Trade in {siteConfig.city}</h2>
              <p className="auth-welcome-description">
                Create your account to start your 3-step application, send itemised
                offers directly to households, and grow your local client base.
              </p>
            </div>
          </div>

          <div className="auth-photo-card">
            <Image
              src="/images/auth-craft.webp"
              alt="Professional skilled artisan at work"
              fill
              sizes="(min-width: 1024px) 420px, 320px"
              style={{ objectFit: "cover" }}
            />
          </div>

          <ul className="auth-benefits-list">
            <li className="auth-benefit-item">
              <span className="auth-benefit-icon">
                <Wrench className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>Send itemised quotes to local households</span>
            </li>
            <li className="auth-benefit-item">
              <span className="auth-benefit-icon">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>Reviewed application process</span>
            </li>
            <li className="auth-benefit-item">
              <span className="auth-benefit-icon">
                <MapPin className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>Direct matching in {siteConfig.city}</span>
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
