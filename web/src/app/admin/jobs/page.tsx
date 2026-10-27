"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  fetchAdminAreas,
  fetchAdminCategories,
  fetchAdminJobs,
} from "@/lib/admin/queries";
import { searchAdminJobs } from "@/lib/api/admin";
import type {
  AdminCategoryRow,
  AdminJobRow,
  JobStatus,
} from "@/lib/admin/types";
import {
  AdminPagination,
  useDebouncedValue,
} from "@/components/admin/admin-dialog";

const JOB_STATUS_OPTIONS: JobStatus[] = [
  "Draft",
  "Open",
  "Offers received",
  "Assigned",
  "In progress",
  "Completed",
  "Cancelled",
  "Expired",
  "Disputed",
];

export default function AdminJobsPage() {
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword, 300);

  const [statusFilter, setStatusFilter] = useState<JobStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  const [areaFilter, setAreaFilter] = useState<number | "">("");
  const [urgencyFilter, setUrgencyFilter] = useState<"normal" | "urgent" | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [filterJobIds, setFilterJobIds] = useState<string[] | null>(null);
  const [categories, setCategories] = useState<AdminCategoryRow[]>([]);
  const [areas, setAreas] = useState<{ id: number; name: string; city: string }[]>([]);

  const [rows, setRows] = useState<AdminJobRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void Promise.all([
      fetchAdminCategories(supabase),
      fetchAdminAreas(supabase),
    ])
      .then(([cats, areaRows]) => {
        setCategories(cats);
        setAreas(areaRows);
      })
      .catch(() => {
        // Keep filter dropdowns empty if metadata cannot be loaded.
      });
  }, []);

  useEffect(() => {
    let active = true;
    const trimmed = debouncedKeyword.trim();
    const timer = setTimeout(() => {
      if (!trimmed) {
        if (active) setFilterJobIds(null);
        return;
      }

      void searchAdminJobs(trimmed)
        .then((ids) => {
          if (!active) return;
          setFilterJobIds(ids);
          setPage(1);
        })
        .catch(() => {
          if (!active) return;
          setFilterJobIds(null);
        });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [debouncedKeyword]);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const result = await fetchAdminJobs(supabase, {
        status: statusFilter,
        categoryId: categoryFilter,
        areaId: areaFilter,
        urgency: urgencyFilter,
        fromDate: fromDate || undefined,
        toDate: toDate ? `${toDate}T23:59:59Z` : undefined,
        filterJobIds,
        page,
        pageSize: 20,
      });
      setRows(result.rows);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  }, [
    statusFilter,
    categoryFilter,
    areaFilter,
    urgencyFilter,
    fromDate,
    toDate,
    filterJobIds,
    page,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadJobs();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadJobs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0C2A1B]">
          Jobs & Lifecycle Moderation
        </h1>
        <p className="mt-1 text-sm text-[#34453B]">
          Filter jobs by status, category, area, urgency, or date range, and search descriptions via JobSearchIndex.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-[#DCE8E0] bg-white p-4 shadow-2xs">
        <div className="relative max-w-xl">
          <label htmlFor="admin-job-keyword" className="sr-only">
            Keyword search jobs
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A7B70]"
            aria-hidden="true"
          />
          <input
            id="admin-job-keyword"
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Keyword search (e.g. inverter, leak, breaker, geyser)..."
            className="w-full rounded-lg border border-[#DCE8E0] py-2 pl-9 pr-8 text-xs text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
          />
          {keyword && (
            <button
              type="button"
              aria-label="Clear keyword search"
              onClick={() => {
                setKeyword("");
                setFilterJobIds(null);
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6A7B70] hover:text-[#0C2A1B]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <div>
            <label
              htmlFor="filter-job-status"
              className="block text-[11px] font-bold text-[#34453B]"
            >
              Status
            </label>
            <select
              id="filter-job-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as JobStatus | "");
                setPage(1);
              }}
              className="mt-1 w-full rounded-lg border border-[#DCE8E0] bg-white px-2.5 py-1.5 text-xs text-[#0C2A1B]"
            >
              <option value="">All statuses</option>
              {JOB_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-job-category"
              className="block text-[11px] font-bold text-[#34453B]"
            >
              Category
            </label>
            <select
              id="filter-job-category"
              value={categoryFilter === "" ? "" : String(categoryFilter)}
              onChange={(e) => {
                setCategoryFilter(e.target.value ? Number(e.target.value) : "");
                setPage(1);
              }}
              className="mt-1 w-full rounded-lg border border-[#DCE8E0] bg-white px-2.5 py-1.5 text-xs text-[#0C2A1B]"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-job-area"
              className="block text-[11px] font-bold text-[#34453B]"
            >
              Area
            </label>
            <select
              id="filter-job-area"
              value={areaFilter === "" ? "" : String(areaFilter)}
              onChange={(e) => {
                setAreaFilter(e.target.value ? Number(e.target.value) : "");
                setPage(1);
              }}
              className="mt-1 w-full rounded-lg border border-[#DCE8E0] bg-white px-2.5 py-1.5 text-xs text-[#0C2A1B]"
            >
              <option value="">All areas</option>
              {areas.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.name} ({a.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-job-urgency"
              className="block text-[11px] font-bold text-[#34453B]"
            >
              Urgency
            </label>
            <select
              id="filter-job-urgency"
              value={urgencyFilter}
              onChange={(e) => {
                setUrgencyFilter(e.target.value as "normal" | "urgent" | "");
                setPage(1);
              }}
              className="mt-1 w-full rounded-lg border border-[#DCE8E0] bg-white px-2.5 py-1.5 text-xs text-[#0C2A1B]"
            >
              <option value="">All urgencies</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-job-from"
              className="block text-[11px] font-bold text-[#34453B]"
            >
              From Date
            </label>
            <input
              id="filter-job-from"
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full rounded-lg border border-[#DCE8E0] bg-white px-2.5 py-1.5 text-xs text-[#0C2A1B]"
            />
          </div>

          <div>
            <label
              htmlFor="filter-job-to"
              className="block text-[11px] font-bold text-[#34453B]"
            >
              To Date
            </label>
            <input
              id="filter-job-to"
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="mt-1 w-full rounded-lg border border-[#DCE8E0] bg-white px-2.5 py-1.5 text-xs text-[#0C2A1B]"
            />
          </div>
        </div>
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
                <th className="px-4 py-3">Job Title</th>
                <th className="px-4 py-3">Category / Area</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Urgency</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE8E0]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#6A7B70]">
                    Loading jobs...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#6A7B70]">
                    No jobs matched the active filters.
                  </td>
                </tr>
              ) : (
                rows.map((job) => (
                  <tr key={job.id} className="hover:bg-[#F8FBF9]">
                    <td className="px-4 py-3 font-bold text-[#0C2A1B]">
                      <div>{job.title}</div>
                      <div className="line-clamp-1 max-w-xs font-normal text-[#6A7B70]">
                        {job.description}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#34453B]">
                      <div className="font-semibold text-[#0C2A1B]">
                        {job.category_name}
                      </div>
                      <div className="text-[11px] text-[#6A7B70]">{job.area_name}</div>
                    </td>
                    <td className="px-4 py-3 text-[#34453B]">{job.customer_name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          job.status === "Disputed"
                            ? "bg-red-100 text-red-800"
                            : job.status === "Completed"
                            ? "bg-[#E6F4EA] text-[#0F6B3E]"
                            : job.status === "Cancelled"
                            ? "bg-gray-200 text-gray-700"
                            : "bg-amber-50 text-amber-900"
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {job.urgency === "urgent" ? (
                        <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                          Urgent
                        </span>
                      ) : (
                        <span className="text-[#6A7B70]">Normal</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#34453B]">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/jobs/${job.id}`}
                        className="rounded-lg border border-[#DCE8E0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F6B3E] hover:bg-[#E6F4EA]"
                      >
                        Inspect
                      </Link>
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
