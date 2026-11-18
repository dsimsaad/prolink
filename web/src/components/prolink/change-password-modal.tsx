"use client";

import { useState, useEffect, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  userEmail,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [forgotNotice, setForgotNotice] = useState<string | null>(null);

  // Reset fields when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setSuccess(null);
      setForgotNotice(null);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleForgotPassword() {
    setForgotLoading(true);
    setForgotNotice(null);
    setError(null);

    try {
      const supabase = createClient();
      let targetEmail = userEmail;
      if (!targetEmail) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        targetEmail = user?.email || "";
      }

      if (!targetEmail) {
        setError("Unable to find an account email to send the reset link.");
        return;
      }

      const callbackUrl = `${window.location.origin}/auth/callback?next=/dashboard/profile`;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        targetEmail,
        { redirectTo: callbackUrl }
      );

      if (resetErr) {
        setError(resetErr.message);
      } else {
        setForgotNotice(
          `A password reset link has been sent to ${targetEmail}. Please check your inbox.`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send password recovery email."
      );
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setForgotNotice(null);

    if (!currentPassword.trim()) {
      setError("Please enter your current password.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("New password cannot be the same as your current password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      let targetEmail = userEmail;
      if (!targetEmail) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        targetEmail = user?.email || "";
      }

      if (!targetEmail) {
        setError("Unable to verify user account. Please refresh and try again.");
        setSubmitting(false);
        return;
      }

      // Step 1: Verify current password
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: currentPassword,
      });

      if (signInErr) {
        setError(
          "Current password is incorrect. Please check and try again, or use 'Forgot password?'."
        );
        setSubmitting(false);
        return;
      }

      // Step 2: Update to new password
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) {
        setError(updateErr.message);
        setSubmitting(false);
        return;
      }

      setSuccess("Your password has been changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to change password."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-[#DCE8E0] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#DCE8E0] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F4FAF6] text-[#0F6B3E]">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="change-password-modal-title"
                className="text-base font-bold text-[#0C2A1B]"
              >
                Change Password
              </h2>
              <p className="text-xs text-[#6A7B70]">
                Choose a new, secure password for your ProLink account.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close change password modal"
            className="rounded-lg p-1.5 text-[#6A7B70] transition hover:bg-[#F4FAF6] hover:text-[#0C2A1B]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {forgotNotice && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-[#E6F4EA] p-3 text-xs font-medium text-[#0C2A1B]"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0F6B3E] mt-0.5" aria-hidden="true" />
            <div>
              <p>{forgotNotice}</p>
              <p className="mt-1 text-[11px] text-[#34453B]">
                Follow the instructions sent to your email to reset your password.
              </p>
            </div>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-[#E6F4EA] p-3 text-xs font-medium text-[#0C2A1B]"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0F6B3E] mt-0.5" aria-hidden="true" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Current password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="modal-current-password"
                className="block text-xs font-semibold text-[#0C2A1B]"
              >
                Current password <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => void handleForgotPassword()}
                disabled={forgotLoading}
                className="text-[11px] font-semibold text-[#0F6B3E] hover:underline disabled:opacity-50"
              >
                {forgotLoading ? "Sending link..." : "Forgot password?"}
              </button>
            </div>
            <div className="relative">
              <input
                id="modal-current-password"
                type={showCurrentPassword ? "text" : "password"}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                className="w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 pr-10 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((v) => !v)}
                aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#6A7B70] hover:text-[#0C2A1B]"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label
              htmlFor="modal-new-password"
              className="block text-xs font-semibold text-[#0C2A1B] mb-1.5"
            >
              New password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="modal-new-password"
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 pr-10 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#6A7B70] hover:text-[#0C2A1B]"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm new password */}
          <div>
            <label
              htmlFor="modal-confirm-password"
              className="block text-xs font-semibold text-[#0C2A1B] mb-1.5"
            >
              Confirm new password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="modal-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 pr-10 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#6A7B70] hover:text-[#0C2A1B]"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 border-t border-[#DCE8E0] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#DCE8E0] bg-white px-4 py-2.5 text-xs font-semibold text-[#34453B] transition hover:bg-[#F4FAF6]"
            >
              {success ? "Close" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#0F6B3E] px-4 py-2.5 text-xs font-semibold !text-white text-white transition hover:bg-[#0A4D2B] disabled:opacity-50"
            >
              {submitting ? "Updating password..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
