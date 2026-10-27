"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getSignInDestination } from "@/utils/auth-destination";

export type PostLoginCheckResult =
  | { status: "suspended"; message: string }
  | { status: "ok"; destination: string };

// Server-side post-login verification.
// Checks profiles.is_suspended and profiles.role before redirecting the user.
export async function resolvePostLoginAction(
  requestedNext: string | null
): Promise<PostLoginCheckResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      status: "ok",
      destination: getSignInDestination(requestedNext, null),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_suspended, suspended_reason")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_suspended) {
    await supabase.auth.signOut();
    const message = profile.suspended_reason
      ? `Your account has been suspended: ${profile.suspended_reason}`
      : "Your account has been suspended. Please contact support.";
    return {
      status: "suspended",
      message,
    };
  }

  if (profile?.role === "admin") {
    return {
      status: "ok",
      destination: "/admin",
    };
  }

  return {
    status: "ok",
    destination: getSignInDestination(requestedNext, null),
  };
}
