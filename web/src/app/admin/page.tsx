"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  fetchAdminJobsByDay,
  fetchAdminOverview,
} from "@/lib/admin/queries";
import {
  getAdminReviewQueue,
  reloadAdminEngine,
} from "@/lib/api/admin";
import type {
  AdminOverviewStats,
  DailyJobCount,
  EngineReloadResponse,
  ReviewQueueItemDto,
} from "@/lib/admin/types";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [dailyJobs, setDailyJobs] = useState<DailyJobCount[]>([]);
  const [queueItems, setQueueItems] = useState<ReviewQueueItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [wakingUp, setWakingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);

  const [reloadingEngine, setReloadingEngine] = useState(false);
  const [engineInfo, setEngineInfo] = useState<EngineReloadResponse | null>(null);
  const [engineFeedback, setEngineFeedback] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setQueueError(null);

    const supabase = createClient();

    try {
      const [overviewData, byDayData] = await Promise.all([
        fetchAdminOverview(supabase),
        fetchAdminJobsByDay(supabase, 14),
      ]);
      setStats(overviewData);
      setDailyJobs(byDayData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load Supabase admin overview."
      );
    }

    try {
      const queueRes = await getAdminReviewQueue(20, {
        onWakingUp: setWakingUp,
      });
      setQueueItems(queueRes.items);
    } catch (err) {
      setQueueError(
        err instanceof Error
          ? err.message
          : "Failed to load the review queue from the C# Engine API."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  async function handleReloadEngine() {
    setReloadingEngine(true);
    setEngineFeedback(null);
    try {
      const result = await reloadAdminEngine({ onWakingUp: setWakingUp });
      setEngineInfo(result);
      setEngineFeedback(
        `Engine reloaded successfully. Active state version: v${result.version}`
      );
      const queueRes = await getAdminReviewQueue(20);
      setQueueItems(queueRes.items);
    } catch (err) {
      setEngineFeedback(
        err instanceof Error ? err.message : "Failed to reload engine state."
      );
    } finally {
      setReloadingEngine(false);
    }
  }

  const maxDailyJobs = Math.max(1, ...dailyJobs.map((d) => d.job_count));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0C2A1B]">
            Platform Overview
          </h1>
          <p className="mt-1 text-sm text-[#34453B]">
            Real-time marketplace metrics, daily job volume, and prioritized moderation queue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleReloadEngine}
            disabled={reloadingEngine}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F6B3E] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#0B5430] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${reloadingEngine ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>{reloadingEngine ? "Reloading engine..." : "Reload engine data"}</span>
          </button>
        </div>
      </div>

      {wakingUp && (
        <div
          role="status"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900"
        >
          The server is waking up, this can take up to a minute...
        </div>
      )}

      {engineFeedback && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#CDE9D6] bg-[#E6F4EA] px-4 py-3 text-xs font-semibold text-[#0C2A1B]"
        >
          <span>{engineFeedback}</span>
          {engineInfo && (
            <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-bold text-[#0F6B3E]">
              Version {engineInfo.version} · {new Date(engineInfo.reloadedAt).toLocaleTimeString()}
            </span>
          )}
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

      {loading && !stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-28 animate-pulse rounded-xl border border-[#DCE8E0] bg-white p-5"
            />
          ))}
        </div>
      ) : (
        stats && (
          <section
            aria-label="Key platform statistics"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="rounded-xl border border-[#DCE8E0] bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-semibold text-[#6A7B70]">
                <span>Total Users</span>
                <Users className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-[#0C2A1B]">
                {stats.total_users}
              </div>
              <div className="mt-1 text-xs text-[#0F6B3E]">
                +{stats.new_users_last_7_days} in the last 7 days
              </div>
            </div>

            <div className="rounded-xl border border-[#DCE8E0] bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-semibold text-[#6A7B70]">
                <span>Pending Applications</span>
                <CheckCircle2 className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-[#0C2A1B]">
                {stats.pending_applications}
              </div>
              <div className="mt-1 text-xs text-[#34453B]">
                {stats.professionals_by_status?.approved ?? 0} approved pros
              </div>
            </div>

            <div className="rounded-xl border border-[#DCE8E0] bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-semibold text-[#6A7B70]">
                <span>Jobs (Last 7 Days)</span>
                <Briefcase className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-[#0C2A1B]">
                {stats.jobs_last_7_days}
              </div>
              <div className="mt-1 text-xs text-[#34453B]">
                {stats.jobs_by_status?.Completed ?? 0} completed overall
              </div>
            </div>

            <div className="rounded-xl border border-[#DCE8E0] bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-semibold text-[#6A7B70]">
                <span>Disputes & Open Reports</span>
                <ShieldAlert className="h-4 w-4 text-amber-600" aria-hidden="true" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-[#0C2A1B]">
                {stats.disputed_jobs} / {stats.open_reports}
              </div>
              <div className="mt-1 text-xs text-amber-800">
                {stats.disputed_jobs} disputed jobs · {stats.open_reports} open reports
              </div>
            </div>
          </section>
        )
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section
          aria-labelledby="jobs-by-day-heading"
          className="rounded-xl border border-[#DCE8E0] bg-white p-5 shadow-2xs lg:col-span-7"
        >
          <div className="flex items-center justify-between border-b border-[#DCE8E0] pb-3">
            <div>
              <h2 id="jobs-by-day-heading" className="text-sm font-bold text-[#0C2A1B]">
                Jobs Created Per Day (Last 14 Days)
              </h2>
              <p className="text-xs text-[#6A7B70]">
                Includes zero-count days from admin_jobs_by_day RPC
              </p>
            </div>
            <Link
              href="/admin/analytics"
              className="text-xs font-semibold text-[#0F6B3E] hover:underline"
            >
              Full analytics
            </Link>
          </div>

          {dailyJobs.length === 0 ? (
            <p className="py-10 text-center text-xs text-[#6A7B70]">
              No daily job statistics available yet.
            </p>
          ) : (
            <div className="mt-5">
              <div
                role="img"
                aria-label="Bar chart of jobs created per day over the last 14 days"
                className="flex h-48 items-end gap-2 border-b border-[#DCE8E0] pb-2 pt-4"
              >
                {dailyJobs.map((entry) => {
                  const heightPercent =
                    entry.job_count === 0
                      ? 4
                      : Math.max(12, Math.round((entry.job_count / maxDailyJobs) * 100));
                  const shortDate = entry.day.slice(5);
                  return (
                    <div
                      key={entry.day}
                      className="flex flex-1 flex-col items-center justify-end gap-1 h-full"
                    >
                      <span className="text-[10px] font-semibold text-[#0C2A1B]">
                        {entry.job_count}
                      </span>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        title={`${entry.day}: ${entry.job_count} jobs`}
                        className={`w-full max-w-[28px] rounded-t-md transition-all ${
                          entry.job_count > 0 ? "bg-[#0F6B3E]" : "bg-[#E6F4EA]"
                        }`}
                      />
                      <span className="mt-1 text-[10px] text-[#6A7B70]">{shortDate}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section
          aria-labelledby="needs-attention-heading"
          className="rounded-xl border border-[#DCE8E0] bg-white p-5 shadow-2xs lg:col-span-5"
        >
          <div className="flex items-center justify-between border-b border-[#DCE8E0] pb-3">
            <div>
              <h2
                id="needs-attention-heading"
                className="flex items-center gap-2 text-sm font-bold text-[#0C2A1B]"
              >
                <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
                <span>Needs Attention</span>
              </h2>
              <p className="text-xs text-[#6A7B70]">
                Prioritized by IndexedPriorityQueue (disputes, reports, applications)
              </p>
            </div>
          </div>

          {queueError ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              {queueError}
            </div>
          ) : queueItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#6A7B70]">
              {loading ? "Loading review queue..." : "All clear! No items require moderation."}
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-[#DCE8E0]">
              {queueItems.slice(0, 8).map((item) => (
                <li key={item.key} className="py-3">
                  <Link
                    href={item.link}
                    className="group flex items-start justify-between gap-3 rounded-lg p-1.5 transition hover:bg-[#F4FAF6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            item.kind === "dispute"
                              ? "bg-red-100 text-red-800"
                              : item.kind === "report"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-[#E6F4EA] text-[#0F6B3E]"
                          }`}
                        >
                          {item.kind}
                        </span>
                        <span className="truncate text-xs font-bold text-[#0C2A1B] group-hover:text-[#0F6B3E]">
                          {item.title}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[#6A7B70]">
                        {item.subtitle}
                      </p>
                    </div>
                    <ArrowUpRight
                      className="h-4 w-4 shrink-0 text-[#6A7B70] group-hover:text-[#0F6B3E]"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
