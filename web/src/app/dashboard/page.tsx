import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Inbox,
  PlusCircle,
  Star,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import {
  fetchCustomerJobs,
  fetchCustomerRecentEvents,
} from "@/lib/customer/queries";
import { formatKarachiDateTime } from "@/lib/customer/format";
import { JobStatusBadge } from "@/components/customer/customer-dialog";

export default async function CustomerOverviewPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const fullName = profile?.full_name || user.email || "Customer";
  const firstName = fullName.trim().split(/\s+/)[0] || "Customer";

  const jobs = await fetchCustomerJobs(user.id);
  const recentEvents = await fetchCustomerRecentEvents(
    jobs.map((j) => j.id),
    8
  );

  const activeJobsCount = jobs.filter((j) =>
    ["Open", "Offers received", "Assigned", "In progress"].includes(j.status)
  ).length;

  const offersWaitingCount = jobs
    .filter((j) => j.status === "Open" || j.status === "Offers received")
    .reduce((acc, j) => acc + j.pending_offer_count, 0);

  const inProgressCount = jobs.filter(
    (j) => j.status === "Assigned" || j.status === "In progress"
  ).length;

  const completedCount = jobs.filter((j) => j.status === "Completed").length;

  const attentionItems = [
    ...jobs
      .filter(
        (j) =>
          (j.status === "Open" || j.status === "Offers received") &&
          j.pending_offer_count > 0
      )
      .map((j) => ({
        id: `offers-${j.id}`,
        jobId: j.id,
        title: j.title,
        badge: `${j.pending_offer_count} ${
          j.pending_offer_count === 1 ? "offer" : "offers"
        } waiting`,
        description: "Compare quotes and accept a professional to begin work.",
        ctaLabel: "Review offers",
        href: `/dashboard/jobs/${j.id}`,
      })),
    ...jobs
      .filter((j) => j.status === "In progress")
      .map((j) => ({
        id: `progress-${j.id}`,
        jobId: j.id,
        title: j.title,
        badge: "In progress",
        description: "Confirm completion once the professional finishes the work.",
        ctaLabel: "View & complete",
        href: `/dashboard/jobs/${j.id}`,
      })),
    ...jobs
      .filter((j) => j.status === "Completed" && !j.has_review)
      .map((j) => ({
        id: `review-${j.id}`,
        jobId: j.id,
        title: j.title,
        badge: "Review pending",
        description: "Share a 1–5 star rating for the completed service.",
        ctaLabel: "Leave a review",
        href: `/dashboard/jobs/${j.id}`,
      })),
    ...jobs
      .filter((j) => j.status === "Draft")
      .map((j) => ({
        id: `draft-${j.id}`,
        jobId: j.id,
        title: j.title,
        badge: "Draft",
        description: "Unpublished draft—finish editing and post when ready.",
        ctaLabel: "Edit draft",
        href: `/dashboard/jobs/${j.id}/edit`,
      })),
  ];

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:flex-row sm:items-center sm:p-6 shadow-2xs">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
            Customer Workspace
          </span>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#0C2A1B] sm:text-2xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-xs text-[#6A7B70]">
            Post service requests in Lahore, compare direct offers from professionals, and manage your jobs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard/jobs"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE8E0] bg-white px-4 py-2.5 text-xs font-semibold text-[#0C2A1B] transition hover:bg-[#F4FAF6]"
          >
            <span>My jobs</span>
          </Link>
          <Link
            href="/dashboard/jobs/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F6B3E] px-4 py-2.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#0A4D2B]"
          >
            <PlusCircle className="h-4 w-4 text-white" aria-hidden="true" />
            <span>Post a job</span>
          </Link>
        </div>
      </section>

      {/* Four Stat Cards */}
      <section
        aria-label="Job summary metrics"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-2xl border border-[#DCE8E0] bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6A7B70]">
            <span>Active jobs</span>
            <Briefcase className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#0C2A1B]">
            {activeJobsCount}
          </p>
          <p className="mt-1 text-[11px] text-[#6A7B70]">
            Open or assigned requests
          </p>
        </div>

        <div className="rounded-2xl border border-[#DCE8E0] bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6A7B70]">
            <span>Offers waiting</span>
            <Inbox className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#0C2A1B]">
            {offersWaitingCount}
          </p>
          <p className="mt-1 text-[11px] text-[#6A7B70]">
            Pending quotes to compare
          </p>
        </div>

        <div className="rounded-2xl border border-[#DCE8E0] bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6A7B70]">
            <span>In progress</span>
            <Clock className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#0C2A1B]">
            {inProgressCount}
          </p>
          <p className="mt-1 text-[11px] text-[#6A7B70]">
            Assigned or work underway
          </p>
        </div>

        <div className="rounded-2xl border border-[#DCE8E0] bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6A7B70]">
            <span>Completed</span>
            <CheckCircle2 className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#0C2A1B]">
            {completedCount}
          </p>
          <p className="mt-1 text-[11px] text-[#6A7B70]">
            Confirmed completed jobs
          </p>
        </div>
      </section>

      {jobs.length === 0 ? (
        /* First-time empty state with 3 steps */
        <section className="rounded-2xl border border-[#DCE8E0] bg-white p-6 sm:p-8 shadow-2xs">
          <div className="max-w-2xl">
            <h2 className="text-lg font-extrabold text-[#0C2A1B]">
              Post your first job in three simple steps
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#6A7B70]">
              You haven&apos;t posted any jobs yet. Describe what needs fixing and receive quotes from approved local professionals.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-4">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0F6B3E] text-xs font-bold text-white">
                1
              </span>
              <h3 className="mt-2.5 text-xs font-bold text-[#0C2A1B]">
                Describe the task
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-[#6A7B70]">
                Pick a service category, choose your Lahore neighbourhood, and set an optional PKR budget.
              </p>
            </div>

            <div className="rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-4">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0F6B3E] text-xs font-bold text-white">
                2
              </span>
              <h3 className="mt-2.5 text-xs font-bold text-[#0C2A1B]">
                Compare offers
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-[#6A7B70]">
                Review quotes sorted by price, arrival time, or rating. Prices are agreed directly with the professional.
              </p>
            </div>

            <div className="rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-4">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0F6B3E] text-xs font-bold text-white">
                3
              </span>
              <h3 className="mt-2.5 text-xs font-bold text-[#0C2A1B]">
                Confirm & review
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-[#6A7B70]">
                Accept an offer to unlock contact details, mark the job completed when done, and leave a rating.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href="/dashboard/jobs/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0F6B3E] px-5 py-2.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#0A4D2B]"
            >
              <PlusCircle className="h-4 w-4 text-white" aria-hidden="true" />
              <span>Post your first job</span>
            </Link>
          </div>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Needs Your Attention */}
          <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs lg:col-span-7">
            <div className="flex items-center justify-between border-b border-[#DCE8E0] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0C2A1B]">
                  Needs your attention
                </h2>
                <p className="text-xs text-[#6A7B70]">
                  Jobs with offers to review, work in progress, or awaiting your rating
                </p>
              </div>
              <Link
                href="/dashboard/jobs"
                className="text-xs font-semibold text-[#0F6B3E] hover:underline"
              >
                All jobs →
              </Link>
            </div>

            {attentionItems.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2
                  className="mx-auto h-7 w-7 text-[#0F6B3E]"
                  aria-hidden="true"
                />
                <p className="mt-2 text-xs font-semibold text-[#0C2A1B]">
                  You&apos;re all caught up
                </p>
                <p className="mt-1 text-[11px] text-[#6A7B70]">
                  No jobs currently need an action from you.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#DCE8E0]">
                {attentionItems.slice(0, 6).map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={item.href}
                          className="truncate text-xs font-bold text-[#0C2A1B] hover:text-[#0F6B3E]"
                        >
                          {item.title}
                        </Link>
                        <span className="inline-flex items-center rounded-full border border-[#DCE8E0] bg-[#F4FAF6] px-2 py-0.5 text-[10px] font-semibold text-[#0F6B3E]">
                          {item.badge}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[#6A7B70]">
                        {item.description}
                      </p>
                    </div>
                    <Link
                      href={item.href}
                      className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#DCE8E0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F6B3E] transition hover:bg-[#E6F4EA]"
                    >
                      <span>{item.ctaLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent Activity from job_events */}
          <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs lg:col-span-5">
            <div className="border-b border-[#DCE8E0] pb-3">
              <h2 className="text-base font-bold text-[#0C2A1B]">
                Recent activity
              </h2>
              <p className="text-xs text-[#6A7B70]">
                Latest status updates across your jobs
              </p>
            </div>

            {recentEvents.length === 0 ? (
              <div className="py-10 text-center">
                <Star className="mx-auto h-7 w-7 text-[#6A7B70]" aria-hidden="true" />
                <p className="mt-2 text-xs font-semibold text-[#0C2A1B]">
                  No status events yet
                </p>
                <p className="mt-1 text-[11px] text-[#6A7B70]">
                  Events appear here as your jobs are published, assigned, and completed.
                </p>
              </div>
            ) : (
              <ol className="divide-y divide-[#DCE8E0]">
                {recentEvents.map((ev) => (
                  <li key={ev.id} className="py-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/dashboard/jobs/${ev.job_id}`}
                        className="truncate font-semibold text-[#0C2A1B] hover:text-[#0F6B3E]"
                      >
                        {ev.job_title}
                      </Link>
                      <JobStatusBadge status={ev.to_status} />
                    </div>
                    {ev.note && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-[#34453B]">
                        {ev.note}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-[#6A7B70]">
                      {formatKarachiDateTime(ev.at)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
