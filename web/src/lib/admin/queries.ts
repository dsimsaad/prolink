import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminApplicationRow,
  AdminCategoryRow,
  AdminChatMessageRow,
  AdminJobEventRow,
  AdminJobRow,
  AdminOfferRow,
  AdminOverviewStats,
  AdminReportRow,
  AdminUserRow,
  ApplicationStatus,
  DailyJobCount,
  JobStatus,
  ReportStatus,
} from "./types";

export async function fetchAdminOverview(supabase: SupabaseClient): Promise<AdminOverviewStats> {
  const { data, error } = await supabase.rpc("admin_overview");
  if (!error && data) {
    return data as AdminOverviewStats;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [profilesRes, prosRes, jobsRes, reportsRes] = await Promise.all([
    supabase.from("profiles").select("id, created_at"),
    supabase.from("professional_profiles").select("status"),
    supabase.from("jobs").select("status, created_at"),
    supabase.from("reports").select("status").eq("status", "open"),
  ]);

  const profiles = (profilesRes.data ?? []) as { id: string; created_at: string }[];
  const pros = (prosRes.data ?? []) as { status: ApplicationStatus }[];
  const jobs = (jobsRes.data ?? []) as { status: JobStatus; created_at: string }[];
  const openReports = reportsRes.error ? 0 : (reportsRes.data ?? []).length;

  const prosByStatus: Record<ApplicationStatus, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  };
  for (const p of pros) {
    if (p.status in prosByStatus) {
      prosByStatus[p.status] += 1;
    }
  }

  const jobsByStatus: Record<JobStatus, number> = {
    Draft: 0,
    Open: 0,
    "Offers received": 0,
    Assigned: 0,
    "In progress": 0,
    Completed: 0,
    Cancelled: 0,
    Expired: 0,
    Disputed: 0,
  };
  let jobsLast7Days = 0;
  for (const j of jobs) {
    if (j.status in jobsByStatus) {
      jobsByStatus[j.status] += 1;
    }
    if (j.created_at >= sevenDaysAgo) {
      jobsLast7Days += 1;
    }
  }

  return {
    total_users: profiles.length,
    new_users_last_7_days: profiles.filter((p) => p.created_at >= sevenDaysAgo).length,
    professionals_by_status: prosByStatus,
    jobs_by_status: jobsByStatus,
    jobs_last_7_days: jobsLast7Days,
    open_reports: openReports,
    disputed_jobs: jobsByStatus.Disputed,
    pending_applications: prosByStatus.pending,
  };
}

