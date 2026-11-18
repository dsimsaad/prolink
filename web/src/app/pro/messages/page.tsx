import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, MessageSquare, Phone, User } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { fetchProfessionalAssignedJobs } from "@/lib/pro/queries";
import { JobStatusBadge } from "@/components/customer/customer-dialog";

export default async function ProfessionalMessagesPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/pro/messages");
  }

  const assignedJobs = await fetchProfessionalAssignedJobs(user.id);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#DCE8E0] bg-white p-6 shadow-2xs space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#DCE8E0] bg-[#F4FAF6] px-3 py-1 text-xs font-semibold text-[#0F6B3E]">
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          <span>In-App Chat Coming Soon</span>
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-[#0C2A1B] sm:text-2xl">
          Customer messages
        </h1>
        <p className="max-w-2xl text-xs leading-relaxed text-[#6A7B70]">
          Real-time chat opens after a customer accepts your offer and is
          coming soon. In the meantime, once your offer is accepted on a job,
          the customer&apos;s phone number is unlocked on the job detail page so
          you can call them directly.
        </p>
      </div>

      <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="border-b border-[#DCE8E0] pb-3">
          <h2 className="text-base font-bold text-[#0C2A1B]">
            Accepted jobs with unlocked customer contact ({assignedJobs.length})
          </h2>
          <p className="text-xs text-[#6A7B70]">
            Open any assigned job below to view the customer&apos;s phone number
            and coordinate directly.
          </p>
        </div>

        {assignedJobs.length === 0 ? (
          <div className="py-10 text-center">
            <Phone
              className="mx-auto h-8 w-8 text-[#6A7B70]"
              aria-hidden="true"
            />
            <p className="mt-2 text-xs font-bold text-[#0C2A1B]">
              No accepted jobs yet
            </p>
            <p className="mx-auto mt-1 max-w-md text-[11px] text-[#6A7B70]">
              When a customer accepts one of your offers, their job and contact
              link will appear here.
            </p>
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
          </div>
        ) : (
          <ul className="divide-y divide-[#DCE8E0]">
            {assignedJobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <JobStatusBadge status={job.status} />
                    <Link
                      href={`/pro/jobs/${job.id}`}
                      className="text-sm font-bold text-[#0C2A1B] hover:text-[#0F6B3E]"
                    >
                      {job.title}
                    </Link>
                  </div>
                  <p className="inline-flex items-center gap-1.5 text-xs text-[#34453B]">
                    <User
                      className="h-3.5 w-3.5 text-[#0F6B3E]"
                      aria-hidden="true"
                    />
                    <span>Customer:</span>
                    <strong className="text-[#0C2A1B]">
                      {job.customer_name}
                    </strong>
                    <span className="text-[#6A7B70]">· {job.area_name}</span>
                  </p>
                </div>

                <Link
                  href={`/pro/jobs/${job.id}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F6B3E] hover:bg-[#E6F4EA]"
                >
                  <span>Open job &amp; contact</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
