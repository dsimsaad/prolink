-- ==============================================================================
-- Migration: 005_dual_role_professional_applications.sql
-- Purpose: Transition account model to a unified dual-role architecture.
--          Every registered user has account role 'user' (or 'admin') and can post jobs.
--          A user becomes a professional by submitting an application for review.
--          professional_profiles introduces an explicit lifecycle status:
--          'pending', 'approved', 'rejected', or 'suspended'.
--          Only 'approved' professionals can view open jobs, submit offers, appear in matching,
--          and be publicly visible.
-- Order: 5 of 5 migrations (Run after 001_core_schema, 002_functions_triggers, 003_rls, 004_google_onboarding)
-- Status: DRAFT FOR HUMAN REVIEW BEFORE RUNNING
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Profiles: Migrate Existing Roles & Update Role Constraint
-- ------------------------------------------------------------------------------

-- 1a. Drop existing check constraints first so 'user' value is permitted during update
ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_role_check,
    DROP CONSTRAINT IF EXISTS chk_profiles_role;

-- 1b. Update all existing 'customer' and 'professional' role entries to unified 'user'
UPDATE public.profiles
SET role = 'user'
WHERE role IN ('customer', 'professional');

-- 1c. Add the updated check constraint restricting values to ('user', 'admin')
ALTER TABLE public.profiles
    ADD CONSTRAINT chk_profiles_role CHECK (role IN ('user', 'admin'));

-- 1d. Set default role for all new profiles to 'user'
ALTER TABLE public.profiles
    ALTER COLUMN role SET DEFAULT 'user';

COMMENT ON COLUMN public.profiles.role IS 'Account authorization type: user (can post jobs and apply as pro) or admin. Source of truth for platform privileges.';

-- ------------------------------------------------------------------------------
-- 2. Professional Profiles: Application Lifecycle Status & Review Metadata
-- ------------------------------------------------------------------------------

-- Add application tracking columns to professional_profiles
ALTER TABLE public.professional_profiles
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS applied_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
    ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS review_note text;

-- Enforce valid lifecycle status values
ALTER TABLE public.professional_profiles
    DROP CONSTRAINT IF EXISTS chk_professional_profiles_status;

ALTER TABLE public.professional_profiles
    ADD CONSTRAINT chk_professional_profiles_status CHECK (
        status IN ('pending', 'approved', 'rejected', 'suspended')
    );

-- Backfill existing rows as 'approved' (these represent test or existing seed data)
UPDATE public.professional_profiles
SET status = 'approved',
    verified = true,
    reviewed_at = COALESCE(reviewed_at, now())
WHERE status = 'pending';

-- Document status as the source of truth
COMMENT ON COLUMN public.professional_profiles.status IS 'Lifecycle state: pending, approved, rejected, suspended. Primary source of truth for professional capability and visibility.';
COMMENT ON COLUMN public.professional_profiles.verified IS 'Maintained to follow status: verified = (status = ''approved''). Status is the authoritative source of truth.';

-- ------------------------------------------------------------------------------
-- 3. Safely Undo Superseded 004 Google Onboarding Objects
-- ------------------------------------------------------------------------------

-- Drop onboarding_completed column from profiles if it exists (Google users no longer need role onboarding)
ALTER TABLE public.profiles
    DROP COLUMN IF EXISTS onboarding_completed;

-- Drop complete_onboarding RPC function if it exists
DROP FUNCTION IF EXISTS public.complete_onboarding(text);

-- ------------------------------------------------------------------------------
-- 4. Auth Signup Profile Provisioning (Replace handle_new_user)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_full_name text;
    v_email_prefix text;
BEGIN
    -- Derive email prefix fallback before the '@' sign
    v_email_prefix := NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), '');

    -- Extract full name from raw_user_meta_data with fallbacks
    v_full_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        v_email_prefix,
        'User'
    );

    -- All signed-up users are created as baseline 'user' profiles.
    -- Metadata roles (customer, professional, admin) are strictly IGNORED.
    -- Professional profiles are NOT created at signup; created only when applying.
    INSERT INTO public.profiles (id, role, full_name, created_at, updated_at)
    VALUES (NEW.id, 'user', v_full_name, now(), now())
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger handler on auth.users creating profiles with role user on registration. Ignores signup metadata role.';

