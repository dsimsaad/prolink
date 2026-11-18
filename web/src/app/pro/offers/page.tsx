import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { fetchProfessionalOffers } from "@/lib/pro/queries";
import type { OfferStatus } from "@/lib/pro/types";
import { OffersClient } from "@/components/pro/offers-client";

export default async function ProfessionalOffersPage({
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
    redirect("/sign-in?next=/pro/offers");
  }

  const offers = await fetchProfessionalOffers(user.id);

  const validTab: OfferStatus =
    tab === "accepted" ||
    tab === "rejected" ||
    tab === "withdrawn" ||
    tab === "pending"
      ? tab
      : tab === "declined"
        ? "rejected"
        : "pending";

  return (
    <div className="space-y-5">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
          My Offers
        </span>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#0C2A1B] sm:text-2xl">
          Track your submitted quotes
        </h1>
        <p className="mt-1 text-xs text-[#6A7B70]">
          Edit or withdraw pending offers before a customer makes a decision.
        </p>
      </div>

      <OffersClient initialOffers={offers} initialTab={validTab} />
    </div>
  );
}
