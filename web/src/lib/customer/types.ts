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

export type JobUrgency = "normal" | "urgent";

export type OfferStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export type OfferSortBy = "price" | "eta" | "rating";

export interface CategoryOption {
  id: number;
  name: string;
  is_active: boolean;
}

export interface AreaOption {
  id: number;
  name: string;
}

export interface CustomerJobRow {
  id: string;
  customer_id: string;
  title: string;
  description: string;
  category_id: number;
  area_id: number;
  budget_min: number | null;
  budget_max: number | null;
  urgency: JobUrgency;
  status: JobStatus;
  assigned_professional_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  category_name: string;
  area_name: string;
  offer_count: number;
  pending_offer_count: number;
  has_review: boolean;
}

export interface OfferWithProfessional {
  id: string;
  job_id: string;
  professional_id: string;
  price: number;
  inspection_fee: number;
  eta_minutes: number;
  message: string | null;
  status: OfferStatus;
  created_at: string;
  professional_name: string;
  years_experience: number;
  rating_count: number;
  avg_rating_bayes: number;
  verified: boolean;
}

export interface JobEventItem {
  id: string;
  job_id: string;
  from_status: string | null;
  to_status: string;
  actor_id: string | null;
  actor_name: string;
  note: string | null;
  at: string;
}

export interface AssignedProfessionalCardData {
  profile_id: string;
  full_name: string;
  bio: string | null;
  years_experience: number;
  rating_count: number;
  avg_rating_bayes: number;
  phone: string | null;
}

export interface JobReviewItem {
  id: string;
  job_id: string;
  reviewer_id: string;
  professional_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface CustomerNotificationItem {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}
