-- ==============================================================================
-- Migration: 001_core_schema.sql
-- Purpose: Create core database tables, foreign keys, constraints, and indexes
-- Order: 1 of 3 migrations
-- Status: DRAFT FOR HUMAN REVIEW BEFORE RUNNING
-- ==============================================================================

-- Enable required extension for UUID generation (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Lookup Tables (Areas & Graph Topology)
-- ------------------------------------------------------------------------------

-- Service Coverage Areas
CREATE TABLE IF NOT EXISTS public.areas (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text UNIQUE NOT NULL,
    lat numeric(9,6),
    lng numeric(9,6)
);

COMMENT ON TABLE public.areas IS 'Geographic service clusters and travel nodes.';

-- Area Travel-Time Graph (Used by Dijkstra shortest-path algorithm)
CREATE TABLE IF NOT EXISTS public.area_edges (
    from_area bigint NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
    to_area bigint NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
    minutes int NOT NULL CHECK (minutes > 0),
    CONSTRAINT chk_distinct_areas CHECK (from_area <> to_area),
    PRIMARY KEY (from_area, to_area)
);

COMMENT ON TABLE public.area_edges IS 'Directed travel time graph between adjacent areas in minutes.';

-- ------------------------------------------------------------------------------
-- 2. Lookup Tables (Taxonomy / Categories)
-- ------------------------------------------------------------------------------

-- Service Categories (hierarchical support via parent_id)
CREATE TABLE IF NOT EXISTS public.categories (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text UNIQUE NOT NULL,
    parent_id bigint REFERENCES public.categories(id) ON DELETE SET NULL,
    is_active boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE public.categories IS 'Hierarchical service categories (e.g. Plumbing, Electrical).';

-- ------------------------------------------------------------------------------
-- 3. Identity & User Profiles
-- ------------------------------------------------------------------------------

-- Base User Profiles (1-to-1 with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'professional', 'admin')),
    full_name text NOT NULL,
    area_id bigint REFERENCES public.areas(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Core profile for all registered users, linked to Supabase Auth.';

-- Private Contact Details (Separated from profiles for fine-grained RLS access)
CREATE TABLE IF NOT EXISTS public.contact_details (
    profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    phone text NOT NULL
);

COMMENT ON TABLE public.contact_details IS 'Private phone numbers, only visible after offer acceptance or to admins.';

-- Professional Profiles (1-to-1 extension for users with role = professional)
CREATE TABLE IF NOT EXISTS public.professional_profiles (
    profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    bio text,
    years_experience int CHECK (years_experience IS NULL OR years_experience >= 0),
    availability text NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'busy', 'offline')),
    verified boolean NOT NULL DEFAULT false,
    response_rate numeric(5,2) CHECK (response_rate IS NULL OR (response_rate >= 0 AND response_rate <= 100)),
    rating_count int NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
    rating_sum int NOT NULL DEFAULT 0 CHECK (rating_sum >= 0),
    avg_rating_bayes numeric(4,3) CHECK (avg_rating_bayes IS NULL OR (avg_rating_bayes >= 1.0 AND avg_rating_bayes <= 5.0)),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.professional_profiles IS 'Professional verification, rating aggregations, and availability metrics.';

-- Professional Skills (Many-to-many relationship with Categories)
CREATE TABLE IF NOT EXISTS public.professional_skills (
    professional_id uuid NOT NULL REFERENCES public.professional_profiles(profile_id) ON DELETE CASCADE,
    category_id bigint NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    skill_tags text[] NOT NULL DEFAULT '{}',
    PRIMARY KEY (professional_id, category_id)
);

COMMENT ON TABLE public.professional_skills IS 'Specific trade categories and custom skill tags assigned to professionals.';

-- Professional Service Areas (Many-to-many relationship with Areas)
CREATE TABLE IF NOT EXISTS public.professional_areas (
    professional_id uuid NOT NULL REFERENCES public.professional_profiles(profile_id) ON DELETE CASCADE,
    area_id bigint NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
    PRIMARY KEY (professional_id, area_id)
);

COMMENT ON TABLE public.professional_areas IS 'Coverage areas where a professional operates.';

-- ------------------------------------------------------------------------------
-- 4. Marketplace: Jobs & Offers
-- ------------------------------------------------------------------------------

-- Customer Job Postings
CREATE TABLE IF NOT EXISTS public.jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    title text NOT NULL,
    description text NOT NULL,
    category_id bigint NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    area_id bigint NOT NULL REFERENCES public.areas(id) ON DELETE RESTRICT,
    budget_min numeric(10,2) CHECK (budget_min IS NULL OR budget_min >= 0),
    budget_max numeric(10,2) CHECK (budget_max IS NULL OR budget_max >= 0),
    urgency text NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent')),
    status text NOT NULL DEFAULT 'Draft' CHECK (
        status IN ('Draft', 'Open', 'Offers received', 'Assigned', 'In progress', 'Completed', 'Cancelled', 'Expired', 'Disputed')
    ),
    assigned_professional_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    CONSTRAINT chk_job_budget_range CHECK (
        budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max
    ),
    CONSTRAINT chk_assigned_professional_when_active CHECK (
        status NOT IN ('Assigned', 'In progress', 'Completed', 'Disputed')
        OR assigned_professional_id IS NOT NULL
    )
);

