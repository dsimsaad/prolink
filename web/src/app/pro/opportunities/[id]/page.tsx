import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import {
  fetchOpportunityDetail,
  fetchProfessionalProfileData,
} from "@/lib/pro/queries";
import { OpportunityDetailClient } from "@/components/pro/opportunity-detail-client";

export default async function OpportunityDetailPage({
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
    redirect(`/sign-in?next=/pro/opportunities/${encodeURIComponent(id)}`);
  }

  const [opportunity, profileBundle] = await Promise.all([
    fetchOpportunityDetail(id, user.id),
    fetchProfessionalProfileData(user.id, user.email ?? ""),
  ]);

  if (!opportunity) {
    return (
      <div className="rounded-2xl border border-[#DCE8E0] bg-white p-8 text-center shadow-2xs space-y-3">
        <h1 className="text-base font-extrabold text-[#0C2A1B]">
          Opportunity not available
        </h1>
        <p className="mx-auto max-w-md text-xs text-[#6A7B70]">
          This job may have been assigned, closed by the customer, or does not
          exist.
        </p>
        <Link
          href="/pro/opportunities"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F6B3E] px-4 py-2 text-xs font-semibold !text-white text-white hover:bg-[#0A4D2B]"
        >
          <ArrowLeft
            className="h-3.5 w-3.5 !text-white text-white"
            aria-hidden="true"
          />
          <span className="!text-white text-white">Back to opportunities</span>
        </Link>
      </div>
    );
  }

  const hasMatchingCategory = profileBundle.profile.category_ids.includes(
    opportunity.category_id
  );

  const isJobOpen =
    (opportunity.status === "Open" ||
      opportunity.status === "Offers received") &&
    (!opportunity.expires_at ||
      new Date(opportunity.expires_at).getTime() > new Date().getTime());

  return (
    <OpportunityDetailClient
      opportunity={opportunity}
      hasMatchingCategory={hasMatchingCategory}
      isJobOpen={isJobOpen}
    />
  );
}
