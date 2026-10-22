import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getProfessionalState } from "@/utils/professional";
import { SiteFooter } from "@/components/prolink/site-footer";
import {
  BecomeProfessionalForm,
  type ApplicationInitialData,
  type CategoryOption,
  type AreaOption,
} from "@/components/prolink/become-professional-form";

export const metadata = {
  title: "Become a Professional | ProLink",
  description:
    "Apply to become a verified skilled professional on the ProLink network.",
};

const FALLBACK_CATEGORIES: CategoryOption[] = [
  { id: 1, name: "Plumbing" },
  { id: 2, name: "Electrical" },
  { id: 3, name: "AC Repair & HVAC" },
  { id: 4, name: "Carpentry" },
  { id: 5, name: "Appliance Repair" },
  { id: 6, name: "Deep Cleaning" },
  { id: 7, name: "Painting" },
  { id: 8, name: "Masonry" },
];

const FALLBACK_AREAS: AreaOption[] = [
  { id: 1, name: "F-6, Islamabad" },
  { id: 2, name: "F-7, Islamabad" },
  { id: 3, name: "F-8, Islamabad" },
  { id: 4, name: "Blue Area, Islamabad" },
  { id: 5, name: "DHA Phase 1, Islamabad" },
  { id: 6, name: "Bahria Town, Rawalpindi" },
  { id: 7, name: "Gulberg, Lahore" },
  { id: 8, name: "DHA Phase 5, Lahore" },
  { id: 9, name: "Clifton, Karachi" },
  { id: 10, name: "DHA Phase 6, Karachi" },
];

export default async function BecomeProfessionalPage() {
  const proInfo = await getProfessionalState();

  // 1. Protection: if user is logged out, redirect to sign-up with ?next=
  if (proInfo.state === "logged_out" || !proInfo.user) {
    redirect("/sign-in?mode=signup&next=/become-professional");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 2. Fetch categories and areas
  const { data: dbCategories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  const { data: dbAreas } = await supabase
    .from("areas")
    .select("id, name")
    .order("name");

  const categories: CategoryOption[] =
    dbCategories && dbCategories.length > 0
      ? dbCategories.map((c) => ({ id: Number(c.id), name: c.name }))
      : FALLBACK_CATEGORIES;

  const areas: AreaOption[] =
    dbAreas && dbAreas.length > 0
      ? dbAreas.map((a) => ({ id: Number(a.id), name: a.name }))
      : FALLBACK_AREAS;

  // 3. Fetch phone number from contact_details if exists
  const { data: contactRow } = await supabase
    .from("contact_details")
    .select("phone")
    .eq("profile_id", proInfo.user.id)
    .maybeSingle();

  // 4. Fetch existing skills and areas if application exists
  let existingSkillIds: number[] = [];
  let existingAreaIds: number[] = [];

  if (proInfo.professionalProfile) {
    const [skillsRes, areasRes] = await Promise.all([
      supabase
        .from("professional_skills")
        .select("category_id")
        .eq("professional_id", proInfo.user.id),
      supabase
        .from("professional_areas")
        .select("area_id")
        .eq("professional_id", proInfo.user.id),
    ]);

    if (skillsRes.data) {
      existingSkillIds = skillsRes.data.map((s) => Number(s.category_id));
    }
    if (areasRes.data) {
      existingAreaIds = areasRes.data.map((a) => Number(a.area_id));
    }
  }

  const initialData: ApplicationInitialData = {
    state: proInfo.state,
    bio: proInfo.professionalProfile?.bio || "",
    yearsExperience:
      proInfo.professionalProfile?.years_experience !== null &&
      proInfo.professionalProfile?.years_experience !== undefined
        ? proInfo.professionalProfile.years_experience
        : 3,
    selectedCategoryIds: existingSkillIds,
    selectedAreaIds: existingAreaIds,
    phone: contactRow?.phone || "",
    reviewNote: proInfo.reviewNote,
    appliedAt: proInfo.professionalProfile?.applied_at || null,
  };

  return (
    <div className="pro-page-wrapper">
      <main className="pro-page-container">
        <Link href="/" className="pro-back-link">
          ← Back to home
        </Link>
        <BecomeProfessionalForm
          initialData={initialData}
          categories={categories}
          areas={areas}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
