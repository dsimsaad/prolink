import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  fetchActiveCategoriesAndAreas,
  fetchCustomerJobDetail,
} from "@/lib/customer/queries";
import { JobForm } from "@/components/customer/job-form";

export default async function EditDraftJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=/dashboard/jobs/${encodeURIComponent(id)}/edit`);
  }

  const [{ job }, { categories, areas }] = await Promise.all([
    fetchCustomerJobDetail(id, user.id),
    fetchActiveCategoriesAndAreas(),
  ]);

  if (!job) {
    notFound();
  }

  if (job.status !== "Draft") {
    redirect(`/dashboard/jobs/${encodeURIComponent(job.id)}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
          Edit Draft
        </span>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#0C2A1B] sm:text-2xl">
          Edit draft job
        </h1>
        <p className="mt-1 text-xs text-[#6A7B70]">
          Update your draft details below or publish the job to begin receiving offers.
        </p>
      </div>

      <JobForm
        mode="edit"
        jobId={job.id}
        categories={categories}
        areas={areas}
        defaultAreaId={job.area_id}
        initialValues={{
          title: job.title,
          description: job.description,
          categoryId: job.category_id,
          areaId: job.area_id,
          budgetMin: job.budget_min,
          budgetMax: job.budget_max,
          urgency: job.urgency,
        }}
      />
    </div>
  );
}
