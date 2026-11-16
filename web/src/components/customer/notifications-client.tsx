"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { formatKarachiDateTime, formatPkr } from "@/lib/customer/format";
import type { CustomerNotificationItem } from "@/lib/customer/types";
import { useCustomerViewer } from "@/components/customer/customer-shell";

const PAGE_SIZE = 20;

function formatNotificationContent(item: CustomerNotificationItem): {
  title: string;
  body: string;
  jobId: string | null;
} {
  const payload = item.payload ?? {};
  const rawJobId =
    typeof payload.job_id === "string"
      ? payload.job_id
      : typeof payload.jobId === "string"
        ? payload.jobId
        : null;
  const jobTitle =
    typeof payload.title === "string" && payload.title.trim().length > 0
      ? payload.title.trim()
      : "your job";
  const statusText =
    typeof payload.status === "string" && payload.status.trim().length > 0
      ? payload.status.trim()
      : null;
  const priceVal =
    typeof payload.price === "number"
      ? payload.price
      : typeof payload.price === "string" && !Number.isNaN(Number(payload.price))
        ? Number(payload.price)
        : null;

  switch (item.type) {
    case "new_job_match":
      return {
        title: "New matching job posted",
        body: `A new job matching your trade and area was posted: "${jobTitle}".`,
        jobId: rawJobId,
      };
    case "offer_received":
      return {
        title: "New offer received",
        body:
          priceVal !== null
            ? `A professional sent a quote of ${formatPkr(priceVal)} for "${jobTitle}".`
            : `You received a new offer from a professional for "${jobTitle}".`,
        jobId: rawJobId,
      };
    case "offer_accepted":
      return {
        title: "Offer accepted",
        body: `Offer accepted for "${jobTitle}". Contact details are now available on the job page.`,
        jobId: rawJobId,
      };
    case "job_status_changed":
      return {
        title: "Job status updated",
        body: statusText
          ? `"${jobTitle}" moved to status: ${statusText}.`
          : `The status of "${jobTitle}" was updated.`,
        jobId: rawJobId,
      };
    case "application_reviewed":
      return {
        title: "Professional application update",
        body:
          typeof payload.note === "string" && payload.note.trim().length > 0
            ? `Your professional application status changed (${payload.decision ?? "updated"}): ${payload.note}`
            : `Your professional application status was updated.`,
        jobId: null,
      };
    default:
      return {
        title: "Account notification",
        body:
          jobTitle !== "your job"
            ? `Update regarding "${jobTitle}".`
            : "You have a new update on your ProLink account.",
        jobId: rawJobId,
      };
  }
}

export function NotificationsClient({
  initialItems,
}: {
  initialItems: CustomerNotificationItem[];
}) {
  const { customerId, refreshHeaderCounts } = useCustomerViewer();
  const [items, setItems] = useState<CustomerNotificationItem[]>(initialItems);
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  const unreadCount = items.filter((i) => !i.read_at).length;
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = items.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  async function markOneAsRead(notificationId: string) {
    setBusyId(notificationId);
    const nowIso = new Date().toISOString();
    const supabase = createClient();

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: nowIso })
      .eq("id", notificationId)
      .eq("user_id", customerId);

    if (!error) {
      setItems((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read_at: nowIso } : n))
      );
      refreshHeaderCounts();
    }
    setBusyId(null);
  }

  async function markAllAsRead() {
    if (unreadCount === 0) return;
    setBusyId("all");
    const nowIso = new Date().toISOString();
    const supabase = createClient();

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: nowIso })
      .eq("user_id", customerId)
      .is("read_at", null);

    if (!error) {
      setItems((prev) =>
        prev.map((n) => (n.read_at ? n : { ...n, read_at: nowIso }))
      );
      refreshHeaderCounts();
    }
    setBusyId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DCE8E0] bg-white px-5 py-3.5 shadow-2xs">
        <span className="text-xs font-semibold text-[#34453B]">
          {unreadCount === 0
            ? "All notifications read"
            : `${unreadCount} unread ${
                unreadCount === 1 ? "notification" : "notifications"
              }`}
        </span>

        <button
          type="button"
          disabled={unreadCount === 0 || busyId !== null}
          onClick={() => void markAllAsRead()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] px-3.5 py-1.5 text-xs font-semibold text-[#0F6B3E] transition hover:bg-[#E6F4EA] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {busyId === "all" ? "Marking all..." : "Mark all as read"}
          </span>
        </button>
      </div>

      {pageItems.length === 0 ? (
        <div className="rounded-2xl border border-[#DCE8E0] bg-white p-10 text-center shadow-2xs">
          <Bell className="mx-auto h-8 w-8 text-[#6A7B70]" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-bold text-[#0C2A1B]">
            No notifications yet
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-[#6A7B70]">
            Alerts appear here when professionals send offers or when the status of your jobs changes.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {pageItems.map((item) => {
            const isUnread = !item.read_at;
            const formatted = formatNotificationContent(item);

            return (
              <article
                key={item.id}
                className={`rounded-2xl border p-4 shadow-2xs transition ${
                  isUnread
                    ? "border-emerald-300 bg-[#E6F4EA]/35"
                    : "border-[#DCE8E0] bg-white"
                }`}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {isUnread && (
                        <span
                          aria-label="Unread"
                          className="h-2 w-2 rounded-full bg-[#0F6B3E]"
                        />
                      )}
                      <h2 className="text-xs font-bold text-[#0C2A1B] sm:text-sm">
                        {formatted.title}
                      </h2>
                    </div>
                    <p className="text-xs text-[#34453B]">{formatted.body}</p>
                    <p className="text-[11px] text-[#6A7B70]">
                      {formatKarachiDateTime(item.created_at)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {formatted.jobId && (
                      <Link
                        href={`/dashboard/jobs/${formatted.jobId}`}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#DCE8E0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F6B3E] hover:bg-[#F4FAF6]"
                      >
                        <span>Open job</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    )}

                    {isUnread && (
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => void markOneAsRead(item.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#0F6B3E] px-3 py-1.5 text-xs font-semibold !text-white text-white hover:bg-[#0A4D2B] disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5 !text-white text-white" aria-hidden="true" />
                        <span className="!text-white text-white">Mark read</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {items.length > PAGE_SIZE && (
            <div className="flex items-center justify-between rounded-2xl border border-[#DCE8E0] bg-white px-4 py-3 text-xs text-[#34453B]">
              <span>
                Page <strong>{safePage}</strong> of <strong>{totalPages}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-[#DCE8E0] bg-white px-3 py-1.5 font-semibold text-[#0C2A1B] hover:bg-[#F4FAF6] disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-[#DCE8E0] bg-white px-3 py-1.5 font-semibold text-[#0C2A1B] hover:bg-[#F4FAF6] disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
