import type {
  AreaOption,
  CategoryOption,
  CustomerNotificationItem,
  JobEventItem,
  JobReviewItem,
  JobStatus,
  JobUrgency,
  OfferStatus,
} from "@/lib/customer/types";

export type {
  AreaOption,
  CategoryOption,
  CustomerNotificationItem,
  JobEventItem,
  JobReviewItem,
  JobStatus,
  JobUrgency,
  OfferStatus,
};

export type ProfessionalAvailability = "available" | "busy" | "offline";

export interface OpportunityJobRow {
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
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  category_name: string;
  area_name: string;
  customer_first_name: string;
  active_offer_count: number;
  my_offer: ProfessionalOfferRow | null;
}

export interface ProfessionalOfferRow {
  id: string;
  job_id: string;
  professional_id: string;
  price: number;
  inspection_fee: number;
  eta_minutes: number;
  message: string | null;
  status: OfferStatus;
  created_at: string;
  job_title: string;
  job_status: JobStatus;
  job_urgency: JobUrgency;
  category_name: string;
  area_name: string;
}

export interface ProfessionalAssignedJobRow {
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
  assigned_professional_id: string;
  expires_at: string | null;
  work_started_at: string | null;
  professional_marked_done_at: string | null;
  created_at: string;
  updated_at: string;
  category_name: string;
  area_name: string;
  customer_name: string;
  agreed_price: number | null;
  agreed_inspection_fee: number | null;
  agreed_eta_minutes: number | null;
  has_review: boolean;
}

export interface ProfessionalReviewRow {
  id: string;
  job_id: string;
  job_title: string;
  reviewer_id: string;
  reviewer_name: string;
  professional_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface WeeklyOfferBucket {
  week_start: string;
  count: number;
}

export interface ProfessionalStatsData {
  offers_sent: number;
  offers_accepted: number;
  offers_pending: number;
  offers_rejected: number;
  offers_withdrawn: number;
  jobs_active: number;
  jobs_completed: number;
  reviews_count: number;
  avg_rating: number | null;
  completed_agreed_value: number;
  weekly_offers: WeeklyOfferBucket[];
}

export interface ProfessionalProfileFullData {
  profile_id: string;
  full_name: string;
  email: string;
  phone: string;
  bio: string;
  years_experience: number;
  availability: ProfessionalAvailability;
  verified: boolean;
  status: "pending" | "approved" | "rejected" | "suspended";
  reviewed_at: string | null;
  rating_count: number;
  avg_rating_bayes: number;
  category_ids: number[];
  area_ids: number[];
}
