-- Migration: 013_professional_dashboard.sql
-- Purpose: Add professional dashboard columns on jobs, verify and tighten RLS policies,
--          add SECURITY DEFINER functions (job_offer_counts, update_my_professional_profile,
--          my_professional_stats), and create performance indexes.
-- Run order: 13 (run after migrations 001 through 012).
-- DRAFT FOR HUMAN REVIEW BEFORE RUNNING

-- 1. Add work_started_at and professional_marked_done_at columns to jobs
ALTER TABLE public.jobs
    ADD COLUMN IF NOT EXISTS work_started_at timestamptz,
    ADD COLUMN IF NOT EXISTS professional_marked_done_at timestamptz;

COMMENT ON COLUMN public.jobs.work_started_at IS 'Timestamp when the assigned professional started work (Assigned -> In progress).';
COMMENT ON COLUMN public.jobs.professional_marked_done_at IS 'Timestamp when the assigned professional marked work as done while In progress, awaiting customer confirmation.';

-- 2. Verify and tighten Row Level Security policies for professionals
-- Existing policies verified and kept intact:
--   * offers_select_authorized (003_rls.sql): a professional can SELECT only their own offers (professional_id = auth.uid()),
--     never other professionals' offers; a customer can SELECT offers on their own jobs; admins can SELECT all.
--   * job_events_select_admin (006_admin_portal.sql): allows SELECT for job customer, assigned_professional_id = auth.uid(), or admin.
--   * profiles_read_authenticated (003_rls.sql): allows authenticated users to SELECT customer names from profiles.
--   * contact_details_select (003_rls.sql) + can_see_contact(uuid) (002_functions_triggers.sql): allows the assigned professional
--     to SELECT the customer's phone only when a job between them is in Assigned, In progress, Completed, or Disputed.
--   * reviews_select_authenticated (003_rls.sql): allows authenticated users to SELECT reviews.
--   * notifications_select_owner & notifications_update_read_owner (003_rls.sql) + protect_notification_columns() (010_customer_dashboard.sql):
--     allows users to SELECT their own notifications and UPDATE only read_at.

-- Update jobs_select_authorized so the professional opportunity rule explicitly requires customer_id <> auth.uid()
-- (owners still read their own jobs via customer_id = auth.uid()).
DROP POLICY IF EXISTS "jobs_select_authorized" ON public.jobs;
CREATE POLICY "jobs_select_authorized"
    ON public.jobs
    FOR SELECT
    TO authenticated
    USING (
        customer_id = (SELECT auth.uid())
        OR
        (
            status IN ('Open', 'Offers received')
            AND customer_id <> (SELECT auth.uid())
            AND public.is_approved_professional((SELECT auth.uid()))
        )
        OR
        (
            assigned_professional_id = (SELECT auth.uid())
            AND public.is_approved_professional((SELECT auth.uid()))
        )
        OR
        public.is_admin()
    );

