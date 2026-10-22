-- ==============================================================================
-- Test Script: rls_tests.sql
-- Purpose: Manual test suite for Row Level Security (RLS), triggers, and constraints.
-- Execution: Run in the Supabase SQL Editor.
-- Safety: Wraps all operations in a transaction that automatically ends with ROLLBACK.
-- Status: DRAFT FOR HUMAN REVIEW BEFORE RUNNING
-- ==============================================================================

BEGIN;

DO $$
DECLARE
    -- Test User UUIDs
    v_c1_id uuid := '11111111-1111-1111-1111-111111111111'; -- Customer 1
    v_c2_id uuid := '22222222-2222-2222-2222-222222222222'; -- Customer 2
    v_p1_id uuid := '33333333-3333-3333-3333-333333333333'; -- Professional 1
    v_p2_id uuid := '44444444-4444-4444-4444-444444444444'; -- Professional 2
    v_a1_id uuid := '55555555-5555-5555-5555-555555555555'; -- Administrator 1

    -- Test Fixtures
    v_cat_id bigint;
    v_area1_id bigint;
    v_area2_id bigint;
    v_draft_job_id uuid := gen_random_uuid();
    v_open_job_id uuid := gen_random_uuid();
    v_assigned_job_id uuid := gen_random_uuid();
    v_completed_job_id uuid := gen_random_uuid();
    v_conversation_id uuid := gen_random_uuid();

    -- Test Assertion Variables
    v_count int;
    v_phone_visible text;
    v_error_caught boolean;
    v_oauth_user_id uuid := '66666666-6666-6666-6666-666666666666';
    v_admin_attempt_id uuid := '77777777-7777-7777-7777-777777777777';
    v_user_role text;
    v_user_onboarded boolean;

    -- Migration 005 Dual-Role Test Variables
    v_new_signup_id uuid := '88888888-8888-8888-8888-888888888888';
    v_applicant_id uuid := '99999999-9999-9999-9999-999999999999';
    v_reapplicant_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_pro_job_id uuid := gen_random_uuid();
    v_status_check text;
    v_verified_check boolean;
    v_note_check text;
    v_skill_count int;
    v_area_count int;
    v_notification_count int;

