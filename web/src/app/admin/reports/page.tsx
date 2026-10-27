"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  fetchAdminReports,
  resolveReportRpc,
} from "@/lib/admin/queries";
import type {
  AdminReportRow,
  ReportStatus,
} from "@/lib/admin/types";
import { AdminDialog, AdminPagination } from "@/components/admin/admin-dialog";

const REPORT_STATUS_FILTERS: { value: ReportStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "reviewing", label: "Reviewing" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

export default function AdminReportsPage() {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "">("open");
  const [rows, setRows] = useState<AdminReportRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [dialogTarget, setDialogTarget] = useState<{
    report: AdminReportRow;
    nextStatus: "reviewing" | "resolved" | "dismissed";
  } | null>(null);
  const [note, setNote] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const result = await fetchAdminReports(supabase, statusFilter, page, 20);
      setRows(result.rows);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load user reports."
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadReports();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadReports]);

  async function handleConfirmReportAction() {
    if (!dialogTarget) return;
    const trimmed = note.trim();

    if (
      (dialogTarget.nextStatus === "resolved" ||
        dialogTarget.nextStatus === "dismissed") &&
      trimmed.length < 3
    ) {
      setDialogError(
        "A resolution note is required when resolving or dismissing a report."
      );
      return;
    }

    setSubmitting(true);
    setDialogError(null);
    try {
      const supabase = createClient();
      await resolveReportRpc(
        supabase,
        dialogTarget.report.id,
        dialogTarget.nextStatus,
        trimmed || "Marked under review by administrator"
      );
      setFeedback(`Updated report status to "${dialogTarget.nextStatus}".`);
      setDialogTarget(null);
      await loadReports();
    } catch (err) {
      setDialogError(
        err instanceof Error ? err.message : "Failed to update report."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0C2A1B]">
          Trust & Safety Reports
        </h1>
        <p className="mt-1 text-sm text-[#34453B]">
          Investigate user-submitted reports regarding users or jobs and record moderation decisions.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Filter reports by status"
        className="flex flex-wrap gap-2 border-b border-[#DCE8E0] pb-3"
      >
        {REPORT_STATUS_FILTERS.map((item) => {
          const isSelected = statusFilter === item.value;
          return (
            <button
              key={item.label}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                setStatusFilter(item.value);
                setPage(1);
                setFeedback(null);
              }}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                isSelected
                  ? "bg-[#0F6B3E] text-white"
                  : "border border-[#DCE8E0] bg-white text-[#34453B] hover:bg-[#F4FAF6]"
              }`}
            >
              {item.label}
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
            Loading reports...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#6A7B70]">
            No reports found for this filter.
          </div>
        ) : (
          <div className="divide-y divide-[#DCE8E0]">
            {rows.map((report) => (
              <article
                key={report.id}
                className="flex flex-col justify-between gap-4 p-5 lg:flex-row lg:items-start"
              >
                <div className="space-y-2 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                        report.status === "open"
                          ? "bg-red-100 text-red-800"
                          : report.status === "reviewing"
                          ? "bg-amber-100 text-amber-900"
                          : report.status === "resolved"
                          ? "bg-[#E6F4EA] text-[#0F6B3E]"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {report.status}
                    </span>
                    <h2 className="text-sm font-bold text-[#0C2A1B]">
                      {report.reason}
                    </h2>
                    <span className="text-xs text-[#6A7B70]">
                      Reported by <strong>{report.reporter_name}</strong> on{" "}
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {report.details && (
                    <p className="text-xs leading-relaxed text-[#34453B]">
                      {report.details}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs">
                    {report.target_user_id && (
                      <span>
                        <strong>Target User:</strong> {report.target_user_name}
                      </span>
                    )}
                    {report.target_job_id && (
                      <span>
                        <strong>Target Job:</strong>{" "}
                        <Link
                          href={`/admin/jobs/${report.target_job_id}`}
                          className="font-semibold text-[#0F6B3E] hover:underline"
                        >
                          {report.target_job_title}
                        </Link>
                      </span>
                    )}
                  </div>

                  {report.resolution_note && (
                    <div className="rounded-lg border border-[#DCE8E0] bg-[#F8FBF9] px-3 py-2 text-xs text-[#34453B]">
                      <strong>Resolution Note:</strong> {report.resolution_note}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {report.status !== "reviewing" && (
                    <button
                      type="button"
                      onClick={() => {
                        setDialogTarget({ report, nextStatus: "reviewing" });
                        setNote(report.resolution_note ?? "");
                        setDialogError(null);
                      }}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      Mark reviewing
                    </button>
                  )}
                  {report.status !== "resolved" && (
                    <button
                      type="button"
                      onClick={() => {
                        setDialogTarget({ report, nextStatus: "resolved" });
                        setNote("");
                        setDialogError(null);
                      }}
                      className="rounded-lg bg-[#0F6B3E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0B5430]"
                    >
                      Resolve
                    </button>
                  )}
                  {report.status !== "dismissed" && (
                    <button
                      type="button"
                      onClick={() => {
                        setDialogTarget({ report, nextStatus: "dismissed" });
                        setNote("");
                        setDialogError(null);
                      }}
                      className="rounded-lg border border-[#DCE8E0] bg-white px-3 py-1.5 text-xs font-semibold text-[#34453B] hover:bg-[#F4FAF6]"
                    >
                      Dismiss
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
                dialogTarget.nextStatus === "resolved"
                  ? "Resolve"
                  : dialogTarget.nextStatus === "dismissed"
                  ? "Dismiss"
                  : "Mark Reviewing"
              } Report`
            : "Update Report"
        }
        description="Record a clear note explaining how this report was handled."
        onClose={() => setDialogTarget(null)}
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="report-resolution-note"
              className="block text-xs font-bold text-[#0C2A1B]"
            >
              Note{" "}
              {dialogTarget?.nextStatus !== "reviewing" && (
                <span className="text-red-700">(required)</span>
              )}
            </label>
            <textarea
              id="report-resolution-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter investigation notes or resolution summary..."
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
              onClick={handleConfirmReportAction}
              className="rounded-lg bg-[#0F6B3E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B5430] disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Confirm"}
            </button>
          </div>
        </div>
      </AdminDialog>
    </div>
  );
}
