"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  Phone,
  Play,
  Star,
  Tag,
  User,
} from "lucide-react";
import {
  disputeProfessionalJob,
  markProfessionalJobDone,
  startProfessionalJob,
} from "@/lib/api/professional";
import {
  formatBudgetRange,
  formatEtaMinutes,
  formatKarachiDate,
  formatKarachiDateTime,
  formatPakistaniPhoneDisplay,
  formatPkr,
} from "@/lib/customer/format";
import type {
  JobEventItem,
  JobReviewItem,
  ProfessionalAssignedJobRow,
} from "@/lib/pro/types";
import {
  CustomerDialog,
  JobStatusBadge,
  WakingServerBanner,
} from "@/components/customer/customer-dialog";

interface ProJobDetailClientProps {
  job: ProfessionalAssignedJobRow;
  customerPhone: string | null;
  events: JobEventItem[];
  review: JobReviewItem | null;
}

export function ProJobDetailClient({
  job,
  customerPhone,
  events,
  review,
}: ProJobDetailClientProps) {
  const router = useRouter();

  const [wakingUp, setWakingUp] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const canStartWork = job.status === "Assigned";
  const canMarkDone =
    job.status === "In progress" && !job.professional_marked_done_at;
  const isWaitingCustomerConfirm =
    job.status === "In progress" && Boolean(job.professional_marked_done_at);
  const canReportProblem =
    job.status === "Assigned" || job.status === "In progress";

  async function handleStartWork() {
    setErrorMessage(null);
    setStatusNotice(null);
    setBusyAction("start");
    try {
      await startProfessionalJob(job.id, { onWakingUp: setWakingUp });
      setStatusNotice(
        "Work started! The customer has been notified that work is now in progress."
      );
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not start work on this job."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleMarkDone() {
    setErrorMessage(null);
    setStatusNotice(null);
    setBusyAction("mark-done");
    try {
      await markProfessionalJobDone(job.id, { onWakingUp: setWakingUp });
      setStatusNotice(
        "Work marked as done! Waiting for the customer to confirm completion."
      );
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not mark this job as done."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleConfirmDispute() {
    const cleanReason = disputeReason.trim();
    if (cleanReason.length < 10) {
      setErrorMessage("Please describe the problem in at least 10 characters.");
      return;
    }

    setErrorMessage(null);
    setStatusNotice(null);
    setBusyAction("dispute");
    try {
      await disputeProfessionalJob(job.id, cleanReason, {
        onWakingUp: setWakingUp,
      });
      setDisputeDialogOpen(false);
      setDisputeReason("");
      setStatusNotice(
        "Problem reported. This job has been marked as Disputed for review."
      );
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not report a problem."
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/pro/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#34453B] hover:text-[#0F6B3E]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to My jobs</span>
        </Link>
      </div>

      <WakingServerBanner visible={wakingUp} />

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

      {statusNotice && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-[#E6F4EA] px-4 py-3 text-xs font-medium text-[#0C2A1B]"
        >
          <CheckCircle2
            className="mt-0.5 h-4 w-4 shrink-0 text-[#0F6B3E]"
            aria-hidden="true"
          />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Job Summary Card */}
      <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <JobStatusBadge status={job.status} />
              {job.urgency === "urgent" && (
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  Urgent
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6A7B70]">
                <Tag
                  className="h-3.5 w-3.5 text-[#0F6B3E]"
                  aria-hidden="true"
                />
                {job.category_name}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6A7B70]">
                <MapPin
                  className="h-3.5 w-3.5 text-[#0F6B3E]"
                  aria-hidden="true"
                />
                {job.area_name}
              </span>
            </div>

            <h1 className="text-lg font-extrabold tracking-tight text-[#0C2A1B] sm:text-xl">
              {job.title}
            </h1>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-[11px] font-medium text-[#6A7B70]">
              {job.agreed_price !== null
                ? "Agreed quote (direct with customer)"
                : "Customer budget"}
            </p>
            <p className="text-base font-extrabold text-[#0F6B3E]">
              {job.agreed_price !== null
                ? formatPkr(job.agreed_price)
                : formatBudgetRange(job.budget_min, job.budget_max)}
            </p>
            {job.agreed_inspection_fee !== null && (
              <p className="mt-0.5 text-[11px] text-[#6A7B70]">
                Inspection fee:{" "}
                {job.agreed_inspection_fee > 0
                  ? formatPkr(job.agreed_inspection_fee)
                  : "None"}{" "}
                {job.agreed_eta_minutes
                  ? `· ETA ${formatEtaMinutes(job.agreed_eta_minutes)}`
                  : ""}
              </p>
            )}
          </div>
        </div>

        <p className="whitespace-pre-line rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-4 text-xs leading-relaxed text-[#0C2A1B]">
          {job.description}
        </p>

        {isWaitingCustomerConfirm && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border border-emerald-300 bg-[#E6F4EA] p-4 text-xs text-[#0C2A1B]"
          >
            <Clock
              className="mt-0.5 h-4 w-4 shrink-0 text-[#0F6B3E]"
              aria-hidden="true"
            />
            <div>
              <p className="font-bold text-[#0C2A1B]">
                Waiting for the customer to confirm
              </p>
              <p className="mt-0.5 text-[11px] text-[#34453B]">
                You marked the work as done on{" "}
                {formatKarachiDateTime(job.professional_marked_done_at)}. The
                customer has been notified to confirm completion.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DCE8E0] pt-4 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#6A7B70]">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              Created {formatKarachiDate(job.created_at)}
            </span>
            {job.work_started_at && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Started {formatKarachiDateTime(job.work_started_at)}
              </span>
            )}
          </div>

          {/* Action Buttons by Status */}
          <div className="flex flex-wrap items-center gap-2">
            {canStartWork && (
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleStartWork()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F6B3E] px-4 py-2 text-xs font-semibold !text-white text-white hover:bg-[#0A4D2B] disabled:opacity-60"
              >
                <Play
                  className="h-3.5 w-3.5 !text-white text-white"
                  aria-hidden="true"
                />
                <span className="!text-white text-white">
                  {busyAction === "start" ? "Starting..." : "Start work"}
                </span>
              </button>
            )}

            {canMarkDone && (
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleMarkDone()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F6B3E] px-4 py-2 text-xs font-semibold !text-white text-white hover:bg-[#0A4D2B] disabled:opacity-60"
              >
                <CheckCircle2
                  className="h-3.5 w-3.5 !text-white text-white"
                  aria-hidden="true"
                />
                <span className="!text-white text-white">
                  {busyAction === "mark-done"
                    ? "Marking done..."
                    : "Mark work as done"}
                </span>
              </button>
            )}

            {canReportProblem && (
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => setDisputeDialogOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
              >
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Report a problem</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Customer Contact Card (Unlocked after offer acceptance via RLS) */}
      <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
              Customer Contact (Unlocked upon acceptance)
            </span>
            <h2 className="flex items-center gap-2 text-base font-bold text-[#0C2A1B]">
              <User
                className="h-4 w-4 text-[#0F6B3E]"
                aria-hidden="true"
              />
              <span>{job.customer_name}</span>
            </h2>
            <p className="text-xs text-[#6A7B70]">
              Coordinate arrival time and exact location directly with the
              customer. Prices are settled directly—ProLink does not handle
              payments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {customerPhone ? (
              <a
                href={`tel:${customerPhone}`}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-[#E6F4EA] px-3.5 py-2 text-xs font-bold text-[#0F6B3E] hover:bg-emerald-100"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{formatPakistaniPhoneDisplay(customerPhone)}</span>
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] px-3 py-2 text-xs text-[#6A7B70]">
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Phone not listed</span>
              </span>
            )}

            <button
              type="button"
              disabled
              aria-disabled="true"
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] px-3.5 py-2 text-xs font-semibold text-[#6A7B70]"
            >
              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Chat (coming soon)</span>
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Customer Review Section (for Completed jobs) */}
        <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs lg:col-span-6 space-y-4">
          <div className="border-b border-[#DCE8E0] pb-3">
            <h2 className="text-base font-bold text-[#0C2A1B]">
              Customer review
            </h2>
            <p className="text-xs text-[#6A7B70]">
              Feedback submitted by {job.customer_name} after job completion
            </p>
          </div>

          {job.status !== "Completed" ? (
            <p className="py-6 text-center text-xs text-[#6A7B70]">
              The customer can leave a review once the job is confirmed as
              Completed.
            </p>
          ) : review ? (
            <div className="rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-4 space-y-2">
              <div
                className="flex items-center gap-1"
                aria-label={`Rated ${review.rating} out of 5 stars`}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= review.rating
                        ? "fill-amber-500 text-amber-500"
                        : "text-stone-300"
                    }`}
                    aria-hidden="true"
                  />
                ))}
                <span className="ml-2 text-xs font-bold text-[#0C2A1B]">
                  {review.rating} / 5
                </span>
              </div>
              {review.comment ? (
                <p className="text-xs text-[#0C2A1B]">{review.comment}</p>
              ) : (
                <p className="text-xs italic text-[#6A7B70]">
                  No written comment provided.
                </p>
              )}
              <p className="text-[11px] text-[#6A7B70]">
                Submitted {formatKarachiDateTime(review.created_at)}
              </p>
            </div>
          ) : (
            <div className="py-6 text-center">
              <Star
                className="mx-auto h-7 w-7 text-[#6A7B70]"
                aria-hidden="true"
              />
              <p className="mt-2 text-xs font-semibold text-[#0C2A1B]">
                No review yet
              </p>
              <p className="mt-1 text-[11px] text-[#6A7B70]">
                The customer has not submitted a rating for this completed job
                yet.
              </p>
            </div>
          )}
        </section>

        {/* Status Timeline */}
        <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs lg:col-span-6 space-y-4">
          <div className="border-b border-[#DCE8E0] pb-3">
            <h2 className="text-base font-bold text-[#0C2A1B]">
              Status timeline
            </h2>
            <p className="text-xs text-[#6A7B70]">
              Recorded events from job creation to completion
            </p>
          </div>

          {events.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#6A7B70]">
              No status events recorded yet.
            </p>
          ) : (
            <ol className="relative border-l border-[#DCE8E0] ml-2 space-y-4 pl-4">
              {events.map((ev) => (
                <li key={ev.id} className="relative text-xs">
                  <span
                    className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#0F6B3E]"
                    aria-hidden="true"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-[#0C2A1B]">
                      {ev.from_status
                        ? `${ev.from_status} → ${ev.to_status}`
                        : ev.to_status}
                    </span>
                    <span className="text-[11px] text-[#6A7B70]">
                      {formatKarachiDateTime(ev.at)}
                    </span>
                  </div>
                  {ev.note && (
                    <p className="mt-1 text-xs text-[#34453B]">{ev.note}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Report a Problem Modal */}
      <CustomerDialog
        open={disputeDialogOpen}
        title="Report a problem with this job"
        description="Describe the issue clearly (at least 10 characters). The job will be marked as Disputed for administrator review."
        onClose={() => setDisputeDialogOpen(false)}
      >
        <div className="space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="pro-dispute-reason"
                className="block font-semibold text-[#0C2A1B]"
              >
                Reason for dispute <span className="text-red-600">*</span>
              </label>
              <span className="text-[11px] text-[#6A7B70]">
                {disputeReason.trim().length} / 1000
              </span>
            </div>
            <textarea
              id="pro-dispute-reason"
              rows={4}
              maxLength={1000}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Explain what happened (minimum 10 characters)..."
              className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => setDisputeDialogOpen(false)}
              className="rounded-xl border border-[#DCE8E0] bg-white px-4 py-2 font-semibold text-[#0C2A1B]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => void handleConfirmDispute()}
              className="rounded-xl bg-amber-600 px-4 py-2 font-semibold !text-white text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {busyAction === "dispute" ? "Submitting..." : "Submit report"}
            </button>
          </div>
        </div>
      </CustomerDialog>
    </div>
  );
}
