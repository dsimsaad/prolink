"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  LogOut,
  Mail,
  Sparkles,
  User,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { siteConfig } from "@/config/site";
import {
  isValidPakistaniPhone,
  normalizePakistaniPhone,
} from "@/lib/customer/format";
import type { AreaOption } from "@/lib/customer/types";
import type { ProfessionalState } from "@/utils/professional";
import { useCustomerViewer } from "@/components/customer/customer-shell";

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

  const [fullName, setFullName] = useState(initialFullName);
  const [areaId, setAreaId] = useState<number>(
    initialAreaId ?? (areas[0]?.id ?? 0)
  );
  const [phone, setPhone] = useState(initialPhone);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileNotice(null);
    setProfileError(null);

    const cleanName = fullName.trim();
    if (cleanName.length < 2 || cleanName.length > 100) {
      setProfileError("Full name must be between 2 and 100 characters.");
      return;
    }

    const cleanPhone = phone.trim() ? normalizePakistaniPhone(phone.trim()) : "";
    if (cleanPhone && !isValidPakistaniPhone(cleanPhone)) {
      setProfileError(
        "Phone number must be an 11-digit Pakistani mobile number starting with 03 (e.g. 03001234567)."
      );
      return;
    }

    setSavingProfile(true);
    const supabase = createClient();

    try {
      const { error: updateProfErr } = await supabase
        .from("profiles")
        .update({
          full_name: cleanName,
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

      setProfileNotice("Your profile details have been saved.");
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

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordNotice(null);
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setSavingPassword(true);
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordError(error.message);
    } else {
      setNewPassword("");
      setConfirmPassword("");
      setPasswordNotice("Your password has been updated.");
    }
    setSavingPassword(false);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.replace("/");
  }

  return (
    <div className="space-y-6">
      {/* Personal Details Form */}
      <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex items-center gap-2.5 border-b border-[#DCE8E0] pb-3">
          <User className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
          <div>
            <h2 className="text-base font-bold text-[#0C2A1B]">
              Personal information
            </h2>
            <p className="text-xs text-[#6A7B70]">
              Your default neighbourhood and contact phone for accepted jobs
            </p>
          </div>
        </div>

        {profileError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
            <span>{profileError}</span>
          </div>
        )}

        {profileNotice && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-[#E6F4EA] px-4 py-3 text-xs font-medium text-[#0C2A1B]"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0F6B3E]" aria-hidden="true" />
            <span>{profileNotice}</span>
          </div>
        )}

        <form onSubmit={(e) => void handleSaveProfile(e)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="profile-full-name"
                className="block text-xs font-semibold text-[#0C2A1B]"
              >
                Full name <span className="text-red-600">*</span>
              </label>
              <input
                id="profile-full-name"
                type="text"
                maxLength={100}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="block text-xs font-semibold text-[#0C2A1B]"
              >
                Email address (read-only)
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                readOnly
                disabled
                className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] px-3.5 py-2.5 text-xs text-[#6A7B70]"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="profile-area"
                className="block text-xs font-semibold text-[#0C2A1B]"
              >
                Default area in Lahore
              </label>
              <select
                id="profile-area"
                value={areaId}
                onChange={(e) => setAreaId(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 text-xs font-medium text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
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
                htmlFor="profile-phone"
                className="block text-xs font-semibold text-[#0C2A1B]"
              >
                Mobile phone (11 digits, 03XXXXXXXXX)
              </label>
              <input
                id="profile-phone"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03001234567"
                className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 text-xs text-[#0C2A1B] placeholder:text-[#6A7B70] focus:border-[#0F6B3E] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[#6A7B70]">
                Hidden from professionals until you accept an offer on a job.
              </p>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-xl bg-[#0F6B3E] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#0A4D2B] disabled:opacity-60"
            >
              {savingProfile ? "Saving changes..." : "Save profile"}
            </button>
          </div>
        </form>
      </section>

      {/* Become a Professional Card */}
      <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F6B3E]">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span>Professional Account Status</span>
        </div>

        {professionalState === "approved" && (
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#0C2A1B]">
              You are an approved ProLink professional
            </h2>
            <p className="text-xs text-[#34453B]">
              Your account can both post jobs as a customer and offer services in Lahore.
            </p>
          </div>
        )}

        {professionalState === "pending" && (
          <div className="space-y-2">
            <h2 className="text-base font-bold text-[#0C2A1B]">
              Your professional application is under review
            </h2>
            <p className="text-xs text-[#34453B]">
              An administrator is reviewing your skills and service areas.
            </p>
            <Link
              href="/become-professional/submitted"
              className="inline-flex items-center rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] px-4 py-2 text-xs font-semibold text-[#0F6B3E] hover:bg-[#E6F4EA]"
            >
              View application status
            </Link>
          </div>
        )}

        {professionalState === "rejected" && (
          <div className="space-y-2">
            <h2 className="text-base font-bold text-amber-900">
              Your previous professional application was not approved
            </h2>
            {reviewNote && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Administrator note: &ldquo;{reviewNote}&rdquo;
              </p>
            )}
            <Link
              href="/become-professional"
              className="inline-flex items-center rounded-xl bg-[#0F6B3E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0A4D2B]"
            >
              Update and reapply
            </Link>
          </div>
        )}

        {(professionalState === "none" || professionalState === "logged_out") && (
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-bold text-[#0C2A1B]">
                Earn with your skills on ProLink
              </h2>
              <p className="mt-1 text-xs text-[#6A7B70]">
                Use the same account to apply as a professional and send quotes on local jobs in Lahore.
              </p>
            </div>
            <Link
              href="/become-professional"
              className="inline-flex shrink-0 items-center rounded-xl bg-[#0F6B3E] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0A4D2B]"
            >
              Apply as a professional
            </Link>
          </div>
        )}
      </section>

      {/* Change Password */}
      <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex items-center gap-2.5 border-b border-[#DCE8E0] pb-3">
          <KeyRound className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
          <div>
            <h2 className="text-base font-bold text-[#0C2A1B]">
              Change password
            </h2>
            <p className="text-xs text-[#6A7B70]">
              Update the password used to sign in to your account
            </p>
          </div>
        </div>

        {passwordError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordNotice && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-[#E6F4EA] px-4 py-3 text-xs font-medium text-[#0C2A1B]"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0F6B3E]" aria-hidden="true" />
            <span>{passwordNotice}</span>
          </div>
        )}

        <form onSubmit={(e) => void handleChangePassword(e)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="new-password"
                className="block text-xs font-semibold text-[#0C2A1B]"
              >
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-semibold text-[#0C2A1B]"
              >
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] px-4 py-2.5 text-xs font-semibold text-[#0C2A1B] transition hover:bg-[#E6F4EA] disabled:opacity-60"
          >
            {savingPassword ? "Updating password..." : "Update password"}
          </button>
        </form>
      </section>

      {/* Sign Out & Account Support */}
      <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-bold text-[#0C2A1B]">
              Session & account support
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#6A7B70]">
              <Mail className="h-3.5 w-3.5 text-[#0F6B3E]" aria-hidden="true" />
              <span>
                Contact support to delete your account:{" "}
                <a
                  href={`mailto:${siteConfig.supportEmail}`}
                  className="font-semibold text-[#0F6B3E] hover:underline"
                >
                  {siteConfig.supportEmail}
                </a>
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </section>
    </div>
  );
}
