import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getProfessionalState } from "@/utils/professional";
import { Brand } from "@/components/prolink/brand";
import {
  ProfessionalApplicationWizard,
  type MultiStepInitialData,
  type CategoryOption,
  type AreaOption,
} from "@/components/prolink/professional-application-wizard";

export const metadata = {
  title: "Become a Professional — Application | ProLink",
  description:
    "Complete your multi-step registration and application to become a verified professional on ProLink.",
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

  // 1. If user is not authenticated, redirect to the dedicated Professional Sign-In Page
  if (proInfo.state === "logged_out" || !proInfo.user) {
    redirect("/become-professional/sign-in");
  }

  // 2. If user is already an approved professional, redirect to the dashboard
  if (proInfo.state === "approved") {
    redirect("/user");
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 3. Fetch categories and service areas from database
  const [dbCategoriesRes, dbAreasRes, contactRowRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase.from("areas").select("id, name").order("name"),
    supabase
      .from("contact_details")
      .select("phone")
      .eq("profile_id", proInfo.user.id)
      .maybeSingle(),
  ]);

  const categories: CategoryOption[] =
    dbCategoriesRes.data && dbCategoriesRes.data.length > 0
      ? dbCategoriesRes.data.map((c) => ({ id: Number(c.id), name: c.name }))
      : FALLBACK_CATEGORIES;

  const areas: AreaOption[] =
    dbAreasRes.data && dbAreasRes.data.length > 0
      ? dbAreasRes.data.map((a) => ({ id: Number(a.id), name: a.name }))
      : FALLBACK_AREAS;

  // 4. Fetch existing skills (including skill_tags) and areas if an application exists
  let existingCategoryIds: number[] = [];
  let existingSkillTags: string[] = [];
  let existingAreaIds: number[] = [];

  if (proInfo.professionalProfile) {
    const [skillsRes, areasRes] = await Promise.all([
      supabase
        .from("professional_skills")
        .select("category_id, skill_tags")
        .eq("professional_id", proInfo.user.id),
      supabase
        .from("professional_areas")
        .select("area_id")
        .eq("professional_id", proInfo.user.id),
    ]);

    if (skillsRes.data) {
      existingCategoryIds = skillsRes.data.map((s) => Number(s.category_id));
      const tagsSet = new Set<string>();
      for (const row of skillsRes.data) {
        if (Array.isArray(row.skill_tags)) {
          row.skill_tags.forEach((t: string) => {
            if (typeof t === "string" && t.trim()) tagsSet.add(t.trim());
          });
        }
      }
      existingSkillTags = Array.from(tagsSet);
    }

    if (areasRes.data) {
      existingAreaIds = areasRes.data.map((a) => Number(a.area_id));
    }
  }

  const meta = proInfo.user.applicationMeta;
  const pp = proInfo.professionalProfile;

  const initialData: MultiStepInitialData = {
    userId: proInfo.user.id,
    userEmail: proInfo.user.email,
    state: proInfo.state,
    fullName: proInfo.profile?.full_name || "",
    fatherName: pp?.father_name || meta?.father_name || "",
    cnic: pp?.cnic || meta?.cnic || "",
    phone:
      meta?.phone_formatted ||
      contactRowRes.data?.phone ||
      "",
    residentialAddress:
      pp?.residential_address || meta?.residential_address || "",
    selectedCategoryIds: existingCategoryIds,
    skillTags:
      existingSkillTags.length > 0
        ? existingSkillTags
        : meta?.skill_tags || [],
    yearsExperience:
      pp?.years_experience !== null && pp?.years_experience !== undefined
        ? pp.years_experience
        : 3,
    bio: pp?.bio || "",
    selectedAreaIds: existingAreaIds,
    availability: pp?.availability || "available",
    notificationPreference:
      pp?.notification_preference ||
      meta?.notification_preference ||
      "matching_only",
    reviewNote: proInfo.reviewNote,
    appliedAt: pp?.applied_at || null,
  };

  return (
    <div className="pro-page-wrapper">
      <header className="pro-page-header">
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Brand href="/user" />
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link href="/user" className="pro-back-link" style={{ marginBottom: 0 }}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="pro-page-container" style={{ maxWidth: "780px" }}>
        <ProfessionalApplicationWizard
          initialData={initialData}
          categories={categories}
          areas={areas}
        />
      </main>
    </div>
  );
}
