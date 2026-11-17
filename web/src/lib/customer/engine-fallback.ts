import { createClient } from "@/utils/supabase/client";
import type {
  AcceptOfferResponse,
  CategorySuggestionResponse,
  CreateOrUpdateJobInput,
  CustomerJobMutationResponse,
  CreateReviewResponse,
  JobStatusChangeResponse,
  PublishJobResponse,
} from "@/lib/api/customer";
import type { JobStatus } from "@/lib/customer/types";

function handleSupabaseError(error: { code?: string; message: string } | null, actionDescription: string): never {
  if (error?.code === "42501") {
    throw new Error(
      `Permission denied by database security policy while trying to ${actionDescription}. ` +
      `Please ensure the ProLink API is running (run 'dotnet run --project api/ProLink.Api'), ` +
      `or execute '011_customer_job_mutations.sql' in the Supabase SQL Editor to allow direct portal mutations.`
    );
  }
  throw new Error(error?.message || `Failed to ${actionDescription}.`);
}

export async function fallbackCreateCustomerJob(
  input: CreateOrUpdateJobInput
): Promise<CustomerJobMutationResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Please sign in to post a job.");
  }

  const isPublish = Boolean(input.publish);
  const targetStatus: JobStatus = isPublish ? "Open" : "Draft";
  const now = new Date();
  const expiresAt = isPublish
    ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: job, error: insertError } = await supabase
    .from("jobs")
    .insert({
      customer_id: user.id,
      title: input.title.trim(),
      description: input.description.trim(),
      category_id: input.categoryId,
      area_id: input.areaId,
      budget_min: input.budgetMin,
      budget_max: input.budgetMax,
      urgency: input.urgency,
      status: targetStatus,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (insertError || !job) {
    handleSupabaseError(insertError, "create job");
  }

  // Audit event
  await supabase.from("job_events").insert({
    job_id: job.id,
    from_status: null,
    to_status: targetStatus,
    actor_id: user.id,
    note: isPublish ? "Job published by customer." : "Job saved as draft.",
  });

  // Calculate matched professionals in Lahore area & trade category
  let matchedCount = 0;
  if (isPublish) {
    try {
      const { count } = await supabase
        .from("professional_skills")
        .select("profile_id", { count: "exact", head: true })
        .eq("category_id", input.categoryId);
      matchedCount = count ?? 0;
    } catch {
      matchedCount = 0;
    }
  }

  return {
    id: String(job.id),
    customerId: String(job.customer_id),
    title: String(job.title),
    description: String(job.description),
    categoryId: Number(job.category_id),
    areaId: Number(job.area_id),
    budgetMin: job.budget_min !== null ? Number(job.budget_min) : null,
    budgetMax: job.budget_max !== null ? Number(job.budget_max) : null,
    urgency: job.urgency,
    status: job.status as JobStatus,
    assignedProfessionalId: job.assigned_professional_id ? String(job.assigned_professional_id) : null,
    expiresAt: job.expires_at ? String(job.expires_at) : null,
    createdAt: String(job.created_at),
    updatedAt: String(job.updated_at),
    matchedProfessionals: matchedCount,
  };
}

export async function fallbackUpdateDraftJob(
  jobId: string,
  input: Omit<CreateOrUpdateJobInput, "publish">
): Promise<CustomerJobMutationResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Please sign in to update this draft job.");
  }

  const { data: job, error: updateError } = await supabase
    .from("jobs")
    .update({
      title: input.title.trim(),
      description: input.description.trim(),
      category_id: input.categoryId,
      area_id: input.areaId,
      budget_min: input.budgetMin,
      budget_max: input.budgetMax,
      urgency: input.urgency,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("customer_id", user.id)
    .eq("status", "Draft")
    .select()
    .single();

  if (updateError || !job) {
    handleSupabaseError(updateError, "update draft job");
  }

  return {
    id: String(job.id),
    customerId: String(job.customer_id),
    title: String(job.title),
    description: String(job.description),
    categoryId: Number(job.category_id),
    areaId: Number(job.area_id),
    budgetMin: job.budget_min !== null ? Number(job.budget_min) : null,
    budgetMax: job.budget_max !== null ? Number(job.budget_max) : null,
    urgency: job.urgency,
    status: job.status as JobStatus,
    assignedProfessionalId: job.assigned_professional_id ? String(job.assigned_professional_id) : null,
    expiresAt: job.expires_at ? String(job.expires_at) : null,
    createdAt: String(job.created_at),
    updatedAt: String(job.updated_at),
    matchedProfessionals: 0,
  };
}

export async function fallbackPublishCustomerJob(
  jobId: string
): Promise<PublishJobResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Please sign in to publish this job.");
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const updatedAt = new Date().toISOString();

  const { data: job, error: updateError } = await supabase
    .from("jobs")
    .update({
      status: "Open",
      expires_at: expiresAt,
      updated_at: updatedAt,
    })
    .eq("id", jobId)
    .eq("customer_id", user.id)
    .eq("status", "Draft")
    .select()
    .single();

  if (updateError || !job) {
    handleSupabaseError(updateError, "publish job");
  }

  await supabase.from("job_events").insert({
    job_id: jobId,
    from_status: "Draft",
    to_status: "Open",
    actor_id: user.id,
    note: "Job published by customer.",
  });

  return {
    id: String(job.id),
    previousStatus: "Draft",
    status: "Open",
    expiresAt,
    matchedProfessionals: 1,
    updatedAt,
  };
}

