import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { fetchProfessionalProfileData } from "@/lib/pro/queries";
import { ProProfileClient } from "@/components/pro/pro-profile-client";

export default async function ProfessionalProfilePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/pro/profile");
  }

  const { profile, categories, areas } = await fetchProfessionalProfileData(
    user.id,
    user.email ?? ""
  );

  return (
    <div className="space-y-5">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
          Professional Profile
        </span>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#0C2A1B] sm:text-2xl">
          Skills, service areas &amp; account settings
        </h1>
        <p className="mt-1 text-xs text-[#6A7B70]">
          Keep your trade categories, Lahore coverage areas, and availability up
          to date so customers can find and hire you.
        </p>
      </div>

      <ProProfileClient
        initialProfile={profile}
        categories={categories}
        areas={areas}
      />
    </div>
  );
}
