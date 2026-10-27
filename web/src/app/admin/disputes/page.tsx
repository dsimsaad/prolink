"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fetchAdminJobs } from "@/lib/admin/queries";
import type { AdminJobRow } from "@/lib/admin/types";
import { AdminPagination } from "@/components/admin/admin-dialog";

export default function AdminDisputesPage() {
  const [rows, setRows] = useState<AdminJobRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const result = await fetchAdminJobs(supabase, {
        status: "Disputed",
        page,
        pageSize: 20,
      });
      setRows(result.rows);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load disputed jobs."
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDisputes();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadDisputes]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-[#0C2A1B]">
          <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden="true" />
          <span>Disputed Jobs Queue</span>
        </h1>
        <p className="mt-1 text-sm text-[#34453B]">
          Review disputed jobs, inspect participant chat messages (unlocked by RLS for disputed jobs only), and record binding outcomes.
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

      <div className="overflow-hidden rounded-xl border border-[#DCE8E0] bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#DCE8E0] bg-[#F4FAF6] text-[11px] font-bold uppercase text-[#34453B]">
              <tr>
                <th className="px-4 py-3">Disputed Job</th>
                <th className="px-4 py-3">Category / Area</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Assigned Professional</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE8E0]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#6A7B70]">
                    Loading disputed jobs...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#6A7B70]">
                    No disputed jobs at the moment.
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
                    <td className="px-4 py-3 text-[#34453B]">
                      {job.assigned_professional_name || "Unassigned"}
                    </td>
                    <td className="px-4 py-3 text-[#34453B]">
                      {new Date(job.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/disputes/${job.id}`}
                        className="rounded-lg bg-[#0F6B3E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0B5430]"
                      >
                        Review & Resolve
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
