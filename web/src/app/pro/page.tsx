import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Briefcase,
  CheckCircle2,
  Compass,
  FileText,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import {
  fetchProfessionalAssignedJobs,
  fetchProfessionalNotifications,
  fetchProfessionalOffers,
  fetchProfessionalOpportunities,
  fetchProfessionalProfileData,
} from "@/lib/pro/queries";
import { formatKarachiDateTime, formatPkr } from "@/lib/customer/format";

export default async function ProfessionalOverviewPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/pro");
  }

  const [
    profileBundle,
    opportunities,
    offers,
    assignedJobs,
    notifications,
  ] = await Promise.all([
    fetchProfessionalProfileData(user.id, user.email ?? ""),
    fetchProfessionalOpportunities(user.id),
    fetchProfessionalOffers(user.id),
    fetchProfessionalAssignedJobs(user.id),
    fetchProfessionalNotifications(user.id),
  ]);

  const { profile } = profileBundle;
  const firstName =
    profile.full_name.trim().split(/\s+/)[0] || "Professional";

  const myCategorySet = new Set(profile.category_ids);
  const myAreaSet = new Set(profile.area_ids);

  const matchingNewOpportunities = opportunities.filter(
    (o) =>
      !o.my_offer &&
      (myCategorySet.size === 0 || myCategorySet.has(o.category_id)) &&
      (myAreaSet.size === 0 || myAreaSet.has(o.area_id))
  );

  const pendingOffers = offers.filter((o) => o.status === "pending");
  const activeJobs = assignedJobs.filter(
    (j) => j.status === "Assigned" || j.status === "In progress"
  );
  const completedJobs = assignedJobs.filter((j) => j.status === "Completed");

  // Profile completeness checks: bio (30..1000), skills (1..5), areas (1..12), phone (11 digits)
  const missingItems: string[] = [];
  if (profile.bio.trim().length < 30) {
    missingItems.push("Add a bio (at least 30 characters)");
  }
  if (profile.category_ids.length === 0) {
    missingItems.push("Select at least 1 trade category");
  }
  if (profile.area_ids.length === 0) {
    missingItems.push("Select at least 1 Lahore service area");
  }
  if (!profile.phone.trim()) {
    missingItems.push("Add your 11-digit mobile phone number");
  }

  // Needs your attention items:
  // 1) Offers accepted and waiting to start (Assigned jobs)
  // 2) Jobs in progress
  // 3) Unread new_job_match notifications
  const unreadMatchNotifs = notifications.filter(
    (n) => n.type === "new_job_match" && !n.read_at
  );

  const attentionItems = [
    ...assignedJobs
      .filter((j) => j.status === "Assigned")
      .map((j) => ({
        id: `start-${j.id}`,
        title: j.title,
        badge: "Offer accepted · Waiting to start",
        description: `Customer (${j.customer_name}) accepted your offer${
          j.agreed_price ? ` of ${formatPkr(j.agreed_price)}` : ""
        }. Contact details are unlocked—start work when you arrive.`,
        ctaLabel: "Open job & start",
        href: `/pro/jobs/${j.id}`,
      })),
    ...assignedJobs
      .filter((j) => j.status === "In progress")
      .map((j) => ({
        id: `progress-${j.id}`,
        title: j.title,
        badge: j.professional_marked_done_at
          ? "Marked done · Waiting for customer"
          : "In progress",
        description: j.professional_marked_done_at
          ? "You marked the work as done. Waiting for the customer to confirm completion."
          : `Work is underway for ${j.customer_name} in ${j.area_name}. Mark as done when finished.`,
        ctaLabel: "Manage job",
        href: `/pro/jobs/${j.id}`,
      })),
    ...unreadMatchNotifs.slice(0, 3).map((n) => {
      const payload = n.payload ?? {};
      const jobId =
        typeof payload.job_id === "string"
          ? payload.job_id
          : typeof payload.jobId === "string"
            ? payload.jobId
            : null;
      const jobTitle =
        typeof payload.title === "string" && payload.title.trim().length > 0
          ? payload.title.trim()
          : "New matching customer job";
      return {
        id: `match-${n.id}`,
        title: jobTitle,
        badge: "New match",
        description:
          "Matches your trade category and Lahore service area. Send a clear quote early.",
        ctaLabel: "View & quote",
        href: jobId ? `/pro/opportunities/${jobId}` : "/pro/opportunities",
      };
    }),
  ];

  const isFirstTimePro = offers.length === 0 && assignedJobs.length === 0;

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-[#CDE9D6] bg-white p-5 sm:flex-row sm:items-center sm:p-6 shadow-2xs">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Professional Workspace · Work Mode</span>
          </span>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#0C2A1B] sm:text-2xl">
            Welcome, {firstName}
          </h1>
          <p className="mt-1 text-xs text-[#6A7B70]">
            Browse matching service requests in Lahore, send transparent PKR
            quotes, and manage your assigned jobs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/pro/jobs"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE8E0] bg-white px-4 py-2.5 text-xs font-semibold text-[#0C2A1B] transition hover:bg-[#F4FAF6]"
          >
            <span>My jobs</span>
          </Link>
          <Link
            href="/pro/opportunities"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F6B3E] px-4 py-2.5 text-xs font-semibold !text-white text-white shadow-2xs transition hover:bg-[#0A4D2B]"
          >
            <Compass
              className="h-4 w-4 !text-white text-white"
              aria-hidden="true"
            />
            <span className="!text-white text-white">Browse opportunities</span>
          </Link>
        </div>
      </section>

      {/* Profile Completeness Hint */}
      {missingItems.length > 0 && (
        <section
          aria-label="Profile completeness reminder"
          className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 sm:flex-row sm:items-center"
        >
          <div className="flex items-start gap-2.5 text-xs text-amber-950">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
              aria-hidden="true"
            />
            <div>
              <p className="font-bold text-amber-900">
                Complete your professional profile to improve matching
              </p>
              <p className="mt-0.5 text-[11px] text-amber-800">
                Missing: {missingItems.join(" · ")}
              </p>
            </div>
          </div>
          <Link
            href="/pro/profile"
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
          >
            <span>Complete profile</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </section>
      )}

      {/* Four Stat Cards */}
      <section
        aria-label="Professional workspace metrics"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Link
          href="/pro/opportunities"
          className="rounded-2xl border border-[#DCE8E0] bg-white p-5 shadow-2xs transition hover:border-[#0F6B3E]/40"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#6A7B70]">
            <span>New opportunities</span>
            <Compass className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#0C2A1B]">
            {matchingNewOpportunities.length}
          </p>
          <p className="mt-1 text-[11px] text-[#6A7B70]">
            Open in your skills &amp; areas
          </p>
        </Link>

        <Link
          href="/pro/offers"
          className="rounded-2xl border border-[#DCE8E0] bg-white p-5 shadow-2xs transition hover:border-[#0F6B3E]/40"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#6A7B70]">
            <span>Pending offers</span>
            <FileText className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#0C2A1B]">
            {pendingOffers.length}
          </p>
          <p className="mt-1 text-[11px] text-[#6A7B70]">
            Awaiting customer decision
          </p>
        </Link>

        <Link
          href="/pro/jobs"
          className="rounded-2xl border border-[#DCE8E0] bg-white p-5 shadow-2xs transition hover:border-[#0F6B3E]/40"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#6A7B70]">
            <span>Active jobs</span>
            <Briefcase className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#0C2A1B]">
            {activeJobs.length}
          </p>
          <p className="mt-1 text-[11px] text-[#6A7B70]">
            Assigned or work in progress
          </p>
        </Link>

        <Link
          href="/pro/jobs?tab=completed"
          className="rounded-2xl border border-[#DCE8E0] bg-white p-5 shadow-2xs transition hover:border-[#0F6B3E]/40"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#6A7B70]">
            <span>Completed jobs</span>
            <CheckCircle2
              className="h-4 w-4 text-[#0F6B3E]"
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#0C2A1B]">
            {completedJobs.length}
          </p>
          <p className="mt-1 text-[11px] text-[#6A7B70]">
            Confirmed by customers
          </p>
        </Link>
      </section>

      {/* First-Time Professional Empty State Guide */}
      {isFirstTimePro && (
        <section className="rounded-2xl border border-[#DCE8E0] bg-white p-6 sm:p-8 shadow-2xs">
          <div className="max-w-2xl">
            <h2 className="text-lg font-extrabold text-[#0C2A1B]">
              Start winning jobs in three simple steps
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#6A7B70]">
              You have not sent any quotes yet. Follow these steps to connect
              with local customers in Lahore.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-4">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0F6B3E] text-xs font-bold !text-white text-white">
                1
              </span>
              <h3 className="mt-2.5 text-xs font-bold text-[#0C2A1B]">
                Browse matching opportunities
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-[#6A7B70]">
                Filter open jobs by your trade categories and Lahore service
                areas. Urgent jobs appear at the top.
              </p>
            </div>

            <div className="rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-4">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0F6B3E] text-xs font-bold !text-white text-white">
                2
              </span>
              <h3 className="mt-2.5 text-xs font-bold text-[#0C2A1B]">
                Send a clear PKR quote
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-[#6A7B70]">
                Share your price, inspection fee, and estimated arrival time.
                Prices are agreed directly with the customer.
              </p>
            </div>

            <div className="rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-4">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0F6B3E] text-xs font-bold !text-white text-white">
                3
              </span>
              <h3 className="mt-2.5 text-xs font-bold text-[#0C2A1B]">
                Complete work &amp; earn reviews
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-[#6A7B70]">
                Once accepted, call the customer directly, start work, and mark
                the job as done so they can confirm and review.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href="/pro/opportunities"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0F6B3E] px-5 py-2.5 text-xs font-semibold !text-white text-white shadow-2xs transition hover:bg-[#0A4D2B]"
            >
              <Compass
                className="h-4 w-4 !text-white text-white"
                aria-hidden="true"
              />
              <span className="!text-white text-white">
                Explore open opportunities
              </span>
            </Link>
          </div>
        </section>
      )}

      {/* Main Two-Column Grid: Needs Your Attention & Recent Notifications */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs lg:col-span-7">
          <div className="flex items-center justify-between border-b border-[#DCE8E0] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#0C2A1B]">
                Needs your attention
              </h2>
              <p className="text-xs text-[#6A7B70]">
                Accepted offers ready to start, active jobs, and new matches
              </p>
            </div>
            <Link
              href="/pro/jobs"
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
                No accepted jobs or new matches need immediate action right now.
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

        {/* Recent Notifications */}
        <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs lg:col-span-5">
          <div className="flex items-center justify-between border-b border-[#DCE8E0] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#0C2A1B]">
                Recent notifications
              </h2>
              <p className="text-xs text-[#6A7B70]">
                Updates on matches, offers, and reviews
              </p>
            </div>
            <Link
              href="/pro/notifications"
              className="text-xs font-semibold text-[#0F6B3E] hover:underline"
            >
              View all →
            </Link>
          </div>

          {notifications.length === 0 ? (
            <div className="py-10 text-center">
              <Bell
                className="mx-auto h-7 w-7 text-[#6A7B70]"
                aria-hidden="true"
              />
              <p className="mt-2 text-xs font-semibold text-[#0C2A1B]">
                No notifications yet
              </p>
              <p className="mt-1 text-[11px] text-[#6A7B70]">
                Alerts appear here when matching jobs are posted or customers
                respond to your offers.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#DCE8E0]">
              {notifications.slice(0, 5).map((notif) => {
                const payload = notif.payload ?? {};
                const jobTitle =
                  typeof payload.title === "string" &&
                  payload.title.trim().length > 0
                    ? payload.title.trim()
                    : "Account update";
                return (
                  <li key={notif.id} className="py-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-[#0C2A1B]">
                        {jobTitle}
                      </span>
                      {!notif.read_at && (
                        <span className="inline-flex rounded-full bg-[#0F6B3E] px-2 py-0.5 text-[10px] font-bold !text-white text-white">
                          New
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#6A7B70]">
                      {notif.type.replace(/_/g, " ")} ·{" "}
                      {formatKarachiDateTime(notif.created_at)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
