import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  CheckCircle2,
  FileText,
  Percent,
  Star,
  Wallet,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { fetchProfessionalStats } from "@/lib/pro/queries";
import { formatKarachiDate, formatPkr } from "@/lib/customer/format";

export default async function ProfessionalPerformancePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/pro/performance");
  }

  const stats = await fetchProfessionalStats();

  const acceptanceRate =
    stats.offers_sent > 0
      ? Math.round((stats.offers_accepted / stats.offers_sent) * 100)
      : 0;

  const maxWeeklyCount = Math.max(
    1,
    ...stats.weekly_offers.map((w) => w.count)
  );

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
          Performance &amp; Activity
        </span>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#0C2A1B] sm:text-2xl">
          Your professional metrics
        </h1>
        <p className="mt-1 text-xs text-[#6A7B70]">
          Real counts from your submitted offers, assigned jobs, and customer
          reviews on ProLink.
        </p>
      </div>

      {/* Stat Cards Grid */}
      <section
        aria-label="Performance statistics"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-2xl border border-[#DCE8E0] bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6A7B70]">
            <span>Offers sent</span>
            <FileText className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#0C2A1B]">
            {stats.offers_sent}
          </p>
          <p className="mt-1 text-[11px] text-[#6A7B70]">
            {stats.offers_pending} pending · {stats.offers_withdrawn} withdrawn
          </p>
        </div>

        <div className="rounded-2xl border border-[#DCE8E0] bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6A7B70]">
            <span>Offers accepted</span>
            <Percent className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#0C2A1B]">
            {stats.offers_accepted}{" "}
            <span className="text-sm font-bold text-[#0F6B3E]">
              ({acceptanceRate}%)
            </span>
          </p>
          <p className="mt-1 text-[11px] text-[#6A7B70]">
            Acceptance rate across all quotes
          </p>
        </div>

        <div className="rounded-2xl border border-[#DCE8E0] bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6A7B70]">
            <span>Active &amp; completed jobs</span>
            <Briefcase className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#0C2A1B]">
            {stats.jobs_completed} completed
          </p>
          <p className="mt-1 text-[11px] text-[#6A7B70]">
            {stats.jobs_active} currently active
          </p>
        </div>

        <div className="rounded-2xl border border-[#DCE8E0] bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6A7B70]">
            <span>Reviews &amp; rating</span>
            <Star className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#0C2A1B]">
            {stats.reviews_count > 0 && stats.avg_rating !== null
              ? `${Number(stats.avg_rating).toFixed(1)} / 5`
              : "New"}
          </p>
          <p className="mt-1 text-[11px] text-[#6A7B70]">
            {stats.reviews_count}{" "}
            {stats.reviews_count === 1 ? "review" : "reviews"} received
          </p>
        </div>
      </section>

      {/* Quoted Value Card + 8-Week Bar Chart */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6A7B70]">
            <span>Agreed value of completed jobs</span>
            <Wallet className="h-4 w-4 text-[#0F6B3E]" aria-hidden="true" />
          </div>
          <p className="text-2xl font-extrabold text-[#0F6B3E]">
            {formatPkr(stats.completed_agreed_value)}
          </p>
          <div className="rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-3.5 text-xs text-[#34453B]">
            <p className="font-bold text-[#0C2A1B]">
              Quoted value, not tracked payments
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#6A7B70]">
              This is the sum of your accepted offer prices on jobs marked as
              Completed. Prices are agreed and settled directly between customer
              and professional; ProLink does not process payments or hold funds.
            </p>
          </div>
        </section>

        {/* Accessible 8-Week Offers Bar Chart */}
        <section
          aria-labelledby="weekly-offers-heading"
          className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs lg:col-span-7 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#DCE8E0] pb-3">
            <div>
              <h2
                id="weekly-offers-heading"
                className="text-base font-bold text-[#0C2A1B]"
              >
                Offers sent per week (last 8 weeks)
              </h2>
              <p className="text-xs text-[#6A7B70]">
                Weekly quote volume submitted from your account
              </p>
            </div>
            <BarChart3
              className="h-5 w-5 text-[#0F6B3E]"
              aria-hidden="true"
            />
          </div>

          {stats.weekly_offers.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle2
                className="mx-auto h-7 w-7 text-[#6A7B70]"
                aria-hidden="true"
              />
              <p className="mt-2 text-xs font-semibold text-[#0C2A1B]">
                No weekly data yet
              </p>
            </div>
          ) : (
            <div
              role="img"
              aria-label="Bar chart showing offers sent per week over the last 8 weeks"
              className="pt-2"
            >
              <div className="grid grid-cols-8 items-end gap-2 sm:gap-3 h-44 border-b border-[#DCE8E0] pb-2">
                {stats.weekly_offers.map((bucket) => {
                  const pct =
                    bucket.count > 0
                      ? Math.max(12, Math.round((bucket.count / maxWeeklyCount) * 100))
                      : 4;
                  const labelDate = formatKarachiDate(bucket.week_start);

                  return (
                    <div
                      key={bucket.week_start}
                      className="flex h-full flex-col items-center justify-end gap-1.5"
                    >
                      <span className="text-[11px] font-bold text-[#0C2A1B]">
                        {bucket.count}
                      </span>
                      <div
                        title={`Week of ${labelDate}: ${bucket.count} offers`}
                        style={{ height: `${pct}%` }}
                        className={`w-full max-w-9 rounded-t-lg transition-all ${
                          bucket.count > 0
                            ? "bg-[#0F6B3E]"
                            : "bg-[#DCE8E0]/60"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 grid grid-cols-8 gap-1 text-center text-[10px] text-[#6A7B70]">
                {stats.weekly_offers.map((bucket) => {
                  const shortDate = bucket.week_start
                    ? new Date(bucket.week_start).toLocaleDateString("en-PK", {
                        month: "short",
                        day: "numeric",
                      })
                    : "—";
                  return (
                    <span key={`lbl-${bucket.week_start}`} className="truncate">
                      {shortDate}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
