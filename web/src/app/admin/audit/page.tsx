"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getAdminAuditLog,
  getAdminAuditSummary,
} from "@/lib/api/admin";
import type {
  AuditLogItemDto,
  DailyAuditCountDto,
} from "@/lib/admin/types";
import { AdminPagination } from "@/components/admin/admin-dialog";

export default function AdminAuditPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<AuditLogItemDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [dailySummary, setDailySummary] = useState<DailyAuditCountDto[]>([]);
  const [totalInPeriod, setTotalInPeriod] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAuditData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pageRes, summaryRes] = await Promise.all([
        getAdminAuditLog({
          from: fromDate ? `${fromDate}T00:00:00Z` : undefined,
          to: toDate ? `${toDate}T23:59:59Z` : undefined,
          page,
          pageSize: 20,
        }),
        getAdminAuditSummary(14),
      ]);
      setItems(pageRes.items);
      setTotalCount(pageRes.totalCount);
      setDailySummary(summaryRes.dailyCounts);
      setTotalInPeriod(summaryRes.totalInPeriod);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load audit log from the C# Engine API."
      );
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadAuditData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadAuditData]);

  const maxDailyCount = Math.max(1, ...dailySummary.map((d) => d.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0C2A1B]">
          Administrator Audit Log
        </h1>
        <p className="mt-1 text-sm text-[#34453B]">
          Immutable log of administrative actions queried via BinarySearch range bounds in AuditIndex.
        </p>
      </div>

      <section
        aria-labelledby="audit-summary-heading"
        className="rounded-xl border border-[#DCE8E0] bg-white p-5 shadow-2xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCE8E0] pb-3">
          <div>
            <h2
              id="audit-summary-heading"
              className="text-sm font-bold text-[#0C2A1B]"
            >
              14-Day Administrative Activity Summary
            </h2>
            <p className="text-xs text-[#6A7B70]">
              {totalInPeriod} total actions recorded over the last 14 days
            </p>
          </div>
        </div>

        {dailySummary.length === 0 ? (
          <p className="py-6 text-center text-xs text-[#6A7B70]">
            No summary data available.
          </p>
        ) : (
          <div className="mt-4 flex h-32 items-end gap-2 border-b border-[#DCE8E0] pb-2 pt-4">
            {dailySummary.map((d) => {
              const heightPct =
                d.count === 0
                  ? 5
                  : Math.max(15, Math.round((d.count / maxDailyCount) * 100));
              return (
                <div
                  key={d.date}
                  className="flex flex-1 flex-col items-center justify-end gap-1 h-full"
                >
                  <span className="text-[10px] font-semibold text-[#0C2A1B]">
                    {d.count}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    title={`${d.date}: ${d.count} actions`}
                    className={`w-full max-w-[26px] rounded-t ${
                      d.count > 0 ? "bg-[#0F6B3E]" : "bg-[#E6F4EA]"
                    }`}
                  />
                  <span className="text-[10px] text-[#6A7B70]">
                    {d.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#DCE8E0] bg-white p-4 shadow-2xs">
        <div>
          <label
            htmlFor="audit-from-date"
            className="block text-xs font-bold text-[#0C2A1B]"
          >
            From Date (UTC)
          </label>
          <input
            id="audit-from-date"
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="mt-1 rounded-lg border border-[#DCE8E0] px-3 py-1.5 text-xs text-[#0C2A1B]"
          />
        </div>

        <div>
          <label
            htmlFor="audit-to-date"
            className="block text-xs font-bold text-[#0C2A1B]"
          >
            To Date (UTC)
          </label>
          <input
            id="audit-to-date"
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="mt-1 rounded-lg border border-[#DCE8E0] px-3 py-1.5 text-xs text-[#0C2A1B]"
          />
        </div>

        {(fromDate || toDate) && (
          <button
            type="button"
            onClick={() => {
              setFromDate("");
              setToDate("");
              setPage(1);
            }}
            className="rounded-lg border border-[#DCE8E0] bg-white px-3 py-1.5 text-xs font-semibold text-[#34453B] hover:bg-[#F4FAF6]"
          >
            Reset Dates
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800"
        >
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[#DCE8E0] bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#DCE8E0] bg-[#F4FAF6] text-[11px] font-bold uppercase text-[#34453B]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Administrator</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Details (JSON)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE8E0]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#6A7B70]">
                    Loading audit log...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#6A7B70]">
                    No audit entries found for the selected window.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FBF9]">
                    <td className="px-4 py-3 whitespace-nowrap text-[#34453B]">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#0C2A1B]">
                      {item.adminName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-[#E6F4EA] px-2 py-0.5 font-mono text-[11px] font-bold text-[#0F6B3E]">
                        {item.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#34453B]">
                      <span className="font-semibold">{item.targetType}</span>:{" "}
                      <span className="font-mono text-[11px]">{item.targetId}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#34453B] max-w-md truncate">
                      {item.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          page={page}
          pageSize={20}
          totalCount={totalCount}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