-- ------------------------------------------------------------------------------
-- 5. Helper Functions: Professional Status & Admin Check
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_approved_professional(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.professional_profiles
        WHERE profile_id = uid
          AND status = 'approved'
    );
$$;

COMMENT ON FUNCTION public.is_approved_professional(uuid) IS 'Returns true if the user possesses an approved professional profile.';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role = 'admin'
    );
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Returns true if the active authenticated user has the admin role.';

-- ------------------------------------------------------------------------------
-- 6. RPC: Apply As Professional
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.apply_as_professional(
    p_bio text,
    p_years int,
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
    v_clean_phone text;
    v_num_categories int;
    v_valid_categories int;
    v_num_areas int;
    v_valid_areas int;
    v_existing_status text;
BEGIN
    -- 1. Ensure caller is authenticated
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller must be authenticated to apply as a professional.'
            USING ERRCODE = '42501';
    END IF;

    -- Ensure profile exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
        RAISE EXCEPTION 'Profile not found: No profile exists for the authenticated user.'
            USING ERRCODE = 'P0002';
    END IF;

    -- 2. Validate Bio: 30 to 1000 characters
    v_clean_bio := TRIM(COALESCE(p_bio, ''));
    IF length(v_clean_bio) < 30 OR length(v_clean_bio) > 1000 THEN
        RAISE EXCEPTION 'Invalid bio: Bio must be between 30 and 1000 characters (provided length: %).', length(v_clean_bio)
            USING ERRCODE = '22023';
    END IF;

    -- 3. Validate Years of Experience: 0 to 60
    IF p_years IS NULL OR p_years < 0 OR p_years > 60 THEN
        RAISE EXCEPTION 'Invalid experience: Years of experience must be between 0 and 60.'
            USING ERRCODE = '22023';
    END IF;

    -- 4. Validate Categories: 1 to 5 active categories
    v_num_categories := COALESCE(cardinality(p_category_ids), 0);
    IF v_num_categories < 1 OR v_num_categories > 5 THEN
        RAISE EXCEPTION 'Invalid categories: Please select between 1 and 5 service trade categories.'
            USING ERRCODE = '22023';
    END IF;

    SELECT count(DISTINCT id) INTO v_valid_categories
    FROM public.categories
    WHERE id = ANY(p_category_ids)
      AND is_active = true;

    IF v_valid_categories <> v_num_categories THEN
        RAISE EXCEPTION 'Invalid categories: One or more selected categories do not exist, are inactive, or contain duplicates.'
            USING ERRCODE = '22023';
    END IF;

    -- 5. Validate Areas: 1 to 12 existing service areas
    v_num_areas := COALESCE(cardinality(p_area_ids), 0);
    IF v_num_areas < 1 OR v_num_areas > 12 THEN
        RAISE EXCEPTION 'Invalid service areas: Please select between 1 and 12 coverage areas.'
            USING ERRCODE = '22023';
    END IF;

    SELECT count(DISTINCT id) INTO v_valid_areas
    FROM public.areas
    WHERE id = ANY(p_area_ids);

    IF v_valid_areas <> v_num_areas THEN
        RAISE EXCEPTION 'Invalid service areas: One or more selected areas do not exist or contain duplicates.'
            USING ERRCODE = '22023';
    END IF;

    -- 6. Validate Phone: plausible international/local format (10 to 15 digits)
    v_clean_phone := TRIM(COALESCE(p_phone, ''));
    IF v_clean_phone !~ '^\+?[0-9]{10,15}$' THEN
        RAISE EXCEPTION 'Invalid phone number: Must be a plausible phone format with 10 to 15 digits (e.g. +923001234567).'
            USING ERRCODE = '22023';
    END IF;

    -- 7. Inspect existing professional_profiles row
    SELECT status INTO v_existing_status
    FROM public.professional_profiles
    WHERE profile_id = v_user_id;

    IF NOT FOUND THEN
        -- Initial application: insert with status 'pending'
        INSERT INTO public.professional_profiles (
            profile_id,
            bio,
            years_experience,
            status,
            verified,
            applied_at,
            updated_at
        ) VALUES (
            v_user_id,
            v_clean_bio,
            p_years,
            'pending',
            false,
            now(),
            now()
        );
    ELSIF v_existing_status = 'rejected' THEN
        -- Reapplication: reset status to 'pending' and clear previous review metadata
        UPDATE public.professional_profiles
        SET bio = v_clean_bio,
            years_experience = p_years,
            status = 'pending',
            verified = false,
            applied_at = now(),
            reviewed_at = NULL,
            reviewed_by = NULL,
            review_note = NULL,
            updated_at = now()
        WHERE profile_id = v_user_id;
    ELSE
        -- Status is 'pending', 'approved', or 'suspended'
        RAISE EXCEPTION 'Cannot apply: You already have an active professional profile with status ''%''.', v_existing_status
            USING ERRCODE = '22023';
    END IF;

    -- 8. Replace professional skills atomically
    DELETE FROM public.professional_skills
    WHERE professional_id = v_user_id;

    INSERT INTO public.professional_skills (professional_id, category_id)
    SELECT DISTINCT v_user_id, unnest(p_category_ids);

    -- 9. Replace professional service areas atomically
    DELETE FROM public.professional_areas
    WHERE professional_id = v_user_id;

    INSERT INTO public.professional_areas (professional_id, area_id)
    SELECT DISTINCT v_user_id, unnest(p_area_ids);

    -- 10. Upsert private contact phone
    INSERT INTO public.contact_details (profile_id, phone)
    VALUES (v_user_id, v_clean_phone)
    ON CONFLICT (profile_id) DO UPDATE
    SET phone = EXCLUDED.phone;

END;
$$;

COMMENT ON FUNCTION public.apply_as_professional(text, int, bigint[], bigint[], text) IS 'Atomic RPC for users to apply or reapply (if rejected) as a professional with skills, areas, and phone.';

REVOKE EXECUTE ON FUNCTION public.apply_as_professional(text, int, bigint[], bigint[], text) FROM public;
REVOKE EXECUTE ON FUNCTION public.apply_as_professional(text, int, bigint[], bigint[], text) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_as_professional(text, int, bigint[], bigint[], text) TO authenticated;

-- ------------------------------------------------------------------------------
-- 7. RPC: Review Professional Application (Admin Only)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.review_professional_application(
    p_professional_id uuid,
    p_decision text,
    p_note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id uuid;
    v_sanitized_decision text;
    v_clean_note text;
    v_existing_status text;
BEGIN
    -- 1. Ensure caller is administrator
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only platform administrators can review professional applications.'
            USING ERRCODE = '42501';
    END IF;

    v_admin_id := (SELECT auth.uid());

    -- 2. Validate decision: strictly approved, rejected, or suspended
    v_sanitized_decision := LOWER(TRIM(COALESCE(p_decision, '')));
    IF v_sanitized_decision NOT IN ('approved', 'rejected', 'suspended') THEN
        RAISE EXCEPTION 'Invalid decision: Review decision must be ''approved'', ''rejected'', or ''suspended''.'
            USING ERRCODE = '22023';
    END IF;

    -- 3. Note is required for rejected and suspended decisions
    v_clean_note := TRIM(COALESCE(p_note, ''));
    IF v_sanitized_decision IN ('rejected', 'suspended') AND v_clean_note = '' THEN
        RAISE EXCEPTION 'Review note required: An explanation note is mandatory when rejecting or suspending an application.'
            USING ERRCODE = '22023';
    END IF;

    -- 4. Target application must exist
    SELECT status INTO v_existing_status
    FROM public.professional_profiles
    WHERE profile_id = p_professional_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found: No professional profile exists for user %.', p_professional_id
            USING ERRCODE = 'P0002';
    END IF;

    -- 5. Admin cannot review their own application
    IF p_professional_id = v_admin_id THEN
        RAISE EXCEPTION 'Conflict of interest: Administrators cannot review their own professional application.'
            USING ERRCODE = '42501';
    END IF;

    -- 6. Apply review decision and align verified column
    UPDATE public.professional_profiles
    SET status = v_sanitized_decision,
        verified = (v_sanitized_decision = 'approved'),
        reviewed_by = v_admin_id,
        reviewed_at = now(),
        review_note = NULLIF(v_clean_note, ''),
        updated_at = now()
    WHERE profile_id = p_professional_id;

    -- 7. Insert notification for applicant
    INSERT INTO public.notifications (user_id, type, payload)
    VALUES (
        p_professional_id,
        'professional_application_reviewed',
        jsonb_build_object(
            'decision', v_sanitized_decision,
            'note', NULLIF(v_clean_note, ''),
            'reviewed_at', now()
        )
    );
END;
$$;

COMMENT ON FUNCTION public.review_professional_application(uuid, text, text) IS 'Admin RPC to approve, reject, or suspend a professional application and notify applicant.';

REVOKE EXECUTE ON FUNCTION public.review_professional_application(uuid, text, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.review_professional_application(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.review_professional_application(uuid, text, text) TO authenticated;

-- ------------------------------------------------------------------------------
-- 8. Protect Privileged Columns From Direct Client Mutation
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Only enforce restrictions when executed from a direct client context ('authenticated' or 'anon').
    -- Legitimate SECURITY DEFINER procedures (running under function owner identity) can update these columns.
    IF CURRENT_USER IN ('authenticated', 'anon') THEN
        -- Check profiles table protected columns
        IF TG_TABLE_NAME = 'profiles' THEN
            IF NEW.role IS DISTINCT FROM OLD.role THEN
                RAISE EXCEPTION 'Unauthorized: Modifying role directly is restricted to administrators and system processes.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;

        -- Check professional_profiles table protected columns
        IF TG_TABLE_NAME = 'professional_profiles' THEN
            IF NEW.status IS DISTINCT FROM OLD.status THEN
                RAISE EXCEPTION 'Unauthorized: Modifying application status directly is prohibited. Use apply_as_professional() or administrative review.'
                    USING ERRCODE = '42501';
            END IF;

            IF NEW.verified IS DISTINCT FROM OLD.verified THEN
                RAISE EXCEPTION 'Unauthorized: Modifying verification status directly is prohibited.'
                    USING ERRCODE = '42501';
            END IF;

            IF NEW.applied_at IS DISTINCT FROM OLD.applied_at
               OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
               OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
               OR NEW.review_note IS DISTINCT FROM OLD.review_note THEN
                RAISE EXCEPTION 'Unauthorized: Modifying application review metadata directly is prohibited.'
                    USING ERRCODE = '42501';
            END IF;

            IF NEW.response_rate IS DISTINCT FROM OLD.response_rate
               OR NEW.rating_count IS DISTINCT FROM OLD.rating_count
               OR NEW.rating_sum IS DISTINCT FROM OLD.rating_sum
               OR NEW.avg_rating_bayes IS DISTINCT FROM OLD.avg_rating_bayes THEN
                RAISE EXCEPTION 'Unauthorized: Modifying rating aggregations directly is prohibited.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.protect_sensitive_columns() IS 'Blocks direct client-side updates to role, status, verification, review metadata, and ratings.';

-- ------------------------------------------------------------------------------
-- 9. Safety Triggers: Marketplace Invariants & Self-Dealing Guards
-- ------------------------------------------------------------------------------

-- 9.1 Offers Validation: Professional must be approved AND not the job customer
CREATE OR REPLACE FUNCTION public.validate_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_customer_id uuid;
BEGIN
    -- Check that offering professional is approved
    IF NOT public.is_approved_professional(NEW.professional_id) THEN
        RAISE EXCEPTION 'Unauthorized offer: Only professionals with an approved profile can submit offers.'
            USING ERRCODE = '42501';
    END IF;

    -- Fetch customer who posted the job
    SELECT customer_id INTO v_customer_id
    FROM public.jobs
    WHERE id = NEW.job_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid job: The target job % does not exist.', NEW.job_id
            USING ERRCODE = '23503';
    END IF;

    -- Disallow self-bidding
    IF NEW.professional_id = v_customer_id THEN
        RAISE EXCEPTION 'Self-offer prohibited: You cannot submit an offer on your own job posting.'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_offer() IS 'Enforces that offers come from approved professionals and prevents self-offers.';

DROP TRIGGER IF EXISTS trg_validate_offer ON public.offers;
CREATE TRIGGER trg_validate_offer
    BEFORE INSERT ON public.offers
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_offer();

-- 9.2 Reviews Validation: Reviewer must not equal professional (plus completed job checks)
CREATE OR REPLACE FUNCTION public.validate_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_job record;
BEGIN
    -- Prevent self-reviews
    IF NEW.reviewer_id = NEW.professional_id THEN
        RAISE EXCEPTION 'Self-review prohibited: A user cannot review their own professional profile.'
            USING ERRCODE = '42501';
    END IF;

    -- Fetch job record
    SELECT customer_id, assigned_professional_id, status
    INTO v_job
    FROM public.jobs
    WHERE id = NEW.job_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid Review: Associated job % does not exist.', NEW.job_id
            USING ERRCODE = '23503';
    END IF;

    -- Job must be Completed
    IF v_job.status <> 'Completed' THEN
        RAISE EXCEPTION 'Invalid Review: Reviews can only be submitted for Completed jobs (current status: %).', v_job.status
            USING ERRCODE = '22023';
    END IF;

    -- Reviewer must be the job customer
    IF v_job.customer_id <> NEW.reviewer_id THEN
        RAISE EXCEPTION 'Invalid Review: Reviewer (%) must match the customer who posted the job (%).', NEW.reviewer_id, v_job.customer_id
            USING ERRCODE = '42501';
    END IF;

    -- Professional must match assigned professional
    IF v_job.assigned_professional_id <> NEW.professional_id THEN
        RAISE EXCEPTION 'Invalid Review: Reviewed professional (%) must match the professional assigned to the job (%).', NEW.professional_id, v_job.assigned_professional_id
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_review() IS 'Enforces that reviews are created by the customer for the assigned professional of Completed jobs and prevents self-reviews.';

-- 9.3 Conversations Validation: Customer cannot equal Professional
CREATE OR REPLACE FUNCTION public.validate_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.customer_id = NEW.professional_id THEN
        RAISE EXCEPTION 'Self-conversation prohibited: A customer cannot open a conversation with themselves.'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_conversation() IS 'Prevents establishing 1-to-1 conversations between identical customer and professional accounts.';

DROP TRIGGER IF EXISTS trg_validate_conversation ON public.conversations;
CREATE TRIGGER trg_validate_conversation
    BEFORE INSERT ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_conversation();

-- ------------------------------------------------------------------------------
-- 10. Row Level Security (RLS) Policy Adjustments
-- ------------------------------------------------------------------------------

-- 10.1 Professional Profiles
DROP POLICY IF EXISTS "professional_profiles_read_authenticated" ON public.professional_profiles;
CREATE POLICY "professional_profiles_read_authenticated"
    ON public.professional_profiles
    FOR SELECT
    TO authenticated
    USING (
        status = 'approved'
        OR profile_id = (SELECT auth.uid())
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "professional_profiles_update_owner" ON public.professional_profiles;
CREATE POLICY "professional_profiles_update_owner"
    ON public.professional_profiles
    FOR UPDATE
    TO authenticated
    USING (profile_id = (SELECT auth.uid()))
    WITH CHECK (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "professional_profiles_admin_update" ON public.professional_profiles;
CREATE POLICY "professional_profiles_admin_update"
    ON public.professional_profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 10.2 Professional Skills: Visible when approved, owner, or admin. Modifiable while pending or approved.
DROP POLICY IF EXISTS "professional_skills_read" ON public.professional_skills;
CREATE POLICY "professional_skills_read"
    ON public.professional_skills
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.professional_profiles pp
            WHERE pp.profile_id = professional_skills.professional_id
              AND (
                  pp.status = 'approved'
                  OR pp.profile_id = (SELECT auth.uid())
                  OR public.is_admin()
              )
        )
    );

DROP POLICY IF EXISTS "professional_skills_insert_owner" ON public.professional_skills;
CREATE POLICY "professional_skills_insert_owner"
    ON public.professional_skills
    FOR INSERT
    TO authenticated
    WITH CHECK (
        professional_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1
            FROM public.professional_profiles pp
            WHERE pp.profile_id = (SELECT auth.uid())
              AND pp.status IN ('pending', 'approved')
        )
    );

DROP POLICY IF EXISTS "professional_skills_update_owner" ON public.professional_skills;
CREATE POLICY "professional_skills_update_owner"
    ON public.professional_skills
    FOR UPDATE
    TO authenticated
    USING (
        professional_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1
            FROM public.professional_profiles pp
            WHERE pp.profile_id = (SELECT auth.uid())
              AND pp.status IN ('pending', 'approved')
        )
    )
    WITH CHECK (
        professional_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1
            FROM public.professional_profiles pp
            WHERE pp.profile_id = (SELECT auth.uid())
              AND pp.status IN ('pending', 'approved')
        )
    );

DROP POLICY IF EXISTS "professional_skills_delete_owner" ON public.professional_skills;
CREATE POLICY "professional_skills_delete_owner"
    ON public.professional_skills
    FOR DELETE
    TO authenticated
    USING (
        professional_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1
            FROM public.professional_profiles pp
            WHERE pp.profile_id = (SELECT auth.uid())
              AND pp.status IN ('pending', 'approved')
        )
    );

