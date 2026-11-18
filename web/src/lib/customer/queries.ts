import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type {
  AreaOption,
  AssignedProfessionalCardData,
  CategoryOption,
  CustomerJobRow,
  CustomerNotificationItem,
  JobEventItem,
  JobReviewItem,
  JobStatus,
  JobUrgency,
  OfferStatus,
  OfferWithProfessional,
} from "@/lib/customer/types";

export async function fetchActiveCategoriesAndAreas(): Promise<{
  categories: CategoryOption[];
  areas: AreaOption[];
}> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [catRes, areaRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("areas")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);

  const categories: CategoryOption[] = (catRes.data ?? []).map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    is_active: Boolean(row.is_active),
  }));

  const areas: AreaOption[] = (areaRes.data ?? []).map((row) => ({
    id: Number(row.id),
    name: String(row.name),
  }));

  return { categories, areas };
}

export async function fetchCustomerJobs(
  customerId: string
): Promise<CustomerJobRow[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [jobsRes, catsRes, areasRes] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id, customer_id, title, description, category_id, area_id, budget_min, budget_max, urgency, status, assigned_professional_id, expires_at, work_started_at, professional_marked_done_at, created_at, updated_at"
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("id, name"),
    supabase.from("areas").select("id, name"),
  ]);

  const rawJobs = jobsRes.data ?? [];
  if (rawJobs.length === 0) {
    return [];
  }

  const jobIds = rawJobs.map((j) => String(j.id));

  const [offersRes, reviewsRes] = await Promise.all([
    supabase
      .from("offers")
      .select("job_id, status")
      .in("job_id", jobIds),
    supabase
      .from("reviews")
      .select("job_id")
      .in("job_id", jobIds),
  ]);

  const categoryMap = new Map<number, string>();
  for (const c of catsRes.data ?? []) {
    categoryMap.set(Number(c.id), String(c.name));
  }

  const areaMap = new Map<number, string>();
  for (const a of areasRes.data ?? []) {
    areaMap.set(Number(a.id), String(a.name));
  }

  const offerCounts = new Map<string, { total: number; pending: number }>();
  for (const o of offersRes.data ?? []) {
    const jId = String(o.job_id);
    const current = offerCounts.get(jId) ?? { total: 0, pending: 0 };
    if (o.status === "pending" || o.status === "accepted") {
      current.total += 1;
    }
    if (o.status === "pending") {
      current.pending += 1;
    }
    offerCounts.set(jId, current);
  }

  const reviewedJobSet = new Set<string>(
    (reviewsRes.data ?? []).map((r) => String(r.job_id))
  );

  return rawJobs.map((job) => {
    const id = String(job.id);
    const counts = offerCounts.get(id) ?? { total: 0, pending: 0 };
    return {
      id,
      customer_id: String(job.customer_id),
      title: String(job.title),
      description: String(job.description),
      category_id: Number(job.category_id),
      area_id: Number(job.area_id),
      budget_min:
        job.budget_min !== null && job.budget_min !== undefined
          ? Number(job.budget_min)
          : null,
      budget_max:
        job.budget_max !== null && job.budget_max !== undefined
          ? Number(job.budget_max)
          : null,
      urgency: (job.urgency === "urgent" ? "urgent" : "normal") as JobUrgency,
      status: String(job.status) as JobStatus,
      assigned_professional_id: job.assigned_professional_id
        ? String(job.assigned_professional_id)
        : null,
      expires_at: job.expires_at ? String(job.expires_at) : null,
      work_started_at: job.work_started_at ? String(job.work_started_at) : null,
      professional_marked_done_at: job.professional_marked_done_at
        ? String(job.professional_marked_done_at)
        : null,
      created_at: String(job.created_at),
      updated_at: String(job.updated_at),
      category_name: categoryMap.get(Number(job.category_id)) ?? "General",
      area_name: areaMap.get(Number(job.area_id)) ?? "Lahore",
      offer_count: counts.total,
      pending_offer_count: counts.pending,
      has_review: reviewedJobSet.has(id),
    };
  });
}

