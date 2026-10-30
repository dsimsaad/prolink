"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FileText, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Icon } from "./brand";
import { siteConfig } from "@/config/site";
import { createClient } from "@/utils/supabase/client";

type AllowedRole = "customer" | "professional";

export function OnboardingForm({
  userFullName,
}: {
  userFullName?: string;
}) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<AllowedRole>("customer");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Guard: strictly customer or professional
    if (selectedRole !== "customer" && selectedRole !== "professional") {
      setMessage("Please choose a valid role to continue.");
      return;
    }

    try {
      setMessage("");
      setLoading(true);
      const supabase = createClient();

      const { error } = await supabase.rpc("complete_onboarding", {
        p_role: selectedRole,
      });

      if (error) {
        setMessage(error.message);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "An error occurred while saving your profile. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sign-in-page">
      <main className="auth-column">
        <div className="auth-top">
          <Link href="/#how-it-works" className="text-link">
            Explore ProLink <Icon name="arrow" />
          </Link>
        </div>
        <div className="auth-content">
          <h1>Welcome{userFullName ? `, ${userFullName}` : ""}!</h1>
          <p className="auth-intro">
            How would you like to use ProLink? Choose your primary account role
            to complete your setup.
          </p>

          <form onSubmit={handleSubmit} style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <label
                style={{
                  display: "block",
                  padding: "16px",
                  borderRadius: "10px",
                  border:
                    selectedRole === "customer"
                      ? "2px solid var(--forest)"
                      : "1px solid var(--border)",
                  backgroundColor:
                    selectedRole === "customer" ? "var(--tint)" : "white",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <input
                    type="radio"
                    name="role"
                    value="customer"
                    checked={selectedRole === "customer"}
                    onChange={() => setSelectedRole("customer")}
                    style={{
                      marginTop: "4px",
                      accentColor: "var(--forest)",
                    }}
                  />
                  <div>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "15px",
                        color: "var(--ink)",
                      }}
                    >
                      I want to hire services (Customer)
                    </strong>
                    <span
                      style={{
                        display: "block",
                        marginTop: "4px",
                        fontSize: "13px",
                        color: "var(--muted)",
                        lineHeight: 1.5,
                      }}
                    >
                      Post home repair and maintenance jobs, receive itemised quotes,
                      and message local professionals directly.
                    </span>
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: "block",
                  padding: "16px",
                  borderRadius: "10px",
                  border:
                    selectedRole === "professional"
                      ? "2px solid var(--forest)"
                      : "1px solid var(--border)",
                  backgroundColor:
                    selectedRole === "professional" ? "var(--tint)" : "white",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <input
                    type="radio"
                    name="role"
                    value="professional"
                    checked={selectedRole === "professional"}
                    onChange={() => setSelectedRole("professional")}
                    style={{
                      marginTop: "4px",
                      accentColor: "var(--forest)",
                    }}
                  />
                  <div>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "15px",
                        color: "var(--ink)",
                      }}
                    >
                      I am a service professional (Tradesperson)
                    </strong>
                    <span
                      style={{
                        display: "block",
                        marginTop: "4px",
                        fontSize: "13px",
                        color: "var(--muted)",
                        lineHeight: 1.5,
                      }}
                    >
                      Browse local service requests, submit custom offers, and
                      connect with households in {siteConfig.city}.
                    </span>
                  </div>
                </div>
              </label>
            </div>

            <button
              className="button submit-button"
              type="submit"
              disabled={loading}
              style={{ marginTop: "28px" }}
            >
              {loading ? "Completing Setup..." : "Confirm & Continue"}{" "}
              <Icon name="arrow" />
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
          <ShieldCheck className="h-4 w-4 text-[var(--forest)]" aria-hidden="true" />
          <span>{siteConfig.name} · {siteConfig.city} Pilot</span>
          <Link href="/">Back to home</Link>
        </footer>
      </main>

      <aside className="auth-visual" aria-label="Account setup benefits">
        <div className="auth-ambient-orb orb-primary" aria-hidden="true" />
        <div className="auth-ambient-orb orb-secondary" aria-hidden="true" />

        <div className="auth-panel-top">
          <span className="badge">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {siteConfig.name} {siteConfig.city}
          </span>
        </div>

        <div className="auth-welcome-stage">
          <div className="auth-welcome-layer is-active">
            <span className="auth-welcome-eyebrow">Account Setup</span>
            <h2 className="auth-welcome-heading">Choose Your Role on {siteConfig.name}</h2>
            <p className="auth-welcome-description">
              Select whether you want to post household repair requests or offer
              your skilled trade services to local residents in {siteConfig.city}.
            </p>
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
              <span>Compare itemised offers before hiring</span>
            </li>
            <li className="auth-benefit-item">
              <span className="auth-benefit-icon">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>Phone numbers stay private until acceptance</span>
            </li>
            <li className="auth-benefit-item">
              <span className="auth-benefit-icon">
                <MapPin className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>Local service matching in {siteConfig.city}</span>
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
