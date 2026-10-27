import { createClient } from "@/utils/supabase/client";
import type {
  AllowedJobActionsDto,
  AuditLogItemDto,
  AuditPageResponse,
  AuditSummaryResponse,
  DailyAuditCountDto,
  EngineReloadResponse,
  FunnelAnalyticsDto,
  JobStatus,
  RankedGroupCountDto,
  ReviewQueueItemDto,
  ReviewQueueResponse,
  UserSearchHitDto,
  UserSuggestionDto,
} from "./types";

let fallbackEngineVersion = 1;

function computePriorityScore(severity: number, createdAtIso: string): number {
  const createdMs = Date.parse(createdAtIso);
  const ageHours = Number.isNaN(createdMs)
    ? 0
    : Math.max(0, Math.floor((Date.now() - createdMs) / (1000 * 60 * 60)));
  return severity * 100 + Math.min(720, ageHours);
}

export async function fallbackGetReviewQueue(limit = 20): Promise<ReviewQueueResponse> {
  const supabase = createClient();

  const [disputesRes, reportsRes, appsRes] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, created_at")
      .eq("status", "Disputed")
      .order("created_at", { ascending: true }),
    supabase
      .from("reports")
      .select("id, reason, status, created_at")
      .in("status", ["open", "reviewing"])
      .order("created_at", { ascending: true }),
    supabase
      .from("professional_profiles")
      .select("profile_id, bio, applied_at")
      .eq("status", "pending")
      .order("applied_at", { ascending: true }),
  ]);

  const items: ReviewQueueItemDto[] = [];

  for (const job of (disputesRes.data ?? []) as { id: string; title: string; created_at: string }[]) {
    items.push({
      key: `dispute:${job.id}`,
      kind: "dispute",
      entityId: job.id,
      title: `Disputed Job: ${job.title}`,
      subtitle: "Requires dispute resolution review",
      createdAt: job.created_at,
      priorityScore: computePriorityScore(3, job.created_at),
      link: `/admin/disputes/${job.id}`,
    });
  }

  if (!reportsRes.error) {
    for (const rep of (reportsRes.data ?? []) as {
      id: string;
      reason: string;
      status: string;
      created_at: string;
    }[]) {
      items.push({
        key: `report:${rep.id}`,
        kind: "report",
        entityId: rep.id,
        title: `Report: ${rep.reason}`,
        subtitle: `Status: ${rep.status}`,
        createdAt: rep.created_at,
        priorityScore: computePriorityScore(2, rep.created_at),
        link: "/admin/reports",
      });
    }
  }

  const pendingApps = (appsRes.data ?? []) as {
    profile_id: string;
    bio: string | null;
    applied_at: string;
  }[];

  if (pendingApps.length > 0) {
    const appIds = pendingApps.map((a) => a.profile_id);
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", appIds);
    const nameMap = new Map<string, string>();
    for (const p of (profs ?? []) as { id: string; full_name: string }[]) {
      nameMap.set(p.id, p.full_name);
    }

    for (const app of pendingApps) {
      const applicantName = nameMap.get(app.profile_id) ?? "Applicant";
      items.push({
        key: `application:${app.profile_id}`,
        kind: "application",
        entityId: app.profile_id,
        title: `Pro Application: ${applicantName}`,
        subtitle: app.bio ? app.bio.slice(0, 80) : "Pending verification review",
        createdAt: app.applied_at,
        priorityScore: computePriorityScore(1, app.applied_at),
        link: "/admin/applications",
      });
    }
  }

  items.sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    items: items.slice(0, Math.max(1, limit)),
    totalCount: items.length,
    refreshedAt: new Date().toISOString(),
  };
}