export async function fetchAdminJobsByDay(
  supabase: SupabaseClient,
  days = 30
): Promise<DailyJobCount[]> {
  const { data, error } = await supabase.rpc("admin_jobs_by_day", { p_days: days });
  if (!error && data) {
    return ((data as { day: string; job_count: number }[] | null) ?? []).map((row) => ({
      day: row.day,
      job_count: Number(row.job_count),
    }));
  }

  const safeDays = Math.min(60, Math.max(1, days));
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (safeDays - 1))
  );

  const { data: jobsData } = await supabase
    .from("jobs")
    .select("created_at")
    .gte("created_at", start.toISOString());

  const counts = new Map<string, number>();
  for (let i = 0; i < safeDays; i++) {
    const d = new Date(start.getTime() + i * 86_400_000);
    counts.set(d.toISOString().slice(0, 10), 0);
  }

  for (const j of (jobsData ?? []) as { created_at: string }[]) {
    const dayKey = j.created_at.slice(0, 10);
    if (counts.has(dayKey)) {
      counts.set(dayKey, (counts.get(dayKey) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries()).map(([day, job_count]) => ({
    day,
    job_count,
  }));
}

export async function fetchAdminApplications(
  supabase: SupabaseClient,
  status: ApplicationStatus,
  page = 1,
  pageSize = 20
): Promise<{ rows: AdminApplicationRow[]; totalCount: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: proRows, count, error } = await supabase
    .from("professional_profiles")
    .select(
      "profile_id, bio, years_experience, status, applied_at, reviewed_at, review_note",
      { count: "exact" }
    )
    .eq("status", status)
    .order("applied_at", { ascending: false })
    .range(from, to);

  if (error) {
    return { rows: [], totalCount: 0 };
  }

  const list = (proRows ?? []) as {
    profile_id: string;
    bio: string | null;
    years_experience: number | null;
    status: ApplicationStatus;
    applied_at: string;
    reviewed_at: string | null;
    review_note: string | null;
  }[];

  if (list.length === 0) {
    return { rows: [], totalCount: count ?? 0 };
  }

  const ids = list.map((r) => r.profile_id);

  const [profilesRes, phonesRes, skillsRes, areasRes, categoriesRes, allAreasRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", ids),
    supabase.from("contact_details").select("profile_id, phone").in("profile_id", ids),
    supabase.from("professional_skills").select("professional_id, category_id").in("professional_id", ids),
    supabase.from("professional_areas").select("professional_id, area_id").in("professional_id", ids),
    supabase.from("categories").select("id, name"),
    supabase.from("areas").select("id, name"),
  ]);

  const nameById = new Map<string, string>();
  for (const p of (profilesRes.data ?? []) as { id: string; full_name: string }[]) {
    nameById.set(p.id, p.full_name);
  }

  const phoneById = new Map<string, string>();
  for (const ph of (phonesRes.data ?? []) as { profile_id: string; phone: string }[]) {
    phoneById.set(ph.profile_id, ph.phone);
  }

  const catNameById = new Map<number, string>();
  for (const c of (categoriesRes.data ?? []) as { id: number; name: string }[]) {
    catNameById.set(Number(c.id), c.name);
  }

  const areaNameById = new Map<number, string>();
  for (const a of (allAreasRes.data ?? []) as { id: number; name: string }[]) {
    areaNameById.set(Number(a.id), a.name);
  }

  const tradesByPro = new Map<string, string[]>();
  for (const s of (skillsRes.data ?? []) as { professional_id: string; category_id: number }[]) {
    const arr = tradesByPro.get(s.professional_id) ?? [];
    const catName = catNameById.get(Number(s.category_id));
    if (catName) arr.push(catName);
    tradesByPro.set(s.professional_id, arr);
  }

  const areasByPro = new Map<string, string[]>();
  for (const a of (areasRes.data ?? []) as { professional_id: string; area_id: number }[]) {
    const arr = areasByPro.get(a.professional_id) ?? [];
    const areaName = areaNameById.get(Number(a.area_id));
    if (areaName) arr.push(areaName);
    areasByPro.set(a.professional_id, arr);
  }

  const rows: AdminApplicationRow[] = list.map((r) => ({
    profile_id: r.profile_id,
    full_name: nameById.get(r.profile_id) ?? "Applicant",
    phone: phoneById.get(r.profile_id) ?? null,
    bio: r.bio,
    years_experience: r.years_experience,
    status: r.status,
    applied_at: r.applied_at,
    reviewed_at: r.reviewed_at,
    review_note: r.review_note,
    trades: tradesByPro.get(r.profile_id) ?? [],
    areas: areasByPro.get(r.profile_id) ?? [],
  }));

  return { rows, totalCount: count ?? rows.length };
}

