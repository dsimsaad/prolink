-- ==============================================================================
-- Migration: 007_professional_multistep_application.sql
-- Purpose: Extend professional_profiles to store multi-step application fields
--          (father_name, cnic, residential_address, notification_preference)
--          and provide the atomic submit_professional_application() RPC while
--          preserving the legacy apply_as_professional() RPC used by the
--          customer dashboard.
-- Order: 7 (Run after 001 through 006)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Extend professional_profiles with Personal & Preference Columns
-- ------------------------------------------------------------------------------

ALTER TABLE public.professional_profiles
    ADD COLUMN IF NOT EXISTS father_name text,
    ADD COLUMN IF NOT EXISTS cnic text,
    ADD COLUMN IF NOT EXISTS residential_address text,
    ADD COLUMN IF NOT EXISTS notification_preference text NOT NULL DEFAULT 'matching_only';

ALTER TABLE public.professional_profiles
    DROP CONSTRAINT IF EXISTS chk_professional_profiles_cnic,
    DROP CONSTRAINT IF EXISTS chk_professional_profiles_notification_preference;

ALTER TABLE public.professional_profiles
    ADD CONSTRAINT chk_professional_profiles_cnic CHECK (
        cnic IS NULL OR cnic ~ '^[0-9]{5}-[0-9]{7}-[0-9]{1}$'
    ),
    ADD CONSTRAINT chk_professional_profiles_notification_preference CHECK (
        notification_preference IN ('matching_only', 'all_jobs')
    );

COMMENT ON COLUMN public.professional_profiles.father_name IS 'Father''s full name provided during professional registration.';
COMMENT ON COLUMN public.professional_profiles.cnic IS 'National Identity Card number in XXXXX-XXXXXXX-X format.';
COMMENT ON COLUMN public.professional_profiles.residential_address IS 'Residential address of the professional applicant.';
COMMENT ON COLUMN public.professional_profiles.notification_preference IS 'Job notification preference: matching_only or all_jobs.';

