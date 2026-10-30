import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getProfessionalState } from "@/utils/professional";
import { Brand, Icon } from "@/components/prolink/brand";

function formatCnicInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

export const metadata: Metadata = {
  title: "Application Submitted Successfully | ProLink",
  description:
    "Your ProLink professional application has been submitted and is awaiting review.",
};

export default async function ApplicationSubmittedPage() {
  const proInfo = await getProfessionalState();

  if (proInfo.state === "logged_out" || !proInfo.user) {
    redirect("/become-professional/sign-in");
  }

  if (proInfo.state === "none") {
    redirect("/become-professional");
  }

  if (proInfo.state === "approved") {
    redirect("/user");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [skillsRes, areasRes, contactRes, categoriesRes, allAreasRes] =
    await Promise.all([
      supabase
        .from("professional_skills")
        .select("category_id, skill_tags")
        .eq("professional_id", proInfo.user.id),
      supabase
        .from("professional_areas")
        .select("area_id")
        .eq("professional_id", proInfo.user.id),
      supabase
        .from("contact_details")
        .select("phone")
        .eq("profile_id", proInfo.user.id)
        .maybeSingle(),
      supabase.from("categories").select("id, name"),
      supabase.from("areas").select("id, name"),
    ]);

  const catMap = new Map<number, string>();
  for (const c of categoriesRes.data ?? []) {
    catMap.set(Number(c.id), c.name);
  }

  const areaMap = new Map<number, string>();
  for (const a of allAreasRes.data ?? []) {
    areaMap.set(Number(a.id), a.name);
  }

  const selectedCategoryNames: string[] = [];
  const skillTagsSet = new Set<string>();
  for (const s of skillsRes.data ?? []) {
    const name = catMap.get(Number(s.category_id));
    if (name) selectedCategoryNames.push(name);
    if (Array.isArray(s.skill_tags)) {
      s.skill_tags.forEach((t: string) => {
        if (typeof t === "string" && t.trim()) skillTagsSet.add(t.trim());
      });
    }
  }

  const selectedAreaNames: string[] = [];
  for (const a of areasRes.data ?? []) {
    const name = areaMap.get(Number(a.area_id));
    if (name) selectedAreaNames.push(name);
  }

  const meta = proInfo.user.applicationMeta;
  const pp = proInfo.professionalProfile;

  const fullName = proInfo.profile?.full_name || "Applicant";
  const fatherName = pp?.father_name || meta?.father_name || "";
  const cnicRaw = pp?.cnic || meta?.cnic || "";
  const cnic = cnicRaw ? formatCnicInput(cnicRaw) : "";
  const phoneRaw = meta?.phone_formatted || contactRes.data?.phone || "";
  const phone = phoneRaw ? formatPhoneInput(phoneRaw) : "";
  const residentialAddress =
    pp?.residential_address || meta?.residential_address || "";
  const skillTags =
    skillTagsSet.size > 0
      ? Array.from(skillTagsSet)
      : meta?.skill_tags || [];
  const notificationPreference =
    pp?.notification_preference ||
    meta?.notification_preference ||
    "matching_only";
  const appliedAt = pp?.applied_at || new Date().toISOString();

  return (
    <div className="pro-page-wrapper">
      <header className="pro-page-header">
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Brand href="/user" />
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link href="/user" className="pro-back-link" style={{ marginBottom: 0 }}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="pro-page-container" style={{ maxWidth: "740px" }}>
        <div className="status-card-box text-center">
          {/* Success Visual Indicator */}
          <div
            aria-hidden="true"
            className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: "var(--mint)",
              color: "var(--forest)",
              border: "2px solid var(--success-border)",
              boxShadow: "0 8px 20px rgba(15, 107, 62, 0.14)",
            }}
          >
            <Icon name="check" className="w-8 h-8" />
          </div>

          {/* Application Status Badge */}
          <span className="pro-header-badge info">Pending Review</span>

          {/* Required Heading */}
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 800,
              color: "var(--ink)",
              marginTop: "8px",
              marginBottom: "12px",
            }}
          >
            Application Submitted Successfully!
          </h1>

          {/* Required Confirmation Message */}
          <p
            style={{
              color: "var(--body)",
              fontSize: "15px",
              maxWidth: "560px",
              margin: "0 auto 18px",
              lineHeight: 1.65,
            }}
          >
            Thank you for applying to become a ProLink professional. Your
            application has been submitted successfully and is awaiting review.
          </p>

          {/* Required Expected Response Time Callout */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              background: "var(--tint)",
              border: "1px solid var(--forest-border)",
              color: "var(--forest)",
              borderRadius: "10px",
              padding: "12px 18px",
              fontSize: "14px",
              fontWeight: 700,
              marginBottom: "30px",
            }}
          >
            <Icon name="shield" />
            <span>
              You will be notified of the outcome within 1–2 business days.
            </span>
          </div>

          {/* Application Details Summary */}
          <div
            style={{
              background: "var(--tint)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "22px",
              textAlign: "left",
              maxWidth: "600px",
              margin: "0 auto 32px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
                paddingBottom: "10px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <h2
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--ink)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  margin: 0,
                }}
              >
                Submitted Application Summary
              </h2>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: "999px",
                  background: "var(--tile-sky-bg)",
                  color: "var(--tile-sky-fg)",
                }}
              >
                Pending Review
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
                fontSize: "13px",
              }}
            >
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>
                  Full Name:
                </span>
                <strong style={{ color: "var(--ink)" }}>{fullName}</strong>
              </div>
              {fatherName && (
                <div>
                  <span style={{ color: "var(--muted)", display: "block" }}>
                    Father&apos;s Name:
                  </span>
                  <strong style={{ color: "var(--ink)" }}>{fatherName}</strong>
                </div>
              )}
              {cnic && (
                <div>
                  <span style={{ color: "var(--muted)", display: "block" }}>
                    CNIC Number:
                  </span>
                  <strong
                    style={{
                      color: "var(--ink)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {cnic}
                  </strong>
                </div>
              )}
              {phone && (
                <div>
                  <span style={{ color: "var(--muted)", display: "block" }}>
                    Phone Number:
                  </span>
                  <strong
                    style={{
                      color: "var(--ink)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {phone}
                  </strong>
                </div>
              )}
              {residentialAddress && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--muted)", display: "block" }}>
                    Residential Address:
                  </span>
                  <strong style={{ color: "var(--ink)" }}>
                    {residentialAddress}
                  </strong>
                </div>
              )}
              {selectedCategoryNames.length > 0 && (
                <div>
                  <span style={{ color: "var(--muted)", display: "block" }}>
                    Service Categories:
                  </span>
                  <strong style={{ color: "var(--ink)" }}>
                    {selectedCategoryNames.join(", ")}
                  </strong>
                </div>
              )}
              {pp?.years_experience !== null &&
                pp?.years_experience !== undefined && (
                  <div>
                    <span style={{ color: "var(--muted)", display: "block" }}>
                      Experience:
                    </span>
                    <strong style={{ color: "var(--ink)" }}>
                      {pp.years_experience} years
                    </strong>
                  </div>
                )}
              {skillTags.length > 0 && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--muted)", display: "block" }}>
                    Skills &amp; Services Offered:
                  </span>
                  <strong style={{ color: "var(--ink)" }}>
                    {skillTags.join(", ")}
                  </strong>
                </div>
              )}
              {selectedAreaNames.length > 0 && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--muted)", display: "block" }}>
                    Service Areas:
                  </span>
                  <strong style={{ color: "var(--ink)" }}>
                    {selectedAreaNames.join(", ")}
                  </strong>
                </div>
              )}
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>
                  Notification Preference:
                </span>
                <strong style={{ color: "var(--ink)" }}>
                  {notificationPreference === "all_jobs"
                    ? "All Available Jobs"
                    : "Matching Jobs Only"}
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>
                  Submitted On:
                </span>
                <strong style={{ color: "var(--ink)" }}>
                  {new Date(appliedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </strong>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            <Link href="/user" className="button">
              Return to Dashboard <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