export async function fetchCustomerJobDetail(
  jobId: string,
  customerId: string
): Promise<{
  job: CustomerJobRow | null;
  offers: OfferWithProfessional[];
  events: JobEventItem[];
  assignedProfessional: AssignedProfessionalCardData | null;
  review: JobReviewItem | null;
}> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: rawJob } = await supabase
    .from("jobs")
    .select(
      "id, customer_id, title, description, category_id, area_id, budget_min, budget_max, urgency, status, assigned_professional_id, expires_at, work_started_at, professional_marked_done_at, created_at, updated_at"
    )
    .eq("id", jobId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (!rawJob) {
    return {
      job: null,
      offers: [],
      events: [],
      assignedProfessional: null,
      review: null,
    };
  }

  const [catRes, areaRes, rawOffersRes, rawEventsRes, reviewRes] =
    await Promise.all([
      supabase
        .from("categories")
        .select("name")
        .eq("id", rawJob.category_id)
        .maybeSingle(),
      supabase
        .from("areas")
        .select("name")
        .eq("id", rawJob.area_id)
        .maybeSingle(),
      supabase
        .from("offers")
        .select(
          "id, job_id, professional_id, price, inspection_fee, eta_minutes, message, status, created_at"
        )
        .eq("job_id", jobId)
        .order("created_at", { ascending: true }),
      supabase
        .from("job_events")
        .select("id, job_id, from_status, to_status, actor_id, note, at")
        .eq("job_id", jobId)
        .order("at", { ascending: true }),
      supabase
        .from("reviews")
        .select("id, job_id, reviewer_id, professional_id, rating, comment, created_at")
        .eq("job_id", jobId)
        .maybeSingle(),
    ]);

  const rawOffers = rawOffersRes.data ?? [];
  const rawEvents = rawEventsRes.data ?? [];

  const profileIds = new Set<string>();
  for (const o of rawOffers) {
    profileIds.add(String(o.professional_id));
  }
  for (const ev of rawEvents) {
    if (ev.actor_id) {
      profileIds.add(String(ev.actor_id));
    }
  }
  if (rawJob.assigned_professional_id) {
    profileIds.add(String(rawJob.assigned_professional_id));
  }

  const profileIdsList = Array.from(profileIds);

  const [profilesRes, proProfilesRes] =
    profileIdsList.length > 0
      ? await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", profileIdsList),
          supabase
            .from("professional_profiles")
            .select(
              "profile_id, bio, years_experience, rating_count, avg_rating_bayes, verified"
            )
            .in("profile_id", profileIdsList),
        ])
      : [{ data: [] }, { data: [] }];

  const nameMap = new Map<string, string>();
  for (const p of profilesRes.data ?? []) {
    nameMap.set(String(p.id), String(p.full_name || "Professional"));
  }

  const proProfileMap = new Map<
    string,
    {
      bio: string | null;
      years_experience: number;
      rating_count: number;
      avg_rating_bayes: number;
      verified: boolean;
    }
  >();

  for (const pp of proProfilesRes.data ?? []) {
    proProfileMap.set(String(pp.profile_id), {
      bio: pp.bio ? String(pp.bio) : null,
      years_experience: Number(pp.years_experience ?? 0),
      rating_count: Number(pp.rating_count ?? 0),
      avg_rating_bayes: Number(pp.avg_rating_bayes ?? 0),
      verified: Boolean(pp.verified),
    });
  }

  const offers: OfferWithProfessional[] = rawOffers
    .filter((o) => o.status === "pending" || o.status === "accepted")
    .map((o) => {
      const proId = String(o.professional_id);
      const proMeta = proProfileMap.get(proId);
      return {
        id: String(o.id),
        job_id: String(o.job_id),
        professional_id: proId,
        price: Number(o.price),
        inspection_fee: Number(o.inspection_fee ?? 0),
        eta_minutes: Number(o.eta_minutes),
        message: o.message ? String(o.message) : null,
        status: String(o.status) as OfferStatus,
        created_at: String(o.created_at),
        professional_name: nameMap.get(proId) ?? "Professional",
        years_experience: proMeta?.years_experience ?? 0,
        rating_count: proMeta?.rating_count ?? 0,
        avg_rating_bayes: proMeta?.avg_rating_bayes ?? 0,
        verified: proMeta?.verified ?? false,
      };
    });

  const events: JobEventItem[] = rawEvents.map((ev) => ({
    id: String(ev.id),
    job_id: String(ev.job_id),
    from_status: ev.from_status ? String(ev.from_status) : null,
    to_status: String(ev.to_status),
    actor_id: ev.actor_id ? String(ev.actor_id) : null,
    actor_name: ev.actor_id
      ? ev.actor_id === customerId
        ? "You"
        : nameMap.get(String(ev.actor_id)) ?? "Participant"
      : "System",
    note: ev.note ? String(ev.note) : null,
    at: String(ev.at),
  }));

  let assignedProfessional: AssignedProfessionalCardData | null = null;
  if (rawJob.assigned_professional_id) {
    const assignedId = String(rawJob.assigned_professional_id);
    const proMeta = proProfileMap.get(assignedId);

    // Read professional phone straight from contact_details via RLS (can_see_contact)
    const { data: contactRow } = await supabase
      .from("contact_details")
      .select("phone")
      .eq("profile_id", assignedId)
      .maybeSingle();

    assignedProfessional = {
      profile_id: assignedId,
      full_name: nameMap.get(assignedId) ?? "Assigned Professional",
      bio: proMeta?.bio ?? null,
      years_experience: proMeta?.years_experience ?? 0,
      rating_count: proMeta?.rating_count ?? 0,
      avg_rating_bayes: proMeta?.avg_rating_bayes ?? 0,
      phone: contactRow?.phone ? String(contactRow.phone) : null,
    };
  }

  const review: JobReviewItem | null = reviewRes.data
    ? {
        id: String(reviewRes.data.id),
        job_id: String(reviewRes.data.job_id),
        reviewer_id: String(reviewRes.data.reviewer_id),
        professional_id: String(reviewRes.data.professional_id),
        rating: Number(reviewRes.data.rating),
        comment: reviewRes.data.comment ? String(reviewRes.data.comment) : null,
        created_at: String(reviewRes.data.created_at),
      }
    : null;

  const job: CustomerJobRow = {
    id: String(rawJob.id),
    customer_id: String(rawJob.customer_id),
    title: String(rawJob.title),
    description: String(rawJob.description),
    category_id: Number(rawJob.category_id),
    area_id: Number(rawJob.area_id),
    budget_min:
      rawJob.budget_min !== null && rawJob.budget_min !== undefined
        ? Number(rawJob.budget_min)
        : null,
    budget_max:
      rawJob.budget_max !== null && rawJob.budget_max !== undefined
        ? Number(rawJob.budget_max)
        : null,
    urgency: (rawJob.urgency === "urgent" ? "urgent" : "normal") as JobUrgency,
    status: String(rawJob.status) as JobStatus,
    assigned_professional_id: rawJob.assigned_professional_id
      ? String(rawJob.assigned_professional_id)
      : null,
    expires_at: rawJob.expires_at ? String(rawJob.expires_at) : null,
    work_started_at: rawJob.work_started_at
      ? String(rawJob.work_started_at)
      : null,
    professional_marked_done_at: rawJob.professional_marked_done_at
      ? String(rawJob.professional_marked_done_at)
      : null,
    created_at: String(rawJob.created_at),
    updated_at: String(rawJob.updated_at),
    category_name: catRes.data?.name ? String(catRes.data.name) : "General",
    area_name: areaRes.data?.name ? String(areaRes.data.name) : "Lahore",
    offer_count: offers.length,
    pending_offer_count: offers.filter((o) => o.status === "pending").length,
    has_review: review !== null,
  };

  return {
    job,
    offers,
    events,
    assignedProfessional,
    review,
  };
}

