"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Star,
  Tag,
  XCircle,
} from "lucide-react";
import {
  acceptJobOffer,
  cancelCustomerJob,
  completeCustomerJob,
  createJobReview,
  disputeCustomerJob,
  publishCustomerJob,
} from "@/lib/api/customer";
import {
  formatBudgetRange,
  formatEtaMinutes,
  formatKarachiDate,
  formatKarachiDateTime,
  formatPakistaniPhoneDisplay,
  formatPkr,
} from "@/lib/customer/format";
import { sortOffers } from "@/lib/customer/offer-sort";
import type {
  AssignedProfessionalCardData,
  CustomerJobRow,
  JobEventItem,
  JobReviewItem,
  OfferSortBy,
  OfferWithProfessional,
} from "@/lib/customer/types";
import {
  CustomerDialog,
  JobStatusBadge,
  WakingServerBanner,
} from "@/components/customer/customer-dialog";

interface JobDetailClientProps {
  job: CustomerJobRow;
  offers: OfferWithProfessional[];
  events: JobEventItem[];
  assignedProfessional: AssignedProfessionalCardData | null;
  review: JobReviewItem | null;
}

const STAR_OPTIONS = [
  { value: 1, label: "1 star — Poor" },
  { value: 2, label: "2 stars — Fair" },
  { value: 3, label: "3 stars — Good" },
  { value: 4, label: "4 stars — Very good" },
  { value: 5, label: "5 stars — Excellent" },
];