export async function reviewProfessionalApplicationRpc(
  supabase: SupabaseClient,
  professionalId: string,
  decision: "approved" | "rejected" | "suspended",
  note: string
): Promise<void> {
  const { error } = await supabase.rpc("review_professional_application", {
    p_professional_id: professionalId,
    p_decision: decision,
    p_note: note,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchAdminUsers(
  supabase: SupabaseClient,
  options: {
    page?: number;
    pageSize?: number;
    filterIds?: string[] | null;
  }
): Promise<{ rows: AdminUserRow[]; totalCount: number }> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  if (options.filterIds && options.filterIds.length === 0) {
    return { rows: [], totalCount: 0 };
  }

  let query = supabase
    .from("profiles")
    .select("id, full_name, role, is_suspended, suspended_reason, suspended_at, created_at", {
      count: "exact",
    });

  if (options.filterIds && options.filterIds.length > 0) {
    query = query.in("id", options.filterIds);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    let fallbackQuery = supabase
      .from("profiles")
      .select("id, full_name, role, created_at", { count: "exact" });
    if (options.filterIds && options.filterIds.length > 0) {
      fallbackQuery = fallbackQuery.in("id", options.filterIds);
    }
    const fallbackRes = await fallbackQuery
      .order("created_at", { ascending: false })
      .range(from, to);
    if (fallbackRes.error) {
      throw new Error(fallbackRes.error.message);
    }
    const fallbackRows = (
      (fallbackRes.data ?? []) as {
        id: string;
        full_name: string;
        role: "user" | "admin";
        created_at: string;
      }[]
    ).map((u) => ({
      ...u,
      is_suspended: false,
      suspended_reason: null,
      suspended_at: null,
    }));
    return { rows: fallbackRows, totalCount: fallbackRes.count ?? fallbackRows.length };
  }

  const rows = ((data ?? []) as AdminUserRow[]).map((u) => ({
    ...u,
    is_suspended: Boolean(u.is_suspended),
  }));

  return { rows, totalCount: count ?? rows.length };
}

export async function setUserSuspendedRpc(
  supabase: SupabaseClient,
  userId: string,
  suspended: boolean,
  reason: string
): Promise<void> {
  const { error } = await supabase.rpc("admin_set_user_suspended", {
    p_user_id: userId,
    p_suspended: suspended,
    p_reason: reason,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchAdminCategories(
  supabase: SupabaseClient
): Promise<AdminCategoryRow[]> {
  const [catsRes, jobsRes] = await Promise.all([
    supabase.from("categories").select("id, name, parent_id, is_active").order("name"),
    supabase.from("jobs").select("category_id"),
  ]);

  if (catsRes.error) {
    throw new Error(catsRes.error.message);
  }

  const counts = new Map<number, number>();
  for (const j of (jobsRes.data ?? []) as { category_id: number }[]) {
    const cid = Number(j.category_id);
    counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }

  return ((catsRes.data ?? []) as {
    id: number;
    name: string;
    parent_id: number | null;
    is_active: boolean;
  }[]).map((c) => ({
    id: Number(c.id),
    name: c.name,
    parent_id: c.parent_id !== null ? Number(c.parent_id) : null,
    is_active: Boolean(c.is_active),
    job_count: counts.get(Number(c.id)) ?? 0,
  }));
}

export async function createCategoryRpc(
  supabase: SupabaseClient,
  name: string,
  parentId: number | null = null
): Promise<number> {
  const { data, error } = await supabase.rpc("admin_create_category", {
    p_name: name.trim(),
    p_parent_id: parentId,
  });
  if (error) {
    throw new Error(error.message);
  }
  return Number(data);
}

export async function updateCategoryRpc(
  supabase: SupabaseClient,
  id: number,
  name: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase.rpc("admin_update_category", {
    p_id: id,
    p_name: name.trim(),
    p_is_active: isActive,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export interface JobQueryFilters {
  status?: JobStatus | "";
  categoryId?: number | "";
  areaId?: number | "";
  urgency?: "normal" | "urgent" | "";
  fromDate?: string;
  toDate?: string;
  filterJobIds?: string[] | null;
  page?: number;
  pageSize?: number;
}

export async function fetchAdminJobs(
  supabase: SupabaseClient,
  filters: JobQueryFilters
): Promise<{ rows: AdminJobRow[]; totalCount: number }> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  if (filters.filterJobIds && filters.filterJobIds.length === 0) {
    return { rows: [], totalCount: 0 };
  }

  let query = supabase
    .from("jobs")
    .select(
      "id, title, description, status, urgency, category_id, area_id, customer_id, assigned_professional_id, budget_min, budget_max, created_at, updated_at",
      { count: "exact" }
    );

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters.areaId) {
    query = query.eq("area_id", filters.areaId);
  }
  if (filters.urgency) {
    query = query.eq("urgency", filters.urgency);
  }
  if (filters.fromDate) {
    query = query.gte("created_at", filters.fromDate);
  }
  if (filters.toDate) {
    query = query.lte("created_at", filters.toDate);
  }
  if (filters.filterJobIds && filters.filterJobIds.length > 0) {
    query = query.in("id", filters.filterJobIds);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return { rows: [], totalCount: 0 };
  }

  const rawJobs = (data ?? []) as {
    id: string;
    title: string;
    description: string;
    status: JobStatus;
    urgency: "normal" | "urgent";
    category_id: number;
    area_id: number;
    customer_id: string;
    assigned_professional_id: string | null;
    budget_min: number | null;
    budget_max: number | null;
    created_at: string;
    updated_at: string;
  }[];

  if (rawJobs.length === 0) {
    return { rows: [], totalCount: count ?? 0 };
  }

  const userIds = Array.from(
    new Set(
      rawJobs.flatMap((j) =>
        j.assigned_professional_id ? [j.customer_id, j.assigned_professional_id] : [j.customer_id]
      )
    )
  );

  const [catsRes, areasRes, usersRes] = await Promise.all([
    supabase.from("categories").select("id, name"),
    supabase.from("areas").select("id, name"),
    supabase.from("profiles").select("id, full_name").in("id", userIds),
  ]);

  const catMap = new Map<number, string>();
  for (const c of (catsRes.data ?? []) as { id: number; name: string }[]) {
    catMap.set(Number(c.id), c.name);
  }

  const areaMap = new Map<number, string>();
  for (const a of (areasRes.data ?? []) as { id: number; name: string }[]) {
    areaMap.set(Number(a.id), a.name);
  }

  const userMap = new Map<string, string>();
  for (const u of (usersRes.data ?? []) as { id: string; full_name: string }[]) {
    userMap.set(u.id, u.full_name);
  }

  const rows: AdminJobRow[] = rawJobs.map((j) => ({
    ...j,
    category_id: Number(j.category_id),
    category_name: catMap.get(Number(j.category_id)) ?? `Category #${j.category_id}`,
    area_id: Number(j.area_id),
    area_name: areaMap.get(Number(j.area_id)) ?? `Area #${j.area_id}`,
    customer_name: userMap.get(j.customer_id) ?? "Customer",
    assigned_professional_name: j.assigned_professional_id
      ? userMap.get(j.assigned_professional_id) ?? "Assigned Pro"
      : null,
  }));

  return { rows, totalCount: count ?? rows.length };
}

export async function fetchAdminJobDetail(
  supabase: SupabaseClient,
  jobId: string
): Promise<{
  job: AdminJobRow | null;
  offers: AdminOfferRow[];
  events: AdminJobEventRow[];
  messages: AdminChatMessageRow[];
}> {
  const { data: rawJob, error: jobErr } = await supabase
    .from("jobs")
    .select(
      "id, title, description, status, urgency, category_id, area_id, customer_id, assigned_professional_id, budget_min, budget_max, created_at, updated_at"
    )
    .eq("id", jobId)
    .maybeSingle();

  if (jobErr) {
    throw new Error(jobErr.message);
  }
  if (!rawJob) {
    return { job: null, offers: [], events: [], messages: [] };
  }

  const [offersRes, eventsRes, convRes, catsRes, areasRes] = await Promise.all([
    supabase
      .from("offers")
      .select("id, professional_id, price, inspection_fee, eta_minutes, message, status, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false }),
    supabase
      .from("job_events")
      .select("id, from_status, to_status, actor_id, note, at")
      .eq("job_id", jobId)
      .order("at", { ascending: true }),
    supabase.from("conversations").select("id").eq("job_id", jobId).maybeSingle(),
    supabase.from("categories").select("id, name").eq("id", rawJob.category_id).maybeSingle(),
    supabase.from("areas").select("id, name").eq("id", rawJob.area_id).maybeSingle(),
  ]);

  let rawMessages: { id: string; sender_id: string; body: string; created_at: string }[] = [];
  if (convRes.data?.id && rawJob.status === "Disputed") {
    const msgRes = await supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", convRes.data.id)
      .order("created_at", { ascending: true });
    rawMessages = (msgRes.data ?? []) as {
      id: string;
      sender_id: string;
      body: string;
      created_at: string;
    }[];
  }

  const offerRows = (offersRes.data ?? []) as {
    id: string;
    professional_id: string;
    price: number;
    inspection_fee: number;
    eta_minutes: number | null;
    message: string | null;
    status: string;
    created_at: string;
  }[];

  const eventRows = (eventsRes.data ?? []) as {
    id: string;
    from_status: string | null;
    to_status: string;
    actor_id: string | null;
    note: string | null;
    at: string;
  }[];

  const profileIds = new Set<string>([rawJob.customer_id]);
  if (rawJob.assigned_professional_id) profileIds.add(rawJob.assigned_professional_id);
  for (const o of offerRows) profileIds.add(o.professional_id);
  for (const e of eventRows) {
    if (e.actor_id) profileIds.add(e.actor_id);
  }
  for (const m of rawMessages) profileIds.add(m.sender_id);

  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", Array.from(profileIds));

  const nameMap = new Map<string, string>();
  for (const p of (profilesData ?? []) as { id: string; full_name: string }[]) {
    nameMap.set(p.id, p.full_name);
  }

  const job: AdminJobRow = {
    ...(rawJob as AdminJobRow),
    category_id: Number(rawJob.category_id),
    category_name: (catsRes.data as { name?: string } | null)?.name ?? `Category #${rawJob.category_id}`,
    area_id: Number(rawJob.area_id),
    area_name: (areasRes.data as { name?: string } | null)?.name ?? `Area #${rawJob.area_id}`,
    customer_name: nameMap.get(rawJob.customer_id) ?? "Customer",
    assigned_professional_name: rawJob.assigned_professional_id
      ? nameMap.get(rawJob.assigned_professional_id) ?? "Assigned Pro"
      : null,
  };

  const offers: AdminOfferRow[] = offerRows.map((o) => ({
    ...o,
    price: Number(o.price),
    inspection_fee: Number(o.inspection_fee),
    professional_name: nameMap.get(o.professional_id) ?? "Professional",
  }));

  const events: AdminJobEventRow[] = eventRows.map((e) => ({
    ...e,
    actor_name: e.actor_id ? nameMap.get(e.actor_id) ?? "User" : null,
  }));

  const messages: AdminChatMessageRow[] = rawMessages.map((m) => ({
    ...m,
    sender_name: nameMap.get(m.sender_id) ?? "Participant",
  }));

  return { job, offers, events, messages };
}

export async function fetchAdminReports(
  supabase: SupabaseClient,
  statusFilter: ReportStatus | "",
  page = 1,
  pageSize = 20
): Promise<{ rows: AdminReportRow[]; totalCount: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("reports")
    .select(
      "id, reporter_id, target_user_id, target_job_id, reason, details, status, resolution_note, resolved_at, created_at",
      { count: "exact" }
    );

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return { rows: [], totalCount: 0 };
  }

  const rawReports = (data ?? []) as {
    id: string;
    reporter_id: string;
    target_user_id: string | null;
    target_job_id: string | null;
    reason: string;
    details: string | null;
    status: ReportStatus;
    resolution_note: string | null;
    resolved_at: string | null;
    created_at: string;
  }[];

  if (rawReports.length === 0) {
    return { rows: [], totalCount: count ?? 0 };
  }

  const userIds = Array.from(
    new Set(
      rawReports.flatMap((r) => (r.target_user_id ? [r.reporter_id, r.target_user_id] : [r.reporter_id]))
    )
  );
  const jobIds = Array.from(
    new Set(rawReports.map((r) => r.target_job_id).filter((id): id is string => Boolean(id)))
  );

  const [usersRes, jobsRes] = await Promise.all([
    userIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] }),
    jobIds.length > 0
      ? supabase.from("jobs").select("id, title").in("id", jobIds)
      : Promise.resolve({ data: [] }),
  ]);

  const userMap = new Map<string, string>();
  for (const u of (usersRes.data ?? []) as { id: string; full_name: string }[]) {
    userMap.set(u.id, u.full_name);
  }

  const jobMap = new Map<string, string>();
  for (const j of (jobsRes.data ?? []) as { id: string; title: string }[]) {
    jobMap.set(j.id, j.title);
  }

  const rows: AdminReportRow[] = rawReports.map((r) => ({
    ...r,
    reporter_name: userMap.get(r.reporter_id) ?? "Reporter",
    target_user_name: r.target_user_id ? userMap.get(r.target_user_id) ?? "User" : null,
    target_job_title: r.target_job_id ? jobMap.get(r.target_job_id) ?? "Job" : null,
  }));

  return { rows, totalCount: count ?? rows.length };
}

export async function fetchAdminAreas(
  supabase: SupabaseClient
): Promise<{ id: number; name: string; city: string }[]> {
  const { data, error } = await supabase
    .from("areas")
    .select("id, name, city")
    .order("name");
  if (error) {
    throw new Error(error.message);
  }
  return ((data ?? []) as { id: number; name: string; city: string }[]).map((a) => ({
    id: Number(a.id),
    name: a.name,
    city: a.city,
  }));
}

export async function resolveReportRpc(
  supabase: SupabaseClient,
  reportId: string,
  status: "reviewing" | "resolved" | "dismissed",
  note: string
): Promise<void> {
  const { error } = await supabase.rpc("admin_resolve_report", {
    p_report_id: reportId,
    p_status: status,
    p_note: note,
  });
  if (error) {
    throw new Error(error.message);
  }
}
