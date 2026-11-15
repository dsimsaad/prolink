import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { fetchCustomerNotifications } from "@/lib/customer/queries";
import { NotificationsClient } from "@/components/customer/notifications-client";

export default async function CustomerNotificationsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/dashboard/notifications");
  }

  const notifications = await fetchCustomerNotifications(user.id);

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
          Activity Alerts
        </span>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#0C2A1B] sm:text-2xl">
          Notifications
        </h1>
        <p className="mt-1 text-xs text-[#6A7B70]">
          Stay updated on new offers and job status changes.
        </p>
      </div>

      <NotificationsClient initialItems={notifications} />
    </div>
  );
}