-- 3. Function job_offer_counts(p_job_ids uuid[])
-- Returns (job_id, offer_count) for pending and accepted offers only, restricted to approved professionals.
CREATE OR REPLACE FUNCTION public.job_offer_counts(
    p_job_ids uuid[]
)
RETURNS TABLE (
    job_id uuid,
    offer_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL OR NOT public.is_approved_professional(v_user_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only approved professionals can query job offer counts.'
            USING ERRCODE = '42501';
    END IF;

    IF p_job_ids IS NULL OR COALESCE(cardinality(p_job_ids), 0) = 0 THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        u.id AS job_id,
        count(o.id)::bigint AS offer_count
    FROM (SELECT DISTINCT unnest(p_job_ids) AS id) u
    LEFT JOIN public.offers o
        ON o.job_id = u.id
       AND o.status IN ('pending', 'accepted')
    GROUP BY u.id;
END;
$$;

COMMENT ON FUNCTION public.job_offer_counts(uuid[]) IS 'Returns pending and accepted offer counts for the given job IDs for approved professionals.';

REVOKE EXECUTE ON FUNCTION public.job_offer_counts(uuid[]) FROM public;
REVOKE EXECUTE ON FUNCTION public.job_offer_counts(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.job_offer_counts(uuid[]) TO authenticated;

-- 4. Function update_my_professional_profile
-- Updates bio, years_experience, availability, skills, areas, and phone atomically for an approved professional.
-- Never modifies status, verified, or rating columns.
CREATE OR REPLACE FUNCTION public.update_my_professional_profile(
    p_bio text,
    p_years int,
    p_availability text,
    p_category_ids bigint[],
    p_area_ids bigint[],
    p_phone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid;
    v_clean_bio text;
    v_clean_availability text;
    v_clean_phone text;
    v_digits text;
    v_num_categories int;
    v_valid_categories int;
    v_num_areas int;
    v_valid_areas int;
    v_existing_tags text[];
BEGIN
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL OR NOT public.is_approved_professional(v_user_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only approved professionals can update their professional profile.'
            USING ERRCODE = '42501';
    END IF;

    v_clean_bio := TRIM(COALESCE(p_bio, ''));
    IF length(v_clean_bio) < 30 OR length(v_clean_bio) > 1000 THEN
        RAISE EXCEPTION 'Invalid bio: Bio must be between 30 and 1000 characters.'
            USING ERRCODE = '22023';
    END IF;

    IF p_years IS NULL OR p_years < 0 OR p_years > 60 THEN
        RAISE EXCEPTION 'Invalid experience: Years of experience must be between 0 and 60.'
            USING ERRCODE = '22023';
    END IF;

    v_clean_availability := LOWER(TRIM(COALESCE(p_availability, '')));
    IF v_clean_availability NOT IN ('available', 'busy', 'offline') THEN
        RAISE EXCEPTION 'Invalid availability: Must be available, busy, or offline.'
            USING ERRCODE = '22023';
    END IF;

    v_num_categories := COALESCE(cardinality(p_category_ids), 0);
    IF v_num_categories < 1 OR v_num_categories > 5 THEN
        RAISE EXCEPTION 'Invalid categories: Please select between 1 and 5 active categories.'
            USING ERRCODE = '22023';
    END IF;

    SELECT count(DISTINCT id) INTO v_valid_categories
    FROM public.categories
    WHERE id = ANY(p_category_ids)
      AND is_active = true;

    IF v_valid_categories <> v_num_categories THEN
        RAISE EXCEPTION 'Invalid categories: One or more categories do not exist, are inactive, or contain duplicates.'
            USING ERRCODE = '22023';
    END IF;

    v_num_areas := COALESCE(cardinality(p_area_ids), 0);
    IF v_num_areas < 1 OR v_num_areas > 12 THEN
        RAISE EXCEPTION 'Invalid areas: Please select between 1 and 12 service areas.'
            USING ERRCODE = '22023';
    END IF;

    SELECT count(DISTINCT id) INTO v_valid_areas
    FROM public.areas
    WHERE id = ANY(p_area_ids);

    IF v_valid_areas <> v_num_areas THEN
        RAISE EXCEPTION 'Invalid areas: One or more selected areas do not exist or contain duplicates.'
            USING ERRCODE = '22023';
    END IF;

    -- Normalize phone to 11-digit Pakistani mobile format (03XXXXXXXXX) when possible, or validate plausible 10-15 digits
    v_clean_phone := TRIM(COALESCE(p_phone, ''));
    v_digits := regexp_replace(v_clean_phone, '[^0-9]', '', 'g');
    IF v_digits ~ '^00923[0-9]{9}$' THEN
        v_digits := '0' || substring(v_digits FROM 5);
    ELSIF v_digits ~ '^923[0-9]{9}$' THEN
        v_digits := '0' || substring(v_digits FROM 3);
    ELSIF v_digits ~ '^3[0-9]{9}$' THEN
        v_digits := '0' || v_digits;
    END IF;

    IF v_digits ~ '^03[0-57][0-9]{8}$' THEN
        v_clean_phone := v_digits;
    ELSIF v_clean_phone !~ '^\+?[0-9]{10,15}$' THEN
        RAISE EXCEPTION 'Invalid phone number: Must be a valid Pakistani mobile number (03XXXXXXXXX).'
            USING ERRCODE = '22023';
    END IF;

    -- Preserve any existing skill tags across categories
    SELECT COALESCE(array_agg(DISTINCT t), '{}')
    INTO v_existing_tags
    FROM public.professional_skills ps,
         LATERAL unnest(ps.skill_tags) AS t
    WHERE ps.professional_id = v_user_id;

    -- Update only bio, years_experience, availability, and updated_at on professional_profiles
    UPDATE public.professional_profiles
    SET bio = v_clean_bio,
        years_experience = p_years,
        availability = v_clean_availability,
        updated_at = now()
    WHERE profile_id = v_user_id;

    -- Replace professional skills atomically
    DELETE FROM public.professional_skills
    WHERE professional_id = v_user_id;

    INSERT INTO public.professional_skills (professional_id, category_id, skill_tags)
    SELECT DISTINCT v_user_id, unnest(p_category_ids), COALESCE(v_existing_tags, '{}');

    -- Replace professional areas atomically
    DELETE FROM public.professional_areas
    WHERE professional_id = v_user_id;

    INSERT INTO public.professional_areas (professional_id, area_id)
    SELECT DISTINCT v_user_id, unnest(p_area_ids);

    -- Upsert contact_details
    INSERT INTO public.contact_details (profile_id, phone)
    VALUES (v_user_id, v_clean_phone)
    ON CONFLICT (profile_id) DO UPDATE
    SET phone = EXCLUDED.phone;
END;
$$;

COMMENT ON FUNCTION public.update_my_professional_profile(text, int, text, bigint[], bigint[], text) IS 'Atomic profile update for approved professionals without touching status, verified, or ratings.';

REVOKE EXECUTE ON FUNCTION public.update_my_professional_profile(text, int, text, bigint[], bigint[], text) FROM public;
REVOKE EXECUTE ON FUNCTION public.update_my_professional_profile(text, int, text, bigint[], bigint[], text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_my_professional_profile(text, int, text, bigint[], bigint[], text) TO authenticated;

-- 5. Function my_professional_stats()
-- Returns JSON performance summary for the authenticated approved professional.
-- Note: agreed_value_completed is the quoted value of accepted offers on completed jobs, not tracked payments.
CREATE OR REPLACE FUNCTION public.my_professional_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid;
    v_offers_sent bigint;
    v_offers_accepted bigint;
    v_acceptance_rate numeric(5,2);
    v_active_jobs bigint;
    v_completed_jobs bigint;
    v_reviews_count bigint;
    v_average_rating numeric(4,2);
    v_agreed_value numeric(12,2);
    v_offers_per_week jsonb;
BEGIN
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL OR NOT public.is_approved_professional(v_user_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only approved professionals can view professional performance statistics.'
            USING ERRCODE = '42501';
    END IF;

    SELECT
        count(*),
        count(*) FILTER (WHERE status = 'accepted')
    INTO v_offers_sent, v_offers_accepted
    FROM public.offers
    WHERE professional_id = v_user_id;

    IF v_offers_sent > 0 THEN
        v_acceptance_rate := ROUND((v_offers_accepted::numeric * 100.0) / v_offers_sent::numeric, 2);
    ELSE
        v_acceptance_rate := NULL;
    END IF;

    SELECT
        count(*) FILTER (WHERE status IN ('Assigned', 'In progress')),
        count(*) FILTER (WHERE status = 'Completed')
    INTO v_active_jobs, v_completed_jobs
    FROM public.jobs
    WHERE assigned_professional_id = v_user_id;

    SELECT
        count(*),
         CASE WHEN count(*) > 0 THEN ROUND(avg(rating)::numeric, 2) ELSE NULL END
    INTO v_reviews_count, v_average_rating
    FROM public.reviews
    WHERE professional_id = v_user_id;

    -- Quoted value (not tracked payments): sum of the accepted offer price for completed jobs assigned to this professional
    SELECT COALESCE(sum(o.price), 0)
    INTO v_agreed_value
    FROM public.jobs j
    JOIN public.offers o
      ON o.job_id = j.id
     AND o.professional_id = v_user_id
     AND o.status = 'accepted'
    WHERE j.assigned_professional_id = v_user_id
      AND j.status = 'Completed';

    -- Offers sent per week for the last 8 weeks (including weeks with zero offers)
    SELECT jsonb_agg(
        jsonb_build_object(
            'week_start', to_char(w.week_start, 'YYYY-MM-DD'),
            'count', COALESCE(c.offer_count, 0)
        )
        ORDER BY w.week_start ASC
    )
    INTO v_offers_per_week
    FROM (
        SELECT generate_series(
            date_trunc('week', now() AT TIME ZONE 'UTC')::date - interval '7 weeks',
            date_trunc('week', now() AT TIME ZONE 'UTC')::date,
            interval '1 week'
        )::date AS week_start
    ) w
    LEFT JOIN (
        SELECT
            date_trunc('week', created_at AT TIME ZONE 'UTC')::date AS week_start,
            count(*)::bigint AS offer_count
        FROM public.offers
        WHERE professional_id = v_user_id
        GROUP BY 1
    ) c ON c.week_start = w.week_start;

    RETURN jsonb_build_object(
        'offers_sent', COALESCE(v_offers_sent, 0),
        'offers_accepted', COALESCE(v_offers_accepted, 0),
        'acceptance_rate', v_acceptance_rate,
        'active_jobs', COALESCE(v_active_jobs, 0),
        'completed_jobs', COALESCE(v_completed_jobs, 0),
        'reviews_count', COALESCE(v_reviews_count, 0),
        'average_rating', v_average_rating,
        'agreed_value_completed', COALESCE(v_agreed_value, 0),
        'offers_per_week', COALESCE(v_offers_per_week, '[]'::jsonb)
    );
END;
$$;

COMMENT ON FUNCTION public.my_professional_stats() IS 'Returns real offer, job, review, and quoted value metrics (not payments) plus 8-week offer counts for the calling approved professional.';

REVOKE EXECUTE ON FUNCTION public.my_professional_stats() FROM public;
REVOKE EXECUTE ON FUNCTION public.my_professional_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.my_professional_stats() TO authenticated;

-- 6. Indexes for professional dashboard queries (if absent)
CREATE INDEX IF NOT EXISTS idx_offers_pro_status_created_desc
    ON public.offers (professional_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_assigned_pro_status
    ON public.jobs (assigned_professional_id, status);

CREATE INDEX IF NOT EXISTS idx_jobs_status_category_area
    ON public.jobs (status, category_id, area_id);
