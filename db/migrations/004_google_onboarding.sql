-- ==============================================================================
-- Migration: 004_google_onboarding.sql
-- Purpose: Add onboarding_completed flag, update signup trigger for Google OAuth,
--          secure sensitive columns, and add complete_onboarding RPC function.
-- Order: 4 of 4 migrations (Run after 001_core_schema, 002_functions_triggers, 003_rls)
-- Status: DRAFT FOR HUMAN REVIEW BEFORE RUNNING
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Add onboarding_completed column to profiles
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Indicates whether the user has completed initial role selection onboarding.';

-- Backfill existing profiles as having completed onboarding (existing users already have an assigned role)
UPDATE public.profiles
SET onboarding_completed = true
WHERE onboarding_completed = false;

-- ------------------------------------------------------------------------------
-- 2. Update Auth Signup Profile Provisioning for Google OAuth & Role Selection
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
    v_onboarding_completed boolean;
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

    -- Extract role from metadata
    v_raw_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', ''));

    IF v_raw_role = 'customer' OR v_raw_role = 'professional' THEN
        -- Explicit valid role provided during signup (e.g., email/password registration)
        v_assigned_role := v_raw_role;
        v_onboarding_completed := true;
    ELSE
        -- Default for Google OAuth or signups without a pre-selected role
        -- User will select their role on the /onboarding page
        v_assigned_role := 'customer';
        v_onboarding_completed := false;
    END IF;

    -- Insert baseline profile
    INSERT INTO public.profiles (id, role, full_name, onboarding_completed, created_at, updated_at)
    VALUES (NEW.id, v_assigned_role, v_full_name, v_onboarding_completed, now(), now())
    ON CONFLICT (id) DO NOTHING;

    -- If registered directly with professional role, create associated professional profile extension
    IF v_assigned_role = 'professional' THEN
        INSERT INTO public.professional_profiles (profile_id, updated_at)
        VALUES (NEW.id, now())
        ON CONFLICT (profile_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger handler on auth.users creating profiles and setting onboarding status on registration.';

-- Re-attach trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 3. Update Column Protection Trigger for Direct Client Updates
-- ------------------------------------------------------------------------------

-- EXPLANATION OF CHANGE:
-- We change the guard condition from `auth.uid() IS NOT NULL` to `CURRENT_USER IN ('authenticated', 'anon')`.
-- In Supabase/PostgREST, direct client requests execute under the PostgreSQL roles 'authenticated' or 'anon'.
-- When a client calls a SECURITY DEFINER function (such as complete_onboarding), PostgreSQL executes that
-- function under the identity of the function owner (the database owner / 'postgres').
-- Checking `CURRENT_USER IN ('authenticated', 'anon')` guarantees that direct client-initiated UPDATE statements
-- targeting `role` or `onboarding_completed` are blocked, while legitimate SECURITY DEFINER procedures running as
-- the database owner can safely perform the updates.

CREATE OR REPLACE FUNCTION public.protect_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Only enforce restrictions when executed from a direct client context ('authenticated' or 'anon')
    IF CURRENT_USER IN ('authenticated', 'anon') THEN
        -- Check profiles table protected columns
        IF TG_TABLE_NAME = 'profiles' THEN
            IF NEW.role IS DISTINCT FROM OLD.role THEN
                RAISE EXCEPTION 'Unauthorized: Modifying role is restricted to administrators and system processes.'
                    USING ERRCODE = '42501';
            END IF;

            IF NEW.onboarding_completed IS DISTINCT FROM OLD.onboarding_completed THEN
                RAISE EXCEPTION 'Unauthorized: Modifying onboarding_completed directly is prohibited.'
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

COMMENT ON FUNCTION public.protect_sensitive_columns() IS 'Blocks direct client-side updates to role, onboarding_completed, verification, and rating aggregation columns.';

-- ------------------------------------------------------------------------------
-- 4. Create complete_onboarding RPC Function
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.complete_onboarding(p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid;
    v_profile_exists boolean;
    v_already_completed boolean;
    v_sanitized_role text;
BEGIN
    -- 1. Ensure caller is authenticated
    v_user_id := (SELECT auth.uid());
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller must be authenticated to complete onboarding.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Validate input role: strictly 'customer' or 'professional' (never 'admin' or arbitrary text)
    v_sanitized_role := LOWER(TRIM(COALESCE(p_role, '')));
    IF v_sanitized_role NOT IN ('customer', 'professional') THEN
        RAISE EXCEPTION 'Invalid role: Role must be either customer or professional.'
            USING ERRCODE = '22023';
    END IF;

    -- 3. Verify profile exists and onboarding is not yet completed
    SELECT true, onboarding_completed
    INTO v_profile_exists, v_already_completed
    FROM public.profiles
    WHERE id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found: No profile exists for the authenticated user.'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_already_completed THEN
        RAISE EXCEPTION 'Onboarding already completed: Role cannot be modified once set.'
            USING ERRCODE = '22023';
    END IF;

    -- 4. Update profile with chosen role and mark onboarding complete
    UPDATE public.profiles
    SET role = v_sanitized_role,
        onboarding_completed = true,
        updated_at = now()
    WHERE id = v_user_id;

    -- 5. If role is professional, create the professional_profiles row
    IF v_sanitized_role = 'professional' THEN
        INSERT INTO public.professional_profiles (profile_id, updated_at)
        VALUES (v_user_id, now())
        ON CONFLICT (profile_id) DO NOTHING;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.complete_onboarding(text) IS 'Allows authenticated users with onboarding_completed = false to select their role (customer or professional) once.';

-- Restrict execution permissions: only authenticated users can invoke this function
REVOKE EXECUTE ON FUNCTION public.complete_onboarding(text) FROM public;
REVOKE EXECUTE ON FUNCTION public.complete_onboarding(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(text) TO authenticated;