export async function fallbackGetAuditLog(params: {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<AuditPageResponse> {
  const supabase = createClient();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const fromIdx = (page - 1) * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  let query = supabase
    .from("admin_actions")
    .select("id, admin_id, action, target_type, target_id, details, created_at", {
      count: "exact",
    });

  if (params.from) {
    query = query.gte("created_at", params.from);
  }
  if (params.to) {
    query = query.lte("created_at", params.to);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(fromIdx, toIdx);

  if (error) {
    return { items: [], page, pageSize, totalCount: 0 };
  }

  const rows = (data ?? []) as {
    id: string;
    admin_id: string;
    action: string;
    target_type: string;
    target_id: string;
    details: unknown;
    created_at: string;
  }[];

  const adminIds = Array.from(new Set(rows.map((r) => r.admin_id)));
  const nameMap = new Map<string, string>();
  if (adminIds.length > 0) {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", adminIds);
    for (const a of (admins ?? []) as { id: string; full_name: string }[]) {
      nameMap.set(a.id, a.full_name);
    }
  }

  const items: AuditLogItemDto[] = rows.map((r) => ({
    id: r.id,
    adminId: r.admin_id,
    adminName: nameMap.get(r.admin_id) ?? "Administrator",
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    details: typeof r.details === "string" ? r.details : JSON.stringify(r.details ?? {}),
    createdAt: r.created_at,
  }));

  return {
    items,
    page,
    pageSize,
    totalCount: count ?? items.length,
  };
}

export async function fallbackGetAuditSummary(days = 14): Promise<AuditSummaryResponse> {
  const supabase = createClient();
  const safeDays = Math.min(60, Math.max(1, days));
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (safeDays - 1))
  );

  const { data, error } = await supabase
    .from("admin_actions")
    .select("created_at")
    .gte("created_at", start.toISOString());

  const countsByDay = new Map<string, number>();
  for (let i = 0; i < safeDays; i++) {
    const d = new Date(start.getTime() + i * 86_400_000);
    countsByDay.set(d.toISOString().slice(0, 10), 0);
  }

  if (!error) {
    for (const row of (data ?? []) as { created_at: string }[]) {
      const dayKey = row.created_at.slice(0, 10);
      if (countsByDay.has(dayKey)) {
        countsByDay.set(dayKey, (countsByDay.get(dayKey) ?? 0) + 1);
      }
    }
  }

  const dailyCounts: DailyAuditCountDto[] = [];
  let totalInPeriod = 0;
  for (const [date, count] of countsByDay.entries()) {
    dailyCounts.push({ date, count });
    totalInPeriod += count;
  }

  return { days: safeDays, totalInPeriod, dailyCounts };
}

export async function fallbackSuggestUsers(
  query: string,
  limit = 8
): Promise<UserSuggestionDto[]> {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .ilike("full_name", `%${clean}%`)
    .order("full_name", { ascending: true })
    .limit(Math.max(1, limit * 2));

  const rows = ((data ?? []) as { id: string; full_name: string }[])
    .filter((u) => Boolean(u.full_name))
    .sort((a, b) => {
      const aStarts = a.full_name.toLowerCase().startsWith(clean) ? 0 : 1;
      const bStarts = b.full_name.toLowerCase().startsWith(clean) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.full_name.localeCompare(b.full_name);
    })
    .slice(0, limit);

  return rows.map((u) => ({
    id: u.id,
    displayName: u.full_name,
  }));
}

export async function fallbackSearchUsers(query: string): Promise<UserSearchHitDto[]> {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return [];

  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("id, full_name, role");

  const hits: UserSearchHitDto[] = [];
  for (const u of (data ?? []) as { id: string; full_name: string; role: string }[]) {
    const haystack = `${u.full_name ?? ""} ${u.role ?? ""}`.toLowerCase();
    let matched = 0;
    for (const token of tokens) {
      if (haystack.includes(token)) {
        matched += 1;
      }
    }
    if (matched > 0) {
      hits.push({
        id: u.id,
        displayName: u.full_name || "User",
        matchedTokens: matched,
      });
    }
  }

  hits.sort((a, b) => {
    if (b.matchedTokens !== a.matchedTokens) return b.matchedTokens - a.matchedTokens;
    return a.displayName.localeCompare(b.displayName);
  });

  return hits;
}

export async function fallbackSearchJobs(query: string): Promise<string[]> {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return [];

  const supabase = createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id, title, description, status")
    .order("created_at", { ascending: false });

  const matchedIds: string[] = [];
  for (const j of (data ?? []) as {
    id: string;
    title: string;
    description: string;
    status: string;
  }[]) {
    const text = `${j.title ?? ""} ${j.description ?? ""} ${j.status ?? ""}`.toLowerCase();
    if (tokens.every((t) => text.includes(t))) {
      matchedIds.push(j.id);
    }
  }

  return matchedIds;
}

export async function fallbackGetFunnelAnalytics(): Promise<FunnelAnalyticsDto> {
  const supabase = createClient();
  const [jobsRes, offersRes] = await Promise.all([
    supabase.from("jobs").select("id, status, assigned_professional_id"),
    supabase.from("offers").select("job_id"),
  ]);

  const jobs = (jobsRes.data ?? []) as {
    id: string;
    status: JobStatus;
    assigned_professional_id: string | null;
  }[];
  const jobsWithOffers = new Set<string>(
    ((offersRes.data ?? []) as { job_id: string }[]).map((o) => o.job_id)
  );

  let posted = 0;
  let receivedOffers = 0;
  let assigned = 0;
  let completed = 0;

  for (const job of jobs) {
    if (job.status !== "Draft") {
      posted += 1;
    }
    if (
      jobsWithOffers.has(job.id) ||
      job.status === "Offers received" ||
      job.status === "Assigned" ||
      job.status === "In progress" ||
      job.status === "Completed" ||
      job.status === "Disputed"
    ) {
      receivedOffers += 1;
    }
    if (
      Boolean(job.assigned_professional_id) ||
      job.status === "Assigned" ||
      job.status === "In progress" ||
      job.status === "Completed" ||
      job.status === "Disputed"
    ) {
      assigned += 1;
    }
    if (job.status === "Completed") {
      completed += 1;
    }
  }

  return { posted, receivedOffers, assigned, completed };
}

export async function fallbackGetTopCategories(n = 5): Promise<RankedGroupCountDto[]> {
  const supabase = createClient();
  const [catsRes, jobsRes] = await Promise.all([
    supabase.from("categories").select("id, name"),
    supabase.from("jobs").select("category_id"),
  ]);

  const counts = new Map<number, number>();
  for (const j of (jobsRes.data ?? []) as { category_id: number }[]) {
    const id = Number(j.category_id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const ranked: RankedGroupCountDto[] = (
    (catsRes.data ?? []) as { id: number; name: string }[]
  ).map((c) => ({
    id: Number(c.id),
    name: c.name,
    jobCount: counts.get(Number(c.id)) ?? 0,
  }));

  ranked.sort((a, b) => {
    if (b.jobCount !== a.jobCount) return b.jobCount - a.jobCount;
    return a.name.localeCompare(b.name);
  });

  return ranked.slice(0, Math.max(1, n));
}

export async function fallbackGetTopAreas(n = 5): Promise<RankedGroupCountDto[]> {
  const supabase = createClient();
  const [areasRes, jobsRes] = await Promise.all([
    supabase.from("areas").select("id, name"),
    supabase.from("jobs").select("area_id"),
  ]);

  const counts = new Map<number, number>();
  for (const j of (jobsRes.data ?? []) as { area_id: number }[]) {
    const id = Number(j.area_id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const ranked: RankedGroupCountDto[] = (
    (areasRes.data ?? []) as { id: number; name: string }[]
  ).map((a) => ({
    id: Number(a.id),
    name: a.name,
    jobCount: counts.get(Number(a.id)) ?? 0,
  }));

  ranked.sort((a, b) => {
    if (b.jobCount !== a.jobCount) return b.jobCount - a.jobCount;
    return a.name.localeCompare(b.name);
  });

  return ranked.slice(0, Math.max(1, n));
}

const NEXT_STATES_BY_STATUS: Record<JobStatus, JobStatus[]> = {
  Draft: ["Open", "Cancelled"],
  Open: ["Offers received", "Assigned", "Expired", "Cancelled"],
  "Offers received": ["Assigned", "Expired", "Cancelled"],
  Assigned: ["In progress", "Disputed", "Cancelled"],
  "In progress": ["Completed", "Disputed", "Cancelled"],
  Disputed: ["Completed", "Cancelled"],
  Completed: [],
  Cancelled: [],
  Expired: [],
};

export async function fallbackGetJobAllowedActions(
  jobId: string
): Promise<AllowedJobActionsDto> {
  const supabase = createClient();
  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, status")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job) {
    throw new Error("Job not found.");
  }

  const currentStatus = job.status as JobStatus;
  const nextStates = NEXT_STATES_BY_STATUS[currentStatus] ?? [];
  const canForceCancel =
    currentStatus !== "Disputed" && nextStates.includes("Cancelled");
  const canResolveDispute = currentStatus === "Disputed";

  return {
    jobId,
    currentStatus,
    nextStates,
    canForceCancel,
    canResolveDispute,
    disputeOutcomes: canResolveDispute ? ["completed", "cancelled"] : [],
  };
}

export async function fallbackForceCancelJob(
  jobId: string,
  reason: string
): Promise<{ jobId: string; previousStatus: string; newStatus: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allowed = await fallbackGetJobAllowedActions(jobId);
  if (!allowed.canForceCancel) {
    throw new Error(`Cannot force-cancel a job in '${allowed.currentStatus}' status.`);
  }

  const { error: updateErr } = await supabase
    .from("jobs")
    .update({ status: "Cancelled", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  if (updateErr) {
    throw new Error(updateErr.message);
  }

  await supabase.from("job_events").insert({
    job_id: jobId,
    from_status: allowed.currentStatus,
    to_status: "Cancelled",
    actor_id: user?.id ?? null,
    note: reason.trim(),
  });

  return {
    jobId,
    previousStatus: allowed.currentStatus,
    newStatus: "Cancelled",
  };
}

export async function fallbackResolveDisputedJob(
  jobId: string,
  outcome: "completed" | "cancelled",
  note: string
): Promise<{ jobId: string; previousStatus: string; newStatus: string; outcome: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allowed = await fallbackGetJobAllowedActions(jobId);
  if (!allowed.canResolveDispute) {
    throw new Error("Only jobs currently in 'Disputed' status can be resolved.");
  }

  const newStatus: JobStatus = outcome === "completed" ? "Completed" : "Cancelled";

  const { error: updateErr } = await supabase
    .from("jobs")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", jobId);

  if (updateErr) {
    throw new Error(updateErr.message);
  }

  await supabase.from("job_events").insert({
    job_id: jobId,
    from_status: "Disputed",
    to_status: newStatus,
    actor_id: user?.id ?? null,
    note: note.trim(),
  });

  return {
    jobId,
    previousStatus: "Disputed",
    newStatus,
    outcome,
  };
}

export async function fallbackReloadEngine(): Promise<EngineReloadResponse> {
  fallbackEngineVersion += 1;
  return {
    version: fallbackEngineVersion,
    reloadedAt: new Date().toISOString(),
  };
}