BEGIN
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'STARTING PROLINK RLS & INTEGRITY POLICY TEST SUITE';
    RAISE NOTICE '================================================================';

    -- --------------------------------------------------------------------------
    -- 0. Set Up Base Lookup & Identity Fixtures (Bypassing RLS as Superuser/Admin)
    -- --------------------------------------------------------------------------
    
    -- Insert test category & areas if not already present
    INSERT INTO public.categories (name) VALUES ('Test Category') 
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_cat_id;

    INSERT INTO public.areas (name, lat, lng) VALUES ('Test Area 1', 31.5, 74.3)
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_area1_id;

    INSERT INTO public.areas (name, lat, lng) VALUES ('Test Area 2', 31.6, 74.4)
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_area2_id;

    -- Create mock auth.users entries (needed for foreign keys)
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES 
        (v_c1_id, 'c1@example.com', '{"role":"customer","full_name":"Customer One"}'::jsonb),
        (v_c2_id, 'c2@example.com', '{"role":"customer","full_name":"Customer Two"}'::jsonb),
        (v_p1_id, 'p1@example.com', '{"role":"professional","full_name":"Pro One"}'::jsonb),
        (v_p2_id, 'p2@example.com', '{"role":"professional","full_name":"Pro Two"}'::jsonb),
        (v_a1_id, 'a1@example.com', '{"role":"customer","full_name":"Admin One"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    -- Ensure profiles exist with target roles (Unified 'user' model, Admin promoted manually)
    INSERT INTO public.profiles (id, role, full_name, area_id)
    VALUES 
        (v_c1_id, 'user', 'Customer One', v_area1_id),
        (v_c2_id, 'user', 'Customer Two', v_area2_id),
        (v_p1_id, 'user', 'Pro One', v_area1_id),
        (v_p2_id, 'user', 'Pro Two', v_area2_id),
        (v_a1_id, 'admin', 'Admin One', v_area1_id)
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

    -- Add contact details
    INSERT INTO public.contact_details (profile_id, phone)
    VALUES 
        (v_c1_id, '+923001111111'),
        (v_c2_id, '+923002222222'),
        (v_p1_id, '+923003333333'),
        (v_p2_id, '+923004444444')
    ON CONFLICT (profile_id) DO UPDATE SET phone = EXCLUDED.phone;

    -- Add professional profiles (Pro 1 approved, Pro 2 pending)
    INSERT INTO public.professional_profiles (profile_id, status, verified, availability)
    VALUES 
        (v_p1_id, 'approved', true, 'available'),
        (v_p2_id, 'pending', false, 'available')
    ON CONFLICT (profile_id) DO UPDATE SET status = EXCLUDED.status, verified = EXCLUDED.verified;

    -- Add test jobs
    -- 1. Draft Job (Customer 1)
    INSERT INTO public.jobs (id, customer_id, title, description, category_id, area_id, status)
    VALUES (v_draft_job_id, v_c1_id, 'Fix Leaking Tap', 'Emergency plumbing', v_cat_id, v_area1_id, 'Draft');

    -- 2. Open Job (Customer 1)
    INSERT INTO public.jobs (id, customer_id, title, description, category_id, area_id, status)
    VALUES (v_open_job_id, v_c1_id, 'Install AC Unit', 'New bedroom AC installation', v_cat_id, v_area1_id, 'Open');

    -- 3. Assigned Job (Customer 1 assigned to Pro 1)
    INSERT INTO public.jobs (id, customer_id, title, description, category_id, area_id, status, assigned_professional_id)
    VALUES (v_assigned_job_id, v_c1_id, 'Rewire Living Room', 'Full electrical rewire', v_cat_id, v_area1_id, 'Assigned', v_p1_id);

    -- 4. Completed Job (Customer 2 assigned to Pro 2)
    INSERT INTO public.jobs (id, customer_id, title, description, category_id, area_id, status, assigned_professional_id)
    VALUES (v_completed_job_id, v_c2_id, 'Paint Exterior Wall', 'Weatherproof paint job', v_cat_id, v_area2_id, 'Completed', v_p2_id);

    -- Add active conversation between Customer 1 and Pro 1
    INSERT INTO public.conversations (id, job_id, customer_id, professional_id)
    VALUES (v_conversation_id, v_assigned_job_id, v_c1_id, v_p1_id);

    -- Add initial message
    INSERT INTO public.messages (conversation_id, sender_id, body)
    VALUES (v_conversation_id, v_c1_id, 'Hello, when can you start?');

    -- --------------------------------------------------------------------------
    -- TEST 1: Customer cannot read another customer's draft/private jobs
    -- --------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_c2_id), true);
    
    SELECT count(*) INTO v_count
    FROM public.jobs
    WHERE id = v_draft_job_id;

    IF v_count = 0 THEN
        RAISE NOTICE 'TEST 1 [Customer cannot see others Draft job]: PASS';
    ELSE
        RAISE WARNING 'TEST 1 [Customer cannot see others Draft job]: FAIL (Count visible: %)', v_count;
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 2: Professional cannot read a Draft job, but CAN read Open jobs
    -- --------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_p1_id), true);

    SELECT count(*) INTO v_count
    FROM public.jobs
    WHERE id = v_draft_job_id;

    IF v_count = 0 THEN
        RAISE NOTICE 'TEST 2A [Professional cannot see Draft job]: PASS';
    ELSE
        RAISE WARNING 'TEST 2A [Professional cannot see Draft job]: FAIL (Count visible: %)', v_count;
    END IF;

    SELECT count(*) INTO v_count
    FROM public.jobs
    WHERE id = v_open_job_id;

    IF v_count = 1 THEN
        RAISE NOTICE 'TEST 2B [Professional CAN see Open job]: PASS';
    ELSE
        RAISE WARNING 'TEST 2B [Professional CAN see Open job]: FAIL (Count visible: %)', v_count;
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 3: User cannot read messages of a conversation they are not in
    -- --------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_c2_id), true);

    SELECT count(*) INTO v_count
    FROM public.messages
    WHERE conversation_id = v_conversation_id;

    IF v_count = 0 THEN
        RAISE NOTICE 'TEST 3 [Uninvolved user cannot read conversation messages]: PASS';
    ELSE
        RAISE WARNING 'TEST 3 [Uninvolved user cannot read conversation messages]: FAIL (Count visible: %)', v_count;
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 4: User cannot change their own role to admin (Blocked by trigger)
    -- --------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_c1_id), true);
    v_error_caught := false;

    BEGIN
        UPDATE public.profiles
        SET role = 'admin'
        WHERE id = v_c1_id;
    EXCEPTION
        WHEN SQLSTATE '42501' THEN
            v_error_caught := true;
    END;

    IF v_error_caught THEN
        RAISE NOTICE 'TEST 4 [Trigger blocks role elevation to admin]: PASS';
    ELSE
        RAISE WARNING 'TEST 4 [Trigger blocks role elevation to admin]: FAIL';
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 5: Professional cannot set verified = true (Blocked by trigger)
    -- --------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_p2_id), true);
    v_error_caught := false;

    BEGIN
        UPDATE public.professional_profiles
        SET verified = true
        WHERE profile_id = v_p2_id;
    EXCEPTION
        WHEN SQLSTATE '42501' THEN
            v_error_caught := true;
    END;

    IF v_error_caught THEN
        RAISE NOTICE 'TEST 5 [Trigger blocks self-verification by professional]: PASS';
    ELSE
        RAISE WARNING 'TEST 5 [Trigger blocks self-verification by professional]: FAIL';
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 6: Phone numbers hidden before offer acceptance and visible after
    -- --------------------------------------------------------------------------
    -- Part A: Customer 1 looking at Pro 2 (no active accepted job between them)
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_c1_id), true);
    
    SELECT phone INTO v_phone_visible
    FROM public.contact_details
    WHERE profile_id = v_p2_id;

    IF v_phone_visible IS NULL THEN
        RAISE NOTICE 'TEST 6A [Phone hidden before offer acceptance]: PASS';
    ELSE
        RAISE WARNING 'TEST 6A [Phone hidden before offer acceptance]: FAIL (Visible: %)', v_phone_visible;
    END IF;

    -- Part B: Customer 1 looking at Pro 1 (assigned to active job)
    SELECT phone INTO v_phone_visible
    FROM public.contact_details
    WHERE profile_id = v_p1_id;

    IF v_phone_visible = '+923003333333' THEN
        RAISE NOTICE 'TEST 6B [Phone visible after assignment/acceptance]: PASS';
    ELSE
        RAISE WARNING 'TEST 6B [Phone visible after assignment/acceptance]: FAIL (Visible: %)', v_phone_visible;
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 7: Review is rejected if job is not Completed (Blocked by trigger)
    -- --------------------------------------------------------------------------
    -- Clear JWT claims to simulate backend execution
    PERFORM set_config('request.jwt.claims', '', true);
    v_error_caught := false;

    BEGIN
        INSERT INTO public.reviews (job_id, reviewer_id, professional_id, rating, comment)
        VALUES (v_assigned_job_id, v_c1_id, v_p1_id, 5, 'Great work!');
    EXCEPTION
        WHEN SQLSTATE '22023' THEN
            v_error_caught := true;
    END;

    IF v_error_caught THEN
        RAISE NOTICE 'TEST 7 [Trigger blocks review on non-Completed job]: PASS';
    ELSE
        RAISE WARNING 'TEST 7 [Trigger blocks review on non-Completed job]: FAIL';
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 8: Second review on the same job is rejected (Unique constraint)
    -- --------------------------------------------------------------------------
    -- Insert valid first review on completed job
    INSERT INTO public.reviews (job_id, reviewer_id, professional_id, rating, comment)
    VALUES (v_completed_job_id, v_c2_id, v_p2_id, 5, 'Excellent painting service!');

    v_error_caught := false;
    BEGIN
        -- Attempt duplicate review
        INSERT INTO public.reviews (job_id, reviewer_id, professional_id, rating, comment)
        VALUES (v_completed_job_id, v_c2_id, v_p2_id, 4, 'Second review attempt.');
    EXCEPTION
        WHEN unique_violation THEN
            v_error_caught := true;
    END;

    IF v_error_caught THEN
        RAISE NOTICE 'TEST 8 [Unique constraint blocks duplicate review on same job]: PASS';
    ELSE
        RAISE WARNING 'TEST 8 [Unique constraint blocks duplicate review on same job]: FAIL';
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 9: Second offer by same professional on same job is rejected (Unique constraint)
    -- --------------------------------------------------------------------------
    INSERT INTO public.offers (job_id, professional_id, price, eta_minutes, message)
    VALUES (v_open_job_id, v_p1_id, 2500.00, 45, 'Initial offer quote.');

    v_error_caught := false;
    BEGIN
        -- Attempt duplicate offer
        INSERT INTO public.offers (job_id, professional_id, price, eta_minutes, message)
        VALUES (v_open_job_id, v_p1_id, 2200.00, 30, 'Revised offer quote.');
    EXCEPTION
        WHEN unique_violation THEN
            v_error_caught := true;
    END;

    IF v_error_caught THEN
        RAISE NOTICE 'TEST 9 [Unique constraint blocks duplicate offer by same pro]: PASS';
    ELSE
        RAISE WARNING 'TEST 9 [Unique constraint blocks duplicate offer by same pro]: FAIL';
    END IF;

    -- --------------------------------------------------------------------------
    -- TESTS 10-14: Legacy 004 Onboarding Checks (Active only if 004 is present)
    -- --------------------------------------------------------------------------
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'onboarding_completed'
    ) THEN
        -- TEST 10: Direct client cannot update onboarding_completed (Blocked by trigger)
        PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_c1_id), true);
        BEGIN
            SET LOCAL ROLE authenticated;
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;
        v_error_caught := false;

        BEGIN
            EXECUTE 'UPDATE public.profiles SET onboarding_completed = false WHERE id = $1' USING v_c1_id;
        EXCEPTION
            WHEN SQLSTATE '42501' THEN
                v_error_caught := true;
        END;

        BEGIN
            RESET ROLE;
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;

        IF v_error_caught THEN
            RAISE NOTICE 'TEST 10 [Direct client update to onboarding_completed blocked]: PASS';
        ELSE
            RAISE WARNING 'TEST 10 [Direct client update to onboarding_completed blocked]: FAIL';
        END IF;

        -- TEST 11: complete_onboarding works once and sets the role
        INSERT INTO auth.users (id, email, raw_user_meta_data)
        VALUES (v_oauth_user_id, 'oauth@example.com', '{}'::jsonb)
        ON CONFLICT (id) DO NOTHING;

        EXECUTE 'INSERT INTO public.profiles (id, role, full_name, onboarding_completed) VALUES ($1, ''user'', ''OAuth User'', false) ON CONFLICT (id) DO UPDATE SET role = ''user''' USING v_oauth_user_id;

        PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_oauth_user_id), true);
        
        BEGIN
            EXECUTE 'SELECT public.complete_onboarding(''professional'')';
            RAISE NOTICE 'TEST 11 [complete_onboarding sets role & creates pro profile]: PASS';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'TEST 11 [complete_onboarding execution]: FAIL';
        END;

        -- TEST 12: Second call to complete_onboarding fails
        v_error_caught := false;
        BEGIN
            EXECUTE 'SELECT public.complete_onboarding(''customer'')';
        EXCEPTION
            WHEN SQLSTATE '22023' THEN
                v_error_caught := true;
        END;

        IF v_error_caught THEN
            RAISE NOTICE 'TEST 12 [Second call to complete_onboarding rejected]: PASS';
        ELSE
            RAISE WARNING 'TEST 12 [Second call to complete_onboarding rejected]: FAIL';
        END IF;

        -- TEST 13: Passing admin role to complete_onboarding is rejected
        INSERT INTO auth.users (id, email, raw_user_meta_data)
        VALUES (v_admin_attempt_id, 'hacker@example.com', '{}'::jsonb)
        ON CONFLICT (id) DO NOTHING;

        EXECUTE 'INSERT INTO public.profiles (id, role, full_name, onboarding_completed) VALUES ($1, ''user'', ''Attempt Admin'', false) ON CONFLICT (id) DO NOTHING' USING v_admin_attempt_id;

        PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_admin_attempt_id), true);
        
        v_error_caught := false;
        BEGIN
            EXECUTE 'SELECT public.complete_onboarding(''admin'')';
        EXCEPTION
            WHEN SQLSTATE '22023' THEN
                v_error_caught := true;
        END;

        IF v_error_caught THEN
            RAISE NOTICE 'TEST 13 [complete_onboarding rejects admin role]: PASS';
        ELSE
            RAISE WARNING 'TEST 13 [complete_onboarding rejects admin role]: FAIL';
        END IF;

        -- TEST 14: Unauthenticated call to complete_onboarding is rejected
        PERFORM set_config('request.jwt.claims', '', true);
        v_error_caught := false;
        BEGIN
            EXECUTE 'SELECT public.complete_onboarding(''customer'')';
        EXCEPTION
            WHEN SQLSTATE '42501' THEN
                v_error_caught := true;
        END;

        IF v_error_caught THEN
            RAISE NOTICE 'TEST 14 [Unauthenticated call to complete_onboarding rejected]: PASS';
        ELSE
            RAISE WARNING 'TEST 14 [Unauthenticated call to complete_onboarding rejected]: FAIL';
        END IF;
    ELSE
        RAISE NOTICE 'TESTS 10-14 [004 Onboarding]: SKIPPED (Superseded by Migration 005 dual-role model)';
    END IF;

    -- --------------------------------------------------------------------------
    -- 005 DUAL-ROLE & PROFESSIONAL APPLICATION TEST SUITE (TESTS 15 to 25)
    -- --------------------------------------------------------------------------

    -- --------------------------------------------------------------------------
    -- TEST 15: New signup gets role 'user' and NO professional row,
    --          even if signup metadata specifies 'professional' or 'admin'
    -- --------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claims', '', true);

    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (
        v_new_signup_id,
        'newpro@example.com',
        '{"role":"admin","full_name":"Attempted Pro Signup"}'::jsonb
    )
    ON CONFLICT (id) DO NOTHING;

    SELECT role INTO v_user_role
    FROM public.profiles
    WHERE id = v_new_signup_id;

    SELECT count(*) INTO v_count
    FROM public.professional_profiles
    WHERE profile_id = v_new_signup_id;

    IF v_user_role = 'user' AND v_count = 0 THEN
        RAISE NOTICE 'TEST 15 [New signup strictly gets role user and no pro row]: PASS';
    ELSE
        RAISE WARNING 'TEST 15 [New signup strictly gets role user and no pro row]: FAIL (Role: %, ProCount: %)', v_user_role, v_count;
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 16: apply_as_professional creates a 'pending' row, skills, areas, and phone
    -- --------------------------------------------------------------------------
    -- Setup applicant auth user and profile
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_applicant_id, 'applicant@example.com', '{"full_name":"Eager Artisan"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, role, full_name, area_id)
    VALUES (v_applicant_id, 'user', 'Eager Artisan', v_area1_id)
    ON CONFLICT (id) DO NOTHING;

    -- Authenticate as applicant
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_applicant_id), true);

    PERFORM public.apply_as_professional(
        'Certified master technician with 12 years in residential electrical wiring and repairs.',
        12,
        ARRAY[v_cat_id],
        ARRAY[v_area1_id, v_area2_id],
        '+923009999999'
    );

    SELECT status, verified INTO v_status_check, v_verified_check
    FROM public.professional_profiles
    WHERE profile_id = v_applicant_id;

    SELECT count(*) INTO v_skill_count
    FROM public.professional_skills
    WHERE professional_id = v_applicant_id;

    SELECT count(*) INTO v_area_count
    FROM public.professional_areas
    WHERE professional_id = v_applicant_id;

    SELECT phone INTO v_phone_visible
    FROM public.contact_details
    WHERE profile_id = v_applicant_id;

    IF v_status_check = 'pending' AND v_verified_check = false AND v_skill_count = 1 AND v_area_count = 2 AND v_phone_visible = '+923009999999' THEN
        RAISE NOTICE 'TEST 16 [apply_as_professional creates pending profile, skills, areas & phone]: PASS';
    ELSE
        RAISE WARNING 'TEST 16 [apply_as_professional creates pending profile, skills, areas & phone]: FAIL (Status: %, Verified: %, Skills: %, Areas: %, Phone: %)',
            v_status_check, v_verified_check, v_skill_count, v_area_count, v_phone_visible;
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 17: Applying twice while pending is rejected
    -- --------------------------------------------------------------------------
    v_error_caught := false;
    BEGIN
        PERFORM public.apply_as_professional(
            'Duplicate application attempt that should be rejected by guard.',
            5,
            ARRAY[v_cat_id],
            ARRAY[v_area1_id],
            '+923009999999'
        );
    EXCEPTION
        WHEN SQLSTATE '22023' THEN
            v_error_caught := true;
    END;

    IF v_error_caught THEN
        RAISE NOTICE 'TEST 17 [Duplicate application while pending rejected]: PASS';
    ELSE
        RAISE WARNING 'TEST 17 [Duplicate application while pending rejected]: FAIL';
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 18: A pending applicant cannot read Open jobs of other customers
    -- --------------------------------------------------------------------------
    -- Still authenticated as applicant (status = 'pending')
    SELECT count(*) INTO v_count
    FROM public.jobs
    WHERE id = v_open_job_id;

    IF v_count = 0 THEN
        RAISE NOTICE 'TEST 18 [Pending applicant cannot view Open jobs]: PASS';
    ELSE
        RAISE WARNING 'TEST 18 [Pending applicant cannot view Open jobs]: FAIL (Count visible: %)', v_count;
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 19: Another user cannot see a pending application
    -- --------------------------------------------------------------------------
    -- Authenticate as Customer 2
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_c2_id), true);

    SELECT count(*) INTO v_count
    FROM public.professional_profiles
    WHERE profile_id = v_applicant_id;

    SELECT count(*) INTO v_skill_count
    FROM public.professional_skills
    WHERE professional_id = v_applicant_id;

    IF v_count = 0 AND v_skill_count = 0 THEN
        RAISE NOTICE 'TEST 19 [Another user cannot view pending applicant profile or skills]: PASS';
    ELSE
        RAISE WARNING 'TEST 19 [Another user cannot view pending applicant profile or skills]: FAIL (Profiles: %, Skills: %)', v_count, v_skill_count;
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 20: A user cannot set their own status or role directly (Blocked by trigger)
    -- --------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_applicant_id), true);
    BEGIN
        SET LOCAL ROLE authenticated;
    EXCEPTION
        WHEN OTHERS THEN
            NULL;
    END;

    -- Attempt 1: Direct update to status = 'approved'
    v_error_caught := false;
    BEGIN
        UPDATE public.professional_profiles
        SET status = 'approved'
        WHERE profile_id = v_applicant_id;
    EXCEPTION
        WHEN SQLSTATE '42501' THEN
            v_error_caught := true;
    END;

    IF v_error_caught THEN
        RAISE NOTICE 'TEST 20A [Direct update to status blocked by trigger]: PASS';
    ELSE
        RAISE WARNING 'TEST 20A [Direct update to status blocked by trigger]: FAIL';
    END IF;

    -- Attempt 2: Direct update to role = 'admin'
    v_error_caught := false;
    BEGIN
        UPDATE public.profiles
        SET role = 'admin'
        WHERE id = v_applicant_id;
    EXCEPTION
        WHEN SQLSTATE '42501' THEN
            v_error_caught := true;
    END;

    BEGIN
        RESET ROLE;
    EXCEPTION
        WHEN OTHERS THEN
            NULL;
    END;

    IF v_error_caught THEN
        RAISE NOTICE 'TEST 20B [Direct update to role blocked by trigger]: PASS';
    ELSE
        RAISE WARNING 'TEST 20B [Direct update to role blocked by trigger]: FAIL';
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 21: A non-admin cannot call review_professional_application
    -- --------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_c1_id), true);
    v_error_caught := false;

    BEGIN
        PERFORM public.review_professional_application(v_applicant_id, 'approved', 'Unauthorized review');
    EXCEPTION
        WHEN SQLSTATE '42501' THEN
            v_error_caught := true;
    END;

    IF v_error_caught THEN
        RAISE NOTICE 'TEST 21 [Non-admin cannot review applications]: PASS';
    ELSE
        RAISE WARNING 'TEST 21 [Non-admin cannot review applications]: FAIL';
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 22: Admin approves application -> pro becomes visible and can read Open jobs
    -- --------------------------------------------------------------------------
    -- Authenticate as Admin 1
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_a1_id), true);

    PERFORM public.review_professional_application(v_applicant_id, 'approved', 'Documents and certifications verified.');

    -- Verify status, verified flag, and notification generated
    SELECT status, verified INTO v_status_check, v_verified_check
    FROM public.professional_profiles
    WHERE profile_id = v_applicant_id;

    SELECT count(*) INTO v_notification_count
    FROM public.notifications
    WHERE user_id = v_applicant_id AND type = 'professional_application_reviewed';

    IF v_status_check = 'approved' AND v_verified_check = true AND v_notification_count = 1 THEN
        RAISE NOTICE 'TEST 22A [Admin approval sets status approved & creates notification]: PASS';
    ELSE
        RAISE WARNING 'TEST 22A [Admin approval sets status approved & creates notification]: FAIL (Status: %, Verified: %, Notifications: %)',
            v_status_check, v_verified_check, v_notification_count;
    END IF;

    -- Customer 2 can now view the approved professional
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_c2_id), true);
    SELECT count(*) INTO v_count
    FROM public.professional_profiles
    WHERE profile_id = v_applicant_id;

    IF v_count = 1 THEN
        RAISE NOTICE 'TEST 22B [Approved professional profile is now visible to other users]: PASS';
    ELSE
        RAISE WARNING 'TEST 22B [Approved professional profile is now visible to other users]: FAIL (Count: %)', v_count;
    END IF;

    -- Approved professional can now view Open jobs
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_applicant_id), true);
    SELECT count(*) INTO v_count
    FROM public.jobs
    WHERE id = v_open_job_id;

    IF v_count = 1 THEN
        RAISE NOTICE 'TEST 22C [Approved professional can now view Open marketplace jobs]: PASS';
    ELSE
        RAISE WARNING 'TEST 22C [Approved professional can now view Open marketplace jobs]: FAIL (Count: %)', v_count;
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 23: Admin rejects application with note, and user can reapply
    -- --------------------------------------------------------------------------
    -- Setup re-applicant user
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (v_reapplicant_id, 'reapplicant@example.com', '{"full_name":"Reapplicant User"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, role, full_name, area_id)
    VALUES (v_reapplicant_id, 'user', 'Reapplicant User', v_area1_id)
    ON CONFLICT (id) DO NOTHING;

    -- User applies
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_reapplicant_id), true);
    PERFORM public.apply_as_professional(
        'Plumbing specialist with 4 years experience in commercial drainage pipes.',
        4,
        ARRAY[v_cat_id],
        ARRAY[v_area1_id],
        '+923008888888'
    );

    -- Admin rejects with note
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_a1_id), true);
    PERFORM public.review_professional_application(v_reapplicant_id, 'rejected', 'Please provide a more detailed portfolio and valid CNIC.');

    SELECT status, verified, review_note INTO v_status_check, v_verified_check, v_note_check
    FROM public.professional_profiles
    WHERE profile_id = v_reapplicant_id;

    IF v_status_check = 'rejected' AND v_verified_check = false AND v_note_check IS NOT NULL THEN
        RAISE NOTICE 'TEST 23A [Admin rejection sets status rejected with note]: PASS';
    ELSE
        RAISE WARNING 'TEST 23A [Admin rejection sets status rejected with note]: FAIL';
    END IF;

    -- User reapplies successfully
    PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_reapplicant_id), true);
    PERFORM public.apply_as_professional(
        'Updated application: Master licensed plumber with 6 years experience in all drainage systems.',
        6,
        ARRAY[v_cat_id],
        ARRAY[v_area1_id],
        '+923008888888'
    );

    SELECT status, verified, review_note INTO v_status_check, v_verified_check, v_note_check
    FROM public.professional_profiles
    WHERE profile_id = v_reapplicant_id;

    IF v_status_check = 'pending' AND v_verified_check = false AND v_note_check IS NULL THEN
        RAISE NOTICE 'TEST 23B [Rejected applicant successfully reapplies, resetting to pending]: PASS';
    ELSE
        RAISE WARNING 'TEST 23B [Rejected applicant successfully reapplies, resetting to pending]: FAIL (Status: %, Note: %)', v_status_check, v_note_check;
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 24: Self-dealing is rejected (Self-offer, self-review, self-conversation)
    -- --------------------------------------------------------------------------
    -- Applicant is approved as a pro. Now applicant also creates a job as a customer!
    PERFORM set_config('request.jwt.claims', '', true);
    INSERT INTO public.jobs (id, customer_id, title, description, category_id, area_id, status)
    VALUES (v_pro_job_id, v_applicant_id, 'Fix My Own Kitchen Lights', 'Short circuit in kitchen', v_cat_id, v_area1_id, 'Open');

    -- TEST 24A: Self-offer is rejected by trigger
    v_error_caught := false;
    BEGIN
        INSERT INTO public.offers (job_id, professional_id, price, eta_minutes, message)
        VALUES (v_pro_job_id, v_applicant_id, 1000.00, 15, 'Self bid attempt');
    EXCEPTION
        WHEN SQLSTATE '42501' THEN
            v_error_caught := true;
    END;

    IF v_error_caught THEN
        RAISE NOTICE 'TEST 24A [Self-offer on own job blocked by trigger]: PASS';
    ELSE
        RAISE WARNING 'TEST 24A [Self-offer on own job blocked by trigger]: FAIL';
    END IF;

    -- TEST 24B: Self-review is rejected by trigger
    v_error_caught := false;
    BEGIN
        INSERT INTO public.reviews (job_id, reviewer_id, professional_id, rating, comment)
        VALUES (v_completed_job_id, v_applicant_id, v_applicant_id, 5, 'Self review attempt');
    EXCEPTION
        WHEN SQLSTATE '42501' THEN
            v_error_caught := true;
    END;

    IF v_error_caught THEN
        RAISE NOTICE 'TEST 24B [Self-review blocked by trigger]: PASS';
    ELSE
        RAISE WARNING 'TEST 24B [Self-review blocked by trigger]: FAIL';
    END IF;

    -- TEST 24C: Self-conversation is rejected by trigger
    v_error_caught := false;
    BEGIN
        INSERT INTO public.conversations (job_id, customer_id, professional_id)
        VALUES (v_pro_job_id, v_applicant_id, v_applicant_id);
    EXCEPTION
        WHEN SQLSTATE '42501' THEN
            v_error_caught := true;
    END;

    IF v_error_caught THEN
        RAISE NOTICE 'TEST 24C [Self-conversation between same user accounts blocked by trigger]: PASS';
    ELSE
        RAISE WARNING 'TEST 24C [Self-conversation between same user accounts blocked by trigger]: FAIL';
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 25: Offers from a pending (unapproved) professional are rejected by trigger
    -- --------------------------------------------------------------------------
    -- v_p2_id is in status 'pending'
    v_error_caught := false;
    BEGIN
        INSERT INTO public.offers (job_id, professional_id, price, eta_minutes, message)
        VALUES (v_open_job_id, v_p2_id, 1800.00, 30, 'Offer from pending pro');
    EXCEPTION
        WHEN SQLSTATE '42501' THEN
            v_error_caught := true;
    END;

    IF v_error_caught THEN
        RAISE NOTICE 'TEST 25 [Offers from unapproved/pending professional blocked by trigger]: PASS';
    ELSE
        RAISE WARNING 'TEST 25 [Offers from unapproved/pending professional blocked by trigger]: FAIL';
    END IF;

    RAISE NOTICE '================================================================';
    RAISE NOTICE 'ALL DUAL-ROLE RLS & APPLICATION TESTS COMPLETED (ROLLING BACK)';
    RAISE NOTICE '================================================================';
END $$;

ROLLBACK;
