"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Info,
  MapPin,
  Send,
  Shield,
  Tag,
  Trash2,
  User,
  Users,
} from "lucide-react";
import {
  submitProfessionalOffer,
  updateProfessionalOffer,
  withdrawProfessionalOffer,
} from "@/lib/api/professional";
import {
  formatBudgetRange,
  formatEtaMinutes,
  formatKarachiDate,
  formatKarachiDateTime,
  formatPkr,
} from "@/lib/customer/format";
import type { OpportunityJobRow } from "@/lib/pro/types";
import {
  CustomerDialog,
  JobStatusBadge,
  WakingServerBanner,
} from "@/components/customer/customer-dialog";

interface OpportunityDetailClientProps {
  opportunity: OpportunityJobRow;
  hasMatchingCategory: boolean;
  isJobOpen: boolean;
}

export function OpportunityDetailClient({
  opportunity,
  hasMatchingCategory,
  isJobOpen,
}: OpportunityDetailClientProps) {
  const router = useRouter();
  const existingOffer = opportunity.my_offer;

  const [isEditingOffer, setIsEditingOffer] = useState(false);
  const [priceInput, setPriceInput] = useState<string>(
    existingOffer ? String(existingOffer.price) : ""
  );
  const [inspectionFeeInput, setInspectionFeeInput] = useState<string>(
    existingOffer ? String(existingOffer.inspection_fee) : "0"
  );
  const [etaMinutesInput, setEtaMinutesInput] = useState<string>(
    existingOffer ? String(existingOffer.eta_minutes) : "60"
  );
  const [messageInput, setMessageInput] = useState<string>(
    existingOffer?.message ?? ""
  );

  const [wakingUp, setWakingUp] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);

  const parsedEta = Number(etaMinutesInput);
  const friendlyEta =
    Number.isFinite(parsedEta) && parsedEta >= 10 && parsedEta <= 10080
      ? formatEtaMinutes(Math.round(parsedEta))
      : null;

  function validateOfferInputs(): {
    price: number;
    inspectionFee: number;
    etaMinutes: number;
    message: string | null;
  } | null {
    const price = Number(priceInput);
    if (!Number.isFinite(price) || price <= 0 || price > 10_000_000) {
      setErrorMessage(
        "Quoted price must be greater than PKR 0 and at most PKR 10,000,000."
      );
      return null;
    }

    const inspectionFee =
      inspectionFeeInput.trim() === "" ? 0 : Number(inspectionFeeInput);
    if (
      !Number.isFinite(inspectionFee) ||
      inspectionFee < 0 ||
      inspectionFee > 100_000
    ) {
      setErrorMessage(
        "Inspection fee must be between PKR 0 and PKR 100,000."
      );
      return null;
    }

    const etaMinutes = Math.round(Number(etaMinutesInput));
    if (
      !Number.isFinite(etaMinutes) ||
      etaMinutes < 10 ||
      etaMinutes > 10_080
    ) {
      setErrorMessage(
        "Estimated arrival time must be between 10 and 10,080 minutes (7 days)."
      );
      return null;
    }

    const cleanMessage = messageInput.trim();
    if (cleanMessage.length > 500) {
      setErrorMessage("Offer message cannot exceed 500 characters.");
      return null;
    }

    return {
      price,
      inspectionFee,
      etaMinutes,
      message: cleanMessage.length > 0 ? cleanMessage : null,
    };
  }

  async function handleSubmitNewOffer(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setStatusNotice(null);

    const valid = validateOfferInputs();
    if (!valid) return;

    setBusyAction("submit");
    try {
      await submitProfessionalOffer(opportunity.id, valid, {
        onWakingUp: setWakingUp,
      });
      setStatusNotice(
        "Your offer has been sent to the customer! You will be notified if they accept."
      );
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not send your offer."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleUpdateOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!existingOffer) return;
    setErrorMessage(null);
    setStatusNotice(null);

    const valid = validateOfferInputs();
    if (!valid) return;

    setBusyAction("update");
    try {
      await updateProfessionalOffer(existingOffer.id, valid, {
        onWakingUp: setWakingUp,
      });
      setIsEditingOffer(false);
      setStatusNotice("Your pending offer has been updated.");
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not update your offer."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleConfirmWithdraw() {
    if (!existingOffer) return;
    setErrorMessage(null);
    setStatusNotice(null);
    setBusyAction("withdraw");
    try {
      await withdrawProfessionalOffer(existingOffer.id, {
        onWakingUp: setWakingUp,
      });
      setWithdrawDialogOpen(false);
      setIsEditingOffer(false);
      setStatusNotice("Your offer has been withdrawn.");
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not withdraw your offer."
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/pro/opportunities"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#34453B] hover:text-[#0F6B3E]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to Opportunities</span>
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

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Opportunity Job Details */}
        <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs lg:col-span-7 space-y-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <JobStatusBadge status={opportunity.status} />
                {opportunity.urgency === "urgent" && (
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    Urgent
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6A7B70]">
                  <Tag
                    className="h-3.5 w-3.5 text-[#0F6B3E]"
                    aria-hidden="true"
                  />
                  {opportunity.category_name}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6A7B70]">
                  <MapPin
                    className="h-3.5 w-3.5 text-[#0F6B3E]"
                    aria-hidden="true"
                  />
                  {opportunity.area_name}
                </span>
              </div>

              <h1 className="text-lg font-extrabold tracking-tight text-[#0C2A1B] sm:text-xl">
                {opportunity.title}
              </h1>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-[11px] font-medium text-[#6A7B70]">
                Customer budget
              </p>
              <p className="text-sm font-extrabold text-[#0C2A1B]">
                {formatBudgetRange(
                  opportunity.budget_min,
                  opportunity.budget_max
                )}
              </p>
            </div>
          </div>

          <p className="whitespace-pre-line rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-4 text-xs leading-relaxed text-[#0C2A1B]">
            {opportunity.description}
          </p>

          <div className="grid gap-3 rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-4 sm:grid-cols-3 text-xs">
            <div>
              <span className="text-[11px] font-medium text-[#6A7B70] block">
                Posted by
              </span>
              <span className="mt-0.5 inline-flex items-center gap-1.5 font-bold text-[#0C2A1B]">
                <User
                  className="h-3.5 w-3.5 text-[#0F6B3E]"
                  aria-hidden="true"
                />
                {opportunity.customer_first_name}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-[#6A7B70] block">
                Competition
              </span>
              <span className="mt-0.5 inline-flex items-center gap-1.5 font-bold text-[#0C2A1B]">
                <Users
                  className="h-3.5 w-3.5 text-[#0F6B3E]"
                  aria-hidden="true"
                />
                {opportunity.active_offer_count}{" "}
                {opportunity.active_offer_count === 1 ? "offer" : "offers"} so
                far
              </span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-[#6A7B70] block">
                Contact privacy
              </span>
              <span className="mt-0.5 inline-flex items-center gap-1.5 font-semibold text-[#34453B]">
                <Shield
                  className="h-3.5 w-3.5 text-[#0F6B3E]"
                  aria-hidden="true"
                />
                Shared after acceptance
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-[#DCE8E0] pt-3.5 text-[11px] text-[#6A7B70]">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              Posted {formatKarachiDate(opportunity.created_at)}
            </span>
            {opportunity.expires_at && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Expires {formatKarachiDate(opportunity.expires_at)}
              </span>
            )}
          </div>
        </section>

        {/* Right: Offer Form or Existing Offer */}
        <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs lg:col-span-5 space-y-4">
          {existingOffer && !isEditingOffer ? (
            /* Existing Offer View */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#DCE8E0] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#0C2A1B]">
                    Your submitted offer
                  </h2>
                  <p className="text-xs text-[#6A7B70]">
                    Sent on {formatKarachiDateTime(existingOffer.created_at)}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                    existingOffer.status === "accepted"
                      ? "bg-[#0F6B3E] !text-white text-white"
                      : existingOffer.status === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-stone-200 text-stone-700"
                  }`}
                >
                  {existingOffer.status === "rejected"
                    ? "Declined"
                    : existingOffer.status}
                </span>
              </div>

              <div className="rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#6A7B70]">Quoted price</span>
                  <span className="text-base font-extrabold text-[#0F6B3E]">
                    {formatPkr(existingOffer.price)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6A7B70]">Inspection fee</span>
                  <span className="font-bold text-[#0C2A1B]">
                    {existingOffer.inspection_fee > 0
                      ? formatPkr(existingOffer.inspection_fee)
                      : "None (PKR 0)"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6A7B70]">Estimated arrival</span>
                  <span className="font-bold text-[#0C2A1B]">
                    {formatEtaMinutes(existingOffer.eta_minutes)} (
                    {existingOffer.eta_minutes} mins)
                  </span>
                </div>
                {existingOffer.message && (
                  <div className="border-t border-[#DCE8E0] pt-2.5">
                    <span className="text-[11px] font-semibold text-[#6A7B70] block">
                      Message to customer
                    </span>
                    <p className="mt-1 whitespace-pre-line text-[#0C2A1B]">
                      {existingOffer.message}
                    </p>
                  </div>
                )}
              </div>

              {existingOffer.status === "accepted" && (
                <div className="rounded-xl border border-emerald-200 bg-[#E6F4EA] p-3.5 text-xs text-[#0C2A1B]">
                  <p className="font-bold text-[#0F6B3E]">
                    Customer accepted your offer!
                  </p>
                  <p className="mt-1 text-[11px] text-[#34453B]">
                    Open the assigned job page to view customer contact details
                    and start work.
                  </p>
                  <Link
                    href={`/pro/jobs/${opportunity.id}`}
                    className="mt-2.5 inline-flex items-center rounded-xl bg-[#0F6B3E] px-3.5 py-2 text-xs font-semibold !text-white text-white hover:bg-[#0A4D2B]"
                  >
                    Go to assigned job
                  </Link>
                </div>
              )}

              {existingOffer.status === "withdrawn" && (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-xs text-stone-700">
                  You withdrew this offer. Withdrawn offers cannot be
                  resubmitted for the same job.
                </div>
              )}

              {existingOffer.status === "pending" && isJobOpen && (
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => {
                      setPriceInput(String(existingOffer.price));
                      setInspectionFeeInput(
                        String(existingOffer.inspection_fee)
                      );
                      setEtaMinutesInput(String(existingOffer.eta_minutes));
                      setMessageInput(existingOffer.message ?? "");
                      setIsEditingOffer(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE8E0] bg-white px-4 py-2 text-xs font-semibold text-[#0C2A1B] hover:bg-[#F4FAF6]"
                  >
                    <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Edit offer</span>
                  </button>

                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => setWithdrawDialogOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Withdraw offer</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Submit or Edit Offer Form */
            <div className="space-y-4">
              <div className="border-b border-[#DCE8E0] pb-3">
                <h2 className="text-base font-bold text-[#0C2A1B]">
                  {isEditingOffer ? "Edit your pending offer" : "Send an offer"}
                </h2>
                <p className="mt-0.5 text-xs text-[#6A7B70]">
                  Quote clearly. The customer sees your price, inspection fee,
                  and arrival time. Your phone number and the customer&apos;s
                  phone number are shared only after the customer accepts.
                </p>
              </div>

              {!hasMatchingCategory && !isEditingOffer && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <Info
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-bold">Category not in your profile</p>
                    <p className="mt-0.5 text-[11px]">
                      This job requires <strong>{opportunity.category_name}</strong>. Add it in{" "}
                      <Link
                        href="/pro/profile"
                        className="font-semibold underline"
                      >
                        your profile
                      </Link>{" "}
                      before sending an offer.
                    </p>
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) =>
                  void (isEditingOffer
                    ? handleUpdateOffer(e)
                    : handleSubmitNewOffer(e))
                }
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="offer-price"
                    className="block text-xs font-semibold text-[#0C2A1B]"
                  >
                    Quoted price (PKR) <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="offer-price"
                    type="number"
                    required
                    min={1}
                    max={10000000}
                    step="1"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder="e.g. 2500"
                    className="mt-1 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-[#6A7B70]">
                    Agreed directly with the customer (PKR 1 to 10,000,000).
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="offer-inspection"
                    className="block text-xs font-semibold text-[#0C2A1B]"
                  >
                    Inspection fee (PKR) <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="offer-inspection"
                    type="number"
                    required
                    min={0}
                    max={100000}
                    step="1"
                    value={inspectionFeeInput}
                    onChange={(e) => setInspectionFeeInput(e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-[#6A7B70]">
                    Enter 0 for free inspection (maximum PKR 100,000).
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="offer-eta"
                      className="block text-xs font-semibold text-[#0C2A1B]"
                    >
                      Estimated arrival time (minutes){" "}
                      <span className="text-red-600">*</span>
                    </label>
                    {friendlyEta && (
                      <span className="text-[11px] font-bold text-[#0F6B3E]">
                        ≈ {friendlyEta}
                      </span>
                    )}
                  </div>
                  <input
                    id="offer-eta"
                    type="number"
                    required
                    min={10}
                    max={10080}
                    step="5"
                    value={etaMinutesInput}
                    onChange={(e) => setEtaMinutesInput(e.target.value)}
                    placeholder="60"
                    className="mt-1 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-[#6A7B70]">
                    Between 10 minutes and 10,080 minutes (7 days).
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="offer-message"
                      className="block text-xs font-semibold text-[#0C2A1B]"
                    >
                      Message to customer (optional)
                    </label>
                    <span className="text-[11px] text-[#6A7B70]">
                      {messageInput.length} / 500
                    </span>
                  </div>
                  <textarea
                    id="offer-message"
                    rows={3}
                    maxLength={500}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Explain what is included in your quote, tools you will bring, or when you can arrive..."
                    className="mt-1 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 text-xs text-[#0C2A1B] placeholder:text-[#6A7B70] focus:border-[#0F6B3E] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="submit"
                    disabled={busyAction !== null || !isJobOpen}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F6B3E] px-5 py-2.5 text-xs font-semibold !text-white text-white hover:bg-[#0A4D2B] disabled:opacity-60"
                  >
                    <Send
                      className="h-3.5 w-3.5 !text-white text-white"
                      aria-hidden="true"
                    />
                    <span className="!text-white text-white">
                      {busyAction === "submit" || busyAction === "update"
                        ? "Saving offer..."
                        : isEditingOffer
                          ? "Save changes"
                          : "Send offer"}
                    </span>
                  </button>

                  {isEditingOffer && (
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => {
                        setIsEditingOffer(false);
                        setErrorMessage(null);
                      }}
                      className="rounded-xl border border-[#DCE8E0] bg-white px-4 py-2.5 text-xs font-semibold text-[#0C2A1B] hover:bg-[#F4FAF6]"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </section>
      </div>

      {/* Withdraw Offer Confirmation Dialog */}
      <CustomerDialog
        open={withdrawDialogOpen}
        title="Withdraw your offer?"
        description="Once you withdraw an offer on a job, you cannot submit another offer for the same job."
        onClose={() => setWithdrawDialogOpen(false)}
      >
        <div className="space-y-4 text-xs">
          <p className="text-[#34453B]">
            Are you sure you want to withdraw your quote of{" "}
            <strong>{formatPkr(existingOffer?.price)}</strong> for{" "}
            <strong>{opportunity.title}</strong>?
          </p>
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => setWithdrawDialogOpen(false)}
              className="rounded-xl border border-[#DCE8E0] bg-white px-4 py-2 font-semibold text-[#0C2A1B] hover:bg-[#F4FAF6]"
            >
              Keep offer
            </button>
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => void handleConfirmWithdraw()}
              className="rounded-xl bg-red-600 px-4 py-2 font-semibold !text-white text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busyAction === "withdraw"
                ? "Withdrawing..."
                : "Confirm withdraw"}
            </button>
          </div>
        </div>
      </CustomerDialog>
    </div>
  );
}