COMMENT ON TABLE public.jobs IS 'Customer job listings and lifecycle state machine.';

-- Professional Offers / Bids on Jobs
CREATE TABLE IF NOT EXISTS public.offers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    professional_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    price numeric(10,2) NOT NULL CHECK (price >= 0),
    inspection_fee numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (inspection_fee >= 0),
    eta_minutes int CHECK (eta_minutes IS NULL OR eta_minutes > 0),
    message text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_job_professional_offer UNIQUE (job_id, professional_id)
);

COMMENT ON TABLE public.offers IS 'Offers submitted by professionals for specific customer jobs.';

-- ------------------------------------------------------------------------------
-- 5. Messaging & Communication
-- ------------------------------------------------------------------------------

-- Direct Chat Conversations (Created by backend when an offer is accepted)
CREATE TABLE IF NOT EXISTS public.conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid UNIQUE NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    professional_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.conversations IS '1-to-1 chat channel established for an active job assignment.';

-- Chat Messages
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.messages IS 'Individual chat messages exchanged between customer and assigned professional.';

-- ------------------------------------------------------------------------------
-- 6. Reviews & Feedback
-- ------------------------------------------------------------------------------

-- Verified Reviews (1 review per completed job)
CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid UNIQUE NOT NULL REFERENCES public.jobs(id) ON DELETE RESTRICT,
    reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    professional_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment text CHECK (comment IS NULL OR length(comment) <= 1000),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.reviews IS 'Customer review and 1-5 star rating submitted upon job completion.';

-- ------------------------------------------------------------------------------
-- 7. Notifications & Audit History
-- ------------------------------------------------------------------------------

-- In-App Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS 'User activity alerts, offer receipts, and status updates.';

-- Job Status Lifecycle Audit Log
CREATE TABLE IF NOT EXISTS public.job_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    from_status text,
    to_status text NOT NULL,
    actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.job_events IS 'Immutable event log recording job lifecycle transitions.';

-- ------------------------------------------------------------------------------
-- 8. Performance Indexes
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_jobs_status_category_area ON public.jobs (status, category_id, area_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON public.jobs (customer_id);
CREATE INDEX IF NOT EXISTS idx_offers_job_id ON public.offers (job_id);
CREATE INDEX IF NOT EXISTS idx_offers_professional_id ON public.offers (professional_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_area_edges_from_area ON public.area_edges (from_area);
CREATE INDEX IF NOT EXISTS idx_professional_skills_category_id ON public.professional_skills (category_id);
CREATE INDEX IF NOT EXISTS idx_professional_areas_area_id ON public.professional_areas (area_id);
CREATE INDEX IF NOT EXISTS idx_reviews_professional_id ON public.reviews (professional_id);

-- ------------------------------------------------------------------------------
-- PLANNED FUTURE MIGRATIONS (Not included in v0 core):
-- 1. service_listings: Fixed-price catalog items offered by professionals.
-- 2. reports: User moderation flags and dispute resolution tickets.
-- 3. health_checks: Synthetic monitoring heartbeat logs from network module.
-- ------------------------------------------------------------------------------
