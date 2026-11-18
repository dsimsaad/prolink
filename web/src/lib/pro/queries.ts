import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type {
  AreaOption,
  CategoryOption,
  CustomerNotificationItem,
  JobEventItem,
  JobReviewItem,
  JobStatus,
  JobUrgency,
  OfferStatus,
  OpportunityJobRow,
  ProfessionalAssignedJobRow,
  ProfessionalAvailability,
  ProfessionalOfferRow,
  ProfessionalProfileFullData,
  ProfessionalReviewRow,
  ProfessionalStatsData,
} from "@/lib/pro/types";
import { sortOpportunities } from "@/lib/pro/opportunity-sort";

function getFirstName(fullName: string | null | undefined): string {
  const trimmed = (fullName ?? "").trim();
  if (!trimmed) return "Customer";
  return trimmed.split(/\s+/)[0] || "Customer";
}

export async function fetchProfessionalProfileData(
  professionalId: string,
  email: string
): Promise<{
  profile: ProfessionalProfileFullData;
  categories: CategoryOption[];
  areas: AreaOption[];
}> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [
    profileRes,
    proProfileRes,
    contactRes,
    skillsRes,
    proAreasRes,
    catsRes,
    areasRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", professionalId)
      .maybeSingle(),
    supabase
      .from("professional_profiles")
      .select(
        "profile_id, bio, years_experience, availability, verified, status, reviewed_at, rating_count, avg_rating_bayes"
      )
      .eq("profile_id", professionalId)
      .maybeSingle(),
    supabase
      .from("contact_details")
      .select("phone")
      .eq("profile_id", professionalId)
      .maybeSingle(),
    supabase
      .from("professional_skills")
      .select("category_id")
      .eq("professional_id", professionalId),
    supabase
      .from("professional_areas")
      .select("area_id")
      .eq("professional_id", professionalId),
    supabase
      .from("categories")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase.from("areas").select("id, name").order("name", { ascending: true }),
  ]);

  const categories: CategoryOption[] = (catsRes.data ?? []).map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    is_active: Boolean(row.is_active),
  }));

  const areas: AreaOption[] = (areasRes.data ?? []).map((row) => ({
    id: Number(row.id),
    name: String(row.name),
  }));

  const pp = proProfileRes.data;
  const rawAvail = String(pp?.availability ?? "available");
  const availability: ProfessionalAvailability =
    rawAvail === "busy" || rawAvail === "offline" ? rawAvail : "available";

  const profile: ProfessionalProfileFullData = {
    profile_id: professionalId,
    full_name: String(profileRes.data?.full_name || "Professional"),
    email,
    phone: String(contactRes.data?.phone || ""),
    bio: String(pp?.bio || ""),
    years_experience: Number(pp?.years_experience ?? 0),
    availability,
    verified: Boolean(pp?.verified),
    status: (pp?.status as ProfessionalProfileFullData["status"]) ?? "approved",
    reviewed_at: pp?.reviewed_at ? String(pp.reviewed_at) : null,
    rating_count: Number(pp?.rating_count ?? 0),
    avg_rating_bayes: Number(pp?.avg_rating_bayes ?? 0),
    category_ids: (skillsRes.data ?? []).map((s) => Number(s.category_id)),
    area_ids: (proAreasRes.data ?? []).map((a) => Number(a.area_id)),
  };

  return { profile, categories, areas };
}

