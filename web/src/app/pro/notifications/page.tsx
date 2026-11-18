import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { fetchProfessionalNotifications } from "@/lib/pro/queries";
import { NotificationsClient } from "@/components/customer/notifications-client";

export default async function ProfessionalNotificationsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/pro/notifications");
  }

  const notifications = await fetchProfessionalNotifications(user.id);

  return (
    <div className="space-y-5">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
          Alerts &amp; Updates
        </span>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#0C2A1B] sm:text-2xl">
          Notifications
        </h1>
        <p className="mt-1 text-xs text-[#6A7B70]">
          Real-time alerts for new matching customer jobs, accepted or declined
          offers, job status updates, and customer reviews.
        </p>
      </div>

      <NotificationsClient
        initialItems={notifications}
        mode="professional"
        viewerId={user.id}
      />
    </div>
  );
}
