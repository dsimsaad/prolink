export type JobStatus =
  | "Draft"
  | "Open"
  | "Offers received"
  | "Assigned"
  | "In progress"
  | "Completed"
  | "Cancelled"
  | "Expired"
  | "Disputed";

export type ApplicationStatus = "pending" | "approved" | "rejected" | "suspended";

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface AdminOverviewStats {
  total_users: number;
  new_users_last_7_days: number;
  professionals_by_status: Record<ApplicationStatus, number>;
  jobs_by_status: Record<JobStatus, number>;
  jobs_last_7_days: number;
  open_reports: number;
  disputed_jobs: number;
  pending_applications: number;
}

export interface DailyJobCount {
  day: string;
  job_count: number;
}

export interface ReviewQueueItemDto {
  key: string;
  kind: "dispute" | "report" | "application";
  entityId: string;
  title: string;
  subtitle: string;
  createdAt: string;
  priorityScore: number;
  link: string;
}

export interface ReviewQueueResponse {
  items: ReviewQueueItemDto[];
  totalCount: number;
  refreshedAt: string;
}

export interface AuditLogItemDto {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

export interface AuditPageResponse {
  items: AuditLogItemDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface DailyAuditCountDto {
  date: string;
  count: number;
}

export interface AuditSummaryResponse {
  days: number;
  totalInPeriod: number;
  dailyCounts: DailyAuditCountDto[];
}

export interface UserSuggestionDto {
  id: string;
  displayName: string;
}

export interface UserSearchHitDto {
  id: string;
  displayName: string;
  matchedTokens: number;
}

export interface FunnelAnalyticsDto {
  posted: number;
  receivedOffers: number;
  assigned: number;
  completed: number;
}

export interface RankedGroupCountDto {
  id: number;
  name: string;
  jobCount: number;
}

export interface AllowedJobActionsDto {
  jobId: string;
  currentStatus: JobStatus;
  nextStates: JobStatus[];
  canForceCancel: boolean;
  canResolveDispute: boolean;
  disputeOutcomes: ("completed" | "cancelled")[];
}

export interface EngineReloadResponse {
  version: number;
  reloadedAt: string;
}

export interface AdminApplicationRow {
  profile_id: string;
  full_name: string;
  father_name?: string | null;
  cnic?: string | null;
  residential_address?: string | null;
  notification_preference?: "matching_only" | "all_jobs" | null;
  phone: string | null;
  bio: string | null;
  years_experience: number | null;
  status: ApplicationStatus;
  applied_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  trades: string[];
  skills?: string[];
  areas: string[];
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  full_name: string;
  role: "user" | "admin";
  is_suspended: boolean;
  suspended_reason: string | null;
  suspended_at: string | null;
  created_at: string;
}

export interface AdminCategoryRow {
  id: number;
  name: string;
  parent_id: number | null;
  is_active: boolean;
  job_count: number;
}

export interface AdminJobRow {
  id: string;
  title: string;
  description: string;
  status: JobStatus;
  urgency: "normal" | "urgent";
  category_id: number;
  category_name: string;
  area_id: number;
  area_name: string;
  customer_id: string;
  customer_name: string;
  assigned_professional_id: string | null;
  assigned_professional_name: string | null;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
  updated_at: string;
}

export interface AdminOfferRow {
  id: string;
  professional_id: string;
  professional_name: string;
  price: number;
  inspection_fee: number;
  eta_minutes: number | null;
  message: string | null;
  status: string;
  created_at: string;
}

export interface AdminJobEventRow {
  id: string;
  from_status: string | null;
  to_status: string;
  actor_id: string | null;
  actor_name: string | null;
  note: string | null;
  at: string;
}

export interface AdminChatMessageRow {
  id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
}

export interface AdminReportRow {
  id: string;
  reporter_id: string;
  reporter_name: string;
  target_user_id: string | null;
  target_user_name: string | null;
  target_job_id: string | null;
  target_job_title: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
}
