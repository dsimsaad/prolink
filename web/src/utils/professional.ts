import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export type ProfessionalState =
  | "logged_out"
  | "none"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export interface ProfessionalStateResult {
  state: ProfessionalState;
  reviewNote: string | null;
  user: {
    id: string;
    email?: string;
  } | null;
  profile: {
    id: string;
    role: "user" | "admin";
    full_name: string;
  } | null;
  professionalProfile: {
    bio: string | null;
    years_experience: number | null;
    status: "pending" | "approved" | "rejected" | "suspended";
    verified: boolean;
    applied_at: string;
    reviewed_at: string | null;
    review_note: string | null;
  } | null;
}

/**
 * Server-side helper to inspect the authenticated user's professional application state.
 * Queries only the current user's own profile and professional_profiles row (guaranteed by RLS).
 */
export async function getProfessionalState(): Promise<ProfessionalStateResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      state: "logged_out",
      reviewNote: null,
      user: null,
      profile: null,
      professionalProfile: null,
    };
  }

  // Fetch base user profile (role: user | admin)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  // Fetch current user's professional profile extension
  const { data: proProfile } = await supabase
    .from("professional_profiles")
    .select(
      "bio, years_experience, status, verified, applied_at, reviewed_at, review_note"
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!proProfile) {
    return {
      state: "none",
      reviewNote: null,
      user: { id: user.id, email: user.email },
      profile: (profile as { id: string; role: "user" | "admin"; full_name: string }) ?? null,
      professionalProfile: null,
    };
  }

  const status = proProfile.status as
    | "pending"
    | "approved"
    | "rejected"
    | "suspended";

  return {
    state: status,
    reviewNote: proProfile.review_note ?? null,
    user: { id: user.id, email: user.email },
    profile: (profile as { id: string; role: "user" | "admin"; full_name: string }) ?? null,
    professionalProfile: proProfile,
  };
}
