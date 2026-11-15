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
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
          Account Settings
        </span>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#0C2A1B] sm:text-2xl">
          Profile
        </h1>
        <p className="mt-1 text-xs text-[#6A7B70]">
          Manage your name, default area in Lahore, phone number, and password.
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
