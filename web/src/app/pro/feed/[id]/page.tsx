import { redirect } from "next/navigation";

export default async function LegacyProFeedDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/pro/opportunities/${encodeURIComponent(id)}`);
}