export async function fetchProfessionalOpportunities(
  professionalId: string
): Promise<OpportunityJobRow[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const nowIso = new Date().toISOString();

  const [jobsRes, myOffersRes, catsRes, areasRes] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id, customer_id, title, description, category_id, area_id, budget_min, budget_max, urgency, status, expires_at, created_at, updated_at"
      )
      .in("status", ["Open", "Offers received"])
      .neq("customer_id", professionalId)
      .order("created_at", { ascending: false }),
    supabase
      .from("offers")
      .select(
        "id, job_id, professional_id, price, inspection_fee, eta_minutes, message, status, created_at"
      )
      .eq("professional_id", professionalId),
    supabase.from("categories").select("id, name"),
    supabase.from("areas").select("id, name"),
  ]);

  const rawJobs = (jobsRes.data ?? []).filter((j) => {
    if (!j.expires_at) return true;
    return String(j.expires_at) > nowIso;
  });

  if (rawJobs.length === 0) {
    return [];
  }

  const jobIds = rawJobs.map((j) => String(j.id));
  const customerIds = Array.from(
    new Set(rawJobs.map((j) => String(j.customer_id)))
  );

  const [countsRes, customerProfilesRes] = await Promise.all([
    supabase.rpc("job_offer_counts", { p_job_ids: jobIds }),
    customerIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", customerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const categoryMap = new Map<number, string>();
  for (const c of catsRes.data ?? []) {
    categoryMap.set(Number(c.id), String(c.name));
  }

  const areaMap = new Map<number, string>();
  for (const a of areasRes.data ?? []) {
    areaMap.set(Number(a.id), String(a.name));
  }

  const customerNameMap = new Map<string, string>();
  for (const p of customerProfilesRes.data ?? []) {
    customerNameMap.set(String(p.id), getFirstName(String(p.full_name || "")));
  }

  const offerCountMap = new Map<string, number>();
  if (Array.isArray(countsRes.data)) {
    for (const row of countsRes.data as {
      job_id?: string;
      active_offer_count?: number;
    }[]) {
      if (row.job_id) {
        offerCountMap.set(String(row.job_id), Number(row.active_offer_count ?? 0));
      }
    }
  }

  const myOfferByJobId = new Map<string, ProfessionalOfferRow>();
  for (const o of myOffersRes.data ?? []) {
    const jId = String(o.job_id);
    myOfferByJobId.set(jId, {
      id: String(o.id),
      job_id: jId,
      professional_id: String(o.professional_id),
      price: Number(o.price),
      inspection_fee: Number(o.inspection_fee ?? 0),
      eta_minutes: Number(o.eta_minutes),
      message: o.message ? String(o.message) : null,
      status: String(o.status) as OfferStatus,
      created_at: String(o.created_at),
      job_title: "",
      job_status: "Open",
      job_urgency: "normal",
      category_name: "",
      area_name: "",
    });
  }

  const mapped: OpportunityJobRow[] = rawJobs.map((job) => {
    const id = String(job.id);
    const catName = categoryMap.get(Number(job.category_id)) ?? "General";
    const arName = areaMap.get(Number(job.area_id)) ?? "Lahore";
    const myOffer = myOfferByJobId.get(id) ?? null;
    if (myOffer) {
      myOffer.job_title = String(job.title);
      myOffer.job_status = String(job.status) as JobStatus;
      myOffer.job_urgency = (
        job.urgency === "urgent" ? "urgent" : "normal"
      ) as JobUrgency;
      myOffer.category_name = catName;
      myOffer.area_name = arName;
    }

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
      expires_at: job.expires_at ? String(job.expires_at) : null,
      created_at: String(job.created_at),
      updated_at: String(job.updated_at),
      category_name: catName,
      area_name: arName,
      customer_first_name:
        customerNameMap.get(String(job.customer_id)) ?? "Customer",
      active_offer_count: offerCountMap.get(id) ?? 0,
      my_offer: myOffer,
    };
  });

  return sortOpportunities(mapped);
}

export async function fetchOpportunityDetail(
  jobId: string,
  professionalId: string
): Promise<OpportunityJobRow | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: rawJob } = await supabase
    .from("jobs")
    .select(
      "id, customer_id, title, description, category_id, area_id, budget_min, budget_max, urgency, status, expires_at, created_at, updated_at"
    )
    .eq("id", jobId)
    .maybeSingle();

  if (!rawJob) {
    return null;
  }

  const [catRes, areaRes, customerProfileRes, myOfferRes, countsRes] =
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
        .from("profiles")
        .select("full_name")
        .eq("id", rawJob.customer_id)
        .maybeSingle(),
      supabase
        .from("offers")
        .select(
          "id, job_id, professional_id, price, inspection_fee, eta_minutes, message, status, created_at"
        )
        .eq("job_id", jobId)
        .eq("professional_id", professionalId)
        .maybeSingle(),
      supabase.rpc("job_offer_counts", { p_job_ids: [jobId] }),
    ]);

  let activeCount = 0;
  if (Array.isArray(countsRes.data) && countsRes.data.length > 0) {
    const first = countsRes.data[0] as { active_offer_count?: number };
    activeCount = Number(first.active_offer_count ?? 0);
  }

  const categoryName = catRes.data?.name ? String(catRes.data.name) : "General";
  const areaName = areaRes.data?.name ? String(areaRes.data.name) : "Lahore";

  const myOffer: ProfessionalOfferRow | null = myOfferRes.data
    ? {
        id: String(myOfferRes.data.id),
        job_id: String(myOfferRes.data.job_id),
        professional_id: String(myOfferRes.data.professional_id),
        price: Number(myOfferRes.data.price),
        inspection_fee: Number(myOfferRes.data.inspection_fee ?? 0),
        eta_minutes: Number(myOfferRes.data.eta_minutes),
        message: myOfferRes.data.message
          ? String(myOfferRes.data.message)
          : null,
        status: String(myOfferRes.data.status) as OfferStatus,
        created_at: String(myOfferRes.data.created_at),
        job_title: String(rawJob.title),
        job_status: String(rawJob.status) as JobStatus,
        job_urgency: (
          rawJob.urgency === "urgent" ? "urgent" : "normal"
        ) as JobUrgency,
        category_name: categoryName,
        area_name: areaName,
      }
    : null;

  return {
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
    expires_at: rawJob.expires_at ? String(rawJob.expires_at) : null,
    created_at: String(rawJob.created_at),
    updated_at: String(rawJob.updated_at),
    category_name: categoryName,
    area_name: areaName,
    customer_first_name: getFirstName(
      customerProfileRes.data?.full_name
        ? String(customerProfileRes.data.full_name)
        : null
    ),
    active_offer_count: activeCount,
    my_offer: myOffer,
  };
}