function ProfessionalRatingBadge({
  ratingCount,
  avgRating,
}: {
  ratingCount: number;
  avgRating: number;
}) {
  if (ratingCount <= 0) {
    return (
      <span className="inline-flex items-center rounded-md border border-[#DCE8E0] bg-[#F4FAF6] px-2 py-0.5 text-[11px] font-semibold text-[#0F6B3E]">
        New
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
      <Star className="h-3 w-3 fill-amber-500 text-amber-500" aria-hidden="true" />
      <span>{avgRating.toFixed(1)}</span>
      <span className="text-amber-700">
        ({ratingCount} {ratingCount === 1 ? "review" : "reviews"})
      </span>
    </span>
  );
}

export function JobDetailClient({
  job,
  offers,
  events,
  assignedProfessional,
  review,
}: JobDetailClientProps) {
  const router = useRouter();

  const [sortBy, setSortBy] = useState<OfferSortBy>("price");
  const [wakingUp, setWakingUp] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Dialog states
  const [offerToAccept, setOfferToAccept] =
    useState<OfferWithProfessional | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  // Review form states
  const [rating, setRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState("");

  const sortedOffers = useMemo(
    () => sortOffers(offers, sortBy),
    [offers, sortBy]
  );

  const canCustomerCancel = ["Draft", "Open", "Offers received", "Assigned"].includes(
    job.status
  );
  const canAcceptOffers =
    job.status === "Open" || job.status === "Offers received";
  const canMarkCompleted = job.status === "In progress";
  const canOpenDispute =
    job.status === "Assigned" || job.status === "In progress";

  async function handlePublishDraft() {
    setErrorMessage(null);
    setStatusNotice(null);
    setBusyAction("publish");
    try {
      const res = await publishCustomerJob(job.id, { onWakingUp: setWakingUp });
      setStatusNotice(
        res.matchedProfessionals > 0
          ? `Job published and ${res.matchedProfessionals} matching professionals were notified.`
          : "Job published. Local professionals can now view and send offers."
      );
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not publish this draft."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleConfirmAcceptOffer() {
    if (!offerToAccept) return;
    setErrorMessage(null);
    setStatusNotice(null);
    setBusyAction(`accept-${offerToAccept.id}`);
    try {
      await acceptJobOffer(job.id, offerToAccept.id, { onWakingUp: setWakingUp });
      setOfferToAccept(null);
      setStatusNotice(
        `Offer from ${offerToAccept.professional_name} accepted. Contact details are now visible below.`
      );
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not accept this offer."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleConfirmCancelJob() {
    setErrorMessage(null);
    setStatusNotice(null);
    setBusyAction("cancel");
    try {
      await cancelCustomerJob(job.id, cancelReason, { onWakingUp: setWakingUp });
      setCancelDialogOpen(false);
      setCancelReason("");
      setStatusNotice("Job has been cancelled.");
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not cancel this job."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleConfirmCompleteJob() {
    setErrorMessage(null);
    setStatusNotice(null);
    setBusyAction("complete");
    try {
      await completeCustomerJob(job.id, { onWakingUp: setWakingUp });
      setCompleteDialogOpen(false);
      setStatusNotice("Job marked as completed. You can now leave a review below.");
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not complete this job."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleConfirmDisputeJob() {
    const cleanReason = disputeReason.trim();
    if (cleanReason.length < 10) {
      setErrorMessage("Please describe the problem in at least 10 characters.");
      return;
    }
    setErrorMessage(null);
    setStatusNotice(null);
    setBusyAction("dispute");
    try {
      await disputeCustomerJob(job.id, cleanReason, { onWakingUp: setWakingUp });
      setDisputeDialogOpen(false);
      setDisputeReason("");
      setStatusNotice(
        "Problem reported. Your job has been marked as Disputed for review."
      );
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not submit your dispute."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setStatusNotice(null);
    setBusyAction("review");
    try {
      await createJobReview(job.id, rating, reviewComment, {
        onWakingUp: setWakingUp,
      });
      setStatusNotice("Thank you! Your review has been submitted.");
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not submit your review."
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/jobs"
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
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {statusNotice && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-[#E6F4EA] px-4 py-3 text-xs font-medium text-[#0C2A1B]"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0F6B3E]" aria-hidden="true" />
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
                <Tag className="h-3.5 w-3.5 text-[#0F6B3E]" aria-hidden="true" />
                {job.category_name}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6A7B70]">
                <MapPin className="h-3.5 w-3.5 text-[#0F6B3E]" aria-hidden="true" />
                {job.area_name}
              </span>
            </div>

            <h1 className="text-lg font-extrabold tracking-tight text-[#0C2A1B] sm:text-xl">
              {job.title}
            </h1>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-[11px] font-medium text-[#6A7B70]">Estimated budget</p>
            <p className="text-sm font-extrabold text-[#0C2A1B]">
              {formatBudgetRange(job.budget_min, job.budget_max)}
            </p>
          </div>
        </div>

        <p className="whitespace-pre-line rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-4 text-xs leading-relaxed text-[#0C2A1B]">
          {job.description}
        </p>

        {job.status === "In progress" && job.professional_marked_done_at && (
          <div
            role="status"
            className="flex flex-col justify-between gap-3 rounded-xl border border-emerald-300 bg-[#E6F4EA] p-4 sm:flex-row sm:items-center"
          >
            <div className="flex items-start gap-2.5 text-xs text-[#0C2A1B]">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-[#0F6B3E]"
                aria-hidden="true"
              />
              <div>
                <p className="font-bold text-[#0C2A1B]">
                  Your professional marked the work as done. Please confirm if you are satisfied.
                </p>
                <p className="mt-0.5 text-[11px] text-[#34453B]">
                  Marked done on {formatKarachiDateTime(job.professional_marked_done_at)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DCE8E0] pt-4 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#6A7B70]">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              Created {formatKarachiDate(job.created_at)}
            </span>
            {job.expires_at &&
              (job.status === "Open" || job.status === "Offers received") && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Expires {formatKarachiDate(job.expires_at)}
                </span>
              )}
          </div>

          {/* Status Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {job.status === "Draft" && (
              <>
                <Link
                  href={`/dashboard/jobs/${job.id}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2 text-xs font-semibold text-[#0C2A1B] hover:bg-[#F4FAF6]"
                >
                  <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Edit draft</span>
                </Link>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => void handlePublishDraft()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F6B3E] px-4 py-2 text-xs font-semibold !text-white text-white hover:bg-[#0A4D2B] disabled:opacity-60"
                >
                  <Send className="h-3.5 w-3.5 !text-white text-white" aria-hidden="true" />
                  <span className="!text-white text-white">
                    {busyAction === "publish" ? "Publishing..." : "Publish job"}
                  </span>
                </button>
              </>
            )}

            {canMarkCompleted && (
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => setCompleteDialogOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F6B3E] px-4 py-2 text-xs font-semibold !text-white text-white hover:bg-[#0A4D2B] disabled:opacity-60"
              >
                <CheckCircle2 className="h-3.5 w-3.5 !text-white text-white" aria-hidden="true" />
                <span className="!text-white text-white">Mark as completed</span>
              </button>
            )}

            {canOpenDispute && (
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

            {canCustomerCancel && (
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => setCancelDialogOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Cancel job</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Assigned Professional Card (once an offer is accepted) */}
      {assignedProfessional && (
        <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
                Assigned Professional
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base font-bold text-[#0C2A1B]">
                  {assignedProfessional.full_name}
                </h2>
                <ProfessionalRatingBadge
                  ratingCount={assignedProfessional.rating_count}
                  avgRating={assignedProfessional.avg_rating_bayes}
                />
                <span className="text-xs text-[#6A7B70]">
                  {assignedProfessional.years_experience}{" "}
                  {assignedProfessional.years_experience === 1 ? "yr" : "yrs"} experience
                </span>
              </div>
              {assignedProfessional.bio && (
                <p className="max-w-2xl text-xs text-[#34453B]">
                  {assignedProfessional.bio}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {assignedProfessional.phone ? (
                <a
                  href={`tel:${assignedProfessional.phone}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-[#E6F4EA] px-3.5 py-2 text-xs font-bold text-[#0F6B3E] hover:bg-emerald-100"
                >
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{formatPakistaniPhoneDisplay(assignedProfessional.phone)}</span>
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
      )}

      {/* Review Section (when job is Completed) */}
      {job.status === "Completed" && (
        <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="border-b border-[#DCE8E0] pb-3">
            <h2 className="text-base font-bold text-[#0C2A1B]">
              {review ? "Your submitted review" : "Rate your experience"}
            </h2>
            <p className="text-xs text-[#6A7B70]">
              {review
                ? `Submitted on ${formatKarachiDateTime(review.created_at)}`
                : "Reviews help other customers in Lahore evaluate local professionals."}
            </p>
          </div>

          {review ? (
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
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmitReview(e)} className="space-y-4">
              <fieldset>
                <legend className="text-xs font-semibold text-[#0C2A1B]">
                  Select a rating (1 to 5 stars) <span className="text-red-600">*</span>
                </legend>
                <div
                  role="radiogroup"
                  aria-label="Star rating"
                  className="mt-2 flex flex-wrap items-center gap-2"
                >
                  {STAR_OPTIONS.map((opt) => {
                    const selected = rating === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition focus-within:ring-2 focus-within:ring-[#0F6B3E] ${
                          selected
                            ? "border-[#0F6B3E] bg-[#E6F4EA] text-[#0F6B3E]"
                            : "border-[#DCE8E0] bg-white text-[#34453B] hover:bg-[#F4FAF6]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="rating"
                          value={opt.value}
                          checked={selected}
                          onChange={() => setRating(opt.value)}
                          className="sr-only"
                        />
                        <Star
                          className={`h-3.5 w-3.5 ${
                            opt.value <= rating
                              ? "fill-amber-500 text-amber-500"
                              : "text-stone-300"
                          }`}
                          aria-hidden="true"
                        />
                        <span>{opt.value}</span>
                        <span className="sr-only">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="review-comment"
                    className="block text-xs font-semibold text-[#0C2A1B]"
                  >
                    Written feedback (optional)
                  </label>
                  <span className="text-[11px] text-[#6A7B70]">
                    {reviewComment.trim().length} / 1000
                  </span>
                </div>
                <textarea
                  id="review-comment"
                  rows={3}
                  maxLength={1000}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share how punctual, tidy, and helpful the professional was..."
                  className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 text-xs text-[#0C2A1B] placeholder:text-[#6A7B70] focus:border-[#0F6B3E] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={busyAction !== null}
                className="inline-flex items-center rounded-xl bg-[#0F6B3E] px-5 py-2.5 text-xs font-semibold !text-white text-white hover:bg-[#0A4D2B] disabled:opacity-60"
              >
                {busyAction === "review" ? "Submitting review..." : "Submit review"}
              </button>
            </form>
          )}
        </section>
      )}

      {/* Offers Section & Timeline */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Offers List */}
        <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs lg:col-span-7 space-y-4">
          <div className="flex flex-col justify-between gap-3 border-b border-[#DCE8E0] pb-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-bold text-[#0C2A1B]">
                Offers ({offers.length})
              </h2>
              <p className="text-xs text-[#6A7B70]">
                Prices are agreed directly with the professional; ProLink does not process payments.
              </p>
            </div>

            {offers.length > 1 && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="offer-sort"
                  className="text-xs font-semibold text-[#34453B]"
                >
                  Sort by:
                </label>
                <select
                  id="offer-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as OfferSortBy)}
                  className="rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] px-3 py-1.5 text-xs font-semibold text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
                >
                  <option value="price">Lowest price</option>
                  <option value="eta">Shortest arrival time</option>
                  <option value="rating">Highest rating</option>
                </select>
              </div>
            )}
          </div>

          {sortedOffers.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-xs font-semibold text-[#0C2A1B]">
                {job.status === "Draft"
                  ? "Publish your draft job to start receiving offers"
                  : "No offers received yet"}
              </p>
              <p className="mt-1 text-[11px] text-[#6A7B70]">
                {job.status === "Draft"
                  ? "Professionals cannot see draft jobs until you publish them."
                  : "Matching professionals in Lahore have been notified and their quotes will appear here."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedOffers.map((offer) => {
                const isAccepted = offer.status === "accepted";
                const isPending = offer.status === "pending";

                return (
                  <article
                    key={offer.id}
                    className={`rounded-xl border p-4 transition ${
                      isAccepted
                        ? "border-[#0F6B3E] bg-[#E6F4EA]/40"
                        : "border-[#DCE8E0] bg-[#F8FBF9]"
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-[#0C2A1B]">
                            {offer.professional_name}
                          </h3>
                          <ProfessionalRatingBadge
                            ratingCount={offer.rating_count}
                            avgRating={offer.avg_rating_bayes}
                          />
                          <span className="text-[11px] text-[#6A7B70]">
                            {offer.years_experience}{" "}
                            {offer.years_experience === 1 ? "yr" : "yrs"} exp
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#34453B]">
                          <span>
                            Arrival: <strong>{formatEtaMinutes(offer.eta_minutes)}</strong>
                          </span>
                          <span>
                            Inspection fee:{" "}
                            <strong>
                              {offer.inspection_fee > 0
                                ? formatPkr(offer.inspection_fee)
                                : "None"}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-base font-extrabold text-[#0F6B3E]">
                          {formatPkr(offer.price)}
                        </p>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            isAccepted
                              ? "bg-[#0F6B3E] !text-white text-white"
                              : isPending
                                ? "bg-amber-100 text-amber-800"
                                : "bg-stone-200 text-stone-700"
                          }`}
                        >
                          {offer.status}
                        </span>
                      </div>
                    </div>

                    {offer.message && (
                      <p className="mt-2.5 rounded-lg border border-[#DCE8E0] bg-white p-3 text-xs text-[#0C2A1B]">
                        {offer.message}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between text-[11px] text-[#6A7B70]">
                      <span>Sent {formatKarachiDateTime(offer.created_at)}</span>

                      {canAcceptOffers && isPending && (
                        <button
                          type="button"
                          disabled={busyAction !== null}
                          onClick={() => setOfferToAccept(offer)}
                          className="rounded-xl bg-[#0F6B3E] px-3.5 py-1.5 text-xs font-semibold !text-white text-white transition hover:bg-[#0A4D2B] disabled:opacity-60"
                        >
                          Accept offer
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Job Events Timeline */}
        <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs lg:col-span-5 space-y-4">
          <div className="border-b border-[#DCE8E0] pb-3">
            <h2 className="text-base font-bold text-[#0C2A1B]">
              Status timeline
            </h2>
            <p className="text-xs text-[#6A7B70]">
              Recorded history from job creation to completion
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

      {/* Confirmation Dialog: Accept Offer */}
      <CustomerDialog
        open={offerToAccept !== null}
        title="Accept this offer?"
        description="Accepting this offer assigns the professional to your job and declines any other pending offers."
        onClose={() => setOfferToAccept(null)}
      >
        {offerToAccept && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-4 space-y-1.5">
              <p className="font-bold text-[#0C2A1B]">
                {offerToAccept.professional_name}
              </p>
              <p className="text-[#34453B]">
                Quoted price: <strong>{formatPkr(offerToAccept.price)}</strong>{" "}
                (Inspection fee:{" "}
                {offerToAccept.inspection_fee > 0
                  ? formatPkr(offerToAccept.inspection_fee)
                  : "None"}
                )
              </p>
              <p className="text-[#34453B]">
                Estimated arrival:{" "}
                <strong>{formatEtaMinutes(offerToAccept.eta_minutes)}</strong>
              </p>
            </div>

            <p className="text-[11px] text-[#6A7B70]">
              Prices are agreed directly with the professional. Once accepted, you will see the professional&apos;s phone number on this page.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOfferToAccept(null)}
                className="rounded-xl border border-[#DCE8E0] bg-white px-4 py-2 font-semibold text-[#34453B] hover:bg-[#F4FAF6]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleConfirmAcceptOffer()}
                className="rounded-xl bg-[#0F6B3E] px-4 py-2 font-semibold !text-white text-white hover:bg-[#0A4D2B] disabled:opacity-60"
              >
                {busyAction?.startsWith("accept-")
                  ? "Accepting..."
                  : "Confirm & accept"}
              </button>
            </div>
          </div>
        )}
      </CustomerDialog>

      {/* Confirmation Dialog: Cancel Job */}
      <CustomerDialog
        open={cancelDialogOpen}
        title="Cancel this job?"
        description="Pending offers will be declined and any assigned professional will be notified."
        onClose={() => setCancelDialogOpen(false)}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label
              htmlFor="cancel-reason"
              className="block font-semibold text-[#0C2A1B]"
            >
              Reason for cancellation (optional)
            </label>
            <textarea
              id="cancel-reason"
              rows={3}
              maxLength={500}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Issue resolved or scheduling changed..."
              className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-white p-3 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCancelDialogOpen(false)}
              className="rounded-xl border border-[#DCE8E0] bg-white px-4 py-2 font-semibold text-[#34453B] hover:bg-[#F4FAF6]"
            >
              Keep job
            </button>
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => void handleConfirmCancelJob()}
              className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busyAction === "cancel" ? "Cancelling..." : "Cancel job"}
            </button>
          </div>
        </div>
      </CustomerDialog>

      {/* Confirmation Dialog: Mark Completed */}
      <CustomerDialog
        open={completeDialogOpen}
        title="Confirm work completion?"
        description="Mark this job as completed once the professional has finished the work."
        onClose={() => setCompleteDialogOpen(false)}
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#34453B]">
            After confirming completion, you will be able to leave a 1–5 star review for the professional.
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCompleteDialogOpen(false)}
              className="rounded-xl border border-[#DCE8E0] bg-white px-4 py-2 font-semibold text-[#34453B] hover:bg-[#F4FAF6]"
            >
              Not yet
            </button>
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => void handleConfirmCompleteJob()}
              className="rounded-xl bg-[#0F6B3E] px-4 py-2 font-semibold !text-white text-white hover:bg-[#0A4D2B] disabled:opacity-60"
            >
              {busyAction === "complete"
                ? "Confirming..."
                : "Yes, mark completed"}
            </button>
          </div>
        </div>
      </CustomerDialog>

      {/* Confirmation Dialog: Report a Problem (Dispute) */}
      <CustomerDialog
        open={disputeDialogOpen}
        title="Report a problem with this job"
        description="Describe what went wrong so an administrator can review the job."
        onClose={() => setDisputeDialogOpen(false)}
      >
        <div className="space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="dispute-reason"
                className="block font-semibold text-[#0C2A1B]"
              >
                Problem details (at least 10 characters){" "}
                <span className="text-red-600">*</span>
              </label>
              <span className="text-[11px] text-[#6A7B70]">
                {disputeReason.trim().length} / 1000
              </span>
            </div>
            <textarea
              id="dispute-reason"
              rows={4}
              maxLength={1000}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Explain the issue with the work or attendance in detail..."
              className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-white p-3 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDisputeDialogOpen(false)}
              className="rounded-xl border border-[#DCE8E0] bg-white px-4 py-2 font-semibold text-[#34453B] hover:bg-[#F4FAF6]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busyAction !== null || disputeReason.trim().length < 10}
              onClick={() => void handleConfirmDisputeJob()}
              className="rounded-xl bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {busyAction === "dispute" ? "Submitting..." : "Submit dispute"}
            </button>
          </div>
        </div>
      </CustomerDialog>
    </div>
  );
}
