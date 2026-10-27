import { createClient } from "@/utils/supabase/client";
import type {
  AllowedJobActionsDto,
  AuditPageResponse,
  AuditSummaryResponse,
  EngineReloadResponse,
  FunnelAnalyticsDto,
  RankedGroupCountDto,
  ReviewQueueResponse,
  UserSearchHitDto,
  UserSuggestionDto,
} from "@/lib/admin/types";

export class AdminApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly retryAfterSeconds?: number;

  constructor(message: string, status: number, code = "api_error", retryAfterSeconds?: number) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface AdminRequestOptions {
  accessToken?: string;
  onWakingUp?: (isWakingUp: boolean) => void;
  signal?: AbortSignal;
}

const REQUEST_TIMEOUT_MS = 60_000;
const SLOW_RESPONSE_THRESHOLD_MS = 3_500;

function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  return (configured && configured.length > 0 ? configured : "http://localhost:5080").replace(/\/+$/, "");
}

async function resolveAccessToken(explicitToken?: string): Promise<string> {
  if (explicitToken) {
    return explicitToken;
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new AdminApiError("You must be signed in as an administrator to call this endpoint.", 401, "unauthorized");
  }

  return session.access_token;
}

// Attaches the caller's Supabase access token as a Bearer header with a 60s timeout.
// Never logs tokens or sensitive request bodies, and triggers onWakingUp if Render cold-start takes >3.5s.
async function requestAdminApi<T>(
  path: string,
  init: RequestInit = {},
  options: AdminRequestOptions = {}
): Promise<T> {
  const token = await resolveAccessToken(options.accessToken);
  const controller = new AbortController();

  const externalAbort = () => controller.abort();
  if (options.signal) {
    options.signal.addEventListener("abort", externalAbort, { once: true });
  }

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const slowTimerId = setTimeout(() => {
    options.onWakingUp?.(true);
  }, SLOW_RESPONSE_THRESHOLD_MS);

  try {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      let code = "api_error";
      let message = `Request failed with status ${response.status}.`;
      let retryAfterSeconds: number | undefined;

      const retryHeader = response.headers.get("Retry-After");
      if (retryHeader && !Number.isNaN(Number(retryHeader))) {
        retryAfterSeconds = Number(retryHeader);
      }

      try {
        const errorBody = (await response.json()) as {
          code?: string;
          message?: string;
          retryAfterSeconds?: number;
        };
        if (errorBody.code) code = errorBody.code;
        if (errorBody.message) message = errorBody.message;
        if (typeof errorBody.retryAfterSeconds === "number") {
          retryAfterSeconds = errorBody.retryAfterSeconds;
        }
      } catch {
        if (response.status === 401) {
          code = "unauthorized";
          message = "Session expired or invalid token. Please sign in again.";
        } else if (response.status === 403) {
          code = "forbidden";
          message = "Administrator privileges are required for this action.";
        } else if (response.status === 429) {
          code = "rate_limit_exceeded";
          message = `Rate limit reached. Please wait ${retryAfterSeconds ?? 60} seconds before retrying.`;
        }
      }

      throw new AdminApiError(message, response.status, code, retryAfterSeconds);
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof AdminApiError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new AdminApiError(
        "The server is waking up, this can take up to a minute. Please try again in a moment.",
        504,
        "timeout"
      );
    }
    throw new AdminApiError(
      "Could not reach the C# Core Engine API. Ensure the backend service is running or waking up.",
      503,
      "network_error"
    );
  } finally {
    clearTimeout(timeoutId);
    clearTimeout(slowTimerId);
    options.onWakingUp?.(false);
    if (options.signal) {
      options.signal.removeEventListener("abort", externalAbort);
    }
  }
}

export async function getAdminReviewQueue(
  limit = 20,
  options?: AdminRequestOptions
): Promise<ReviewQueueResponse> {
  return requestAdminApi<ReviewQueueResponse>(`/admin/review-queue?limit=${limit}`, { method: "GET" }, options);
}

export async function refreshAdminReviewQueue(
  options?: AdminRequestOptions
): Promise<{ totalCount: number; refreshedAt: string }> {
  return requestAdminApi<{ totalCount: number; refreshedAt: string }>(
    "/admin/review-queue/refresh",
    { method: "POST" },
    options
  );
}

