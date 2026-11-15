import { redirect } from "next/navigation";

export default async function LegacyUserRedirectPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;

  if (slug.length === 0 || slug[0] === "overview") {
    redirect("/dashboard");
  }

  if (slug[0] === "post-job") {
    redirect("/dashboard/jobs/new");
  }

  if (slug[0] === "jobs") {
    if (slug[1]) {
      redirect(`/dashboard/jobs/${encodeURIComponent(slug[1])}`);
    }
    redirect("/dashboard/jobs");
  }

  if (slug[0] === "profile") {
    redirect("/dashboard/profile");
  }

  if (slug[0] === "notifications") {
    redirect("/dashboard/notifications");
  }

  if (slug[0] === "messages") {
    redirect("/dashboard/messages");
  }

  redirect("/dashboard");
}
