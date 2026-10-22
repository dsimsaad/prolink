"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "./brand";
import { useNavigationAccount } from "./use-navigation-account";
import { createClient } from "@/utils/supabase/client";
import type { ProfessionalState } from "@/utils/professional";

export interface CategoryOption {
  id: number;
  name: string;
}

export interface AreaOption {
  id: number;
  name: string;
}

export interface ApplicationInitialData {
  state: ProfessionalState;
  bio?: string;
  yearsExperience?: number;
  selectedCategoryIds?: number[];
  selectedAreaIds?: number[];
  phone?: string;
  reviewNote?: string | null;
  appliedAt?: string | null;
}

interface BecomeProfessionalFormProps {
  initialData: ApplicationInitialData;
  categories: CategoryOption[];
  areas: AreaOption[];
}

export function BecomeProfessionalForm({
  initialData,
  categories,
  areas,
}: BecomeProfessionalFormProps) {
  const router = useRouter();
  const { refreshAccount } = useNavigationAccount();
  const [currentState, setCurrentState] = useState<ProfessionalState>(
    initialData.state
  );
  const [bio, setBio] = useState(initialData.bio || "");
  const [years, setYears] = useState<string>(
    initialData.yearsExperience !== undefined && initialData.yearsExperience !== null
      ? String(initialData.yearsExperience)
      : "3"
  );
  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    initialData.selectedCategoryIds || []
  );
  const [selectedAreas, setSelectedAreas] = useState<number[]>(
    initialData.selectedAreaIds || []
  );
  const [phone, setPhone] = useState(initialData.phone || "");
  const [confirmed, setConfirmed] = useState(false);
  const [appliedDate, setAppliedDate] = useState<string | null>(
    initialData.appliedAt || null
  );

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleCategory = (id: number) => {
    setSelectedCategories((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const toggleArea = (id: number) => {
    setSelectedAreas((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 12) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const cleanBio = bio.trim();
  const isBioValid = cleanBio.length >= 30 && cleanBio.length <= 1000;
  const numYears = parseInt(years, 10);
  const isYearsValid = !isNaN(numYears) && numYears >= 0 && numYears <= 60;
  const isCategoriesValid =
    selectedCategories.length >= 1 && selectedCategories.length <= 5;
  const isAreasValid = selectedAreas.length >= 1 && selectedAreas.length <= 12;
  const cleanPhone = phone.trim();
  const isPhoneValid = /^\+?[0-9]{10,15}$/.test(cleanPhone);
  const isFormValid =
    isBioValid &&
    isYearsValid &&
    isCategoriesValid &&
    isAreasValid &&
    isPhoneValid &&
    confirmed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isCategoriesValid) {
      setErrorMsg("Please select between 1 and 5 trade categories.");
      return;
    }
    if (!isAreasValid) {
      setErrorMsg("Please select between 1 and 12 service coverage areas.");
      return;
    }
    if (!isYearsValid) {
      setErrorMsg("Years of experience must be between 0 and 60.");
      return;
    }
    if (!isBioValid) {
      setErrorMsg(
        cleanBio.length < 30
          ? `Bio is too short (${cleanBio.length}/30 characters minimum).`
          : `Bio exceeds 1000 characters (${cleanBio.length}/1000).`
      );
      return;
    }
    if (!isPhoneValid) {
      setErrorMsg(
        "Please enter a valid 10-15 digit phone number (e.g., +923001234567 or 03001234567)."
      );
      return;
    }
    if (!confirmed) {
      setErrorMsg("Please check the confirmation box to submit your application.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("apply_as_professional", {
        p_bio: cleanBio,
        p_years: numYears,
        p_category_ids: selectedCategories,
        p_area_ids: selectedAreas,
        p_phone: cleanPhone,
      });

      if (error) {
        let msg = error.message;
        if (msg.includes("Invalid bio")) {
          msg = "Bio must be between 30 and 1,000 characters.";
        } else if (msg.includes("Invalid experience")) {
          msg = "Experience must be between 0 and 60 years.";
        } else if (msg.includes("Invalid categories")) {
          msg = "Please select between 1 and 5 active trade categories.";
        } else if (msg.includes("Invalid service areas")) {
          msg = "Please select between 1 and 12 service areas.";
        } else if (msg.includes("Invalid phone number")) {
          msg = "Phone number must be 10 to 15 digits.";
        } else if (msg.includes("Unauthorized")) {
          msg = "Your session has expired. Please sign in again.";
        }
        setErrorMsg(msg);
        setLoading(false);
        return;
      }

      setAppliedDate(new Date().toISOString());
      setCurrentState("pending");
      window.scrollTo({ top: 0, behavior: "smooth" });
      refreshAccount();
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  // 1. Pending View
  if (currentState === "pending") {
    const selectedCategoryNames = categories
      .filter((c) => selectedCategories.includes(c.id))
      .map((c) => c.name);
    const selectedAreaNames = areas
      .filter((a) => selectedAreas.includes(a.id))
      .map((a) => a.name);

    return (
      <div className="status-card-box text-center">
        <div
          className="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "#eff6ff", color: "#1d4ed8" }}
        >
          <span style={{ fontSize: "22px" }}>⏳</span>
        </div>
        <span className="pro-header-badge info">Under Review</span>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 800,
            color: "var(--ink)",
            marginTop: "8px",
            marginBottom: "12px",
          }}
        >
          Your application is being reviewed
        </h1>
        <p
          style={{
            color: "var(--body)",
            fontSize: "15px",
            maxWidth: "520px",
            margin: "0 auto 28px",
            lineHeight: 1.6,
          }}
        >
          Our team typically reviews applications within 24 to 48 hours. We&apos;ll
          verify your trade credentials and activate your professional profile.
        </p>

        {/* Application Summary */}
        <div
          style={{
            background: "var(--tint)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "20px",
            textAlign: "left",
            maxWidth: "520px",
            margin: "0 auto 32px",
          }}
        >
          <h2
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--ink)",
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Application Summary
          </h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              fontSize: "13px",
            }}
          >
            {selectedCategoryNames.length > 0 && (
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>
                  Selected Trades:
                </span>
                <strong style={{ color: "var(--ink)" }}>
                  {selectedCategoryNames.join(", ")}
                </strong>
              </div>
            )}
            {selectedAreaNames.length > 0 && (
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>
                  Coverage Areas:
                </span>
                <strong style={{ color: "var(--ink)" }}>
                  {selectedAreaNames.join(", ")}
                </strong>
              </div>
            )}
            {years && (
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>
                  Experience:
                </span>
                <strong style={{ color: "var(--ink)" }}>
                  {years} years
                </strong>
              </div>
            )}
            {cleanPhone && (
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>
                  Contact Phone:
                </span>
                <strong style={{ color: "var(--ink)" }}>{cleanPhone}</strong>
              </div>
            )}
            {appliedDate && (
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>
                  Submitted:
                </span>
                <strong style={{ color: "var(--ink)" }}>
                  {new Date(appliedDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </strong>
              </div>
            )}
          </div>
        </div>

        <Link href="/" className="button">
          Return to home
        </Link>
      </div>
    );
  }

  // 2. Approved View
  if (currentState === "approved") {
    return (
      <div className="status-card-box text-center">
        <div
          className="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "var(--mint)", color: "var(--forest)" }}
        >
          <Icon name="check" className="w-6 h-6" />
        </div>
        <span className="pro-header-badge success">Verified Professional</span>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 800,
            color: "var(--ink)",
            marginTop: "8px",
            marginBottom: "12px",
          }}
        >
          You&apos;re an approved ProLink professional!
        </h1>
        <p
          style={{
            color: "var(--body)",
            fontSize: "15px",
            maxWidth: "520px",
            margin: "0 auto 32px",
            lineHeight: 1.6,
          }}
        >
          Your professional tools (job feed, quoting, profile) are coming in the
          next release. In the meantime, you can continue using ProLink to post
          jobs and hire other specialists.
        </p>
        <Link href="/" className="button">
          Return to home
        </Link>
      </div>
    );
  }

  // 3. Suspended View
  if (currentState === "suspended") {
    return (
      <div className="status-card-box text-center">
        <div
          className="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "#fee2e2", color: "#b91c1c" }}
        >
          <span style={{ fontSize: "20px" }}>⚠️</span>
        </div>
        <span className="pro-header-badge danger">Account On Hold</span>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 800,
            color: "var(--ink)",
            marginTop: "8px",
            marginBottom: "12px",
          }}
        >
          Professional account on hold
        </h1>
        {initialData.reviewNote && (
          <div className="review-note-callout text-left max-w-lg mx-auto">
            <strong>Administrator Note:</strong>
            <p style={{ marginTop: "4px" }}>{initialData.reviewNote}</p>
          </div>
        )}
        <p
          style={{
            color: "var(--body)",
            fontSize: "15px",
            maxWidth: "520px",
            margin: "0 auto 32px",
            lineHeight: 1.6,
          }}
        >
          Your professional privileges are currently on hold. For details or to
          request a status review, please contact our support team at{" "}
          <strong>support@prolink.pk</strong>.
        </p>
        <Link href="/" className="button outline">
          Return to home
        </Link>
      </div>
    );
  }

  // 4. Form View (for state 'none' or 'rejected')
  const isRejected = currentState === "rejected";

  return (
    <div className="pro-form-card">
      {isRejected ? (
        <div style={{ marginBottom: "28px" }}>
          <span className="pro-header-badge warning">Application Needs Update</span>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "var(--ink)",
              marginTop: "8px",
              marginBottom: "8px",
            }}
          >
            Your application needs updates
          </h1>
          {initialData.reviewNote && (
            <div className="review-note-callout">
              <strong>Reviewer Feedback:</strong>
              <p style={{ marginTop: "4px" }}>&ldquo;{initialData.reviewNote}&rdquo;</p>
            </div>
          )}
          <p style={{ color: "var(--body)", fontSize: "14px" }}>
            You can update your details below and reapply whenever you&apos;re ready.
          </p>
        </div>
      ) : (
        <div style={{ marginBottom: "28px" }}>
          <span className="pro-header-badge info">Professional Application</span>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "var(--ink)",
              marginTop: "8px",
              marginBottom: "8px",
            }}
          >
            Apply to become a verified professional
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "14px" }}>
            Join Pakistan&apos;s verified network of skilled artisans. Receive job
            leads and build your reputation.
          </p>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          style={{
            background: "#fee2e2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            borderRadius: "8px",
            padding: "12px 16px",
            fontSize: "13px",
            marginBottom: "24px",
          }}
        >
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* 1. Trade Categories */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
              fontSize: "14px",
              color: "var(--ink)",
              marginBottom: "4px",
            }}
          >
            <span>Trade Categories</span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color:
                  selectedCategories.length < 1 || selectedCategories.length > 5
                    ? "#b91c1c"
                    : "var(--muted)",
              }}
            >
              {selectedCategories.length}/5 selected (1-5 required)
            </span>
          </label>
          <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "10px" }}>
            Select the services you are certified or experienced to provide.
          </p>
          <div className="pill-grid">
            {categories.map((cat) => {
              const active = selectedCategories.includes(cat.id);
              return (
                <button
                  type="button"
                  key={cat.id}
                  className={`pill-button ${active ? "active" : ""}`}
                  onClick={() => toggleCategory(cat.id)}
                  aria-pressed={active}
                >
                  {active ? "✓ " : "+ "}
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Service Areas */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
              fontSize: "14px",
              color: "var(--ink)",
              marginBottom: "4px",
            }}
          >
            <span>Service Coverage Areas</span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color:
                  selectedAreas.length < 1 || selectedAreas.length > 12
                    ? "#b91c1c"
                    : "var(--muted)",
              }}
            >
              {selectedAreas.length}/12 selected (1-12 required)
            </span>
          </label>
          <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "10px" }}>
            Select the localities where you can travel for on-site inspections and work.
          </p>
          <div className="pill-grid">
            {areas.map((area) => {
              const active = selectedAreas.includes(area.id);
              return (
                <button
                  type="button"
                  key={area.id}
                  className={`pill-button ${active ? "active" : ""}`}
                  onClick={() => toggleArea(area.id)}
                  aria-pressed={active}
                >
                  {active ? "✓ " : "+ "}
                  {area.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Years of Experience */}
        <div style={{ marginBottom: "24px" }}>
          <label
            htmlFor="pro-years"
            style={{
              display: "block",
              fontWeight: 700,
              fontSize: "14px",
              color: "var(--ink)",
              marginBottom: "4px",
            }}
          >
            Years of Experience (0 – 60)
          </label>
          <input
            id="pro-years"
            type="number"
            min="0"
            max="60"
            value={years}
            onChange={(e) => setYears(e.target.value)}
            required
            style={{
              width: "140px",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              fontSize: "14px",
              color: "var(--ink)",
            }}
          />
        </div>

        {/* 4. Short Bio */}
        <div style={{ marginBottom: "24px" }}>
          <label
            htmlFor="pro-bio"
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
              fontSize: "14px",
              color: "var(--ink)",
              marginBottom: "4px",
            }}
          >
            <span>Professional Bio</span>
            <span
              className={`char-counter ${
                cleanBio.length > 0 && !isBioValid ? "error" : ""
              }`}
            >
              {cleanBio.length}/1,000 chars (min 30)
            </span>
          </label>
          <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "8px" }}>
            Summarize your expertise, past experience, tools, and work standards.
          </p>
          <textarea
            id="pro-bio"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="E.g., Licensed electrician with 5+ years of residential and commercial wiring experience in Islamabad. Skilled in distribution boards, inverter installations, and troubleshooting..."
            required
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              fontSize: "14px",
              fontFamily: "inherit",
              color: "var(--ink)",
              lineHeight: 1.5,
              resize: "vertical",
            }}
          />
        </div>

        {/* 5. Contact Phone */}
        <div style={{ marginBottom: "28px" }}>
          <label
            htmlFor="pro-phone"
            style={{
              display: "block",
              fontWeight: 700,
              fontSize: "14px",
              color: "var(--ink)",
              marginBottom: "4px",
            }}
          >
            Contact Phone Number
          </label>
          <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "8px" }}>
            Used for client calls after job offer acceptance. Must be 10-15 digits.
          </p>
          <input
            id="pro-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+923001234567"
            required
            style={{
              width: "100%",
              maxWidth: "320px",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              fontSize: "14px",
              color: "var(--ink)",
            }}
          />
        </div>

        {/* 6. Confirmation Checkbox */}
        <div style={{ marginBottom: "32px" }}>
          <label className="form-checkbox-row">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              required
            />
            <span>
              I confirm this information is true and that I am ready to accept jobs in the
              selected areas.
            </span>
          </label>
        </div>

        {/* 7. Action Button */}
        <div>
          <button
            type="submit"
            className="button"
            disabled={!isFormValid || loading}
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "14px",
              fontSize: "15px",
            }}
          >
            {loading
              ? "Submitting application..."
              : isRejected
                ? "Update and reapply"
                : "Submit application"}
          </button>
        </div>
      </form>
    </div>
  );
}
