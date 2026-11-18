"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MapPin,
  ShieldCheck,
  Star,
  Tag,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { siteConfig } from "@/config/site";
import { formatKarachiDate } from "@/lib/customer/format";
import {
  normalizePakistaniMobilePhone,
  sanitizePakistaniPhoneInput,
} from "@/utils/phone";
import type {
  AreaOption,
  CategoryOption,
  ProfessionalAvailability,
  ProfessionalProfileFullData,
} from "@/lib/pro/types";
import { useProViewer } from "@/components/pro/pro-shell";
import { ChangePasswordModal } from "@/components/prolink/change-password-modal";

interface ProProfileClientProps {
  initialProfile: ProfessionalProfileFullData;
  categories: CategoryOption[];
  areas: AreaOption[];
}

export function ProProfileClient({
  initialProfile,
  categories,
  areas,
}: ProProfileClientProps) {
  const router = useRouter();
  const { setAvailabilityState, refreshHeaderCounts } = useProViewer();

  const [bio, setBio] = useState(initialProfile.bio);
  const [yearsExperience, setYearsExperience] = useState<string>(
    String(initialProfile.years_experience)
  );
  const [availability, setAvailability] = useState<ProfessionalAvailability>(
    initialProfile.availability
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(
    initialProfile.category_ids
  );
  const [selectedAreaIds, setSelectedAreaIds] = useState<number[]>(
    initialProfile.area_ids
  );
  const [phone, setPhone] = useState(
    initialProfile.phone.replace(/\D/g, "").slice(0, 11)
  );

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  function toggleCategory(id: number) {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, id];
    });
  }

  function toggleArea(id: number) {
    setSelectedAreaIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 12) {
        return prev;
      }
      return [...prev, id];
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    setErrorMessage(null);

    const cleanBio = bio.trim();
    if (cleanBio.length < 30 || cleanBio.length > 1000) {
      setErrorMessage("Bio must be between 30 and 1,000 characters.");
      return;
    }

    const years = Math.round(Number(yearsExperience));
    if (!Number.isFinite(years) || years < 0 || years > 60) {
      setErrorMessage("Years of experience must be between 0 and 60.");
      return;
    }

    if (selectedCategoryIds.length < 1 || selectedCategoryIds.length > 5) {
      setErrorMessage("Please select between 1 and 5 trade categories.");
      return;
    }

    if (selectedAreaIds.length < 1 || selectedAreaIds.length > 12) {
      setErrorMessage("Please select between 1 and 12 service areas.");
      return;
    }

    let cleanPhone: string | null = null;
    if (phone.trim().length > 0) {
      const normalized = normalizePakistaniMobilePhone(phone.trim());
      if (!normalized) {
        setErrorMessage(
          "Phone number must be a valid 11-digit Pakistani mobile number starting with 03 (prefixes 036, 038, and 039 are not allowed)."
        );
        return;
      }
      cleanPhone = normalized;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.rpc("update_my_professional_profile", {
        p_bio: cleanBio,
        p_years: years,
        p_availability: availability,
        p_category_ids: selectedCategoryIds,
        p_area_ids: selectedAreaIds,
        p_phone: cleanPhone,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (cleanPhone) {
        setPhone(cleanPhone);
      }
      setAvailabilityState(availability);
      refreshHeaderCounts();
      setNotice("Your professional profile has been updated.");
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not save your professional profile."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.replace("/");
  }

  const selectedCategoryNames = categories
    .filter((c) => selectedCategoryIds.includes(c.id))
    .map((c) => c.name);

  const selectedAreaNames = areas
    .filter((a) => selectedAreaIds.includes(a.id))
    .map((a) => a.name);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Right: Professional profile information */}
        <section className="order-2 rounded-[18px] border border-[#DCE8E0] bg-white p-6 shadow-2xs space-y-5">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0F6B3E]">
              Professional details
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0C2A1B]">
              Profile Information
            </h2>
            <p className="mt-1 text-sm text-[#6A7B70]">
              Keep your skills, availability, service areas, and contact details current.
            </p>
          </div>

          {notice && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-[#E6F4EA] px-4 py-3 text-xs font-medium text-[#0C2A1B]"
            >
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-[#0F6B3E]"
                aria-hidden="true"
              />
              <span>{notice}</span>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
                aria-hidden="true"
              />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={(e) => void handleSave(e)} className="space-y-5">
            {/* Bio */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="pro-bio"
                  className="block text-xs font-semibold text-[#0C2A1B]"
                >
                  Professional bio (30–1,000 characters){" "}
                  <span className="text-red-600">*</span>
                </label>
                <span
                  className={`text-[11px] font-semibold ${
                    bio.trim().length < 30
                      ? "text-amber-700"
                      : "text-[#6A7B70]"
                  }`}
                >
                  {bio.trim().length} / 1000
                </span>
              </div>
              <textarea
                id="pro-bio"
                rows={4}
                required
                minLength={30}
                maxLength={1000}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Describe your trade skills, tools, and experience serving customers in Lahore..."
                className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
              />
            </div>

            {/* Years, Availability, Phone */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="pro-years"
                  className="block text-xs font-semibold text-[#0C2A1B]"
                >
                  Years of experience (0–60){" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  id="pro-years"
                  type="number"
                  required
                  min={0}
                  max={60}
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="pro-availability"
                  className="block text-xs font-semibold text-[#0C2A1B]"
                >
                  Availability <span className="text-red-600">*</span>
                </label>
                <select
                  id="pro-availability"
                  value={availability}
                  onChange={(e) =>
                    setAvailability(
                      e.target.value as ProfessionalAvailability
                    )
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2 text-xs font-medium text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
                >
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="pro-phone"
                  className="block text-xs font-semibold text-[#0C2A1B]"
                >
                  Mobile phone (03XXXXXXXXX)
                </label>
                <input
                  id="pro-phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={phone}
                  onChange={(e) =>
                    setPhone(sanitizePakistaniPhoneInput(e.target.value))
                  }
                  placeholder="03001234567"
                  className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
                />
              </div>
            </div>

            {/* Categories (1..5) */}
            <fieldset>
              <div className="flex items-center justify-between">
                <legend className="text-xs font-semibold text-[#0C2A1B]">
                  Trade categories (select 1 to 5){" "}
                  <span className="text-red-600">*</span>
                </legend>
                <span className="text-[11px] font-semibold text-[#0F6B3E]">
                  {selectedCategoryIds.length} / 5 selected
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const selected = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      aria-pressed={selected}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                        selected
                          ? "border-[#0F6B3E] bg-[#E6F4EA] text-[#0F6B3E]"
                          : "border-[#DCE8E0] bg-white text-[#34453B] hover:bg-[#F4FAF6]"
                      }`}
                    >
                      <Tag className="h-3 w-3" aria-hidden="true" />
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Areas (1..12) */}
            <fieldset>
              <div className="flex items-center justify-between">
                <legend className="text-xs font-semibold text-[#0C2A1B]">
                  Lahore service areas (select 1 to 12){" "}
                  <span className="text-red-600">*</span>
                </legend>
                <span className="text-[11px] font-semibold text-[#0F6B3E]">
                  {selectedAreaIds.length} / 12 selected
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {areas.map((area) => {
                  const selected = selectedAreaIds.includes(area.id);
                  return (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => toggleArea(area.id)}
                      aria-pressed={selected}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                        selected
                          ? "border-[#0F6B3E] bg-[#E6F4EA] text-[#0F6B3E]"
                          : "border-[#DCE8E0] bg-white text-[#34453B] hover:bg-[#F4FAF6]"
                      }`}
                    >
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      <span>{area.name}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-xl bg-[#0F6B3E] px-5 py-2.5 text-xs font-semibold !text-white text-white hover:bg-[#0A4D2B] disabled:opacity-60"
              >
                {saving ? "Saving changes..." : "Save professional profile"}
              </button>
            </div>
          </form>
        </section>

        {/* Left: identity summary and account controls */}
        <aside className="order-1 space-y-6">
          {/* "How customers see you" Preview Card */}
          <section className="overflow-hidden rounded-[18px] border border-[#DCE8E0] bg-white shadow-2xs">
            <div className="border-b border-[#DCE8E0] bg-[#F4FAF6] p-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#0F6B3E] text-2xl font-bold text-white shadow-sm">
                {initialProfile.full_name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <h2 className="mt-5 text-2xl font-bold leading-tight tracking-tight text-[#0C2A1B]">
                {initialProfile.full_name}
              </h2>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#0F6B3E]">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Approved Professional</span>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-[#0C2A1B]">
                    {initialProfile.full_name}
                  </h3>
                  <p className="text-[11px] text-[#6A7B70]">
                    {Number(yearsExperience) || 0}{" "}
                    {Number(yearsExperience) === 1 ? "year" : "years"} experience
                  </p>
                </div>

                {initialProfile.rating_count <= 0 ? (
                  <span className="inline-flex items-center rounded-md border border-[#DCE8E0] bg-[#E6F4EA] px-2.5 py-0.5 text-[11px] font-bold text-[#0F6B3E]">
                    New
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                    <Star
                      className="h-3 w-3 fill-amber-500 text-amber-500"
                      aria-hidden="true"
                    />
                    <span>{initialProfile.avg_rating_bayes.toFixed(1)}</span>
                    <span className="text-amber-700">
                      ({initialProfile.rating_count})
                    </span>
                  </span>
                )}
              </div>

              <p className="text-xs leading-relaxed text-[#34453B]">
                {bio.trim() || "Your professional bio will appear here."}
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedCategoryNames.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center rounded-md border border-[#DCE8E0] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#0F6B3E]"
                  >
                    {name}
                  </span>
                ))}
              </div>

              {selectedAreaNames.length > 0 && (
                <p className="text-[11px] text-[#6A7B70]">
                  Areas: {selectedAreaNames.join(", ")}
                </p>
              )}
            </div>
          </section>

          {/* Read-Only Application Review Status & Account Security */}
          <section className="rounded-[18px] border border-[#DCE8E0] bg-white p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-[#0C2A1B] border-b border-[#DCE8E0] pb-3">
              Application status &amp; account security
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5 rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-3.5">
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#0F6B3E]"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-bold text-[#0C2A1B]">
                    Reviewed by our team
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#6A7B70]">
                    Status: Approved{" "}
                    {initialProfile.reviewed_at
                      ? `on ${formatKarachiDate(initialProfile.reviewed_at)}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-3.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail
                    className="h-4 w-4 shrink-0 text-[#6A7B70]"
                    aria-hidden="true"
                  />
                  <span className="truncate font-semibold text-[#0C2A1B]">
                    {initialProfile.email}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] text-[#6A7B70]">
                  <Lock className="h-3 w-3" aria-hidden="true" />
                  Read-only
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2 text-xs font-semibold text-[#0C2A1B] hover:bg-[#F4FAF6]"
                >
                  <KeyRound
                    className="h-3.5 w-3.5 text-[#0F6B3E]"
                    aria-hidden="true"
                  />
                  <span>Change password</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Sign out</span>
                </button>
              </div>

              <div className="border-t border-[#DCE8E0] pt-3 text-[11px] text-[#6A7B70]">
                <p className="font-semibold text-[#34453B]">
                  Contact support to remove your professional profile
                </p>
                <p className="mt-0.5">
                  To deactivate or remove your professional profile, email{" "}
                  <a
                    href={`mailto:${siteConfig.supportEmail}`}
                    className="font-semibold text-[#0F6B3E] hover:underline"
                  >
                    {siteConfig.supportEmail}
                  </a>
                  .
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        userEmail={initialProfile.email}
      />
    </div>
  );
}