-- 10.3 Professional Areas: Visible when approved, owner, or admin. Modifiable while pending or approved.
DROP POLICY IF EXISTS "professional_areas_read" ON public.professional_areas;
CREATE POLICY "professional_areas_read"
    ON public.professional_areas
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.professional_profiles pp
            WHERE pp.profile_id = professional_areas.professional_id
              AND (
                  pp.status = 'approved'
                  OR pp.profile_id = (SELECT auth.uid())
                  OR public.is_admin()
              )
        )
    );

DROP POLICY IF EXISTS "professional_areas_insert_owner" ON public.professional_areas;
CREATE POLICY "professional_areas_insert_owner"
    ON public.professional_areas
    FOR INSERT
    TO authenticated
    WITH CHECK (
        professional_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1
            FROM public.professional_profiles pp
            WHERE pp.profile_id = (SELECT auth.uid())
              AND pp.status IN ('pending', 'approved')
        )
    );

DROP POLICY IF EXISTS "professional_areas_update_owner" ON public.professional_areas;
CREATE POLICY "professional_areas_update_owner"
    ON public.professional_areas
    FOR UPDATE
    TO authenticated
    USING (
        professional_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1
            FROM public.professional_profiles pp
            WHERE pp.profile_id = (SELECT auth.uid())
              AND pp.status IN ('pending', 'approved')
        )
    )
    WITH CHECK (
        professional_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1
            FROM public.professional_profiles pp
            WHERE pp.profile_id = (SELECT auth.uid())
              AND pp.status IN ('pending', 'approved')
        )
    );

