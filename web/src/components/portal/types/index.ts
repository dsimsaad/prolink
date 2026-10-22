export type UserRole = 'guest' | 'customer' | 'professional' | 'admin';

export type ProLevel = 'new' | 'verified' | 'top_rated';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string;
  city: string;
  area: string;
  status: 'active' | 'suspended' | 'pending';
  joinedDate: string;
  // Professional specific
  category?: string;
  skills?: string[];
  bio?: string;
  baseRate?: number;
  inspectionFee?: number;
  experienceYears?: number;
  rating?: number;
  totalReviews?: number;
  completedJobs?: number;
  responseMinutes?: number;
  level?: ProLevel;
  isVerified?: boolean;
  travelRadiusKm?: number;
  portfolioImages?: string[];
  isAvailable?: boolean;
  // Customer specific
  totalSpentPKR?: number;
  jobsPosted?: number;
  savedProIds?: string[];
}

export type JobUrgency = 'urgent' | 'today' | 'flexible';
export type JobStatus = 'open' | 'offers_received' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';

export interface Job {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerAvatar?: string;
  title: string;
  description: string;
  category: string;
  subCategory?: string;
  city: string;
  area: string;
  address?: string;
  lat?: number;
  lng?: number;
  urgency: JobUrgency;
  dateScheduled: string;
  budgetMin: number;
  budgetMax: number;
  status: JobStatus;
  createdAt: string;
  offersCount: number;
  selectedOfferId?: string;
  hiredProId?: string;
  hiredProName?: string;
  hiredProAvatar?: string;
  hiredProPhone?: string;
  photos?: string[];
  completedAt?: string;
  // Professional progress
  proWorkLog?: {
    status: 'assigned' | 'on_the_way' | 'started' | 'finished';
    notes?: string[];
    photos?: string[];
    etaMinutes?: number;
    completionRequested?: boolean;
  };
  clientReview?: {
    rating: number;
    tags: string[];
    text: string;
    createdAt: string;
  };
}

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';

export interface Offer {
  id: string;
  jobId: string;
  jobTitle?: string;
  proId: string;
  proName: string;
  proAvatar: string;
  proRating: number;
  proReviewCount: number;
  proLevel: ProLevel;
  proCategory?: string;
  pricePKR: number;
  inspectionFeePKR: number;
  materialsEstimatedPKR: number;
  totalEstimatePKR: number;
  arrivalTimeEstimate: string;
  message: string;
  status: OfferStatus;
  createdAt: string;
  isBestMatch?: boolean;
  matchScore?: number;
}

export interface Review {
  id: string;
  jobId: string;
  jobTitle: string;
  customerId: string;
  customerName: string;
  customerAvatar: string;
  proId: string;
  proName: string;
  rating: number;
  tags: string[];
  comment: string;
  createdAt: string;
  city: string;
}

export interface Transaction {
  id: string;
  jobId: string;
  jobTitle: string;
  customerId: string;
  customerName: string;
  proId: string;
  proName: string;
  amountPKR: number;
  platformFeePKR: number;
  type: 'escrow_hold' | 'escrow_release' | 'payout' | 'refund';
  status: 'held' | 'completed' | 'pending';
  date: string;
}

export interface VerificationRequest {
  id: string;
  proId: string;
  proName: string;
  proEmail: string;
  proPhone: string;
  category: string;
  experienceYears: number;
  cnicNumber: string;
  cnicFrontImage: string;
  selfieImage: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  adminNotes?: string;
}

export interface NotificationItem {
  id: string;
  targetRole: UserRole;
  userId?: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
  type: 'offer' | 'job' | 'verification' | 'system' | 'payout';
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  iconName: string;
  description: string;
  startingPricePKR: number;
  popularJobs: string[];
  tags: string[];
  photoUrl: string;
}
