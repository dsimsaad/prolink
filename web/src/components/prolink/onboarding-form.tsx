"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Brand, Icon } from "./brand";
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
          <Brand />
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
                      Post home repair and maintenance jobs, receive verified quotes,
                      and chat directly with local technicians.
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
                      Browse local service requests, submit custom bids, build your
                      reputation, and get hired across Pakistan.
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
            “Joining ProLink as a certified electrician gave me verified leads
            and guaranteed payment escrow without middlemen cuts.”
          </blockquote>
          <div className="testimonial-person">
            <span className="avatar" aria-hidden="true">
              KA
            </span>
            <div>
              <strong>Khurram Abbas</strong>
              <span>Verified Electrician · Rawalpindi</span>
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
