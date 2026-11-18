import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { fetchProfessionalJobDetail } from "@/lib/pro/queries";
import { ProJobDetailClient } from "@/components/pro/pro-job-detail-client";

export default async function ProfessionalJobDetailPage({
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
    redirect(`/sign-in?next=/pro/jobs/${encodeURIComponent(id)}`);
  }

  const { job, customerPhone, events, review } =
    await fetchProfessionalJobDetail(id, user.id);

  if (!job) {
    return (
      <div className="rounded-2xl border border-[#DCE8E0] bg-white p-8 text-center shadow-2xs space-y-3">
        <h1 className="text-base font-extrabold text-[#0C2A1B]">
          Job not found
        </h1>
        <p className="mx-auto max-w-md text-xs text-[#6A7B70]">
          This job is not assigned to your professional account or does not
          exist.
        </p>
        <Link
          href="/pro/jobs"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F6B3E] px-4 py-2 text-xs font-semibold !text-white text-white hover:bg-[#0A4D2B]"
        >
          <ArrowLeft
            className="h-3.5 w-3.5 !text-white text-white"
            aria-hidden="true"
          />
          <span className="!text-white text-white">Back to My jobs</span>
        </Link>
      </div>
    );
  }

  return (
    <ProJobDetailClient
      job={job}
      customerPhone={customerPhone}
      events={events}
      review={review}
    />
  );
}
