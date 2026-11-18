"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Phone,
  Shield,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { siteConfig } from "@/config/site";
import {
  isValidPakistaniPhone,
  normalizePakistaniPhone,
} from "@/lib/customer/format";
import {
  normalizePakistaniMobilePhone,
  sanitizePakistaniPhoneInput,
} from "@/utils/phone";
import type { AreaOption } from "@/lib/customer/types";
import type { ProfessionalState } from "@/utils/professional";
import { useCustomerViewer } from "@/components/customer/customer-shell";
import { ChangePasswordModal } from "@/components/prolink/change-password-modal";

interface ProfileClientProps {
  customerId: string;
  email: string;
  initialFullName: string;
  initialAreaId: number | null;
  initialPhone: string;
  areas: AreaOption[];
  professionalState: ProfessionalState;
  reviewNote: string | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function displayValue(value: string | null | undefined, fallback = "Not set") {
  return value && value.trim().length ? value : fallback;
}

export function ProfileClient({
  customerId,
  email,
  initialFullName,
  initialAreaId,
  initialPhone,
  areas,
  professionalState,
  reviewNote,
}: ProfileClientProps) {
  const router = useRouter();
  const { refreshHeaderCounts } = useCustomerViewer();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(initialFullName);
  const [areaId, setAreaId] = useState<number>(
    initialAreaId ?? (areas[0]?.id ?? 0)
  );
  const [phone, setPhone] = useState(initialPhone.replace(/\D/g, "").slice(0, 11));

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const currentAreaName =
    areas.find((a) => a.id === areaId)?.name ||
    areas.find((a) => a.id === initialAreaId)?.name ||
    "Lahore";

  function handleCancelEdit() {
    setFullName(initialFullName);
    setAreaId(initialAreaId ?? (areas[0]?.id ?? 0));
    setPhone(initialPhone.replace(/\D/g, "").slice(0, 11));
    setEditing(false);
    setProfileError(null);
    setProfileNotice(null);
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(sanitizePakistaniPhoneInput(e.target.value));
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileNotice(null);
    setProfileError(null);

    const cleanPhone = phone.trim() ? normalizePakistaniMobilePhone(phone.trim()) : "";
    if (phone.trim() && !cleanPhone) {
      setProfileError(
        "Phone number must be a valid 11-digit Pakistani mobile number starting with 03 (prefixes 036, 038, and 039 are not allowed)."
      );
      return;
    }

    setSavingProfile(true);
    const supabase = createClient();

    try {
      const { error: updateProfErr } = await supabase
        .from("profiles")
        .update({
          area_id: areaId || null,
        })
        .eq("id", customerId);

      if (updateProfErr) {
        throw new Error(updateProfErr.message);
      }

      if (cleanPhone) {
        const { error: phoneErr } = await supabase
          .from("contact_details")
          .upsert(
            {
              profile_id: customerId,
              phone: cleanPhone,
            },
            { onConflict: "profile_id" }
          );

        if (phoneErr) {
          throw new Error(phoneErr.message);
        }
        setPhone(cleanPhone);
      }

      setProfileNotice("Profile details updated successfully.");
      setEditing(false);
      refreshHeaderCounts();
      router.refresh();
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Could not update your profile."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  const roleBadgeLabel =
    professionalState === "approved"
      ? "Approved Professional"
      : professionalState === "pending"
        ? "Application Under Review"
        : "Customer Account";

  return (
    <div className="space-y-6">
      {/* Main 2-Column Grid (Darsgah Layout Style) */}
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left Column: User Summary & Identity Card */}
        <aside className="overflow-hidden rounded-[18px] border border-[#DCE8E0] bg-white shadow-2xs">
          {/* Card Header with Large Square Avatar */}
          <div className="border-b border-[#DCE8E0] bg-[#F4FAF6] p-6">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-[#0F6B3E] text-2xl font-bold text-white shadow-sm">
              {getInitials(fullName || "Customer")}
            </div>
            <h2 className="mt-5 text-2xl font-bold leading-tight tracking-tight text-[#0C2A1B]">
              {fullName || "Customer"}
            </h2>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#0F6B3E]">
              {professionalState === "approved" && (
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{roleBadgeLabel}</span>
            </div>
          </div>

          {/* Quick Details List */}
          <div className="grid gap-4 p-5 text-sm">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-[#0F6B3E]">
                <Mail className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#6A7B70]">
                  Account Email
                </p>
                <p className="mt-0.5 break-words font-semibold text-[#0C2A1B] text-xs sm:text-sm">
                  {displayValue(email)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-[#0F6B3E]">
                <Phone className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#6A7B70]">
                  Contact Phone
                </p>
                <p className="mt-0.5 break-words font-semibold text-[#0C2A1B] text-xs sm:text-sm">
                  {displayValue(phone)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-[#0F6B3E]">
                <MapPin className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#6A7B70]">
                  Default Area
                </p>
                <p className="mt-0.5 break-words font-semibold text-[#0C2A1B] text-xs sm:text-sm">
                  {currentAreaName}, {siteConfig.city}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-[#0F6B3E]">
                <Shield className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#6A7B70]">
                  Account Status
                </p>
                <p className="mt-0.5 break-words font-semibold text-[#0C2A1B] text-xs sm:text-sm">
                  Active Verified
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Profile Information (View Mode / Edit Mode) */}
        <section className="rounded-[18px] border border-[#DCE8E0] bg-white p-6 shadow-2xs">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0F6B3E]">
              Account Details
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0C2A1B]">
              Profile Information
            </h2>
            <p className="mt-1 text-sm text-[#6A7B70]">
              {editing
                ? "Update your personal details, default service area in Lahore, and contact phone."
                : "Review your account details and switch into edit mode when needed."}
            </p>
          </div>

          {/* Feedback alerts */}
          {profileNotice && (
            <div
              role="status"
              className="mb-5 flex items-center gap-2 rounded-xl bg-[#E6F4EA] border border-[#86EFAC] px-4 py-3 text-sm font-semibold text-[#166534]"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0F6B3E]" aria-hidden="true" />
              <span>{profileNotice}</span>
            </div>
          )}

          {profileError && (
            <div
              role="alert"
              className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold text-red-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
              <span>{profileError}</span>
            </div>
          )}

          {editing ? (
            /* Edit Form Mode */
            <form onSubmit={(e) => void handleSaveProfile(e)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-fullName"
                    className="block text-xs font-semibold text-[#0C2A1B] mb-1.5"
                  >
                    Full Name
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] px-3.5 py-2.5 text-sm text-[#6A7B70]">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-[#6A7B70]" aria-hidden="true" />
                    <input
                      id="edit-fullName"
                      type="text"
                      readOnly
                      disabled
                      value={fullName}
                      className="w-full bg-transparent text-sm text-[#6A7B70] cursor-not-allowed focus:outline-none"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-[#6A7B70]">
                    Contact support if you need to update your registered name.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="edit-phone"
                    className="block text-xs font-semibold text-[#0C2A1B] mb-1.5"
                  >
                    Contact Phone (11 digits, 03XXXXXXXXX)
                  </label>
                  <input
                    id="edit-phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="numeric"
                    maxLength={11}
                    pattern="03[0-57][0-9]{8}"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="03001234567"
                    className="w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 text-sm text-[#0C2A1B] placeholder:text-[#6A7B70] focus:border-[#0F6B3E] focus:ring-1 focus:ring-[#0F6B3E] focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-[#6A7B70]">
                    Only shared with a professional after you accept their offer.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="edit-area"
                    className="block text-xs font-semibold text-[#0C2A1B] mb-1.5"
                  >
                    Default Area in Lahore
                  </label>
                  <select
                    id="edit-area"
                    value={areaId}
                    onChange={(e) => setAreaId(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 text-sm font-medium text-[#0C2A1B] focus:border-[#0F6B3E] focus:ring-1 focus:ring-[#0F6B3E] focus:outline-none"
                  >
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="edit-email"
                    className="block text-xs font-semibold text-[#0C2A1B] mb-1.5"
                  >
                    Account Email
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] px-3.5 py-2.5 text-sm text-[#6A7B70]">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-[#6A7B70]" aria-hidden="true" />
                    <span className="truncate">{email}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#6A7B70]">
                    Contact support if you need to change your login email.
                  </p>
                </div>
              </div>

              {/* Action buttons in Edit Mode */}
              <div className="mt-6 flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={savingProfile}
                  className="rounded-xl border border-[#DCE8E0] bg-white px-4 py-2.5 text-xs font-semibold text-[#0C2A1B] transition hover:bg-[#F4FAF6] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-xl bg-[#0F6B3E] px-5 py-2.5 text-xs font-semibold !text-white text-white transition hover:bg-[#0A4D2B] disabled:opacity-50 shadow-xs"
                >
                  {savingProfile ? "Saving changes..." : "Save Profile"}
                </button>
              </div>
            </form>
          ) : (
            /* View Mode - Tiles Grid matching Darsgah */
            <div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[16px] border border-[#DCE8E0]/70 bg-[#F4FAF6] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#6A7B70]">
                    Full Name
                  </p>
                  <p className="mt-2 font-semibold text-[#0C2A1B] text-sm">
                    {displayValue(fullName)}
                  </p>
                </div>

                <div className="rounded-[16px] border border-[#DCE8E0]/70 bg-[#F4FAF6] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#6A7B70]">
                    Contact Phone
                  </p>
                  <p className="mt-2 font-semibold text-[#0C2A1B] text-sm">
                    {displayValue(phone)}
                  </p>
                </div>

                <div className="rounded-[16px] border border-[#DCE8E0]/70 bg-[#F4FAF6] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#6A7B70]">
                    Email Address
                  </p>
                  <p className="mt-2 break-words font-semibold text-[#0C2A1B] text-sm">
                    {displayValue(email)}
                  </p>
                </div>

                <div className="rounded-[16px] border border-[#DCE8E0]/70 bg-[#F4FAF6] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#6A7B70]">
                    Default Area
                  </p>
                  <p className="mt-2 font-semibold text-[#0C2A1B] text-sm">
                    {currentAreaName}
                  </p>
                </div>

                <div className="rounded-[16px] border border-[#DCE8E0]/70 bg-[#F4FAF6] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#6A7B70]">
                    City & Region
                  </p>
                  <p className="mt-2 font-semibold text-[#0C2A1B] text-sm">
                    {siteConfig.city}, Pakistan
                  </p>
                </div>

                <div className="rounded-[16px] border border-[#DCE8E0]/70 bg-[#F4FAF6] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#6A7B70]">
                    Role Context
                  </p>
                  <p className="mt-2 font-semibold text-[#0C2A1B] text-sm">
                    {professionalState === "approved"
                      ? "Dual Role (Customer & Professional)"
                      : "Household Customer"}
                  </p>
                </div>
              </div>

              {/* Action buttons in View Mode */}
              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] px-4 py-2.5 text-xs font-semibold text-[#0C2A1B] transition hover:bg-[#E6F4EA]"
                >
                  <KeyRound className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
                  <span>Change Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-xl bg-[#0F6B3E] px-5 py-2.5 text-xs font-semibold !text-white text-white transition hover:bg-[#0A4D2B] shadow-xs"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        userEmail={email}
      />
    </div>
  );
}
