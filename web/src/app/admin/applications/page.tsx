"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  fetchAdminApplications,
  reviewProfessionalApplicationRpc,
} from "@/lib/admin/queries";
import type {
  AdminApplicationRow,
  ApplicationStatus,
} from "@/lib/admin/types";
import { AdminDialog, AdminPagination } from "@/components/admin/admin-dialog";

const STATUS_TABS: { value: ApplicationStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

export default function AdminApplicationsPage() {
  const [activeTab, setActiveTab] = useState<ApplicationStatus>("pending");
  const [rows, setRows] = useState<AdminApplicationRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [dialogTarget, setDialogTarget] = useState<{
    applicant: AdminApplicationRow;
    decision: "approved" | "rejected" | "suspended";
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const result = await fetchAdminApplications(supabase, activeTab, page, 20);
      setRows(result.rows);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load professional applications."
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadApplications();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadApplications]);

  function openReviewModal(
    applicant: AdminApplicationRow,
    decision: "approved" | "rejected" | "suspended"
  ) {
    setDialogTarget({ applicant, decision });
    setReviewNote("");
    setDialogError(null);
  }

  async function submitDecision() {
    if (!dialogTarget) return;
    const trimmed = reviewNote.trim();

    setSubmitting(true);
    setDialogError(null);
    try {
      const supabase = createClient();
      await reviewProfessionalApplicationRpc(
        supabase,
        dialogTarget.applicant.profile_id,
        dialogTarget.decision,
        trimmed || `${dialogTarget.decision === "approved" ? "Approved" : dialogTarget.decision === "rejected" ? "Rejected" : "Suspended"} by administrator.`
      );
      setFeedback(
        `Updated ${dialogTarget.applicant.full_name} to "${dialogTarget.decision}".`
      );
      setDialogTarget(null);
      await loadApplications();
    } catch (err) {
      setDialogError(
        err instanceof Error ? err.message : "Failed to submit application review."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0C2A1B]">
          Professional Applications
        </h1>
        <p className="mt-1 text-sm text-[#34453B]">
          Review applicant credentials, trade skills, and coverage areas before granting marketplace access.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Filter applications by status"
        className="flex flex-wrap gap-2 border-b border-[#DCE8E0] pb-3"
      >
        {STATUS_TABS.map((tab) => {
          const isSelected = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                setActiveTab(tab.value);
                setPage(1);
                setFeedback(null);
              }}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E] ${
                isSelected
                  ? "bg-[#0F6B3E] text-white"
                  : "border border-[#DCE8E0] bg-white text-[#34453B] hover:bg-[#F4FAF6]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
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
        {loading ? (
          <div className="p-8 text-center text-xs text-[#6A7B70]">
            Loading {activeTab} applications...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#6A7B70]">
            No {activeTab} applications found.
          </div>
        ) : (
          <div className="divide-y divide-[#DCE8E0]">
            {rows.map((row) => (
              <article
                key={row.profile_id}
                className="flex flex-col justify-between gap-4 p-5 lg:flex-row lg:items-start"
              >
                <div className="space-y-2 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-sm font-bold text-[#0C2A1B]">{row.full_name}</h2>
                    <span className="rounded-full border border-[#DCE8E0] bg-[#F4FAF6] px-2.5 py-0.5 text-[11px] font-semibold text-[#34453B]">
                      {row.years_experience ?? 0} yrs experience
                    </span>
                    <span className="text-xs text-[#6A7B70]">
                      Phone: <strong>{row.phone || "Not provided"}</strong>
                    </span>
                    {row.cnic && (
                      <span className="text-xs text-[#6A7B70]">
                        CNIC: <strong>{row.cnic}</strong>
                      </span>
                    )}
                    <span className="text-xs text-[#6A7B70]">
                      Applied: {new Date(row.applied_at).toLocaleDateString()}
                    </span>
                  </div>

                  {(row.father_name || row.residential_address || row.notification_preference) && (
                    <div className="flex flex-wrap gap-4 text-xs text-[#6A7B70]">
                      {row.father_name && (
                        <span>
                          Father&apos;s Name: <strong className="text-[#34453B]">{row.father_name}</strong>
                        </span>
                      )}
                      {row.residential_address && (
                        <span>
                          Address: <strong className="text-[#34453B]">{row.residential_address}</strong>
                        </span>
                      )}
                      {row.notification_preference && (
                        <span>
                          Notifications:{" "}
                          <strong className="text-[#34453B]">
                            {row.notification_preference === "all_jobs"
                              ? "All Available Jobs"
                              : "Matching Jobs Only"}
                          </strong>
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-xs leading-relaxed text-[#34453B]">
                    {row.bio || "No biography submitted."}
                  </p>

                  <div className="flex flex-wrap gap-4 pt-1 text-xs">
                    <div>
                      <span className="font-semibold text-[#0C2A1B]">Trades: </span>
                      {row.trades.length > 0 ? (
                        <span className="text-[#34453B]">{row.trades.join(", ")}</span>
                      ) : (
                        <span className="text-[#6A7B70]">None listed</span>
                      )}
                    </div>
                    {row.skills && row.skills.length > 0 && (
                      <div>
                        <span className="font-semibold text-[#0C2A1B]">Skills: </span>
                        <span className="text-[#34453B]">{row.skills.join(", ")}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-[#0C2A1B]">Areas: </span>
                      {row.areas.length > 0 ? (
                        <span className="text-[#34453B]">{row.areas.join(", ")}</span>
                      ) : (
                        <span className="text-[#6A7B70]">None listed</span>
                      )}
                    </div>
                  </div>

                  {row.review_note && (
                    <div className="rounded-lg border border-[#DCE8E0] bg-[#F8FBF9] px-3 py-2 text-xs text-[#34453B]">
                      <strong>Review note:</strong> {row.review_note}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {row.status !== "approved" && (
                    <button
                      type="button"
                      onClick={() => openReviewModal(row, "approved")}
                      className="rounded-lg bg-[#0F6B3E] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#0B5430] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
                    >
                      Approve
                    </button>
                  )}
                  {row.status !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => openReviewModal(row, "rejected")}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
                    >
                      Reject
                    </button>
                  )}
                  {row.status !== "suspended" && (
                    <button
                      type="button"
                      onClick={() => openReviewModal(row, "suspended")}
                      className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-800 transition hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <AdminPagination
          page={page}
          pageSize={20}
          totalCount={totalCount}
          onPageChange={setPage}
        />
      </div>

      <AdminDialog
        open={Boolean(dialogTarget)}
        title={
          dialogTarget
            ? `${
                dialogTarget.decision === "approved"
                  ? "Approve"
                  : dialogTarget.decision === "rejected"
                  ? "Reject"
                  : "Suspend"
              } ${dialogTarget.applicant.full_name}`
            : "Review Application"
        }
        description={
          dialogTarget?.decision === "approved"
            ? "Confirm approval so this professional can send offers on customer jobs."
            : "Confirm this decision. You may add a note for the applicant."
        }
        onClose={() => setDialogTarget(null)}
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="application-review-note"
              className="block text-xs font-bold text-[#0C2A1B]"
            >
              Review Note
            </label>
            <textarea
              id="application-review-note"
              rows={3}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder={
                dialogTarget?.decision === "approved"
                  ? "Add a verification note..."
                  : "Add a note for the applicant..."
              }
              className="mt-1.5 w-full rounded-lg border border-[#DCE8E0] px-3 py-2 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
            />
          </div>

          {dialogError && (
            <p role="alert" className="text-xs font-semibold text-red-700">
              {dialogError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDialogTarget(null)}
              className="rounded-lg border border-[#DCE8E0] bg-white px-4 py-2 text-xs font-semibold text-[#34453B] hover:bg-[#F4FAF6]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={submitDecision}
              className="rounded-lg bg-[#0F6B3E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B5430] disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Confirm Decision"}
            </button>
          </div>
        </div>
      </AdminDialog>
    </div>
  );
}
