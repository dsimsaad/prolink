import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  fetchProfessionalOpportunities,
  fetchProfessionalProfileData,
} from "@/lib/pro/queries";
import { OpportunitiesClient } from "@/components/pro/opportunities-client";

export default async function ProfessionalOpportunitiesPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/pro/opportunities");
  }

  const [opportunities, profileBundle] = await Promise.all([
    fetchProfessionalOpportunities(user.id),
    fetchProfessionalProfileData(user.id, user.email ?? ""),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
          Opportunities Feed
        </span>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#0C2A1B] sm:text-2xl">
          Open customer service requests
        </h1>
        <p className="mt-1 text-xs text-[#6A7B70]">
          Review job details in Lahore and send your direct PKR quote. Prices are
          agreed directly with the customer.
        </p>
      </div>

      <OpportunitiesClient
        initialJobs={opportunities}
        categories={profileBundle.categories}
        areas={profileBundle.areas}
        myCategoryIds={profileBundle.profile.category_ids}
        myAreaIds={profileBundle.profile.area_ids}
      />
    </div>
  );
}