export async function fetchProfessionalOffers(
  professionalId: string
): Promise<ProfessionalOfferRow[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [offersRes, catsRes, areasRes] = await Promise.all([
    supabase
      .from("offers")
      .select(
        "id, job_id, professional_id, price, inspection_fee, eta_minutes, message, status, created_at"
      )
      .eq("professional_id", professionalId)
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("id, name"),
    supabase.from("areas").select("id, name"),
  ]);

  const rawOffers = offersRes.data ?? [];
  if (rawOffers.length === 0) {
    return [];
  }

  const jobIds = Array.from(new Set(rawOffers.map((o) => String(o.job_id))));
  const { data: jobsData } = await supabase
    .from("jobs")
    .select("id, title, status, urgency, category_id, area_id")
    .in("id", jobIds);

  const categoryMap = new Map<number, string>();
  for (const c of catsRes.data ?? []) {
    categoryMap.set(Number(c.id), String(c.name));
  }

  const areaMap = new Map<number, string>();
  for (const a of areasRes.data ?? []) {
    areaMap.set(Number(a.id), String(a.name));
  }

  const jobMap = new Map<
    string,
    {
      title: string;
      status: JobStatus;
      urgency: JobUrgency;
      category_name: string;
      area_name: string;
    }
  >();

  for (const j of jobsData ?? []) {
    jobMap.set(String(j.id), {
      title: String(j.title),
      status: String(j.status) as JobStatus,
      urgency: (j.urgency === "urgent" ? "urgent" : "normal") as JobUrgency,
      category_name: categoryMap.get(Number(j.category_id)) ?? "General",
      area_name: areaMap.get(Number(j.area_id)) ?? "Lahore",
    });
  }

  return rawOffers.map((o) => {
    const jId = String(o.job_id);
    const jMeta = jobMap.get(jId);
    return {
      id: String(o.id),
      job_id: jId,
      professional_id: String(o.professional_id),
      price: Number(o.price),
      inspection_fee: Number(o.inspection_fee ?? 0),
      eta_minutes: Number(o.eta_minutes),
      message: o.message ? String(o.message) : null,
      status: String(o.status) as OfferStatus,
      created_at: String(o.created_at),
      job_title: jMeta?.title ?? "Customer job",
      job_status: jMeta?.status ?? "Closed" as JobStatus,
      job_urgency: jMeta?.urgency ?? "normal",
      category_name: jMeta?.category_name ?? "General",
      area_name: jMeta?.area_name ?? "Lahore",
    };
  });
}

