"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Filter,
  MapPin,
  Search,
  Tag,
  Users,
} from "lucide-react";
import {
  formatBudgetRange,
  formatKarachiDate,
  formatPkr,
} from "@/lib/customer/format";
import { sortOpportunities } from "@/lib/pro/opportunity-sort";
import type {
  AreaOption,
  CategoryOption,
  OpportunityJobRow,
} from "@/lib/pro/types";
import { JobStatusBadge } from "@/components/customer/customer-dialog";

const PAGE_SIZE = 20;

interface OpportunitiesClientProps {
  initialJobs: OpportunityJobRow[];
  categories: CategoryOption[];
  areas: AreaOption[];
  myCategoryIds: number[];
  myAreaIds: number[];
}

export function OpportunitiesClient({
  initialJobs,
  categories,
  areas,
  myCategoryIds,
  myAreaIds,
}: OpportunitiesClientProps) {
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [selectedAreaId, setSelectedAreaId] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<
    "all" | "urgent" | "normal"
  >("all");
  const [budgetFilter, setBudgetFilter] = useState<
    "all" | "under_5k" | "5k_20k" | "over_20k" | "open_budget"
  >("all");
  const [keyword, setKeyword] = useState("");
  const [hideQuoted, setHideQuoted] = useState(false);
  const [page, setPage] = useState(1);

  const myCategorySet = useMemo(
    () => new Set(myCategoryIds),
    [myCategoryIds]
  );
  const myAreaSet = useMemo(() => new Set(myAreaIds), [myAreaIds]);

  // Order categories with the professional's own categories listed first
  const orderedCategories = useMemo(() => {
    const mine: CategoryOption[] = [];
    const others: CategoryOption[] = [];
    for (const c of categories) {
      if (myCategorySet.has(c.id)) {
        mine.push(c);
      } else {
        others.push(c);
      }
    }
    return [...mine, ...others];
  }, [categories, myCategorySet]);

  const filteredJobs = useMemo(() => {
    const cleanQuery = keyword.trim().toLowerCase();

    const matches = initialJobs.filter((job) => {
      if (!showAllMatches) {
        if (myCategorySet.size > 0 && !myCategorySet.has(job.category_id)) {
          return false;
        }
        if (myAreaSet.size > 0 && !myAreaSet.has(job.area_id)) {
          return false;
        }
      }

      if (
        selectedCategoryId !== "all" &&
        job.category_id !== Number(selectedCategoryId)
      ) {
        return false;
      }

      if (
        selectedAreaId !== "all" &&
        job.area_id !== Number(selectedAreaId)
      ) {
        return false;
      }

      if (urgencyFilter !== "all" && job.urgency !== urgencyFilter) {
        return false;
      }

      if (hideQuoted && job.my_offer !== null) {
        return false;
      }

      if (budgetFilter !== "all") {
        const refBudget = job.budget_max ?? job.budget_min;
        if (budgetFilter === "open_budget") {
          if (refBudget !== null) return false;
        } else if (refBudget === null) {
          return false;
        } else if (budgetFilter === "under_5k" && refBudget >= 5000) {
          return false;
        } else if (
          budgetFilter === "5k_20k" &&
          (refBudget < 5000 || refBudget > 20000)
        ) {
          return false;
        } else if (budgetFilter === "over_20k" && refBudget <= 20000) {
          return false;
        }
      }

      if (cleanQuery.length > 0) {
        const hay = `${job.title} ${job.description} ${job.category_name} ${job.area_name}`.toLowerCase();
        if (!hay.includes(cleanQuery)) {
          return false;
        }
      }

      return true;
    });

    return sortOpportunities(matches);
  }, [
    initialJobs,
    showAllMatches,
    myCategorySet,
    myAreaSet,
    selectedCategoryId,
    selectedAreaId,
    urgencyFilter,
    hideQuoted,
    budgetFilter,
    keyword,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredJobs.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function resetFilters() {
    setShowAllMatches(false);
    setSelectedCategoryId("all");
    setSelectedAreaId("all");
    setUrgencyFilter("all");
    setBudgetFilter("all");
    setKeyword("");
    setHideQuoted(false);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      {/* Filter Controls Card */}
      <section
        aria-label="Opportunity filters"
        className="rounded-2xl border border-[#DCE8E0] bg-white p-5 shadow-2xs space-y-4"
      >
        <div className="flex flex-col justify-between gap-3 border-b border-[#DCE8E0] pb-3.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0C2A1B]">
            <Filter className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
            <span>
              {showAllMatches
                ? "Showing all open Lahore opportunities"
                : "Matched to your skills & service areas"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] px-3 py-1.5 text-xs font-semibold text-[#0C2A1B]">
              <input
                type="checkbox"
                checked={showAllMatches}
                onChange={(e) => {
                  setShowAllMatches(e.target.checked);
                  setPage(1);
                }}
                className="h-3.5 w-3.5 rounded border-[#DCE8E0] text-[#0F6B3E] focus:ring-[#0F6B3E]"
              />
              <span>Show all categories &amp; areas</span>
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] px-3 py-1.5 text-xs font-semibold text-[#0C2A1B]">
              <input
                type="checkbox"
                checked={hideQuoted}
                onChange={(e) => {
                  setHideQuoted(e.target.checked);
                  setPage(1);
                }}
                className="h-3.5 w-3.5 rounded border-[#DCE8E0] text-[#0F6B3E] focus:ring-[#0F6B3E]"
              />
              <span>Hide jobs I already quoted</span>
            </label>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Keyword Search */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label
              htmlFor="opp-search"
              className="block text-[11px] font-semibold text-[#6A7B70] mb-1"
            >
              Keyword search
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-[#6A7B70]"
                aria-hidden="true"
              />
              <input
                id="opp-search"
                type="search"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
                placeholder="Title or description..."
                className="w-full rounded-xl border border-[#DCE8E0] bg-white pl-8 pr-3 py-2 text-xs text-[#0C2A1B] placeholder:text-[#6A7B70] focus:border-[#0F6B3E] focus:outline-none"
              />
            </div>
          </div>

          {/* Category Filter (My Categories First) */}
          <div>
            <label
              htmlFor="opp-category"
              className="block text-[11px] font-semibold text-[#6A7B70] mb-1"
            >
              Trade category
            </label>
            <select
              id="opp-category"
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-[#DCE8E0] bg-white px-3 py-2 text-xs font-medium text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
            >
              <option value="all">All categories</option>
              {orderedCategories.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
                  {myCategorySet.has(cat.id)
                    ? `★ ${cat.name} (Your skill)`
                    : cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Area Filter */}
          <div>
            <label
              htmlFor="opp-area"
              className="block text-[11px] font-semibold text-[#6A7B70] mb-1"
            >
              Service area
            </label>
            <select
              id="opp-area"
              value={selectedAreaId}
              onChange={(e) => {
                setSelectedAreaId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-[#DCE8E0] bg-white px-3 py-2 text-xs font-medium text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
            >
              <option value="all">All Lahore areas</option>
              {areas.map((area) => (
                <option key={area.id} value={String(area.id)}>
                  {myAreaSet.has(area.id)
                    ? `★ ${area.name} (Your area)`
                    : area.name}
                </option>
              ))}
            </select>
          </div>

          {/* Urgency Filter */}
          <div>
            <label
              htmlFor="opp-urgency"
              className="block text-[11px] font-semibold text-[#6A7B70] mb-1"
            >
              Urgency
            </label>
            <select
              id="opp-urgency"
              value={urgencyFilter}
              onChange={(e) => {
                setUrgencyFilter(
                  e.target.value as "all" | "urgent" | "normal"
                );
                setPage(1);
              }}
              className="w-full rounded-xl border border-[#DCE8E0] bg-white px-3 py-2 text-xs font-medium text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
            >
              <option value="all">All urgencies</option>
              <option value="urgent">Urgent only</option>
              <option value="normal">Standard only</option>
            </select>
          </div>

          {/* Budget Range Filter */}
          <div>
            <label
              htmlFor="opp-budget"
              className="block text-[11px] font-semibold text-[#6A7B70] mb-1"
            >
              Customer budget
            </label>
            <select
              id="opp-budget"
              value={budgetFilter}
              onChange={(e) => {
                setBudgetFilter(
                  e.target.value as
                    | "all"
                    | "under_5k"
                    | "5k_20k"
                    | "over_20k"
                    | "open_budget"
                );
                setPage(1);
              }}
              className="w-full rounded-xl border border-[#DCE8E0] bg-white px-3 py-2 text-xs font-medium text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
            >
              <option value="all">Any budget</option>
              <option value="under_5k">Under PKR 5,000</option>
              <option value="5k_20k">PKR 5,000 – 20,000</option>
              <option value="over_20k">Above PKR 20,000</option>
              <option value="open_budget">Open budget</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-[#6A7B70]">
          <span>
            Showing <strong>{filteredJobs.length}</strong>{" "}
            {filteredJobs.length === 1 ? "opportunity" : "opportunities"} (sorted
            urgent first, then newest)
          </span>
          <button
            type="button"
            onClick={resetFilters}
            className="font-semibold text-[#0F6B3E] hover:underline"
          >
            Reset filters
          </button>
        </div>
      </section>

      {/* Opportunity Cards List */}
      {pageItems.length === 0 ? (
        <div className="rounded-2xl border border-[#DCE8E0] bg-white p-10 text-center shadow-2xs">
          <Compass
            className="mx-auto h-8 w-8 text-[#6A7B70]"
            aria-hidden="true"
          />
          <h2 className="mt-3 text-sm font-bold text-[#0C2A1B]">
            No matching opportunities found
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-[#6A7B70]">
            {!showAllMatches
              ? "Try enabling 'Show all categories & areas' to view open requests across all of Lahore."
              : "No open customer jobs match your current filters right now."}
          </p>
          {!showAllMatches && (
            <button
              type="button"
              onClick={() => setShowAllMatches(true)}
              className="mt-4 inline-flex items-center rounded-xl bg-[#0F6B3E] px-4 py-2 text-xs font-semibold !text-white text-white hover:bg-[#0A4D2B]"
            >
              Show all categories &amp; areas
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {pageItems.map((job) => {
            const quoted = job.my_offer !== null;
            return (
              <article
                key={job.id}
                className="rounded-2xl border border-[#DCE8E0] bg-white p-5 shadow-2xs transition hover:border-[#0F6B3E]/40"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <JobStatusBadge status={job.status} />
                      {job.urgency === "urgent" && (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                          Urgent
                        </span>
                      )}
                      {quoted && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-[#E6F4EA] px-2.5 py-0.5 text-xs font-bold text-[#0F6B3E]">
                          <CheckCircle2
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                          <span>
                            You quoted ({formatPkr(job.my_offer?.price)})
                          </span>
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
                        href={`/pro/opportunities/${job.id}`}
                        className="hover:text-[#0F6B3E]"
                      >
                        {job.title}
                      </Link>
                    </h2>

                    <p className="line-clamp-2 text-xs leading-relaxed text-[#34453B]">
                      {job.description}
                    </p>
                  </div>

                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-[11px] font-medium text-[#6A7B70]">
                      Customer budget
                    </p>
                    <p className="text-sm font-extrabold text-[#0C2A1B]">
                      {formatBudgetRange(job.budget_min, job.budget_max)}
                    </p>
                    <p className="mt-1 text-[11px] text-[#6A7B70]">
                      Posted by {job.customer_first_name}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#DCE8E0] pt-3.5 text-xs">
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#6A7B70]">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      Posted {formatKarachiDate(job.created_at)}
                    </span>
                    {job.expires_at && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        Expires {formatKarachiDate(job.expires_at)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 font-semibold text-[#34453B]">
                      <Users
                        className="h-3.5 w-3.5 text-[#0F6B3E]"
                        aria-hidden="true"
                      />
                      {job.active_offer_count}{" "}
                      {job.active_offer_count === 1 ? "offer" : "offers"} so far
                    </span>
                  </div>

                  <Link
                    href={`/pro/opportunities/${job.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F6B3E] px-4 py-2 text-xs font-semibold !text-white text-white transition hover:bg-[#0A4D2B]"
                  >
                    <span className="!text-white text-white">
                      {quoted ? "View / edit your offer" : "View & send offer"}
                    </span>
                    <ArrowRight
                      className="h-3.5 w-3.5 !text-white text-white"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </article>
            );
          })}

          {filteredJobs.length > PAGE_SIZE && (
            <div className="flex items-center justify-between rounded-2xl border border-[#DCE8E0] bg-white px-4 py-3 text-xs text-[#34453B]">
              <span>
                Page <strong>{safePage}</strong> of{" "}
                <strong>{totalPages}</strong>
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
