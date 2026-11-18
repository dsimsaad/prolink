"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Brand } from "./brand";
import { AuthVisualPanel } from "./auth-visual-panel";
import { createClient } from "@/utils/supabase/client";
import { getSignInDestination } from "@/utils/auth-destination";
import {
  clearOAuthDestination,
  rememberOAuthDestination,
} from "@/utils/oauth-navigation";
import { resolvePostLoginAction } from "@/app/sign-in/actions";

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

export function SignInForm({
  defaultMode = "signin",
}: {
  defaultMode?: "signin" | "signup" | "forgot";
} = {}) {
  const searchParams = useSearchParams();

  const queryMode = searchParams.get("mode");
  const hasRoleParam = searchParams.get("role") === "professional";
  const initialMode: "signin" | "signup" | "forgot" =
    queryMode === "signup" || hasRoleParam || defaultMode === "signup"
      ? "signup"
      : queryMode === "forgot" || queryMode === "reset" || defaultMode === "forgot"
        ? "forgot"
        : "signin";

  const queryError = searchParams.get("error") || "";

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(initialMode);
  const [spinCount, setSpinCount] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccessMessage, setIsSuccessMessage] = useState(false);
  const [loading, setLoading] = useState(false);

  const displayMessage = message || queryError;
  const safeNext = getSignInDestination(
    searchParams.get("next"),
    searchParams.get("role"),
  );

  async function handleGoogleSignIn() {
    setSpinCount((prev) => prev + 1);
    try {
      setMessage("");
      setIsSuccessMessage(false);
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
    setSpinCount((prev) => prev + 1);
    try {
      setMessage("");
      setIsSuccessMessage(false);
      setLoading(true);
      const formData = new FormData(event.currentTarget);
      const email = (formData.get("email") as string)?.trim();
      const password = formData.get("password") as string;

      const supabase = createClient();

      if (mode === "signin") {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
        } else {
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
              return;
            }

            if (profile?.role === "admin") {
              window.location.replace("/admin");
              return;
            }
          }

          const check = await resolvePostLoginAction(safeNext);
          if (check.status === "suspended") {
            await supabase.auth.signOut();
            setMessage(check.message);
          } else {
            window.location.replace(check.destination);
          }
        }
      } else if (mode === "signup") {
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
          setIsSuccessMessage(true);
          setMessage(
            "Account created! Please check your email inbox to confirm your email address before signing in.",
          );
        }
      } else if (mode === "forgot") {
        const callbackUrl = `${window.location.origin}/auth/callback?next=/dashboard/profile`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: callbackUrl,
        });

        if (error) {
          setMessage(error.message);
        } else {
          setIsSuccessMessage(true);
          setMessage(
            "If an account exists for that email, a password reset link has been sent. Please check your inbox.",
          );
        }
      }
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : `Failed to ${
              mode === "signin"
                ? "sign in"
                : mode === "signup"
                  ? "sign up"
                  : "reset password"
            }. Please try again.`,
      );
    } finally {
      setLoading(false);
    }
  }

  function handleModeChange(newMode: "signin" | "signup" | "forgot") {
    setSpinCount((prev) => prev + 1);
    setMode(newMode);
    setMessage("");
    setIsSuccessMessage(false);
    const targetUrl =
      newMode === "signin"
        ? "/sign-in"
        : newMode === "signup"
          ? "/sign-up"
          : "/forgot-password";
    window.history.pushState(null, "", targetUrl);
  }

  return (
    <div className="prolink-auth-page">
      <main className="prolink-auth-main">
        {/* Top Header: ProLink logo on left, Back to home on right */}
        <header className="prolink-auth-header">
          <Brand priority />
          <Link href="/" className="prolink-auth-back-link">
            <span>Back to home</span>
            <span aria-hidden="true" className="arrow">→</span>
          </Link>
        </header>

        {/* Center Content / Form Area */}
        <div key={mode} className="prolink-auth-content auth-form-enter">
          <div className="prolink-auth-intro">
            {mode === "signin" && (
              <>
                <h1 className="prolink-auth-title">Sign in to your account</h1>
                <p className="prolink-auth-subtitle">
                  Access your jobs, review offers, and manage your ProLink activity.
                </p>
              </>
            )}
            {mode === "signup" && (
              <>
                <h1 className="prolink-auth-title">Create your account</h1>
                <p className="prolink-auth-subtitle">
                  Set up your ProLink profile in seconds to get started.
                </p>
              </>
            )}
            {mode === "forgot" && (
              <>
                <h1 className="prolink-auth-title">Reset your password</h1>
                <p className="prolink-auth-subtitle">
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </p>
              </>
            )}
          </div>

          {/* Social Sign-in (Google) - for signin & signup */}
          {mode !== "forgot" && (
            <>
              <button
                type="button"
                className="prolink-google-btn"
                onClick={handleGoogleSignIn}
                disabled={loading}
                aria-label={
                  mode === "signin" ? "Continue with Google" : "Sign up with Google"
                }
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
            </>
          )}

          {/* Form */}
          <form onSubmit={submit} className="prolink-auth-form">
            {mode === "signup" && (
              <div className="prolink-form-field">
                <label htmlFor="fullName">Full name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            )}

            <div className="prolink-form-field">
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

            {mode !== "forgot" && (
              <div className="prolink-form-field">
                <label htmlFor="password">Password</label>
                <div className="prolink-password-wrapper">
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
                    className="prolink-password-toggle"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            )}

            {mode === "signin" && (
              <div className="prolink-form-options">
                <label className="prolink-remember-checkbox">
                  <input type="checkbox" name="remember" defaultChecked />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleModeChange("forgot")}
                  className="prolink-forgot-link"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Pill Submit Button */}
            <button
              className="prolink-submit-btn"
              type="submit"
              disabled={loading}
            >
              <span>
                {loading
                  ? "Processing..."
                  : mode === "signin"
                    ? "Sign In"
                    : mode === "signup"
                      ? "Create Account"
                      : "Send Reset Link"}
              </span>
              <span aria-hidden="true" className="arrow">→</span>
            </button>
          </form>

          {/* Switch Mode Links */}
          <div className="prolink-auth-switch">
            {mode === "signin" && (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => handleModeChange("signup")}
                  className="prolink-switch-link"
                >
                  Sign up
                </button>
              </>
            )}
            {mode === "signup" && (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => handleModeChange("signin")}
                  className="prolink-switch-link"
                >
                  Sign in
                </button>
              </>
            )}
            {mode === "forgot" && (
              <>
                Remember your password?{" "}
                <button
                  type="button"
                  onClick={() => handleModeChange("signin")}
                  className="prolink-switch-link"
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          {/* Status Message */}
          {displayMessage && (
            <div
              id="auth-status"
              role="status"
              aria-live="polite"
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
