import type { OpportunityJobRow } from "@/lib/pro/types";

// Comparator ordering urgent opportunities first, then newest created_at descending.
// Kept in one function so it can later delegate to the engine's merge sort.
export function compareOpportunities(
  a: Pick<OpportunityJobRow, "urgency" | "created_at" | "id">,
  b: Pick<OpportunityJobRow, "urgency" | "created_at" | "id">
): number {
  const aUrgent = a.urgency === "urgent" ? 1 : 0;
  const bUrgent = b.urgency === "urgent" ? 1 : 0;
  if (aUrgent !== bUrgent) {
    return bUrgent - aUrgent;
  }

  const aTime = new Date(a.created_at).getTime();
  const bTime = new Date(b.created_at).getTime();
  if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
    return bTime - aTime;
  }

  return a.id.localeCompare(b.id);
}

export function sortOpportunities<
  T extends Pick<OpportunityJobRow, "urgency" | "created_at" | "id">,
>(items: readonly T[]): T[] {
  return [...items].sort(compareOpportunities);
}
