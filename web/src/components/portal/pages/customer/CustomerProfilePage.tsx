"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Mail, Phone, Shield, UserPen } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { normalizePakistaniMobilePhone } from "@/utils/phone";
import { useMarketplace } from "../../store/marketplaceStore";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function CustomerProfilePage() {
  const { currentUser } = useMarketplace();
  const userId = currentUser?.id || "";
  const defaultName = currentUser?.name || "Customer";
  const userEmail = currentUser?.email || "";

  const [fullName, setFullName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [formName, setFormName] = useState(defaultName);
  const [formPhone, setFormPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const [profRes, contactRes, authRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, created_at")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("contact_details")
          .select("phone")
          .eq("profile_id", userId)
          .maybeSingle(),
        supabase.auth.getUser(),
      ]);

      const loadedName = profRes.data?.full_name || defaultName;
      const loadedPhone = contactRes.data?.phone || "";

      setFullName(loadedName);
      setPhone(loadedPhone);
      setJoinedAt(profRes.data?.created_at ?? authRes.data.user?.created_at ?? null);

      setFormName(loadedName);
      setFormPhone(loadedPhone.replace(/\D/g, "").slice(0, 11));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load profile details."
      );
    } finally {
      setLoading(false);
    }
  }, [userId, defaultName]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadProfile();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadProfile]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const normalizedPhone = normalizePakistaniMobilePhone(formPhone);
    if (!normalizedPhone) {
      setError("Enter a valid Pakistani mobile number, e.g. 0300-1234567 or +92 300 1234567.");
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const supabase = createClient();
      const { error: upsertPhoneErr } = await supabase
        .from("contact_details")
        .upsert(
          { profile_id: userId, phone: normalizedPhone },
          { onConflict: "profile_id" }
        );
      if (upsertPhoneErr) {
        throw new Error(upsertPhoneErr.message);
      }

      setPhone(normalizedPhone);
      setIsEditing(false);
      setFeedback("Your profile has been updated.");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("prolink:customer-profile-updated"));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save profile changes."
      );
    } finally {
      setSaving(false);
    }
  }

  const initials = getInitials(fullName);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0C2A1B]">
            Customer Profile
          </h1>
          <p className="mt-1 text-sm text-[#34453B]">
            View and manage your personal profile details.
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={() => {
              setFormName(fullName);
              setFormPhone(phone);
              setFeedback(null);
              setError(null);
              setIsEditing(true);
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0F6B3E] px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#0B5430] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
          >
            <UserPen className="h-4 w-4" aria-hidden="true" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {feedback && (
        <div
          role="status"
          className="rounded-xl border border-[#CDE9D6] bg-[#E6F4EA] px-4 py-3 text-xs font-semibold text-[#0C2A1B]"
        >
          {feedback}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800"
        >
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[#DCE8E0] bg-white shadow-2xs">
        {/* Top Banner & Avatar */}
        <div className="border-b border-[#DCE8E0] bg-[#F4FAF6] p-6">
          <div className="flex flex-wrap items-center gap-5">
            <span className="inline-flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#0F6B3E] text-xl font-extrabold text-white shadow-sm">
              {initials}
            </span>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg font-extrabold text-[#0C2A1B]">
                  {loading ? "Loading..." : fullName}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#CDE9D6] bg-[#E6F4EA] px-2.5 py-0.5 text-[11px] font-semibold text-[#0F6B3E]">
                  <Shield className="h-3 w-3" aria-hidden="true" />
                  <span>Customer</span>
                </span>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-[#6A7B70]">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{userEmail || "No email"}</span>
              </p>
            </div>
          </div>
        </div>

        {/* View Details or Edit Form */}
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-5 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="customer-profile-full-name"
                  className="block text-xs font-bold text-[#0C2A1B]"
                >
                  Full Name *
                </label>
                <input
                  id="customer-profile-full-name"
                  type="text"
                  readOnly
                  value={formName}
                  aria-describedby="customer-profile-name-help"
                  className="mt-1.5 w-full rounded-lg border border-[#DCE8E0] bg-gray-50 px-3 py-2 text-xs text-[#6A7B70]"
                />
                <p id="customer-profile-name-help" className="mt-1 text-[11px] text-[#6A7B70]">Names cannot be changed from profile settings.</p>
              </div>

              <div>
                <label
                  htmlFor="customer-profile-phone"
                  className="block text-xs font-bold text-[#0C2A1B]"
                >
                  Phone Number
                </label>
                <input
                  id="customer-profile-phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  inputMode="numeric"
                  maxLength={11}
                  pattern="03[0-9]{9}"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="03001234567"
                  className="mt-1.5 w-full rounded-lg border border-[#DCE8E0] px-3 py-2 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
                />
              </div>

            </div>

            <div className="flex justify-end gap-2 border-t border-[#DCE8E0] pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setError(null);
                }}
                className="cursor-pointer rounded-lg border border-[#DCE8E0] bg-white px-4 py-2 text-xs font-semibold text-[#34453B] hover:bg-[#F4FAF6]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="cursor-pointer rounded-lg bg-[#0F6B3E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B5430] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            <dl className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
              <div className="rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-4">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-[#6A7B70]">
                  Full Name
                </dt>
                <dd className="mt-1 text-sm font-bold text-[#0C2A1B]">
                  {fullName}
                </dd>
              </div>

              <div className="rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-4">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-[#6A7B70]">
                  Email Address
                </dt>
                <dd className="mt-1 text-sm font-bold text-[#0C2A1B]">
                  {userEmail || "—"}
                </dd>
              </div>

              <div className="rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-4">
                <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#6A7B70]">
                  <Phone className="h-3 w-3" aria-hidden="true" />
                  <span>Phone Number</span>
                </dt>
                <dd className="mt-1 text-sm font-bold text-[#0C2A1B]">
                  {phone || "Not added yet"}
                </dd>
              </div>

              <div className="rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-4">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-[#6A7B70]">
                  Member Since
                </dt>
                <dd className="mt-1 text-sm font-bold text-[#0C2A1B]">
                  {joinedAt
                    ? new Date(joinedAt).toLocaleDateString()
                    : "Date unavailable"}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
