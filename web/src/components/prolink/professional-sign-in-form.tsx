"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Brand } from "./brand";
import { AuthVisualPanel } from "./auth-visual-panel";
import { createClient } from "@/utils/supabase/client";
import {
  clearOAuthDestination,
  rememberOAuthDestination,
} from "@/utils/oauth-navigation";
import { resolvePostLoginAction } from "@/app/sign-in/actions";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.44 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.56 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
      />
    </svg>
  );
}

export function ProfessionalSignInForm() {
  const searchParams = useSearchParams();
  const queryMode = searchParams.get("mode");
  const queryError = searchParams.get("error") || "";

  const [mode, setMode] = useState<"signin" | "signup">(
    queryMode === "signup" ? "signup" : "signin"
  );
  const [spinCount, setSpinCount] = useState(1);
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateFields()) {
      return;
    }
    setSpinCount((prev) => prev + 1);

    try {
      setMessage("");
      setIsSuccessMessage(false);
      setLoading(true);

      const trimmedEmail = email.trim();
      const trimmedName = fullName.trim();
      const supabase = createClient();

      if (mode === "signin") {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error) {
          setMessage(error.message);
          setLoading(false);
          return;
        }

        if (authData?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, is_suspended, suspended_reason")
            .eq("id", authData.user.id)
            .maybeSingle();

          if (profile?.is_suspended) {
            await supabase.auth.signOut();
            const msg = profile.suspended_reason
              ? `Your account has been suspended: ${profile.suspended_reason}`
              : "Your account has been suspended. Please contact support.";
            setMessage(msg);
            setLoading(false);
            return;
          }

          if (profile?.role === "admin") {
            window.location.replace("/admin");
            return;
          }
        }

        const check = await resolvePostLoginAction(targetDestination);
        if (check.status === "suspended") {
          await supabase.auth.signOut();
          setMessage(check.message);
          setLoading(false);
        } else {
          window.location.replace(check.destination);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              full_name: trimmedName,
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
          } else {
            window.location.replace(check.destination);
          }
        } else if (data.user) {
          setIsSuccessMessage(true);
          setMessage(
            "Professional account created! Please check your email to confirm your address before signing in."
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
    <div className="prolink-auth-page">
      <main className="prolink-auth-main">
        {/* Top Header */}
        <header className="prolink-auth-header">
          <Brand priority />
          <Link href="/" className="prolink-auth-back-link">
            <span>Back to home</span>
            <span aria-hidden="true" className="arrow">→</span>
          </Link>
        </header>

        {/* Content Form Area */}
        <div key={mode} className="prolink-auth-content auth-form-enter">
          <div className="prolink-auth-intro">
            {mode === "signin" ? (
              <>
                <h1 className="prolink-auth-title">Professional Sign In</h1>
                <p className="prolink-auth-subtitle">
                  Sign in to track your trade application and manage your professional profile.
                </p>
              </>
            ) : (
              <>
                <h1 className="prolink-auth-title">Become a Trade Partner</h1>
                <p className="prolink-auth-subtitle">
                  Create your account to start your professional application and offer local services.
                </p>
              </>
            )}
          </div>

          {/* Google Button */}
          <button
            type="button"
            className="prolink-google-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <GoogleIcon className="prolink-google-icon" />
            <span>
              {loading
                ? "Connecting..."
                : mode === "signin"
                  ? "Continue with Google"
                  : "Sign up with Google"}
            </span>
          </button>

          <div className="prolink-auth-divider">
            <span>Or with email</span>
          </div>

          <form onSubmit={submit} className="prolink-auth-form" noValidate>
            {mode === "signup" && (
              <div className="prolink-form-field">
                <label htmlFor="proFullName">Full name</label>
                <input
                  id="proFullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Tariq Mehmood"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName) {
                      setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                    }
                  }}
                  disabled={loading}
                  className={fieldErrors.fullName ? "has-error" : ""}
                />
                {fieldErrors.fullName && (
                  <p className="prolink-field-error">{fieldErrors.fullName}</p>
                )}
              </div>
            )}

            <div className="prolink-form-field">
              <label htmlFor="proEmail">Email address</label>
              <input
                id="proEmail"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                disabled={loading}
                className={fieldErrors.email ? "has-error" : ""}
              />
              {fieldErrors.email && (
                <p className="prolink-field-error">{fieldErrors.email}</p>
              )}
            </div>

            <div className="prolink-form-field">
              <label htmlFor="proPassword">Password</label>
              <div className="prolink-password-wrapper">
                <input
                  id="proPassword"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder={
                    mode === "signin"
                      ? "Enter your password"
                      : "Create a password (min 6 characters)"
                  }
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  disabled={loading}
                  className={fieldErrors.password ? "has-error" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="prolink-password-toggle"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="prolink-field-error">{fieldErrors.password}</p>
              )}
            </div>

            {mode === "signin" && (
              <div className="prolink-form-options">
                <label className="prolink-remember-checkbox">
                  <input type="checkbox" name="remember" defaultChecked />
                  <span>Remember me</span>
                </label>
                <Link href="/forgot-password" className="prolink-forgot-link">
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              className="prolink-submit-btn"
              type="submit"
              disabled={loading}
            >
              <span>
                {loading
                  ? "Processing..."
                  : mode === "signin"
                    ? "Sign In & Continue"
                    : "Create Account & Continue"}
              </span>
              <span aria-hidden="true" className="arrow">→</span>
            </button>
          </form>

          {/* Switch link */}
          <div className="prolink-auth-switch">
            {mode === "signin" ? (
              <>
                New to ProLink?{" "}
                <button
                  type="button"
                  className="prolink-switch-link"
                  onClick={() => {
                    setSpinCount((prev) => prev + 1);
                    setMode("signup");
                    setMessage("");
                    setFieldErrors({});
                  }}
                >
                  Create a professional account
                </button>
              </>
            ) : (
              <>
                Already registered?{" "}
                <button
                  type="button"
                  className="prolink-switch-link"
                  onClick={() => {
                    setSpinCount((prev) => prev + 1);
                    setMode("signin");
                    setMessage("");
                    setFieldErrors({});
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          {displayMessage && (
            <div
              role="status"
              className={`prolink-auth-alert ${
                isSuccessMessage ? "is-success" : "is-error"
              }`}
            >
              {displayMessage}
            </div>
          )}
        </div>
      </main>

      {/* Right Side Visual Panel */}
      <AuthVisualPanel spinCount={spinCount} isLoading={loading} />
    </div>
  );
}