export async function fallbackCancelCustomerJob(
  jobId: string,
  reason?: string
): Promise<JobStatusChangeResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Please sign in to cancel this job.");
  }

  const { data: currentJob, error: fetchErr } = await supabase
    .from("jobs")
    .select("status")
    .eq("id", jobId)
    .eq("customer_id", user.id)
    .single();

  if (fetchErr || !currentJob) {
    handleSupabaseError(fetchErr, "find job to cancel");
  }

  const previousStatus = currentJob.status as JobStatus;
  const updatedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("jobs")
    .update({
      status: "Cancelled",
      updated_at: updatedAt,
    })
    .eq("id", jobId)
    .eq("customer_id", user.id);

  if (updateError) {
    handleSupabaseError(updateError, "cancel job");
  }

  // Reject any pending offers
  await supabase
    .from("offers")
    .update({ status: "rejected" })
    .eq("job_id", jobId)
    .eq("status", "pending");

  await supabase.from("job_events").insert({
    job_id: jobId,
    from_status: previousStatus,
    to_status: "Cancelled",
    actor_id: user.id,
    note: reason?.trim() || "Cancelled by customer.",
  });

  return {
    id: jobId,
    previousStatus,
    status: "Cancelled",
    updatedAt,
  };
}

export async function fallbackAcceptJobOffer(
  jobId: string,
  offerId: string
): Promise<AcceptOfferResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Please sign in to accept this offer.");
  }

  const { data: offer, error: offerErr } = await supabase
    .from("offers")
    .select("id, professional_id, status")
    .eq("id", offerId)
    .eq("job_id", jobId)
    .single();

  if (offerErr || !offer) {
    handleSupabaseError(offerErr, "retrieve offer");
  }

  const updatedAt = new Date().toISOString();

  // Accept selected offer
  await supabase
    .from("offers")
    .update({ status: "accepted" })
    .eq("id", offerId);

  // Reject other offers on this job
  await supabase
    .from("offers")
    .update({ status: "rejected" })
    .eq("job_id", jobId)
    .neq("id", offerId);

  // Assign professional and set status to Assigned
  const { error: jobUpdateErr } = await supabase
    .from("jobs")
    .update({
      status: "Assigned",
      assigned_professional_id: offer.professional_id,
      updated_at: updatedAt,
    })
    .eq("id", jobId)
    .eq("customer_id", user.id);

  if (jobUpdateErr) {
    handleSupabaseError(jobUpdateErr, "assign job");
  }

  // Log job event
  await supabase.from("job_events").insert({
    job_id: jobId,
    from_status: "Open",
    to_status: "Assigned",
    actor_id: user.id,
    note: `Accepted offer from professional ${offer.professional_id}.`,
  });

  // Ensure conversation exists
  let conversationId = "";
  const { data: existingConv } = await supabase
    .from("conversations")
    .select("id")
    .eq("job_id", jobId)
    .maybeSingle();

  if (existingConv) {
    conversationId = existingConv.id;
  } else {
    const { data: newConv } = await supabase
      .from("conversations")
      .insert({
        job_id: jobId,
        customer_id: user.id,
        professional_id: offer.professional_id,
      })
      .select("id")
      .single();
    if (newConv) {
      conversationId = newConv.id;
    }
  }

  return {
    jobId,
    previousStatus: "Open",
    status: "Assigned",
    acceptedOfferId: offerId,
    assignedProfessionalId: offer.professional_id,
    conversationId,
    updatedAt,
  };
}

