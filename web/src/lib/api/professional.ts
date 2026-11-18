import { createClient } from "@/utils/supabase/client";
import type { JobStatus, OfferStatus } from "@/lib/customer/types";

const REQUEST_TIMEOUT_MS = 60_000;
const WAKING_NOTICE_DELAY_MS = 3_500;

export class ProfessionalApiError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ProfessionalApiError";
    this.status = status;
    this.code = code;
  }
}

export interface ProfessionalRequestOptions {
  onWakingUp?: (waking: boolean) => void;
}

export interface SubmitOrUpdateOfferInput {
  price: number;
  inspectionFee: number;
  etaMinutes: number;
  message?: string | null;
}

export interface ProfessionalSubmitOfferResponse {
  id: string;
  jobId: string;
  professionalId: string;
  price: number;
  inspectionFee: number;
  etaMinutes: number;
  message: string | null;
  status: OfferStatus;
  createdAt: string;
  jobPreviousStatus: JobStatus;
  jobStatus: JobStatus;
}

export interface ProfessionalOfferDto {
  id: string;
  jobId: string;
  professionalId: string;
  price: number;
  inspectionFee: number;
  etaMinutes: number;
  message: string | null;
  status: OfferStatus;
  createdAt: string;
}

export interface ProfessionalWithdrawOfferResponse {
  id: string;
  jobId: string;
  previousStatus: OfferStatus;
  status: OfferStatus;
  jobStatus: JobStatus;
  updatedAt: string;
}

export interface ProfessionalStartJobResponse {
  id: string;
  previousStatus: JobStatus;
  status: JobStatus;
  workStartedAt: string;
  updatedAt: string;
}

export interface ProfessionalMarkDoneResponse {
  id: string;
  status: JobStatus;
  professionalMarkedDoneAt: string;
  updatedAt: string;
}

export interface ProfessionalDisputeJobResponse {
  id: string;
  previousStatus: JobStatus;
  status: JobStatus;
  updatedAt: string;
}

function getCoreEngineBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_CORE_ENGINE_URL?.trim();
  const raw =
    configured && configured.length > 0 ? configured : "http://localhost:5080";
  return raw.replace(/\/+$/, "");
}

function toFriendlyProErrorMessage(
  status: number,
  code: string,
  fallback: string
): string {
  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }
  if (code === "not_approved" || status === 403) {
    return "Only approved, non-suspended professionals can perform this action.";
  }
  if (status === 429 || code === "rate_limit_exceeded") {
    return "You are sending requests too quickly. Please wait a moment and try again.";
  }
  if (code === "own_job") {
    return "You cannot send an offer on a job you posted yourself.";
  }
  if (code === "duplicate_offer") {
    return "You have already submitted an offer for this job.";
  }
  if (code === "category_mismatch") {
    return "This job belongs to a trade category that is not listed on your professional profile. Update your skills in Profile first.";
  }
  if (code === "job_closed") {
    return "This job is no longer open for offers.";
  }
  if (code === "offer_not_pending") {
    return "Only pending offers on open jobs can be edited or withdrawn.";
  }
  if (code === "already_marked_done") {
    return "You have already marked this job as done.";
  }
  if (code === "invalid_transition") {
    return (
      fallback ||
      "This job's status has changed. Please refresh the page and try again."
    );
  }
  return (
    fallback || "Something went wrong while communicating with the server."
  );
}

async function professionalRequest<T>(
  path: string,
  init: RequestInit = {},
  options?: ProfessionalRequestOptions
): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new ProfessionalApiError(
      401,
      "unauthenticated",
      "Please sign in to continue."
    );
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
      const rawMessage =
        errObj?.message ?? `Request failed (${response.status}).`;
      throw new ProfessionalApiError(
        response.status,
        code,
        toFriendlyProErrorMessage(response.status, code, rawMessage)
      );
    }

    return parsed as T;
  } catch (err) {
    if (err instanceof ProfessionalApiError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ProfessionalApiError(
        504,
        "timeout",
        "The server is waking up and took longer than 60 seconds to respond. Please try again."
      );
    }
    throw new ProfessionalApiError(
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

export async function submitProfessionalOffer(
  jobId: string,
  input: SubmitOrUpdateOfferInput,
  options?: ProfessionalRequestOptions
): Promise<ProfessionalSubmitOfferResponse> {
  return await professionalRequest<ProfessionalSubmitOfferResponse>(
    `/pro/jobs/${encodeURIComponent(jobId)}/offers`,
    {
      method: "POST",
      body: JSON.stringify({
        price: input.price,
        inspectionFee: input.inspectionFee,
        etaMinutes: input.etaMinutes,
        message: input.message?.trim() || null,
      }),
    },
    options
  );
}

export async function updateProfessionalOffer(
  offerId: string,
  input: SubmitOrUpdateOfferInput,
  options?: ProfessionalRequestOptions
): Promise<ProfessionalOfferDto> {
  return await professionalRequest<ProfessionalOfferDto>(
    `/pro/offers/${encodeURIComponent(offerId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        price: input.price,
        inspectionFee: input.inspectionFee,
        etaMinutes: input.etaMinutes,
        message: input.message?.trim() || null,
      }),
    },
    options
  );
}

export async function withdrawProfessionalOffer(
  offerId: string,
  options?: ProfessionalRequestOptions
): Promise<ProfessionalWithdrawOfferResponse> {
  return await professionalRequest<ProfessionalWithdrawOfferResponse>(
    `/pro/offers/${encodeURIComponent(offerId)}/withdraw`,
    { method: "POST" },
    options
  );
}

export async function startProfessionalJob(
  jobId: string,
  options?: ProfessionalRequestOptions
): Promise<ProfessionalStartJobResponse> {
  return await professionalRequest<ProfessionalStartJobResponse>(
    `/pro/jobs/${encodeURIComponent(jobId)}/start`,
    { method: "POST" },
    options
  );
}

export async function markProfessionalJobDone(
  jobId: string,
  options?: ProfessionalRequestOptions
): Promise<ProfessionalMarkDoneResponse> {
  return await professionalRequest<ProfessionalMarkDoneResponse>(
    `/pro/jobs/${encodeURIComponent(jobId)}/mark-done`,
    { method: "POST" },
    options
  );
}

export async function disputeProfessionalJob(
  jobId: string,
  reason: string,
  options?: ProfessionalRequestOptions
): Promise<ProfessionalDisputeJobResponse> {
  return await professionalRequest<ProfessionalDisputeJobResponse>(
    `/pro/jobs/${encodeURIComponent(jobId)}/dispute`,
    {
      method: "POST",
      body: JSON.stringify({ reason: reason.trim() }),
    },
    options
  );
}
