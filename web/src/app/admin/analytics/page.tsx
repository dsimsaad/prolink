"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { fetchAdminJobsByDay } from "@/lib/admin/queries";
import {
  getAdminFunnelAnalytics,
  getAdminTopAreas,
  getAdminTopCategories,
} from "@/lib/api/admin";
import type {
  DailyJobCount,
  FunnelAnalyticsDto,
  RankedGroupCountDto,
} from "@/lib/admin/types";

export default function AdminAnalyticsPage() {
  const [funnel, setFunnel] = useState<FunnelAnalyticsDto | null>(null);
  const [topCategories, setTopCategories] = useState<RankedGroupCountDto[]>([]);
  const [topAreas, setTopAreas] = useState<RankedGroupCountDto[]>([]);
  const [dailyJobs, setDailyJobs] = useState<DailyJobCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      const [funnelRes, catsRes, areasRes, jobsByDayRes] = await Promise.all([
        getAdminFunnelAnalytics(),
        getAdminTopCategories(5),
        getAdminTopAreas(5),
        fetchAdminJobsByDay(supabase, 30),
      ]);
      setFunnel(funnelRes);
      setTopCategories(catsRes);
      setTopAreas(areasRes);
      setDailyJobs(jobsByDayRes);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load analytics data from the C# Engine API."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadAnalytics();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadAnalytics]);

  const maxFunnel = Math.max(
    1,
    funnel?.posted ?? 0,
    funnel?.receivedOffers ?? 0,
    funnel?.assigned ?? 0,
    funnel?.completed ?? 0
  );
  const maxCategoryCount = Math.max(1, ...topCategories.map((c) => c.jobCount));
  const maxAreaCount = Math.max(1, ...topAreas.map((a) => a.jobCount));
  const maxDailyCount = Math.max(1, ...dailyJobs.map((d) => d.job_count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0C2A1B]">
          Marketplace Analytics
        </h1>
        <p className="mt-1 text-sm text-[#34453B]">
          Conversion funnel, top categories and areas ranked via MinHeap.TopK + MergeSort (cached in LruCache), and 30-day job volume.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800"
        >
          {error}
        </div>
      )}

      {loading && !funnel ? (
        <div className="p-8 text-center text-xs text-[#6A7B70]">
          Loading analytics...
        </div>
      ) : (
        <>
          <section
            aria-labelledby="funnel-heading"
            className="rounded-xl border border-[#DCE8E0] bg-white p-5 shadow-2xs"
          >
            <h2 id="funnel-heading" className="text-sm font-bold text-[#0C2A1B]">
              Job Conversion Funnel
            </h2>
            <p className="text-xs text-[#6A7B70]">
              Progression from job creation to offer submission, professional assignment, and final completion
            </p>

            {funnel && (
              <div className="mt-4 space-y-3">
                {[
                  { label: "Jobs Posted", value: funnel.posted },
                  { label: "Received Offers", value: funnel.receivedOffers },
                  { label: "Assigned to Pro", value: funnel.assigned },
                  { label: "Completed", value: funnel.completed },
                ].map((stage) => {
                  const widthPct = Math.max(
                    4,
                    Math.round((stage.value / maxFunnel) * 100)
                  );
                  return (
                    <div key={stage.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-[#0C2A1B]">
                        <span>{stage.label}</span>
                        <span>{stage.value}</span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-[#E6F4EA]">
                        <div
                          style={{ width: `${widthPct}%` }}
                          className="h-full rounded-full bg-[#0F6B3E]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section
              aria-labelledby="top-cats-heading"
              className="rounded-xl border border-[#DCE8E0] bg-white p-5 shadow-2xs"
            >
              <h2
                id="top-cats-heading"
                className="text-sm font-bold text-[#0C2A1B]"
              >
                Top 5 Service Categories
              </h2>
              <p className="text-xs text-[#6A7B70]">
                Computed with MinHeap.TopK + MergeSort
              </p>

              <div className="mt-4 space-y-3">
                {topCategories.length === 0 ? (
                  <p className="text-xs text-[#6A7B70]">No category data.</p>
                ) : (
                  topCategories.map((cat) => {
                    const widthPct = Math.max(
                      6,
                      Math.round((cat.jobCount / maxCategoryCount) * 100)
                    );
                    return (
                      <div key={cat.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-[#0C2A1B]">
                          <span>{cat.name}</span>
                          <span>{cat.jobCount} jobs</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#E6F4EA]">
                          <div
                            style={{ width: `${widthPct}%` }}
                            className="h-full rounded-full bg-[#0F6B3E]"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section
              aria-labelledby="top-areas-heading"
              className="rounded-xl border border-[#DCE8E0] bg-white p-5 shadow-2xs"
            >
              <h2
                id="top-areas-heading"
                className="text-sm font-bold text-[#0C2A1B]"
              >
                Top 5 Service Areas
              </h2>
              <p className="text-xs text-[#6A7B70]">
                Computed with MinHeap.TopK + MergeSort
              </p>

              <div className="mt-4 space-y-3">
                {topAreas.length === 0 ? (
                  <p className="text-xs text-[#6A7B70]">No area data.</p>
                ) : (
                  topAreas.map((area) => {
                    const widthPct = Math.max(
                      6,
                      Math.round((area.jobCount / maxAreaCount) * 100)
                    );
                    return (
                      <div key={area.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-[#0C2A1B]">
                          <span>{area.name}</span>
                          <span>{area.jobCount} jobs</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#E6F4EA]">
                          <div
                            style={{ width: `${widthPct}%` }}
                            className="h-full rounded-full bg-[#0F6B3E]"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          <section
            aria-labelledby="analytics-daily-heading"
            className="rounded-xl border border-[#DCE8E0] bg-white p-5 shadow-2xs"
          >
            <h2
              id="analytics-daily-heading"
              className="text-sm font-bold text-[#0C2A1B]"
            >
              Jobs Per Day (Last 30 Days)
            </h2>
            <div className="mt-4 flex h-44 items-end gap-1.5 border-b border-[#DCE8E0] pb-2 pt-4 overflow-x-auto">
              {dailyJobs.map((d) => {
                const heightPct =
                  d.job_count === 0
                    ? 4
                    : Math.max(
                        12,
                        Math.round((d.job_count / maxDailyCount) * 100)
                      );
                return (
                  <div
                    key={d.day}
                    className="flex min-w-[18px] flex-1 flex-col items-center justify-end gap-1 h-full"
                  >
                    <span className="text-[9px] font-semibold text-[#0C2A1B]">
                      {d.job_count}
                    </span>
                    <div
                      style={{ height: `${heightPct}%` }}
                      title={`${d.day}: ${d.job_count} jobs`}
                      className={`w-full rounded-t ${
                        d.job_count > 0 ? "bg-[#0F6B3E]" : "bg-[#E6F4EA]"
                      }`}
                    />
                    <span className="text-[9px] text-[#6A7B70]">
                      {d.day.slice(8)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
