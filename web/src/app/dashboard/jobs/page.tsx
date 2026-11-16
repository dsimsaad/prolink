import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { fetchCustomerJobs } from "@/lib/customer/queries";
import { JobsListClient } from "@/components/customer/jobs-list-client";

export default async function CustomerJobsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/dashboard/jobs");
  }

  const jobs = await fetchCustomerJobs(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
            Requests & Quotes
          </span>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#0C2A1B] sm:text-2xl">
            My jobs
          </h1>
          <p className="mt-1 text-xs text-[#6A7B70]">
            Track drafts, open requests, incoming offers, active assignments, and completed work.
          </p>
        </div>

        <Link
          href="/dashboard/jobs/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F6B3E] px-4 py-2.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#0A4D2B]"
        >
          <PlusCircle className="h-4 w-4 text-white" aria-hidden="true" />
          <span>Post a job</span>
        </Link>
      </div>

      <JobsListClient jobs={jobs} />
    </div>
  );
}
