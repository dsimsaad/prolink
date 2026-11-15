import { createClient } from "@/utils/supabase/client";
import type { JobStatus, JobUrgency } from "@/lib/customer/types";

const REQUEST_TIMEOUT_MS = 60_000;
const WAKING_NOTICE_DELAY_MS = 3_500;

export class CustomerApiError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "CustomerApiError";
    this.status = status;
    this.code = code;
  }
}

export interface CustomerRequestOptions {
  onWakingUp?: (waking: boolean) => void;
}

export interface CreateOrUpdateJobInput {
  title: string;
  description: string;
  categoryId: number;
  areaId: number;
  budgetMin: number | null;
  budgetMax: number | null;
  urgency: JobUrgency;
  publish?: boolean;
}

export interface CustomerJobMutationResponse {
  id: string;
  customerId: string;
  title: string;
  description: string;
  categoryId: number;
  areaId: number;
  budgetMin: number | null;
  budgetMax: number | null;
  urgency: JobUrgency;
  status: JobStatus;
  assignedProfessionalId: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  matchedProfessionals?: number | null;
}

export interface PublishJobResponse {
  id: string;
  previousStatus: JobStatus;
  status: JobStatus;
  expiresAt: string | null;
  matchedProfessionals: number;
  updatedAt: string;
}

export interface JobStatusChangeResponse {
  id: string;
  previousStatus: JobStatus;
  status: JobStatus;
  updatedAt: string;
}

export interface AcceptOfferResponse {
  jobId: string;
  previousStatus: JobStatus;
  status: JobStatus;
  acceptedOfferId: string;
  assignedProfessionalId: string;
  conversationId: string;
  updatedAt: string;
}

export interface CreateReviewResponse {
  id: string;
  jobId: string;
  reviewerId: string;
  professionalId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface CategorySuggestionResponse {
  suggestedCategoryId: number | null;
  suggestedCategoryName: string | null;
  confidence: number;
}

function getCoreEngineBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_CORE_ENGINE_URL?.trim();
  const raw = configured && configured.length > 0 ? configured : "http://localhost:5080";
  return raw.replace(/\/+$/, "");
}

function toFriendlyErrorMessage(status: number, code: string, fallback: string): string {
  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }
  if (status === 403) {
    return "Your account is currently restricted from performing this action.";
  }
  if (status === 429 || code === "rate_limit_exceeded") {
    return "You are sending requests too quickly. Please wait a moment and try again.";
  }
  if (code === "duplicate_review") {
    return "You have already submitted a review for this job.";
  }
  if (code === "offer_not_pending") {
    return "This offer is no longer available to accept. Please refresh the page.";
  }
  if (code === "invalid_transition") {
    return fallback || "This job's status has changed. Please refresh the page and try again.";
  }
  return fallback || "Something went wrong while communicating with the server.";
}

async function customerRequest<T>(
  path: string,
  init: RequestInit = {},
  options?: CustomerRequestOptions
): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new CustomerApiError(401, "unauthenticated", "Please sign in to continue.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const wakingTimerId = setTimeout(() => {
    options?.onWakingUp?.(true);
  }, WAKING_NOTICE_DELAY_MS);

  try {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${getCoreEngineBaseUrl()}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await response.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }

    if (!response.ok) {
      const errObj =
        parsed && typeof parsed === "object"
          ? (parsed as { code?: string; message?: string })
          : null;
      const code = errObj?.code ?? `http_${response.status}`;
      const rawMessage = errObj?.message ?? `Request failed (${response.status}).`;
      throw new CustomerApiError(
        response.status,
        code,
        toFriendlyErrorMessage(response.status, code, rawMessage)
      );
    }

    return parsed as T;
  } catch (err) {
    if (err instanceof CustomerApiError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new CustomerApiError(
        504,
        "timeout",
        "The server is waking up and took longer than 60 seconds to respond. Please try again."
      );
    }
    throw new CustomerApiError(
      503,
      "network_error",
      "Could not reach the ProLink API server. It may still be waking up—please try again in a few seconds."
    );
  } finally {
    clearTimeout(timeoutId);
    clearTimeout(wakingTimerId);
    options?.onWakingUp?.(false);
  }
}

