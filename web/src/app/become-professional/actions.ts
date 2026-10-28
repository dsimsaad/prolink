"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export interface SubmitProfessionalApplicationInput {
  fullName: string;
  fatherName: string;
  cnic: string;
  phone: string;
  residentialAddress: string;
  selectedCategoryIds: number[];
  skillTags: string[];
  yearsExperience: number;
  bio: string;
  selectedAreaIds: number[];
  availability?: "available" | "busy" | "offline";
  notificationPreference: "matching_only" | "all_jobs";
}

export type SubmitProfessionalApplicationResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      existingStatus?: "pending" | "approved" | "suspended";
    };

const CNIC_REGEX = /^\d{5}-\d{7}-\d{1}$/;
const PHONE_REGEX = /^\d{4}-\d{7}$/;

export async function submitProfessionalApplicationAction(
  input: SubmitProfessionalApplicationInput
): Promise<SubmitProfessionalApplicationResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 1. Authenticate user on the server
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      error: "Your session has expired. Please sign in again to submit your application.",
    };
  }

  // 2. Check base profile & account suspension
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return {
      ok: false,
      error: "User profile not found. Please sign out and sign in again.",
    };
  }

  if (profile.is_suspended) {
    return {
      ok: false,
      error: "Your account is currently suspended and cannot submit a professional application.",
    };
  }

  // 3. Check for existing non-rejected application to prevent duplicates
  const { data: existingPro } = await supabase
    .from("professional_profiles")
    .select("status")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existingPro && existingPro.status !== "rejected") {
    const status = existingPro.status as "pending" | "approved" | "suspended";
    if (status === "pending") {
      return {
        ok: false,
        error: "You already have a professional application pending review.",
        existingStatus: "pending",
      };
    }
    if (status === "approved") {
      return {
        ok: false,
        error: "Your professional account is already approved.",
        existingStatus: "approved",
      };
    }
    return {
      ok: false,
      error: "Your professional account is currently on hold.",
      existingStatus: "suspended",
    };
  }

  // 4. Validate Step 1: Personal Information
  const cleanFullName = (input.fullName || "").trim();
  if (cleanFullName.length < 3 || cleanFullName.length > 120) {
    return {
      ok: false,
      error: "Full Name must be between 3 and 120 characters.",
    };
  }

  const cleanFatherName = (input.fatherName || "").trim();
  if (cleanFatherName.length < 3 || cleanFatherName.length > 120) {
    return {
      ok: false,
      error: "Father's Name must be between 3 and 120 characters.",
    };
  }

  const cleanCnic = (input.cnic || "").trim();
  if (!CNIC_REGEX.test(cleanCnic)) {
    return {
      ok: false,
      error: "CNIC Number must follow the format XXXXX-XXXXXXX-X (e.g. 35202-1234567-1).",
    };
  }

  const cleanPhone = (input.phone || "").trim();
  if (!PHONE_REGEX.test(cleanPhone)) {
    return {
      ok: false,
      error: "Phone Number must follow the format XXXX-XXXXXXX (e.g. 0300-1234567).",
    };
  }

  const cleanAddress = (input.residentialAddress || "").trim();
  if (cleanAddress.length < 10 || cleanAddress.length > 500) {
    return {
      ok: false,
      error: "Residential Address must be between 10 and 500 characters.",
    };
  }

  // 5. Validate Step 2: Professional Information
  const uniqueCategoryIds = Array.from(
    new Set((input.selectedCategoryIds || []).map((id) => Number(id)).filter((id) => !isNaN(id)))
  );
  if (uniqueCategoryIds.length < 1 || uniqueCategoryIds.length > 5) {
    return {
      ok: false,
      error: "Please select between 1 and 5 service categories.",
    };
  }

  const cleanSkillTags = Array.from(
    new Set(
      (input.skillTags || [])
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    )
  );
  if (cleanSkillTags.length < 1 || cleanSkillTags.length > 25) {
    return {
      ok: false,
      error: "Please enter at least 1 skill or service offered (up to 25).",
    };
  }

  const years = Number(input.yearsExperience);
  if (!Number.isInteger(years) || years < 0 || years > 60) {
    return {
      ok: false,
      error: "Years of experience must be a whole number between 0 and 60.",
    };
  }

  const cleanBio = (input.bio || "").trim();
  if (cleanBio.length < 30 || cleanBio.length > 1000) {
    return {
      ok: false,
      error:
        cleanBio.length < 30
          ? `Professional description is too short (${cleanBio.length}/30 characters minimum).`
          : `Professional description exceeds 1,000 characters (${cleanBio.length}/1000).`,
    };
  }

  const uniqueAreaIds = Array.from(
    new Set((input.selectedAreaIds || []).map((id) => Number(id)).filter((id) => !isNaN(id)))
  );
  if (uniqueAreaIds.length < 1 || uniqueAreaIds.length > 12) {
    return {
      ok: false,
      error: "Please select between 1 and 12 service coverage areas.",
    };
  }

  const cleanAvailability =
    input.availability === "busy" || input.availability === "offline"
      ? input.availability
      : "available";

  // 6. Validate Step 3: Notification Preferences
  if (
    input.notificationPreference !== "matching_only" &&
    input.notificationPreference !== "all_jobs"
  ) {
    return {
      ok: false,
      error: "Please select your job notification preference.",
    };
  }

  // 7. Persist Application to Database
  // First try the extended RPC from migration 007
  const { error: rpcError } = await supabase.rpc("submit_professional_application", {
    p_full_name: cleanFullName,
    p_father_name: cleanFatherName,
    p_cnic: cleanCnic,
    p_phone: cleanPhone,
    p_residential_address: cleanAddress,
    p_bio: cleanBio,
    p_years: years,
    p_category_ids: uniqueCategoryIds,
    p_skill_tags: cleanSkillTags,
    p_area_ids: uniqueAreaIds,
    p_notification_preference: input.notificationPreference,
    p_availability: cleanAvailability,
  });

  if (rpcError) {
    const isMissingNewRpc =
      rpcError.code === "PGRST202" ||
      rpcError.code === "42883" ||
      rpcError.message.includes("submit_professional_application");

    if (!isMissingNewRpc) {
      return {
        ok: false,
        error: normalizeDbError(rpcError.message),
      };
    }

    // Fallback when migration 007 has not been applied to the remote DB yet:
    // Use the existing apply_as_professional RPC (which requires digits-only phone)
    // and update profile, skill_tags, and extended columns/user_metadata.
    const digitsOnlyPhone = cleanPhone.replace(/-/g, "");
    const { error: legacyRpcError } = await supabase.rpc("apply_as_professional", {
      p_bio: cleanBio,
      p_years: years,
      p_category_ids: uniqueCategoryIds,
      p_area_ids: uniqueAreaIds,
      p_phone: digitsOnlyPhone,
    });

    if (legacyRpcError) {
      return {
        ok: false,
        error: normalizeDbError(legacyRpcError.message),
      };
    }

    // Update full_name and primary area on public.profiles
    await supabase
      .from("profiles")
      .update({
        full_name: cleanFullName,
        area_id: uniqueAreaIds[0],
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    // Save skill_tags on professional_skills
    await supabase
      .from("professional_skills")
      .update({ skill_tags: cleanSkillTags })
      .eq("professional_id", user.id);

    // Update availability (and extended columns if present) on professional_profiles
    const { error: extColErr } = await supabase
      .from("professional_profiles")
      .update({
        father_name: cleanFatherName,
        cnic: cleanCnic,
        residential_address: cleanAddress,
        notification_preference: input.notificationPreference,
        availability: cleanAvailability,
      })
      .eq("profile_id", user.id);

    if (extColErr) {
      await supabase
        .from("professional_profiles")
        .update({ availability: cleanAvailability })
        .eq("profile_id", user.id);
    }
  }

  // Persist structured metadata on the authenticated user record as well
  await supabase.auth.updateUser({
    data: {
      full_name: cleanFullName,
      professional_application: {
        father_name: cleanFatherName,
        cnic: cleanCnic,
        phone_formatted: cleanPhone,
        residential_address: cleanAddress,
        skill_tags: cleanSkillTags,
        notification_preference: input.notificationPreference,
      },
    },
  });

  return { ok: true };
}

function normalizeDbError(msg: string): string {
  if (msg.includes("Invalid bio")) {
    return "Professional description must be between 30 and 1,000 characters.";
  }
  if (msg.includes("Invalid experience")) {
    return "Years of experience must be between 0 and 60.";
  }
  if (msg.includes("Invalid categories")) {
    return "Please select between 1 and 5 active service categories.";
  }
  if (msg.includes("Invalid service areas")) {
    return "Please select between 1 and 12 service coverage areas.";
  }
  if (msg.includes("Invalid phone number")) {
    return "Phone number must follow the format XXXX-XXXXXXX (e.g. 0300-1234567).";
  }
  if (msg.includes("Invalid CNIC")) {
    return "CNIC number must follow the format XXXXX-XXXXXXX-X (e.g. 35202-1234567-1).";
  }
  if (msg.includes("Unauthorized")) {
    return "Your session has expired. Please sign in again.";
  }
  return msg;
}