export async function fetchCustomerRecentEvents(
  jobIds: string[],
  limit = 8
): Promise<(JobEventItem & { job_title: string })[]> {
  if (jobIds.length === 0) {
    return [];
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [eventsRes, jobsRes] = await Promise.all([
    supabase
      .from("job_events")
      .select("id, job_id, from_status, to_status, actor_id, note, at")
      .in("job_id", jobIds)
      .order("at", { ascending: false })
      .limit(limit),
    supabase.from("jobs").select("id, title").in("id", jobIds),
  ]);

  const titleMap = new Map<string, string>();
  for (const j of jobsRes.data ?? []) {
    titleMap.set(String(j.id), String(j.title));
  }

  return (eventsRes.data ?? []).map((ev) => ({
    id: String(ev.id),
    job_id: String(ev.job_id),
    from_status: ev.from_status ? String(ev.from_status) : null,
    to_status: String(ev.to_status),
    actor_id: ev.actor_id ? String(ev.actor_id) : null,
    actor_name: "System",
    note: ev.note ? String(ev.note) : null,
    at: String(ev.at),
    job_title: titleMap.get(String(ev.job_id)) ?? "Job",
  }));
}

export async function fetchCustomerNotifications(
  customerId: string
): Promise<CustomerNotificationItem[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data } = await supabase
    .from("notifications")
    .select("id, user_id, type, payload, read_at, created_at")
    .eq("user_id", customerId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((n) => ({
    id: String(n.id),
    user_id: String(n.user_id),
    type: String(n.type),
    payload:
      n.payload && typeof n.payload === "object"
        ? (n.payload as Record<string, unknown>)
        : {},
    read_at: n.read_at ? String(n.read_at) : null,
    created_at: String(n.created_at),
  }));
}