export async function fetchProfessionalAssignedJobs(
  professionalId: string
): Promise<ProfessionalAssignedJobRow[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [jobsRes, offersRes, catsRes, areasRes] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id, customer_id, title, description, category_id, area_id, budget_min, budget_max, urgency, status, assigned_professional_id, expires_at, work_started_at, professional_marked_done_at, created_at, updated_at"
      )
      .eq("assigned_professional_id", professionalId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("offers")
      .select("job_id, price, inspection_fee, eta_minutes, status")
      .eq("professional_id", professionalId)
      .eq("status", "accepted"),
    supabase.from("categories").select("id, name"),
    supabase.from("areas").select("id, name"),
  ]);

  const rawJobs = jobsRes.data ?? [];
  if (rawJobs.length === 0) {
    return [];
  }

  const jobIds = rawJobs.map((j) => String(j.id));
  const customerIds = Array.from(
    new Set(rawJobs.map((j) => String(j.customer_id)))
  );

  const [profilesRes, reviewsRes] = await Promise.all([
    customerIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", customerIds)
      : Promise.resolve({ data: [] }),
    supabase.from("reviews").select("job_id").in("job_id", jobIds),
  ]);

  const categoryMap = new Map<number, string>();
  for (const c of catsRes.data ?? []) {
    categoryMap.set(Number(c.id), String(c.name));
  }

  const areaMap = new Map<number, string>();
  for (const a of areasRes.data ?? []) {
    areaMap.set(Number(a.id), String(a.name));
  }

  const customerNameMap = new Map<string, string>();
  for (const p of profilesRes.data ?? []) {
    customerNameMap.set(String(p.id), String(p.full_name || "Customer"));
  }

  const acceptedOfferMap = new Map<
    string,
    { price: number; inspection_fee: number; eta_minutes: number }
  >();
  for (const o of offersRes.data ?? []) {
    acceptedOfferMap.set(String(o.job_id), {
      price: Number(o.price),
      inspection_fee: Number(o.inspection_fee ?? 0),
      eta_minutes: Number(o.eta_minutes),
    });
  }

  const reviewedSet = new Set<string>(
    (reviewsRes.data ?? []).map((r) => String(r.job_id))
  );

  return rawJobs.map((job) => {
    const id = String(job.id);
    const offer = acceptedOfferMap.get(id);
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
      assigned_professional_id: String(job.assigned_professional_id),
      expires_at: job.expires_at ? String(job.expires_at) : null,
      work_started_at: job.work_started_at ? String(job.work_started_at) : null,
      professional_marked_done_at: job.professional_marked_done_at
        ? String(job.professional_marked_done_at)
        : null,
      created_at: String(job.created_at),
      updated_at: String(job.updated_at),
      category_name: categoryMap.get(Number(job.category_id)) ?? "General",
      area_name: areaMap.get(Number(job.area_id)) ?? "Lahore",
      customer_name:
        customerNameMap.get(String(job.customer_id)) ?? "Customer",
      agreed_price: offer?.price ?? null,
      agreed_inspection_fee: offer?.inspection_fee ?? null,
      agreed_eta_minutes: offer?.eta_minutes ?? null,
      has_review: reviewedSet.has(id),
    };
  });
}

export async function fetchProfessionalJobDetail(
  jobId: string,
  professionalId: string
): Promise<{
  job: ProfessionalAssignedJobRow | null;
  customerPhone: string | null;
  events: JobEventItem[];
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
    .eq("assigned_professional_id", professionalId)
    .maybeSingle();

  if (!rawJob) {
    return {
      job: null,
      customerPhone: null,
      events: [],
      review: null,
    };
  }

  const customerId = String(rawJob.customer_id);

  const [
    catRes,
    areaRes,
    customerProfileRes,
    contactRes,
    offerRes,
    eventsRes,
    reviewRes,
  ] = await Promise.all([
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
      .from("profiles")
      .select("full_name")
      .eq("id", customerId)
      .maybeSingle(),
    supabase
      .from("contact_details")
      .select("phone")
      .eq("profile_id", customerId)
      .maybeSingle(),
    supabase
      .from("offers")
      .select("price, inspection_fee, eta_minutes")
      .eq("job_id", jobId)
      .eq("professional_id", professionalId)
      .eq("status", "accepted")
      .maybeSingle(),
    supabase
      .from("job_events")
      .select("id, job_id, from_status, to_status, actor_id, note, at")
      .eq("job_id", jobId)
      .order("at", { ascending: true }),
    supabase
      .from("reviews")
      .select(
        "id, job_id, reviewer_id, professional_id, rating, comment, created_at"
      )
      .eq("job_id", jobId)
      .maybeSingle(),
  ]);

  const customerName = customerProfileRes.data?.full_name
    ? String(customerProfileRes.data.full_name)
    : "Customer";

  const events: JobEventItem[] = (eventsRes.data ?? []).map((ev) => ({
    id: String(ev.id),
    job_id: String(ev.job_id),
    from_status: ev.from_status ? String(ev.from_status) : null,
    to_status: String(ev.to_status),
    actor_id: ev.actor_id ? String(ev.actor_id) : null,
    actor_name: ev.actor_id
      ? ev.actor_id === professionalId
        ? "You"
        : ev.actor_id === customerId
          ? customerName
          : "Participant"
      : "System",
    note: ev.note ? String(ev.note) : null,
    at: String(ev.at),
  }));

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

  const job: ProfessionalAssignedJobRow = {
    id: String(rawJob.id),
    customer_id: customerId,
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
    assigned_professional_id: String(rawJob.assigned_professional_id),
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
    customer_name: customerName,
    agreed_price: offerRes.data ? Number(offerRes.data.price) : null,
    agreed_inspection_fee: offerRes.data
      ? Number(offerRes.data.inspection_fee ?? 0)
      : null,
    agreed_eta_minutes: offerRes.data
      ? Number(offerRes.data.eta_minutes)
      : null,
    has_review: review !== null,
  };

  return {
    job,
    customerPhone: contactRes.data?.phone
      ? String(contactRes.data.phone)
      : null,
    events,
    review,
  };
}

