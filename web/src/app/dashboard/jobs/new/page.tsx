import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { fetchActiveCategoriesAndAreas } from "@/lib/customer/queries";
import { JobForm } from "@/components/customer/job-form";

export default async function NewJobPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/dashboard/jobs/new");
  }

  const [{ data: profile }, { categories, areas }] = await Promise.all([
    supabase
      .from("profiles")
      .select("area_id")
      .eq("id", user.id)
      .maybeSingle(),
    fetchActiveCategoriesAndAreas(),
  ]);

  const defaultAreaId =
    profile?.area_id !== null && profile?.area_id !== undefined
      ? Number(profile.area_id)
      : null;

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
          New Request
        </span>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#0C2A1B] sm:text-2xl">
          Post a job
        </h1>
        <p className="mt-1 text-xs text-[#6A7B70]">
          Save as a draft or publish right away so matching professionals in Lahore are notified.
        </p>
      </div>

      <JobForm
        mode="create"
        categories={categories}
        areas={areas}
        defaultAreaId={defaultAreaId}
      />
    </div>
  );
}
