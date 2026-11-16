"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Edit3,
  FolderOpen,
  Inbox,
  MapPin,
  PlusCircle,
  Search,
  Tag,
} from "lucide-react";
import {
  formatBudgetRange,
  formatKarachiDate,
} from "@/lib/customer/format";
import type { CustomerJobRow } from "@/lib/customer/types";
import { JobStatusBadge } from "@/components/customer/customer-dialog";

type TabFilter =
  | "all"
  | "open"
  | "offers"
  | "in_progress"
  | "completed"
  | "closed";

const PAGE_SIZE = 20;

const TABS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "offers", label: "Offers received" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "closed", label: "Closed" },
];

function matchesTab(job: CustomerJobRow, tab: TabFilter): boolean {
  switch (tab) {
    case "all":
      return true;
    case "open":
      return job.status === "Draft" || job.status === "Open";
    case "offers":
      return (
        job.status === "Offers received" ||
        (job.status === "Open" && job.offer_count > 0)
      );
    case "in_progress":
      return job.status === "Assigned" || job.status === "In progress";
    case "completed":
      return job.status === "Completed";
    case "closed":
      return (
        job.status === "Cancelled" ||
        job.status === "Expired" ||
        job.status === "Disputed"
      );
  }
}

export function JobsListClient({ jobs }: { jobs: CustomerJobRow[] }) {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return jobs.filter((job) => {
      if (!matchesTab(job, activeTab)) return false;
      if (!q) return true;
      return job.title.toLowerCase().includes(q);
    });
  }, [jobs, activeTab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredJobs.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#DCE8E0] bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Filter jobs by status"
          className="flex flex-wrap items-center gap-1.5"
        >
          {TABS.map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E] ${
                  selected
                    ? "bg-[#0F6B3E] !text-white text-white shadow-2xs"
                    : "bg-[#F8FBF9] text-[#34453B] hover:bg-[#E6F4EA] hover:text-[#0C2A1B]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6A7B70]"
            aria-hidden="true"
          />
          <label htmlFor="jobs-title-search" className="sr-only">
            Search jobs by title
          </label>
          <input
            id="jobs-title-search"
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by job title..."
            className="w-full rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] py-2 pl-9 pr-3 text-xs text-[#0C2A1B] placeholder:text-[#6A7B70] focus:border-[#0F6B3E] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Job cards or empty state */}
      {pageItems.length === 0 ? (
        <div className="rounded-2xl border border-[#DCE8E0] bg-white p-8 text-center shadow-2xs">
          <FolderOpen
            className="mx-auto h-8 w-8 text-[#6A7B70]"
            aria-hidden="true"
          />
          <h2 className="mt-3 text-sm font-bold text-[#0C2A1B]">
            No matching jobs found
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-[#6A7B70]">
            {jobs.length === 0
              ? "You have not posted any jobs yet. Create a request to receive quotes from professionals in Lahore."
              : "Try switching tabs or clearing your title search filter."}
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard/jobs/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F6B3E] px-4 py-2 text-xs font-semibold !text-white text-white transition hover:bg-[#0A4D2B]"
            >
              <PlusCircle className="h-4 w-4 !text-white text-white" aria-hidden="true" />
              <span className="!text-white text-white">Post a job</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {pageItems.map((job) => {
            const isDraft = job.status === "Draft";
            const isOpen =
              job.status === "Open" || job.status === "Offers received";
            const primaryHref = isDraft
              ? `/dashboard/jobs/${job.id}/edit`
              : `/dashboard/jobs/${job.id}`;

            return (
              <article
                key={job.id}
                className="rounded-2xl border border-[#DCE8E0] bg-white p-5 shadow-2xs transition hover:border-[#0F6B3E]/40"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <JobStatusBadge status={job.status} />
                      {job.urgency === "urgent" && (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                          Urgent
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs text-[#6A7B70]">
                        <Tag className="h-3 w-3 text-[#0F6B3E]" aria-hidden="true" />
                        {job.category_name}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-[#6A7B70]">
                        <MapPin className="h-3 w-3 text-[#0F6B3E]" aria-hidden="true" />
                        {job.area_name}
                      </span>
                    </div>

                    <h2 className="text-sm font-bold text-[#0C2A1B] sm:text-base">
                      <Link
                        href={primaryHref}
                        className="hover:text-[#0F6B3E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B3E]"
                      >
                        {job.title}
                      </Link>
                    </h2>

                    <p className="line-clamp-2 text-xs text-[#34453B]">
                      {job.description}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <p className="text-xs font-bold text-[#0C2A1B]">
                      {formatBudgetRange(job.budget_min, job.budget_max)}
                    </p>
                    <div className="flex items-center gap-2">
                      {isDraft && (
                        <Link
                          href={`/dashboard/jobs/${job.id}`}
                          className="rounded-xl border border-[#DCE8E0] bg-white px-3 py-1.5 text-xs font-semibold text-[#34453B] hover:bg-[#F4FAF6]"
                        >
                          Details
                        </Link>
                      )}
                      <Link
                        href={primaryHref}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#E6F4EA] px-3.5 py-1.5 text-xs font-semibold text-[#0F6B3E] transition hover:bg-[#0F6B3E] hover:text-white"
                      >
                        {isDraft ? (
                          <>
                            <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Edit draft</span>
                          </>
                        ) : (
                          <span>View job</span>
                        )}
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#DCE8E0] pt-3 text-[11px] text-[#6A7B70]">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      Posted {formatKarachiDate(job.created_at)}
                    </span>
                    {isOpen && job.expires_at && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        Expires {formatKarachiDate(job.expires_at)}
                      </span>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 font-semibold text-[#34453B]">
                    <Inbox className="h-3.5 w-3.5 text-[#0F6B3E]" aria-hidden="true" />
                    {job.offer_count === 0
                      ? "No offers yet"
                      : `${job.offer_count} ${
                          job.offer_count === 1 ? "offer" : "offers"
                        }${
                          job.pending_offer_count > 0
                            ? ` (${job.pending_offer_count} pending)`
                            : ""
                        }`}
                  </span>
                </div>
              </article>
            );
          })}

          {/* Pagination (20 per page) */}
          {filteredJobs.length > PAGE_SIZE && (
            <div className="flex items-center justify-between rounded-2xl border border-[#DCE8E0] bg-white px-4 py-3 text-xs text-[#34453B]">
              <span>
                Showing <strong>{(safePage - 1) * PAGE_SIZE + 1}</strong>–
                <strong>
                  {Math.min(filteredJobs.length, safePage * PAGE_SIZE)}
                </strong>{" "}
                of <strong>{filteredJobs.length}</strong> jobs
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-[#DCE8E0] bg-white px-3 py-1.5 font-semibold text-[#0C2A1B] hover:bg-[#F4FAF6] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-2 font-medium">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-[#DCE8E0] bg-white px-3 py-1.5 font-semibold text-[#0C2A1B] hover:bg-[#F4FAF6] disabled:cursor-not-allowed disabled:opacity-50"
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
