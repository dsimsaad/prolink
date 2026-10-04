-- ==============================================================================
-- Migration: 002_functions_triggers.sql
-- Purpose: Helper functions, triggers, security checks, and rating calculations
-- Order: 2 of 3 migrations
-- Status: DRAFT FOR HUMAN REVIEW BEFORE RUNNING
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Generic Timestamp Maintainer
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS 'Updates the updated_at timestamp column to the current time on record modification.';

-- Attach timestamp triggers
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_professional_profiles_updated_at ON public.professional_profiles;
CREATE TRIGGER trg_professional_profiles_updated_at
    BEFORE UPDATE ON public.professional_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_jobs_updated_at ON public.jobs;
CREATE TRIGGER trg_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_offers_updated_at ON public.offers;
CREATE TRIGGER trg_offers_updated_at
    BEFORE UPDATE ON public.offers
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 2. Auth Signup Profile Provisioning
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_raw_role text;
    v_assigned_role text;
    v_full_name text;
BEGIN
    -- Extract role from metadata; sanitize so only customer/professional can be self-assigned
    v_raw_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'customer'));
    
    IF v_raw_role = 'professional' THEN
        v_assigned_role := 'professional';
    ELSE
        -- Admins and invalid inputs default strictly to 'customer'
        v_assigned_role := 'customer';
    END IF;

    -- Extract full name with fallback
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        'User'
    );

    -- Insert baseline profile
    INSERT INTO public.profiles (id, role, full_name, created_at, updated_at)
    VALUES (NEW.id, v_assigned_role, v_full_name, now(), now())
    ON CONFLICT (id) DO NOTHING;

    -- If registered as a professional, create associated professional profile extension
    IF v_assigned_role = 'professional' THEN
        INSERT INTO public.professional_profiles (profile_id, updated_at)
        VALUES (NEW.id, now())
        ON CONFLICT (profile_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger handler on auth.users creating profiles and professional_profiles on registration.';

-- Attach signup trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 3. Protect Privileged Columns From Direct Client Mutation
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Only enforce restrictions when executed from an authenticated client context (auth.uid() is not null)
    -- Service role and direct DB admin operations bypass this check.
    IF (SELECT auth.uid()) IS NOT NULL THEN
        -- Check profiles table protected columns
        IF TG_TABLE_NAME = 'profiles' THEN
            IF NEW.role IS DISTINCT FROM OLD.role THEN
                RAISE EXCEPTION 'Unauthorized: Modifying role is restricted to administrators and system processes.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;

        -- Check professional_profiles table protected columns
        IF TG_TABLE_NAME = 'professional_profiles' THEN
            IF NEW.verified IS DISTINCT FROM OLD.verified THEN
                RAISE EXCEPTION 'Unauthorized: Modifying verification status is restricted to administrators.'
                    USING ERRCODE = '42501';
            END IF;

            IF NEW.response_rate IS DISTINCT FROM OLD.response_rate
               OR NEW.rating_count IS DISTINCT FROM OLD.rating_count
               OR NEW.rating_sum IS DISTINCT FROM OLD.rating_sum
               OR NEW.avg_rating_bayes IS DISTINCT FROM OLD.avg_rating_bayes THEN
                RAISE EXCEPTION 'Unauthorized: Modifying rating metrics and response rates directly is prohibited.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.protect_sensitive_columns() IS 'Blocks client-side updates to role, verification, and rating aggregation columns.';

DROP TRIGGER IF EXISTS trg_protect_profiles_columns ON public.profiles;
CREATE TRIGGER trg_protect_profiles_columns
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_sensitive_columns();

DROP TRIGGER IF EXISTS trg_protect_professional_columns ON public.professional_profiles;
CREATE TRIGGER trg_protect_professional_columns
    BEFORE UPDATE ON public.professional_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_sensitive_columns();

-- ------------------------------------------------------------------------------
-- 4. Role & Authorization Helpers
-- ------------------------------------------------------------------------------

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

CREATE OR REPLACE FUNCTION public.can_see_contact(target uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_viewer_id uuid;
BEGIN
    v_viewer_id := (SELECT auth.uid());

    -- Anonymous users cannot view contact info
    IF v_viewer_id IS NULL THEN
        RETURN false;
    END IF;

    -- User viewing their own contact details
    IF v_viewer_id = target THEN
        RETURN true;
    END IF;

    -- Admins can view all contact details
    IF public.is_admin() THEN
        RETURN true;
    END IF;

    -- Customer and assigned professional can view each other's contact details when job is in active/completed state
    RETURN EXISTS (
        SELECT 1
        FROM public.jobs j
        WHERE (
            (j.customer_id = v_viewer_id AND j.assigned_professional_id = target)
            OR
            (j.customer_id = target AND j.assigned_professional_id = v_viewer_id)
        )
        AND j.status IN ('Assigned', 'In progress', 'Completed', 'Disputed')
    );
END;
$$;

COMMENT ON FUNCTION public.can_see_contact(uuid) IS 'Evaluates whether the caller is authorized to view the target user private phone number.';

-- ------------------------------------------------------------------------------
-- 5. Review Integrity & Rating Updates
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_job record;
BEGIN
    -- Fetch job record
    SELECT customer_id, assigned_professional_id, status
    INTO v_job
    FROM public.jobs
    WHERE id = NEW.job_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid Review: Associated job % does not exist.', NEW.job_id
            USING ERRCODE = '23503';
    END IF;

    -- Rule 1: Job must be in Completed status
    IF v_job.status <> 'Completed' THEN
        RAISE EXCEPTION 'Invalid Review: Reviews can only be submitted for Completed jobs (current status: %).', v_job.status
            USING ERRCODE = '22023';
    END IF;

    -- Rule 2: Reviewer must be the job customer
    IF v_job.customer_id <> NEW.reviewer_id THEN
        RAISE EXCEPTION 'Invalid Review: Reviewer (%) must match the customer who posted the job (%).', NEW.reviewer_id, v_job.customer_id
            USING ERRCODE = '42501';
    END IF;

    -- Rule 3: Professional must match the assigned professional
    IF v_job.assigned_professional_id <> NEW.professional_id THEN
        RAISE EXCEPTION 'Invalid Review: Reviewed professional (%) must match the professional assigned to the job (%).', NEW.professional_id, v_job.assigned_professional_id
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_review() IS 'Enforces that reviews are only created by the customer of a Completed job for its assigned professional.';

DROP TRIGGER IF EXISTS trg_validate_review ON public.reviews;
CREATE TRIGGER trg_validate_review
    BEFORE INSERT ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_review();

CREATE OR REPLACE FUNCTION public.update_professional_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    -- Constants for Bayesian average calculation:
    -- m (prior weight): Number of virtual baseline reviews required to anchor the average
    -- C (prior mean): Global expected baseline star rating across the marketplace
    c_m CONSTANT numeric := 5.0;
    c_C CONSTANT numeric := 3.5;

    v_new_count int;
    v_new_sum int;
    v_R numeric;
    v_bayes numeric(4,3);
BEGIN
    -- Update rating count and sum, returning updated figures
    UPDATE public.professional_profiles
    SET rating_count = rating_count + 1,
        rating_sum = rating_sum + NEW.rating
    WHERE profile_id = NEW.professional_id
    RETURNING rating_count, rating_sum INTO v_new_count, v_new_sum;

    IF v_new_count > 0 THEN
        -- Arithmetic mean
        v_R := v_new_sum::numeric / v_new_count::numeric;
        
        -- Bayesian weighted rating formula: (v / (v + m)) * R + (m / (v + m)) * C
        v_bayes := ROUND(
            ((v_new_count::numeric / (v_new_count::numeric + c_m)) * v_R) +
            ((c_m / (v_new_count::numeric + c_m)) * c_C),
            3
        );

        -- Persist computed Bayesian rating
        UPDATE public.professional_profiles
        SET avg_rating_bayes = v_bayes
        WHERE profile_id = NEW.professional_id;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_professional_rating() IS 'Increment rating aggregations and recalculates Bayesian average rating on new review.';

DROP TRIGGER IF EXISTS trg_update_professional_rating ON public.reviews;
CREATE TRIGGER trg_update_professional_rating
    AFTER INSERT ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_professional_rating();
