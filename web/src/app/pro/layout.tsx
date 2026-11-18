import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getProfessionalState } from "@/utils/professional";
import { ProShell } from "@/components/pro/pro-shell";
import type { ProfessionalAvailability } from "@/lib/pro/types";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: `Professional Workspace | ${siteConfig.name}`,
  description: `Browse customer service opportunities in ${siteConfig.city}, send quotes, and manage your assigned jobs on ${siteConfig.name}.`,
};

export default async function ProfessionalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in?next=/pro");
  }

  const [{ data: profileRow }, proInfo, unreadRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, is_suspended, suspended_reason")
      .eq("id", user.id)
      .maybeSingle(),
    getProfessionalState(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
  ]);

  if (profileRow?.role === "admin" || proInfo.profile?.role === "admin") {
    redirect("/admin");
  }

  if (profileRow?.is_suspended || proInfo.state === "suspended") {
    await supabase.auth.signOut();
    const message = profileRow?.suspended_reason
      ? `Your account has been suspended: ${profileRow.suspended_reason}`
      : proInfo.reviewNote
        ? `Your professional account is suspended: ${proInfo.reviewNote}`
        : "Your account has been suspended.";
    redirect(`/sign-in?error=${encodeURIComponent(message)}`);
  }

  if (proInfo.state !== "approved") {
    redirect("/become-professional");
  }

  const unreadCount = unreadRes.count;

  const rawAvail = proInfo.professionalProfile?.availability;
  const initialAvailability: ProfessionalAvailability =
    rawAvail === "busy" || rawAvail === "offline" ? rawAvail : "available";

  const fullName =
    proInfo.profile?.full_name ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "") ||
    user.email ||
    "Professional";

  return (
    <ProShell
      professionalId={user.id}
      professionalName={fullName}
      professionalEmail={user.email ?? ""}
      initialAvailability={initialAvailability}
      initialUnreadNotifications={unreadCount ?? 0}
    >
      {children}
    </ProShell>
  );
}
