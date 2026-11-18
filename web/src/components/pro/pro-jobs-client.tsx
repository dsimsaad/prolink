"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  MapPin,
  Tag,
  User,
} from "lucide-react";
import {
  formatBudgetRange,
  formatKarachiDate,
  formatPkr,
} from "@/lib/customer/format";
import type { ProfessionalAssignedJobRow } from "@/lib/pro/types";
import { JobStatusBadge } from "@/components/customer/customer-dialog";

type JobTabKey = "active" | "completed" | "closed";

const TABS: { key: JobTabKey; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "closed", label: "Closed" },
];

export function ProJobsClient({
  initialJobs,
  initialTab = "active",
}: {
  initialJobs: ProfessionalAssignedJobRow[];
  initialTab?: JobTabKey;
}) {
  const [activeTab, setActiveTab] = useState<JobTabKey>(initialTab);

  const activeJobs = initialJobs.filter(
    (j) => j.status === "Assigned" || j.status === "In progress"
  );
  const completedJobs = initialJobs.filter((j) => j.status === "Completed");
  const closedJobs = initialJobs.filter((j) =>
    ["Cancelled", "Expired", "Disputed"].includes(j.status)
  );

  const tabCounts: Record<JobTabKey, number> = {
    active: activeJobs.length,
    completed: completedJobs.length,
    closed: closedJobs.length,
  };

  const visibleJobs =
    activeTab === "active"
      ? activeJobs
      : activeTab === "completed"
        ? completedJobs
        : closedJobs;

  return (
    <div className="space-y-5">
      {/* Status Tabs */}
      <div
        role="tablist"
        aria-label="Filter assigned jobs by status"
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

      {/* Jobs List */}
      {visibleJobs.length === 0 ? (
        <div className="rounded-2xl border border-[#DCE8E0] bg-white p-10 text-center shadow-2xs">
          <Briefcase
            className="mx-auto h-8 w-8 text-[#6A7B70]"
            aria-hidden="true"
          />
          <h2 className="mt-3 text-sm font-bold text-[#0C2A1B]">
            No {activeTab} jobs
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-[#6A7B70]">
            {activeTab === "active"
              ? "When a customer accepts your offer, the assigned job appears here."
              : "Jobs in this category will appear here."}
          </p>
          {activeTab === "active" && (
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
          {visibleJobs.map((job) => (
            <article
              key={job.id}
              className="rounded-2xl border border-[#DCE8E0] bg-white p-5 shadow-2xs space-y-3"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <JobStatusBadge status={job.status} />
                    {job.status === "In progress" &&
                      job.professional_marked_done_at && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-[#E6F4EA] px-2.5 py-0.5 text-xs font-bold text-[#0F6B3E]">
                          <CheckCircle2
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                          <span>Waiting for customer to confirm</span>
                        </span>
                      )}
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6A7B70]">
                      <Tag
                        className="h-3.5 w-3.5 text-[#0F6B3E]"
                        aria-hidden="true"
                      />
                      {job.category_name}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6A7B70]">
                      <MapPin
                        className="h-3.5 w-3.5 text-[#0F6B3E]"
                        aria-hidden="true"
                      />
                      {job.area_name}
                    </span>
                  </div>

                  <h2 className="text-base font-extrabold text-[#0C2A1B]">
                    <Link
                      href={`/pro/jobs/${job.id}`}
                      className="hover:text-[#0F6B3E]"
                    >
                      {job.title}
                    </Link>
                  </h2>

                  <p className="inline-flex items-center gap-1.5 text-xs text-[#34453B]">
                    <User
                      className="h-3.5 w-3.5 text-[#0F6B3E]"
                      aria-hidden="true"
                    />
                    <span>Customer:</span>
                    <strong className="text-[#0C2A1B]">
                      {job.customer_name}
                    </strong>
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-[11px] font-medium text-[#6A7B70]">
                    {job.agreed_price !== null
                      ? "Agreed quote (direct)"
                      : "Customer budget"}
                  </p>
                  <p className="text-base font-extrabold text-[#0F6B3E]">
                    {job.agreed_price !== null
                      ? formatPkr(job.agreed_price)
                      : formatBudgetRange(job.budget_min, job.budget_max)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DCE8E0] pt-3 text-xs">
                <span className="inline-flex items-center gap-1 text-[11px] text-[#6A7B70]">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  Updated {formatKarachiDate(job.updated_at)}
                </span>

                <Link
                  href={`/pro/jobs/${job.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F6B3E] px-4 py-2 text-xs font-semibold !text-white text-white transition hover:bg-[#0A4D2B]"
                >
                  <span className="!text-white text-white">Open job</span>
                  <ArrowRight
                    className="h-3.5 w-3.5 !text-white text-white"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