export async function fallbackCompleteCustomerJob(
  jobId: string
): Promise<JobStatusChangeResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Please sign in to confirm completion.");
  }

  const updatedAt = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("jobs")
    .update({
      status: "Completed",
      updated_at: updatedAt,
    })
    .eq("id", jobId)
    .eq("customer_id", user.id);

  if (updateErr) {
    handleSupabaseError(updateErr, "complete job");
  }

  await supabase.from("job_events").insert({
    job_id: jobId,
    from_status: "In progress",
    to_status: "Completed",
    actor_id: user.id,
    note: "Customer confirmed job completed.",
  });

  return {
    id: jobId,
    previousStatus: "In progress",
    status: "Completed",
    updatedAt,
  };
}

export async function fallbackDisputeCustomerJob(
  jobId: string,
  reason: string
): Promise<JobStatusChangeResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Please sign in to dispute this job.");
  }

  const updatedAt = new Date().toISOString();

  const { data: currentJob } = await supabase
    .from("jobs")
    .select("status")
    .eq("id", jobId)
    .eq("customer_id", user.id)
    .single();

  const previousStatus = (currentJob?.status ?? "In progress") as JobStatus;

  const { error: updateErr } = await supabase
    .from("jobs")
    .update({
      status: "Disputed",
      updated_at: updatedAt,
    })
    .eq("id", jobId)
    .eq("customer_id", user.id);

  if (updateErr) {
    handleSupabaseError(updateErr, "dispute job");
  }

  await supabase.from("job_events").insert({
    job_id: jobId,
    from_status: previousStatus,
    to_status: "Disputed",
    actor_id: user.id,
    note: reason.trim(),
  });

  return {
    id: jobId,
    previousStatus,
    status: "Disputed",
    updatedAt,
  };
}

export async function fallbackCreateJobReview(
  jobId: string,
  rating: number,
  comment?: string
): Promise<CreateReviewResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Please sign in to submit a review.");
  }

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("assigned_professional_id")
    .eq("id", jobId)
    .eq("customer_id", user.id)
    .single();

  if (jobErr || !job || !job.assigned_professional_id) {
    handleSupabaseError(jobErr, "find completed job for review");
  }

  const { data: review, error: reviewErr } = await supabase
    .from("reviews")
    .insert({
      job_id: jobId,
      reviewer_id: user.id,
      professional_id: job.assigned_professional_id,
      rating,
      comment: comment?.trim() || null,
    })
    .select()
    .single();

  if (reviewErr || !review) {
    handleSupabaseError(reviewErr, "submit review");
  }

  return {
    id: String(review.id),
    jobId: String(review.job_id),
    reviewerId: String(review.reviewer_id),
    professionalId: String(review.professional_id),
    rating: Number(review.rating),
    comment: review.comment ? String(review.comment) : null,
    createdAt: String(review.created_at),
  };
}

export async function fallbackSuggestJobCategory(
  text: string
): Promise<CategorySuggestionResponse> {
  const supabase = createClient();
  const lower = text.toLowerCase();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true);

  if (!categories || categories.length === 0) {
    return { suggestedCategoryId: null, suggestedCategoryName: null, confidence: 0 };
  }

  for (const cat of categories) {
    const nameLower = cat.name.toLowerCase();
    const tokens = nameLower.split(/\s+/);
    if (tokens.some((token: string) => token.length > 3 && lower.includes(token))) {
      return {
        suggestedCategoryId: Number(cat.id),
        suggestedCategoryName: String(cat.name),
        confidence: 0.75,
      };
    }
  }

  return { suggestedCategoryId: null, suggestedCategoryName: null, confidence: 0 };
}
