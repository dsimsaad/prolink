"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fetchAdminJobDetail } from "@/lib/admin/queries";
import {
  forceCancelJob,
  getJobAllowedActions,
} from "@/lib/api/admin";
import type {
  AdminJobEventRow,
  AdminJobRow,
  AdminOfferRow,
  AllowedJobActionsDto,
} from "@/lib/admin/types";
import { AdminDialog } from "@/components/admin/admin-dialog";

export default function AdminJobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  const [job, setJob] = useState<AdminJobRow | null>(null);
  const [offers, setOffers] = useState<AdminOfferRow[]>([]);
  const [events, setEvents] = useState<AdminJobEventRow[]>([]);
  const [allowedActions, setAllowedActions] = useState<AllowedJobActionsDto | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadJobDetail = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const [detail, actions] = await Promise.all([
        fetchAdminJobDetail(supabase, jobId),
        getJobAllowedActions(jobId).catch(() => null),
      ]);
      setJob(detail.job);
      setOffers(detail.offers);
      setEvents(detail.events);
      setAllowedActions(actions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load job details."
      );
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadJobDetail();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadJobDetail]);

  async function handleConfirmForceCancel() {
    const trimmed = cancelReason.trim();
    if (trimmed.length < 10) {
      setCancelError("Force-cancel reason must be at least 10 characters.");
      return;
    }

    setCancelling(true);
    setCancelError(null);
    try {
      const res = await forceCancelJob(jobId, trimmed);
      setFeedback(
        `Job force-cancelled (${res.previousStatus} → ${res.newStatus}).`
      );
      setCancelModalOpen(false);
      await loadJobDetail();
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : "Could not force-cancel job."
      );
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-[#6A7B70]">
        Loading job detail...
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F6B3E] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Jobs
        </Link>
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800"
        >
          {error || "Job not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F6B3E] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Jobs
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0C2A1B]">
            {job.title}
          </h1>
          <p className="mt-0.5 text-xs text-[#6A7B70]">
            Job ID: <span className="font-mono">{job.id}</span> · Created{" "}
            {new Date(job.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {job.status === "Disputed" && (
            <Link
              href={`/admin/disputes/${job.id}`}
              className="rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Open Dispute Resolution
            </Link>
          )}
          {allowedActions?.canForceCancel && (
            <button
              type="button"
              onClick={() => {
                setCancelReason("");
                setCancelError(null);
                setCancelModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-800"
            >
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Force Cancel Job</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="rounded-xl border border-[#CDE9D6] bg-[#E6F4EA] px-4 py-3 text-xs font-semibold text-[#0C2A1B]"
        >
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-[#DCE8E0] bg-white p-5 shadow-2xs lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCE8E0] pb-3">
            <h2 className="text-sm font-bold text-[#0C2A1B]">Job Specification</h2>
            <span className="rounded-full bg-[#E6F4EA] px-3 py-0.5 text-xs font-bold text-[#0F6B3E]">
              {job.status}
            </span>
          </div>

          <p className="text-xs leading-relaxed text-[#34453B]">
            {job.description}
          </p>

          <dl className="grid grid-cols-2 gap-3 border-t border-[#DCE8E0] pt-3 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-[#6A7B70]">Category</dt>
              <dd className="font-semibold text-[#0C2A1B]">{job.category_name}</dd>
            </div>
            <div>
              <dt className="text-[#6A7B70]">Area</dt>
              <dd className="font-semibold text-[#0C2A1B]">{job.area_name}</dd>
            </div>
            <div>
              <dt className="text-[#6A7B70]">Urgency</dt>
              <dd className="font-semibold uppercase text-[#0C2A1B]">
                {job.urgency}
              </dd>
            </div>
            <div>
              <dt className="text-[#6A7B70]">Customer</dt>
              <dd className="font-semibold text-[#0C2A1B]">{job.customer_name}</dd>
            </div>
            <div>
              <dt className="text-[#6A7B70]">Assigned Professional</dt>
              <dd className="font-semibold text-[#0C2A1B]">
                {job.assigned_professional_name || "Unassigned"}
              </dd>
            </div>
            <div>
              <dt className="text-[#6A7B70]">Budget Range (PKR)</dt>
              <dd className="font-semibold text-[#0C2A1B]">
                {job.budget_min || job.budget_max
                  ? `${job.budget_min ?? 0} – ${job.budget_max ?? 0}`
                  : "Open"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-[#DCE8E0] bg-white p-5 shadow-2xs space-y-3">
          <h2 className="border-b border-[#DCE8E0] pb-3 text-sm font-bold text-[#0C2A1B]">
            JobStateMachine Allowed Actions
          </h2>
          {allowedActions ? (
            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-[#6A7B70]">Current State: </span>
                <strong className="text-[#0C2A1B]">{allowedActions.currentStatus}</strong>
              </div>
              <div>
                <span className="font-semibold text-[#6A7B70]">Valid Next States:</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {allowedActions.nextStates.length === 0 ? (
                    <span className="text-[#6A7B70]">Terminal state (none)</span>
                  ) : (
                    allowedActions.nextStates.map((st) => (
                      <span
                        key={st}
                        className="rounded-md border border-[#DCE8E0] bg-[#F4FAF6] px-2 py-0.5 text-[11px] font-semibold text-[#0C2A1B]"
                      >
                        {st}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div>
                <span className="font-semibold text-[#6A7B70]">Can Force Cancel: </span>
                <strong>{allowedActions.canForceCancel ? "Yes" : "No"}</strong>
              </div>
              <div>
                <span className="font-semibold text-[#6A7B70]">Can Resolve Dispute: </span>
                <strong>{allowedActions.canResolveDispute ? "Yes" : "No"}</strong>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#6A7B70]">
              State machine transitions unavailable (ensure C# Engine API is running).
            </p>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[#DCE8E0] bg-white p-5 shadow-2xs">
          <h2 className="border-b border-[#DCE8E0] pb-3 text-sm font-bold text-[#0C2A1B]">
            Submitted Offers ({offers.length})
          </h2>
          {offers.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#6A7B70]">
              No offers submitted for this job.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[#DCE8E0] text-xs">
              {offers.map((offer) => (
                <li key={offer.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between font-bold text-[#0C2A1B]">
                    <span>{offer.professional_name}</span>
                    <span>PKR {offer.price.toLocaleString()}</span>
                  </div>
                  <div className="text-[11px] text-[#6A7B70]">
                    Status: <strong>{offer.status}</strong> · Inspection Fee: PKR{" "}
                    {offer.inspection_fee} · ETA: {offer.eta_minutes ?? "—"} mins
                  </div>
                  {offer.message && (
                    <p className="text-[#34453B]">{offer.message}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-[#DCE8E0] bg-white p-5 shadow-2xs">
          <h2 className="border-b border-[#DCE8E0] pb-3 text-sm font-bold text-[#0C2A1B]">
            Status History (job_events)
          </h2>
          {events.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#6A7B70]">
              No status transitions recorded yet.
            </p>
          ) : (
            <ol className="mt-3 divide-y divide-[#DCE8E0] text-xs">
              {events.map((ev) => (
                <li key={ev.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0C2A1B]">
                      {ev.from_status ?? "Created"} → {ev.to_status}
                    </span>
                    <span className="text-[11px] text-[#6A7B70]">
                      {new Date(ev.at).toLocaleString()}
                    </span>
                  </div>
                  {ev.actor_name && (
                    <div className="text-[11px] text-[#6A7B70]">
                      Actor: {ev.actor_name}
                    </div>
                  )}
                  {ev.note && (
                    <div className="rounded-md bg-[#F4FAF6] px-2.5 py-1.5 text-[#0C2A1B]">
                      Note: {ev.note}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <AdminDialog
        open={cancelModalOpen}
        title="Force Cancel Job"
        description="This immediately transitions the job to Cancelled and writes an atomic audit record in job_events and admin_actions."
        onClose={() => setCancelModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="force-cancel-reason"
              className="block text-xs font-bold text-[#0C2A1B]"
            >
              Cancellation Reason{" "}
              <span className="text-red-700">(required, min 10 characters)</span>
            </label>
            <textarea
              id="force-cancel-reason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Explain why an administrator is force-cancelling this job..."
              className="mt-1.5 w-full rounded-lg border border-[#DCE8E0] px-3 py-2 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
            />
          </div>

          {cancelError && (
            <p role="alert" className="text-xs font-semibold text-red-700">
              {cancelError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="rounded-lg border border-[#DCE8E0] bg-white px-4 py-2 text-xs font-semibold text-[#34453B] hover:bg-[#F4FAF6]"
            >
              Close
            </button>
            <button
              type="button"
              disabled={cancelling}
              onClick={handleConfirmForceCancel}
              className="rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
            >
              {cancelling ? "Cancelling..." : "Confirm Force Cancel"}
            </button>
          </div>
        </div>
      </AdminDialog>
    </div>
  );
}