-- ------------------------------------------------------------------------------
-- 2. RPC: Submit Multi-Step Professional Application
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_professional_application(
    p_full_name text,
    p_father_name text,
    p_cnic text,
    p_phone text,
    p_residential_address text,
    p_bio text,
    p_years int,
    p_category_ids bigint[],
    p_skill_tags text[],
    p_area_ids bigint[],
    p_notification_preference text,
    p_availability text DEFAULT 'available'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid;
    v_clean_full_name text;
    v_clean_father_name text;
    v_clean_cnic text;
    v_clean_phone text;
    v_clean_address text;
    v_clean_bio text;
    v_clean_pref text;
    v_clean_availability text;
    v_clean_skills text[];
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

    -- Ensure base profile exists and is not suspended
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
        RAISE EXCEPTION 'Profile not found: No profile exists for the authenticated user.'
            USING ERRCODE = 'P0002';
    END IF;

    -- 2. Validate Step 1: Personal Information
    v_clean_full_name := TRIM(COALESCE(p_full_name, ''));
    IF length(v_clean_full_name) < 3 OR length(v_clean_full_name) > 120 THEN
        RAISE EXCEPTION 'Invalid full name: Full name must be between 3 and 120 characters.'
            USING ERRCODE = '22023';
    END IF;

    v_clean_father_name := TRIM(COALESCE(p_father_name, ''));
    IF length(v_clean_father_name) < 3 OR length(v_clean_father_name) > 120 THEN
        RAISE EXCEPTION 'Invalid father name: Father''s name must be between 3 and 120 characters.'
            USING ERRCODE = '22023';
    END IF;

    v_clean_cnic := TRIM(COALESCE(p_cnic, ''));
    IF v_clean_cnic !~ '^[0-9]{5}-[0-9]{7}-[0-9]{1}$' THEN
        RAISE EXCEPTION 'Invalid CNIC: CNIC number must follow the format XXXXX-XXXXXXX-X.'
            USING ERRCODE = '22023';
    END IF;

    v_clean_phone := TRIM(COALESCE(p_phone, ''));
    IF v_clean_phone !~ '^[0-9]{4}-[0-9]{7}$' THEN
        RAISE EXCEPTION 'Invalid phone number: Phone number must follow the format XXXX-XXXXXXX.'
            USING ERRCODE = '22023';
    END IF;

    v_clean_address := TRIM(COALESCE(p_residential_address, ''));
    IF length(v_clean_address) < 10 OR length(v_clean_address) > 500 THEN
        RAISE EXCEPTION 'Invalid residential address: Address must be between 10 and 500 characters.'
            USING ERRCODE = '22023';
    END IF;

    -- 3. Validate Step 2: Professional Information
    v_clean_bio := TRIM(COALESCE(p_bio, ''));
    IF length(v_clean_bio) < 30 OR length(v_clean_bio) > 1000 THEN
        RAISE EXCEPTION 'Invalid bio: Bio must be between 30 and 1000 characters (provided length: %).', length(v_clean_bio)
            USING ERRCODE = '22023';
    END IF;

    IF p_years IS NULL OR p_years < 0 OR p_years > 60 THEN
        RAISE EXCEPTION 'Invalid experience: Years of experience must be between 0 and 60.'
            USING ERRCODE = '22023';
    END IF;

    v_num_categories := COALESCE(cardinality(p_category_ids), 0);
    IF v_num_categories < 1 OR v_num_categories > 5 THEN
        RAISE EXCEPTION 'Invalid categories: Please select between 1 and 5 service categories.'
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

    SELECT COALESCE(array_agg(DISTINCT TRIM(s)), '{}')
    INTO v_clean_skills
    FROM unnest(COALESCE(p_skill_tags, '{}')) AS s
    WHERE length(TRIM(s)) > 0;

    IF COALESCE(cardinality(v_clean_skills), 0) < 1 OR COALESCE(cardinality(v_clean_skills), 0) > 25 THEN
        RAISE EXCEPTION 'Invalid skills: Please provide between 1 and 25 skills or services offered.'
            USING ERRCODE = '22023';
    END IF;

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

    -- 4. Validate Step 3: Notification Preferences & Availability
    v_clean_pref := LOWER(TRIM(COALESCE(p_notification_preference, '')));
    IF v_clean_pref NOT IN ('matching_only', 'all_jobs') THEN
        RAISE EXCEPTION 'Invalid notification preference: Must be matching_only or all_jobs.'
            USING ERRCODE = '22023';
    END IF;

    v_clean_availability := LOWER(TRIM(COALESCE(p_availability, 'available')));
    IF v_clean_availability NOT IN ('available', 'busy', 'offline') THEN
        v_clean_availability := 'available';
    END IF;

    -- 5. Inspect existing professional_profiles row & prevent duplicate applications
    SELECT status INTO v_existing_status
    FROM public.professional_profiles
    WHERE profile_id = v_user_id;

    IF NOT FOUND THEN
        INSERT INTO public.professional_profiles (
            profile_id,
            father_name,
            cnic,
            residential_address,
            bio,
            years_experience,
            availability,
            notification_preference,
            status,
            verified,
            applied_at,
            updated_at
        ) VALUES (
            v_user_id,
            v_clean_father_name,
            v_clean_cnic,
            v_clean_address,
            v_clean_bio,
            p_years,
            v_clean_availability,
            v_clean_pref,
            'pending',
            false,
            now(),
            now()
        );
    ELSIF v_existing_status = 'rejected' THEN
        UPDATE public.professional_profiles
        SET father_name = v_clean_father_name,
            cnic = v_clean_cnic,
            residential_address = v_clean_address,
            bio = v_clean_bio,
            years_experience = p_years,
            availability = v_clean_availability,
            notification_preference = v_clean_pref,
            status = 'pending',
            verified = false,
            applied_at = now(),
            reviewed_at = NULL,
            reviewed_by = NULL,
            review_note = NULL,
            updated_at = now()
        WHERE profile_id = v_user_id;
    ELSE
        RAISE EXCEPTION 'Cannot apply: You already have an active professional profile with status ''%''.', v_existing_status
            USING ERRCODE = '22023';
    END IF;

    -- 6. Update full_name and primary area on public.profiles
    UPDATE public.profiles
    SET full_name = v_clean_full_name,
        area_id = COALESCE(area_id, p_area_ids[1]),
        updated_at = now()
    WHERE id = v_user_id;

    -- 7. Replace professional skills atomically (with skill_tags)
    DELETE FROM public.professional_skills
    WHERE professional_id = v_user_id;

    INSERT INTO public.professional_skills (professional_id, category_id, skill_tags)
    SELECT DISTINCT v_user_id, unnest(p_category_ids), v_clean_skills;

    -- 8. Replace professional service areas atomically
    DELETE FROM public.professional_areas
    WHERE professional_id = v_user_id;

    INSERT INTO public.professional_areas (professional_id, area_id)
    SELECT DISTINCT v_user_id, unnest(p_area_ids);

    -- 9. Upsert private contact phone
    INSERT INTO public.contact_details (profile_id, phone)
    VALUES (v_user_id, v_clean_phone)
    ON CONFLICT (profile_id) DO UPDATE
    SET phone = EXCLUDED.phone;

END;
$$;

COMMENT ON FUNCTION public.submit_professional_application(text, text, text, text, text, text, int, bigint[], text[], bigint[], text, text) IS 'Atomic RPC for multi-step professional registration and application submission.';

REVOKE EXECUTE ON FUNCTION public.submit_professional_application(text, text, text, text, text, text, int, bigint[], text[], bigint[], text, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.submit_professional_application(text, text, text, text, text, text, int, bigint[], text[], bigint[], text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_professional_application(text, text, text, text, text, text, int, bigint[], text[], bigint[], text, text) TO authenticated;
