"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Edit3,
  FileText,
  MapPin,
  Tag,
  Trash2,
} from "lucide-react";
import {
  updateProfessionalOffer,
  withdrawProfessionalOffer,
} from "@/lib/api/professional";
import {
  formatEtaMinutes,
  formatKarachiDateTime,
  formatPkr,
} from "@/lib/customer/format";
import type { OfferStatus, ProfessionalOfferRow } from "@/lib/pro/types";
import {
  CustomerDialog,
  JobStatusBadge,
  WakingServerBanner,
} from "@/components/customer/customer-dialog";

const TABS: { key: OfferStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Declined" },
  { key: "withdrawn", label: "Withdrawn" },
];

export function OffersClient({
  initialOffers,
  initialTab = "pending",
}: {
  initialOffers: ProfessionalOfferRow[];
  initialTab?: OfferStatus;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<OfferStatus>(initialTab);
  const [wakingUp, setWakingUp] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Edit dialog state
  const [editingOffer, setEditingOffer] =
    useState<ProfessionalOfferRow | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [inspectionFeeInput, setInspectionFeeInput] = useState("0");
  const [etaMinutesInput, setEtaMinutesInput] = useState("60");
  const [messageInput, setMessageInput] = useState("");

  // Withdraw dialog state
  const [withdrawingOffer, setWithdrawingOffer] =
    useState<ProfessionalOfferRow | null>(null);

  const tabCounts = {
    pending: initialOffers.filter((o) => o.status === "pending").length,
    accepted: initialOffers.filter((o) => o.status === "accepted").length,
    rejected: initialOffers.filter((o) => o.status === "rejected").length,
    withdrawn: initialOffers.filter((o) => o.status === "withdrawn").length,
  };

  const visibleOffers = initialOffers.filter((o) => o.status === activeTab);

  function openEditDialog(offer: ProfessionalOfferRow) {
    setErrorMessage(null);
    setStatusNotice(null);
    setEditingOffer(offer);
    setPriceInput(String(offer.price));
    setInspectionFeeInput(String(offer.inspection_fee));
    setEtaMinutesInput(String(offer.eta_minutes));
    setMessageInput(offer.message ?? "");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingOffer) return;

    const price = Number(priceInput);
    const inspectionFee =
      inspectionFeeInput.trim() === "" ? 0 : Number(inspectionFeeInput);
    const etaMinutes = Math.round(Number(etaMinutesInput));
    const cleanMessage = messageInput.trim();

    if (!Number.isFinite(price) || price <= 0 || price > 10_000_000) {
      setErrorMessage(
        "Price must be greater than PKR 0 and at most PKR 10,000,000."
      );
      return;
    }
    if (
      !Number.isFinite(inspectionFee) ||
      inspectionFee < 0 ||
      inspectionFee > 100_000
    ) {
      setErrorMessage("Inspection fee must be between PKR 0 and PKR 100,000.");
      return;
    }
    if (
      !Number.isFinite(etaMinutes) ||
      etaMinutes < 10 ||
      etaMinutes > 10_080
    ) {
      setErrorMessage(
        "Arrival time must be between 10 and 10,080 minutes (7 days)."
      );
      return;
    }
    if (cleanMessage.length > 500) {
      setErrorMessage("Message cannot exceed 500 characters.");
      return;
    }

    setBusyAction(`edit-${editingOffer.id}`);
    setErrorMessage(null);
    try {
      await updateProfessionalOffer(
        editingOffer.id,
        {
          price,
          inspectionFee,
          etaMinutes,
          message: cleanMessage || null,
        },
        { onWakingUp: setWakingUp }
      );
      setEditingOffer(null);
      setStatusNotice("Your pending offer was updated.");
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
    if (!withdrawingOffer) return;
    setBusyAction(`withdraw-${withdrawingOffer.id}`);
    setErrorMessage(null);
    try {
      await withdrawProfessionalOffer(withdrawingOffer.id, {
        onWakingUp: setWakingUp,
      });
      setWithdrawingOffer(null);
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
    <div className="space-y-5">
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

      {/* Status Tabs */}
      <div
        role="tablist"
        aria-label="Filter offers by status"
        className="flex flex-wrap gap-2 rounded-2xl border border-[#DCE8E0] bg-white p-2 shadow-2xs"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const count = tabCounts[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                active
                  ? "bg-[#0F6B3E] !text-white text-white shadow-2xs"
                  : "text-[#34453B] hover:bg-[#F4FAF6] hover:text-[#0C2A1B]"
              }`}
            >
              <span className={active ? "!text-white text-white" : ""}>
                {tab.label}
              </span>
              <span
                className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  active
                    ? "bg-white/20 !text-white text-white"
                    : "bg-[#F4FAF6] text-[#0F6B3E]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Offers List */}
      {visibleOffers.length === 0 ? (
        <div className="rounded-2xl border border-[#DCE8E0] bg-white p-10 text-center shadow-2xs">
          <FileText
            className="mx-auto h-8 w-8 text-[#6A7B70]"
            aria-hidden="true"
          />
          <h2 className="mt-3 text-sm font-bold text-[#0C2A1B]">
            No{" "}
            {activeTab === "rejected"
              ? "declined"
              : activeTab}{" "}
            offers
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-[#6A7B70]">
            {activeTab === "pending"
              ? "Browse open customer jobs in Lahore and send quotes to see them here."
              : "Offers in this status will appear here."}
          </p>
          {activeTab === "pending" && (
            <Link
              href="/pro/opportunities"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#0F6B3E] px-4 py-2 text-xs font-semibold !text-white text-white hover:bg-[#0A4D2B]"
            >
              <span className="!text-white text-white">
                Browse opportunities
              </span>
              <ArrowRight
                className="h-3.5 w-3.5 !text-white text-white"
                aria-hidden="true"
              />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleOffers.map((offer) => {
            const canModify =
              offer.status === "pending" &&
              (offer.job_status === "Open" ||
                offer.job_status === "Offers received");

            const targetHref =
              offer.status === "accepted"
                ? `/pro/jobs/${offer.job_id}`
                : `/pro/opportunities/${offer.job_id}`;

            return (
              <article
                key={offer.id}
                className="rounded-2xl border border-[#DCE8E0] bg-white p-5 shadow-2xs space-y-3"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                          offer.status === "accepted"
                            ? "bg-[#0F6B3E] !text-white text-white"
                            : offer.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-stone-200 text-stone-700"
                        }`}
                      >
                        {offer.status === "rejected"
                          ? "Declined"
                          : offer.status}
                      </span>
                      <JobStatusBadge status={offer.job_status} />
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6A7B70]">
                        <Tag
                          className="h-3.5 w-3.5 text-[#0F6B3E]"
                          aria-hidden="true"
                        />
                        {offer.category_name}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6A7B70]">
                        <MapPin
                          className="h-3.5 w-3.5 text-[#0F6B3E]"
                          aria-hidden="true"
                        />
                        {offer.area_name}
                      </span>
                    </div>

                    <h2 className="text-base font-extrabold text-[#0C2A1B]">
                      <Link
                        href={targetHref}
                        className="hover:text-[#0F6B3E]"
                      >
                        {offer.job_title}
                      </Link>
                    </h2>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#34453B]">
                      <span>
                        Quoted price:{" "}
                        <strong className="text-[#0F6B3E]">
                          {formatPkr(offer.price)}
                        </strong>
                      </span>
                      <span>
                        Inspection fee:{" "}
                        <strong>
                          {offer.inspection_fee > 0
                            ? formatPkr(offer.inspection_fee)
                            : "None (PKR 0)"}
                        </strong>
                      </span>
                      <span>
                        Arrival:{" "}
                        <strong>{formatEtaMinutes(offer.eta_minutes)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-base font-extrabold text-[#0F6B3E]">
                      {formatPkr(offer.price)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#6A7B70]">
                      Sent {formatKarachiDateTime(offer.created_at)}
                    </p>
                  </div>
                </div>

                {offer.message && (
                  <p className="rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-3 text-xs text-[#0C2A1B]">
                    {offer.message}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DCE8E0] pt-3 text-xs">
                  <Link
                    href={targetHref}
                    className="inline-flex items-center gap-1 font-semibold text-[#0F6B3E] hover:underline"
                  >
                    <span>
                      {offer.status === "accepted"
                        ? "Open assigned job"
                        : "View job details"}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>

                  {canModify && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => openEditDialog(offer)}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#DCE8E0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0C2A1B] hover:bg-[#F4FAF6]"
                      >
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => setWithdrawingOffer(offer)}
                        className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Withdraw</span>
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Edit Offer Modal */}
      <CustomerDialog
        open={editingOffer !== null}
        title="Edit pending offer"
        description={
          editingOffer
            ? `Update your quote for "${editingOffer.job_title}".`
            : undefined
        }
        onClose={() => setEditingOffer(null)}
      >
        {editingOffer && (
          <form onSubmit={(e) => void handleSaveEdit(e)} className="space-y-4">
            <div>
              <label
                htmlFor="modal-offer-price"
                className="block text-xs font-semibold text-[#0C2A1B]"
              >
                Quoted price (PKR) <span className="text-red-600">*</span>
              </label>
              <input
                id="modal-offer-price"
                type="number"
                required
                min={1}
                max={10000000}
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2 text-xs text-[#0C2A1B]"
              />
            </div>

            <div>
              <label
                htmlFor="modal-offer-fee"
                className="block text-xs font-semibold text-[#0C2A1B]"
              >
                Inspection fee (PKR) <span className="text-red-600">*</span>
              </label>
              <input
                id="modal-offer-fee"
                type="number"
                required
                min={0}
                max={100000}
                value={inspectionFeeInput}
                onChange={(e) => setInspectionFeeInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2 text-xs text-[#0C2A1B]"
              />
            </div>

            <div>
              <label
                htmlFor="modal-offer-eta"
                className="block text-xs font-semibold text-[#0C2A1B]"
              >
                Arrival time (minutes) <span className="text-red-600">*</span>
              </label>
              <input
                id="modal-offer-eta"
                type="number"
                required
                min={10}
                max={10080}
                value={etaMinutesInput}
                onChange={(e) => setEtaMinutesInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2 text-xs text-[#0C2A1B]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="modal-offer-msg"
                  className="block text-xs font-semibold text-[#0C2A1B]"
                >
                  Message (optional)
                </label>
                <span className="text-[11px] text-[#6A7B70]">
                  {messageInput.length} / 500
                </span>
              </div>
              <textarea
                id="modal-offer-msg"
                rows={3}
                maxLength={500}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2 text-xs text-[#0C2A1B]"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingOffer(null)}
                className="rounded-xl border border-[#DCE8E0] bg-white px-4 py-2 text-xs font-semibold text-[#0C2A1B]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyAction !== null}
                className="rounded-xl bg-[#0F6B3E] px-4 py-2 text-xs font-semibold !text-white text-white hover:bg-[#0A4D2B] disabled:opacity-60"
              >
                {busyAction ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </CustomerDialog>

      {/* Withdraw Offer Modal */}
      <CustomerDialog
        open={withdrawingOffer !== null}
        title="Withdraw your offer?"
        description="Once you withdraw an offer on a job, you cannot submit another offer for the same job."
        onClose={() => setWithdrawingOffer(null)}
      >
        {withdrawingOffer && (
          <div className="space-y-4 text-xs">
            <p className="text-[#34453B]">
              Withdraw your quote of{" "}
              <strong>{formatPkr(withdrawingOffer.price)}</strong> for{" "}
              <strong>{withdrawingOffer.job_title}</strong>?
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setWithdrawingOffer(null)}
                className="rounded-xl border border-[#DCE8E0] bg-white px-4 py-2 font-semibold text-[#0C2A1B]"
              >
                Keep offer
              </button>
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleConfirmWithdraw()}
                className="rounded-xl bg-red-600 px-4 py-2 font-semibold !text-white text-white hover:bg-red-700 disabled:opacity-60"
              >
                {busyAction ? "Withdrawing..." : "Confirm withdraw"}
              </button>
            </div>
          </div>
        )}
      </CustomerDialog>
    </div>
  );
}
