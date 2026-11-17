import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getProfessionalState } from "@/utils/professional";
import { fetchActiveCategoriesAndAreas } from "@/lib/customer/queries";
import { ProfileClient } from "@/components/customer/profile-client";

export default async function CustomerProfilePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/dashboard/profile");
  }

  const [{ data: profile }, { data: contactRow }, { areas }, proState] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, area_id")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("contact_details")
        .select("phone")
        .eq("profile_id", user.id)
        .maybeSingle(),
      fetchActiveCategoriesAndAreas(),
      getProfessionalState(),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#0F6B3E]">
          My Account
        </span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0C2A1B] sm:text-3xl">
          Profile
        </h1>
        <p className="mt-1 text-sm text-[#6A7B70]">
          Keep your profile current so professionals and administrators can see the right contact details and service area context.
        </p>
      </div>

      <ProfileClient
        customerId={user.id}
        email={user.email ?? ""}
        initialFullName={profile?.full_name ? String(profile.full_name) : ""}
        initialAreaId={
          profile?.area_id !== null && profile?.area_id !== undefined
            ? Number(profile.area_id)
            : null
        }
        initialPhone={contactRow?.phone ? String(contactRow.phone) : ""}
        areas={areas}
        professionalState={proState.state}
        reviewNote={proState.reviewNote}
      />
    </div>
  );
}
