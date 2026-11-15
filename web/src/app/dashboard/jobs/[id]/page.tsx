import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { fetchCustomerJobDetail } from "@/lib/customer/queries";
import { JobDetailClient } from "@/components/customer/job-detail-client";

export default async function CustomerJobDetailPage({
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
    redirect(`/sign-in?next=/dashboard/jobs/${encodeURIComponent(id)}`);
  }

  const { job, offers, events, assignedProfessional, review } =
    await fetchCustomerJobDetail(id, user.id);

  if (!job) {
    notFound();
  }

  return (
    <JobDetailClient
      job={job}
      offers={offers}
      events={events}
      assignedProfessional={assignedProfessional}
      review={review}
    />
  );
}