export async function createCustomerJob(
  input: CreateOrUpdateJobInput,
  options?: CustomerRequestOptions
): Promise<CustomerJobMutationResponse> {
  return customerRequest<CustomerJobMutationResponse>(
    "/jobs",
    {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        description: input.description,
        categoryId: input.categoryId,
        areaId: input.areaId,
        budgetMin: input.budgetMin,
        budgetMax: input.budgetMax,
        urgency: input.urgency,
        publish: Boolean(input.publish),
      }),
    },
    options
  );
}

export async function updateDraftJob(
  jobId: string,
  input: Omit<CreateOrUpdateJobInput, "publish">,
  options?: CustomerRequestOptions
): Promise<CustomerJobMutationResponse> {
  return customerRequest<CustomerJobMutationResponse>(
    `/jobs/${encodeURIComponent(jobId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        title: input.title,
        description: input.description,
        categoryId: input.categoryId,
        areaId: input.areaId,
        budgetMin: input.budgetMin,
        budgetMax: input.budgetMax,
        urgency: input.urgency,
      }),
    },
    options
  );
}

export async function publishCustomerJob(
  jobId: string,
  options?: CustomerRequestOptions
): Promise<PublishJobResponse> {
  return customerRequest<PublishJobResponse>(
    `/jobs/${encodeURIComponent(jobId)}/publish`,
    { method: "POST" },
    options
  );
}

export async function cancelCustomerJob(
  jobId: string,
  reason?: string,
  options?: CustomerRequestOptions
): Promise<JobStatusChangeResponse> {
  return customerRequest<JobStatusChangeResponse>(
    `/jobs/${encodeURIComponent(jobId)}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ reason: reason?.trim() || null }),
    },
    options
  );
}

export async function acceptJobOffer(
  jobId: string,
  offerId: string,
  options?: CustomerRequestOptions
): Promise<AcceptOfferResponse> {
  return customerRequest<AcceptOfferResponse>(
    `/jobs/${encodeURIComponent(jobId)}/offers/${encodeURIComponent(offerId)}/accept`,
    { method: "POST" },
    options
  );
}

export async function completeCustomerJob(
  jobId: string,
  options?: CustomerRequestOptions
): Promise<JobStatusChangeResponse> {
  return customerRequest<JobStatusChangeResponse>(
    `/jobs/${encodeURIComponent(jobId)}/complete`,
    { method: "POST" },
    options
  );
}

export async function disputeCustomerJob(
  jobId: string,
  reason: string,
  options?: CustomerRequestOptions
): Promise<JobStatusChangeResponse> {
  return customerRequest<JobStatusChangeResponse>(
    `/jobs/${encodeURIComponent(jobId)}/dispute`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
    options
  );
}

export async function createJobReview(
  jobId: string,
  rating: number,
  comment?: string,
  options?: CustomerRequestOptions
): Promise<CreateReviewResponse> {
  return customerRequest<CreateReviewResponse>(
    `/jobs/${encodeURIComponent(jobId)}/review`,
    {
      method: "POST",
      body: JSON.stringify({
        rating,
        comment: comment?.trim() || null,
      }),
    },
    options
  );
}

export async function suggestJobCategory(
  text: string
): Promise<CategorySuggestionResponse> {
  const trimmed = text.trim();
  if (trimmed.length < 10) {
    return {
      suggestedCategoryId: null,
      suggestedCategoryName: null,
      confidence: 0,
    };
  }

  try {
    return await customerRequest<CategorySuggestionResponse>(
      `/jobs/suggest-category?text=${encodeURIComponent(trimmed)}`,
      { method: "GET" }
    );
  } catch {
    return {
      suggestedCategoryId: null,
      suggestedCategoryName: null,
      confidence: 0,
    };
  }
}
