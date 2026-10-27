"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, MessageSquareLock } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fetchAdminJobDetail } from "@/lib/admin/queries";
import { resolveDisputedJob } from "@/lib/api/admin";
import type {
  AdminChatMessageRow,
  AdminJobEventRow,
  AdminJobRow,
  AdminOfferRow,
} from "@/lib/admin/types";
import { AdminDialog } from "@/components/admin/admin-dialog";

export default function AdminDisputeDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  const [job, setJob] = useState<AdminJobRow | null>(null);
  const [offers, setOffers] = useState<AdminOfferRow[]>([]);
  const [events, setEvents] = useState<AdminJobEventRow[]>([]);
  const [messages, setMessages] = useState<AdminChatMessageRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [outcome, setOutcome] = useState<"completed" | "cancelled">("completed");
  const [note, setNote] = useState("");
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const loadDispute = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const detail = await fetchAdminJobDetail(supabase, jobId);
      setJob(detail.job);
      setOffers(detail.offers);
      setEvents(detail.events);
      setMessages(detail.messages);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dispute case."
      );
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDispute();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadDispute]);

  async function handleConfirmResolve() {
    const trimmed = note.trim();
    if (trimmed.length < 10) {
      setResolveError("Resolution note must be at least 10 characters.");
      return;
    }

    setResolving(true);
    setResolveError(null);
    try {
      const res = await resolveDisputedJob(jobId, outcome, trimmed);
      setFeedback(
        `Dispute resolved as "${res.outcome}" (${res.previousStatus} → ${res.newStatus}).`
      );
      setResolveModalOpen(false);
      await loadDispute();
    } catch (err) {
      setResolveError(
        err instanceof Error ? err.message : "Failed to resolve dispute."
      );
    } finally {
      setResolving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-[#6A7B70]">
        Loading dispute investigation...
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/disputes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F6B3E] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Disputes
        </Link>
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800"
        >
          {error || "Disputed job not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/disputes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F6B3E] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Disputes
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0C2A1B]">
            Dispute Review: {job.title}
          </h1>
          <p className="mt-0.5 text-xs text-[#6A7B70]">
            Customer: <strong>{job.customer_name}</strong> · Assigned Pro:{" "}
            <strong>{job.assigned_professional_name || "Unassigned"}</strong>
          </p>
        </div>

        {job.status === "Disputed" && (
          <button
            type="button"
            onClick={() => {
              setOutcome("completed");
              setNote("");
              setResolveError(null);
              setResolveModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F6B3E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B5430]"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>Resolve Dispute</span>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-[#DCE8E0] bg-white p-5 shadow-2xs lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#DCE8E0] pb-3">
            <h2 className="text-sm font-bold text-[#0C2A1B]">Job & Offers Summary</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                job.status === "Disputed"
                  ? "bg-red-100 text-red-800"
                  : "bg-[#E6F4EA] text-[#0F6B3E]"
              }`}
            >
              {job.status}
            </span>
          </div>

          <p className="text-xs leading-relaxed text-[#34453B]">
            {job.description}
          </p>

          <div className="border-t border-[#DCE8E0] pt-3">
            <h3 className="text-xs font-bold text-[#0C2A1B]">
              Offers ({offers.length})
            </h3>
            {offers.length === 0 ? (
              <p className="mt-2 text-xs text-[#6A7B70]">No offers recorded.</p>
            ) : (
              <ul className="mt-2 divide-y divide-[#DCE8E0] text-xs">
                {offers.map((o) => (
                  <li key={o.id} className="py-2">
                    <div className="flex justify-between font-semibold text-[#0C2A1B]">
                      <span>{o.professional_name}</span>
                      <span>PKR {o.price.toLocaleString()}</span>
                    </div>
                    <div className="text-[11px] text-[#6A7B70]">
                      Status: {o.status}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-[#DCE8E0] pt-3">
            <h3 className="text-xs font-bold text-[#0C2A1B]">
              Status Timeline ({events.length})
            </h3>
            <ol className="mt-2 divide-y divide-[#DCE8E0] text-xs">
              {events.map((ev) => (
                <li key={ev.id} className="py-2 space-y-1">
                  <div className="flex justify-between font-semibold text-[#0C2A1B]">
                    <span>
                      {ev.from_status ?? "Created"} → {ev.to_status}
                    </span>
                    <span className="text-[10px] text-[#6A7B70]">
                      {new Date(ev.at).toLocaleDateString()}
                    </span>
                  </div>
                  {ev.note && (
                    <p className="rounded bg-[#F4FAF6] px-2 py-1 text-[11px] text-[#0C2A1B]">
                      {ev.note}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="rounded-xl border border-[#DCE8E0] bg-white p-5 shadow-2xs lg:col-span-7 flex flex-col">
          <div className="flex items-center justify-between border-b border-[#DCE8E0] pb-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-[#0C2A1B]">
                <MessageSquareLock
                  className="h-4 w-4 text-[#0F6B3E]"
                  aria-hidden="true"
                />
                <span>Dispute Evidence: Conversation Transcript</span>
              </h2>
              <p className="text-xs text-[#6A7B70]">
                Privacy policy: Administrators can read chat messages only while the job status is Disputed.
              </p>
            </div>
          </div>

          {messages.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#6A7B70]">
              {job.status === "Disputed"
                ? "No chat messages were exchanged in this job's conversation."
                : "Chat transcript is locked because this job is no longer in Disputed status."}
            </div>
          ) : (
            <div className="mt-4 space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {messages.map((msg) => {
                const isCustomer = msg.sender_id === job.customer_id;
                return (
                  <div
                    key={msg.id}
                    className={`rounded-xl border p-3 text-xs ${
                      isCustomer
                        ? "border-[#DCE8E0] bg-[#F8FBF9]"
                        : "border-[#CDE9D6] bg-[#E6F4EA]"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-[#0C2A1B]">
                      <span>
                        {msg.sender_name}{" "}
                        <span className="font-normal text-[#6A7B70]">
                          ({isCustomer ? "Customer" : "Professional"})
                        </span>
                      </span>
                      <span className="text-[10px] font-normal text-[#6A7B70]">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1.5 leading-relaxed text-[#0C2A1B]">
                      {msg.body}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <AdminDialog
        open={resolveModalOpen}
        title="Resolve Disputed Job"
        description="Choose the final job outcome and record a resolution note. This updates jobs.status, job_events, and admin_actions in a single transaction."
        onClose={() => setResolveModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="dispute-outcome-select"
              className="block text-xs font-bold text-[#0C2A1B]"
            >
              Resolution Outcome
            </label>
            <select
              id="dispute-outcome-select"
              value={outcome}
              onChange={(e) =>
                setOutcome(e.target.value as "completed" | "cancelled")
              }
              className="mt-1.5 w-full rounded-lg border border-[#DCE8E0] bg-white px-3 py-2 text-xs text-[#0C2A1B]"
            >
              <option value="completed">Mark Job Completed</option>
              <option value="cancelled">Mark Job Cancelled</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="dispute-resolution-note"
              className="block text-xs font-bold text-[#0C2A1B]"
            >
              Resolution Note{" "}
              <span className="text-red-700">(required, min 10 characters)</span>
            </label>
            <textarea
              id="dispute-resolution-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Summarize the findings and why this outcome was chosen..."
              className="mt-1.5 w-full rounded-lg border border-[#DCE8E0] px-3 py-2 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
            />
          </div>

          {resolveError && (
            <p role="alert" className="text-xs font-semibold text-red-700">
              {resolveError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setResolveModalOpen(false)}
              className="rounded-lg border border-[#DCE8E0] bg-white px-4 py-2 text-xs font-semibold text-[#34453B] hover:bg-[#F4FAF6]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={resolving}
              onClick={handleConfirmResolve}
              className="rounded-lg bg-[#0F6B3E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B5430] disabled:opacity-50"
            >
              {resolving ? "Resolving..." : "Confirm Resolution"}
            </button>
          </div>
        </div>
      </AdminDialog>
    </div>
  );
}
