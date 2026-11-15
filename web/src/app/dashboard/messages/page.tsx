import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, Info, MessageSquare, Phone } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { formatKarachiDate } from "@/lib/customer/format";
import { JobStatusBadge } from "@/components/customer/customer-dialog";

export default async function CustomerMessagesPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/dashboard/messages");
  }

  const { data: rawJobs } = await supabase
    .from("jobs")
    .select("id, title, status, assigned_professional_id, updated_at")
    .eq("customer_id", user.id)
    .not("assigned_professional_id", "is", null)
    .order("updated_at", { ascending: false });

  const assignedJobs = rawJobs ?? [];
  const proIds = Array.from(
    new Set(
      assignedJobs
        .map((j) =>
          j.assigned_professional_id ? String(j.assigned_professional_id) : null
        )
        .filter((id): id is string => Boolean(id))
    )
  );

  const { data: proProfiles } =
    proIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", proIds)
      : { data: [] };

  const proNameMap = new Map<string, string>();
  for (const p of proProfiles ?? []) {
    proNameMap.set(String(p.id), String(p.full_name || "Professional"));
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
          Direct Coordination
        </span>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#0C2A1B] sm:text-2xl">
          Messages
        </h1>
        <p className="mt-1 text-xs text-[#6A7B70]">
          Coordinate arrival and job details with your assigned professionals.
        </p>
      </div>

      {/* Coming Soon Banner */}
      <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6F4EA] text-[#0F6B3E]">
            <MessageSquare className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-[#0C2A1B] sm:text-base">
                Real-time chat is coming soon
              </h2>
              <span className="rounded-full border border-[#DCE8E0] bg-[#F4FAF6] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#0F6B3E]">
                Coming soon
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#34453B]">
              A conversation thread is automatically created for each job once you accept an offer. While the real-time chat module is being completed, you can view your assigned professional&apos;s direct phone number on each job&apos;s detail page.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] px-4 py-2.5 text-xs text-[#34453B]">
          <Info className="h-4 w-4 shrink-0 text-[#0F6B3E]" aria-hidden="true" />
          <span>
            For privacy, contact details are only shared between you and the assigned professional after an offer is accepted.
          </span>
        </div>
      </section>

      {/* Accepted Jobs List */}
      <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="border-b border-[#DCE8E0] pb-3">
          <h2 className="text-base font-bold text-[#0C2A1B]">
            Accepted jobs & assigned professionals ({assignedJobs.length})
          </h2>
          <p className="text-xs text-[#6A7B70]">
            Open any job below to view the assigned professional&apos;s phone number and status timeline.
          </p>
        </div>

        {assignedJobs.length === 0 ? (
          <div className="py-8 text-center">
            <Phone className="mx-auto h-7 w-7 text-[#6A7B70]" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-[#0C2A1B]">
              No accepted jobs yet
            </p>
            <p className="mt-1 text-[11px] text-[#6A7B70]">
              Once you accept an offer on one of your open jobs, the assigned professional will appear here.
            </p>
            <Link
              href="/dashboard/jobs"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#0F6B3E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0A4D2B]"
            >
              <span>View my jobs</span>
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[#DCE8E0]">
            {assignedJobs.map((j) => {
              const proName = j.assigned_professional_id
                ? proNameMap.get(String(j.assigned_professional_id)) ??
                  "Assigned Professional"
                : "Assigned Professional";

              return (
                <li
                  key={String(j.id)}
                  className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/jobs/${j.id}`}
                        className="text-xs font-bold text-[#0C2A1B] hover:text-[#0F6B3E] sm:text-sm"
                      >
                        {String(j.title)}
                      </Link>
                      <JobStatusBadge status={String(j.status)} />
                    </div>
                    <p className="text-xs text-[#34453B]">
                      Professional: <strong>{proName}</strong> · Updated{" "}
                      {formatKarachiDate(String(j.updated_at))}
                    </p>
                  </div>

                  <Link
                    href={`/dashboard/jobs/${j.id}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] px-3.5 py-2 text-xs font-semibold text-[#0F6B3E] hover:bg-[#E6F4EA]"
                  >
                    <span>View job & contact</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
