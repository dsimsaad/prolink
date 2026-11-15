import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/utils/supabase/server";
import { getProfessionalState } from "@/utils/professional";
import { CustomerShell } from "@/components/customer/customer-shell";

export const metadata: Metadata = {
  title: "Customer Dashboard | ProLink",
};

export default async function DashboardLayout({
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
    redirect("/sign-in?next=/dashboard");
  }

  const [{ data: profile }, proState, unreadRes] = await Promise.all([
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

  if (profile?.is_suspended) {
    await supabase.auth.signOut();
    const message = profile.suspended_reason
      ? `Your account has been suspended: ${profile.suspended_reason}`
      : "Your account has been suspended. Please contact support for assistance.";
    redirect(`/sign-in?error=${encodeURIComponent(message)}`);
  }

  const customerName =
    profile?.full_name ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "") ||
    user.email ||
    "Customer";

  const role = profile?.role === "admin" ? "admin" : "user";

  return (
    <CustomerShell
      customerId={user.id}
      customerName={customerName}
      customerEmail={user.email ?? ""}
      role={role}
      professionalState={proState.state}
      reviewNote={proState.reviewNote}
      initialUnreadNotifications={unreadRes.count ?? 0}
    >
      {children}
    </CustomerShell>
  );
}