export async function fetchProfessionalReviews(
  professionalId: string
): Promise<{
  reviews: ProfessionalReviewRow[];
  ratingCount: number;
  avgRating: number | null;
}> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [reviewsRes, proProfileRes] = await Promise.all([
    supabase
      .from("reviews")
      .select(
        "id, job_id, reviewer_id, professional_id, rating, comment, created_at"
      )
      .eq("professional_id", professionalId)
      .order("created_at", { ascending: false }),
    supabase
      .from("professional_profiles")
      .select("rating_count, avg_rating_bayes")
      .eq("profile_id", professionalId)
      .maybeSingle(),
  ]);

  const rawReviews = reviewsRes.data ?? [];
  if (rawReviews.length === 0) {
    return {
      reviews: [],
      ratingCount: 0,
      avgRating: null,
    };
  }

  const jobIds = Array.from(new Set(rawReviews.map((r) => String(r.job_id))));
  const reviewerIds = Array.from(
    new Set(rawReviews.map((r) => String(r.reviewer_id)))
  );

  const [jobsRes, profilesRes] = await Promise.all([
    supabase.from("jobs").select("id, title").in("id", jobIds),
    supabase.from("profiles").select("id, full_name").in("id", reviewerIds),
  ]);

  const jobTitleMap = new Map<string, string>();
  for (const j of jobsRes.data ?? []) {
    jobTitleMap.set(String(j.id), String(j.title));
  }

  const reviewerNameMap = new Map<string, string>();
  for (const p of profilesRes.data ?? []) {
    reviewerNameMap.set(String(p.id), getFirstName(String(p.full_name || "")));
  }

  const reviews: ProfessionalReviewRow[] = rawReviews.map((r) => ({
    id: String(r.id),
    job_id: String(r.job_id),
    job_title: jobTitleMap.get(String(r.job_id)) ?? "Completed job",
    reviewer_id: String(r.reviewer_id),
    reviewer_name:
      reviewerNameMap.get(String(r.reviewer_id)) ?? "Customer",
    professional_id: String(r.professional_id),
    rating: Number(r.rating),
    comment: r.comment ? String(r.comment) : null,
    created_at: String(r.created_at),
  }));

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const computedAvg = Number((sum / reviews.length).toFixed(2));
  const ratingCount =
    Number(proProfileRes.data?.rating_count ?? reviews.length) || reviews.length;

  return {
    reviews,
    ratingCount,
    avgRating: computedAvg,
  };
}

export async function fetchProfessionalStats(): Promise<ProfessionalStatsData> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data } = await supabase.rpc("my_professional_stats");
  const raw =
    data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {};

  const rawWeekly = Array.isArray(raw.weekly_offers)
    ? (raw.weekly_offers as { week_start?: string; count?: number }[])
    : [];

  return {
    offers_sent: Number(raw.offers_sent ?? 0),
    offers_accepted: Number(raw.offers_accepted ?? 0),
    offers_pending: Number(raw.offers_pending ?? 0),
    offers_rejected: Number(raw.offers_rejected ?? 0),
    offers_withdrawn: Number(raw.offers_withdrawn ?? 0),
    jobs_active: Number(raw.jobs_active ?? 0),
    jobs_completed: Number(raw.jobs_completed ?? 0),
    reviews_count: Number(raw.reviews_count ?? 0),
    avg_rating:
      raw.avg_rating !== null && raw.avg_rating !== undefined
        ? Number(raw.avg_rating)
        : null,
    completed_agreed_value: Number(raw.completed_agreed_value ?? 0),
    weekly_offers: rawWeekly.map((w) => ({
      week_start: String(w.week_start ?? ""),
      count: Number(w.count ?? 0),
    })),
  };
}

export async function fetchProfessionalNotifications(
  professionalId: string
): Promise<CustomerNotificationItem[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data } = await supabase
    .from("notifications")
    .select("id, user_id, type, payload, read_at, created_at")
    .eq("user_id", professionalId)
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