export async function getAdminAuditLog(
  params: { from?: string; to?: string; page?: number; pageSize?: number },
  options?: AdminRequestOptions
): Promise<AuditPageResponse> {
  const search = new URLSearchParams();
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  search.set("page", String(params.page ?? 1));
  search.set("pageSize", String(Math.min(100, Math.max(1, params.pageSize ?? 20))));

  return requestAdminApi<AuditPageResponse>(`/admin/audit?${search.toString()}`, { method: "GET" }, options);
}

export async function getAdminAuditSummary(
  days = 14,
  options?: AdminRequestOptions
): Promise<AuditSummaryResponse> {
  return requestAdminApi<AuditSummaryResponse>(`/admin/audit/summary?days=${days}`, { method: "GET" }, options);
}

export async function suggestAdminUsers(
  query: string,
  limit = 8,
  options?: AdminRequestOptions
): Promise<UserSuggestionDto[]> {
  const search = new URLSearchParams({ q: query.trim(), limit: String(limit) });
  const res = await requestAdminApi<{ items: UserSuggestionDto[] }>(
    `/admin/users/suggest?${search.toString()}`,
    { method: "GET" },
    options
  );
  return res.items;
}

export async function searchAdminUsers(
  query: string,
  options?: AdminRequestOptions
): Promise<UserSearchHitDto[]> {
  const search = new URLSearchParams({ q: query.trim() });
  const res = await requestAdminApi<{ items: UserSearchHitDto[] }>(
    `/admin/users/search?${search.toString()}`,
    { method: "GET" },
    options
  );
  return res.items;
}

export async function searchAdminJobs(
  query: string,
  options?: AdminRequestOptions
): Promise<string[]> {
  const search = new URLSearchParams({ q: query.trim() });
  const res = await requestAdminApi<{ jobIds: string[] }>(
    `/admin/jobs/search?${search.toString()}`,
    { method: "GET" },
    options
  );
  return res.jobIds;
}

export async function getAdminFunnelAnalytics(
  options?: AdminRequestOptions
): Promise<FunnelAnalyticsDto> {
  return requestAdminApi<FunnelAnalyticsDto>("/admin/analytics/funnel", { method: "GET" }, options);
}

export async function getAdminTopCategories(
  n = 5,
  options?: AdminRequestOptions
): Promise<RankedGroupCountDto[]> {
  const res = await requestAdminApi<{ items: RankedGroupCountDto[] }>(
    `/admin/analytics/top-categories?n=${n}`,
    { method: "GET" },
    options
  );
  return res.items;
}

export async function getAdminTopAreas(
  n = 5,
  options?: AdminRequestOptions
): Promise<RankedGroupCountDto[]> {
  const res = await requestAdminApi<{ items: RankedGroupCountDto[] }>(
    `/admin/analytics/top-areas?n=${n}`,
    { method: "GET" },
    options
  );
  return res.items;
}

export async function getJobAllowedActions(
  jobId: string,
  options?: AdminRequestOptions
): Promise<AllowedJobActionsDto> {
  return requestAdminApi<AllowedJobActionsDto>(
    `/admin/jobs/${encodeURIComponent(jobId)}/allowed-actions`,
    { method: "GET" },
    options
  );
}

export async function forceCancelJob(
  jobId: string,
  reason: string,
  options?: AdminRequestOptions
): Promise<{ jobId: string; previousStatus: string; newStatus: string }> {
  return requestAdminApi<{ jobId: string; previousStatus: string; newStatus: string }>(
    `/admin/jobs/${encodeURIComponent(jobId)}/force-cancel`,
    {
      method: "POST",
      body: JSON.stringify({ reason: reason.trim() }),
    },
    options
  );
}

export async function resolveDisputedJob(
  jobId: string,
  outcome: "completed" | "cancelled",
  note: string,
  options?: AdminRequestOptions
): Promise<{ jobId: string; previousStatus: string; newStatus: string; outcome: string }> {
  return requestAdminApi<{ jobId: string; previousStatus: string; newStatus: string; outcome: string }>(
    `/admin/disputes/${encodeURIComponent(jobId)}/resolve`,
    {
      method: "POST",
      body: JSON.stringify({ outcome, note: note.trim() }),
    },
    options
  );
}

export async function reloadAdminEngine(
  options?: AdminRequestOptions
): Promise<EngineReloadResponse> {
  return requestAdminApi<EngineReloadResponse>("/admin/engine/reload", { method: "POST" }, options);
}