DROP POLICY IF EXISTS "professional_areas_delete_owner" ON public.professional_areas;
CREATE POLICY "professional_areas_delete_owner"
    ON public.professional_areas
    FOR DELETE
    TO authenticated
    USING (
        professional_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1
            FROM public.professional_profiles pp
            WHERE pp.profile_id = (SELECT auth.uid())
              AND pp.status IN ('pending', 'approved')
        )
    );

-- 10.4 Jobs: Open/Offers received jobs visible only to approved professionals (or customer, assigned pro, admin)
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
            AND public.is_approved_professional((SELECT auth.uid()))
        )
        OR
        assigned_professional_id = (SELECT auth.uid())
        OR
        public.is_admin()
    );

-- ------------------------------------------------------------------------------
-- 11. Performance Indexes
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_professional_profiles_status
    ON public.professional_profiles (status);

-- ------------------------------------------------------------------------------
-- 12. Follow-Up Operational & Engineering Directives
-- ------------------------------------------------------------------------------
-- 1. SEED DATASETS:
--    All pre-populated demo/seed professionals must be explicitly inserted with:
--    status = 'approved', verified = true.
--
-- 2. BACKEND MATCHING & SYNTHETIC DATA GENERATOR:
--    - Python data generator and C# Core API matching engine queries must filter for:
--      status = 'approved' AND availability = 'available'
--    - Matching must strictly exclude professionals whose professional_id matches job.customer_id.
--
-- 3. PROMOTING ADMINISTRATORS:
--    Administrators are created manually by running in the Supabase SQL editor:
--    UPDATE public.profiles SET role = 'admin' WHERE id = '<target-user-uuid>';
-- ------------------------------------------------------------------------------
