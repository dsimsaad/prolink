import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/utils/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Admin Portal | ProLink",
};

// Server guard for all /admin routes.
// Redirects unauthenticated visitors to /sign-in and non-admins to "/".
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in?next=/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.is_suspended) {
    redirect("/");
  }

  if (profile.role !== "admin") {
    redirect("/user");
  }

  return (
    <AdminShell
      adminId={user.id}
      adminName={profile.full_name || user.email || "Administrator"}
      adminEmail={user.email ?? ""}
    >
      {children}
    </AdminShell>
  );
}
