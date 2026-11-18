import { redirect } from "next/navigation";

export default function LegacyProActiveJobsRedirect() {
  redirect("/pro/jobs");
}
