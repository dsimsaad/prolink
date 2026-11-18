import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { fetchProfessionalAssignedJobs } from "@/lib/pro/queries";
import { ProJobsClient } from "@/components/pro/pro-jobs-client";

export default async function ProfessionalJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/pro/jobs");
  }

  const jobs = await fetchProfessionalAssignedJobs(user.id);

  const initialTab =
    tab === "completed" || tab === "closed" || tab === "active"
      ? tab
      : "active";

  return (
    <div className="space-y-5">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
          My Jobs
        </span>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#0C2A1B] sm:text-2xl">
          Assigned customer jobs
        </h1>
        <p className="mt-1 text-xs text-[#6A7B70]">
          Start work when you arrive, mark work as done when finished, and view
          customer reviews.
        </p>
      </div>

      <ProJobsClient initialJobs={jobs} initialTab={initialTab} />
    </div>
  );
}
