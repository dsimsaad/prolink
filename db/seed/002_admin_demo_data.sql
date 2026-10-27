-- DEMO DATA FOR DEVELOPMENT ONLY
-- Purpose: Populate realistic administrative portal demo data across users, professional applications,
--          jobs (all 9 statuses over 30 days), offers, conversations, messages, reviews, disputed job notes,
--          moderation reports, and audit log entries.
-- Run order: Run after migrations 001 through 006 and seed 001_categories_areas.sql.
-- Removal: Run db/seed/999_remove_demo_data.sql to remove all records inserted by this script.
-- DRAFT FOR HUMAN REVIEW BEFORE RUNNING

BEGIN;

DO $$
DECLARE
    v_cat_ids bigint[];
    v_area_ids bigint[];
    v_num_cats int;
    v_num_areas int;
    v_admin_actor uuid;
    v_i int;
    v_user_id uuid;
    v_job_id uuid;
    v_pro_id uuid;
    v_cust_id uuid;
    v_conv_id uuid;
    v_status text;
    v_urgency text;
    v_created timestamptz;
    v_names text[] := ARRAY[
        'Demo Ahmed Khan',
        'Demo Bilal Tariq',
        'Demo Usman Raza',
        'Demo Kamran Siddiqui',
        'Demo Farhan Mahmood',
        'Demo Zainab Ali',
        'Demo Hassan Javed',
        'Demo Salman Akram',
        'Demo Nadeem Ashraf',
        'Demo Waqas Chaudry',
        'Demo Imran Qureshi',
        'Demo Kashif Iqbal',
        'Demo Tariq Mehmood',
        'Demo Asadullah Shah',
        'Demo Faisal Nawaz',
        'Demo Rizwan Haider',
        'DemoAyesha Noor',
        'Demo Sana Malik',
        'Demo Omar Farooq',
        'Demo Hina Bukhari',
        'Demo Daniyal Baig',
        'Demo Mariam Zahid',
        'Demo Saad Haroon',
        'Demo Nida Gilani'
    ];
    v_job_titles text[] := ARRAY[
        'Kitchen sink pipe replacement',
        'Main breaker panel inspection',
        'Living room wall repainting',
        'Custom wardrobe door hinge repair',
        'Split AC gas refill and service',
        'Boundary wall brick masonry repair',
        'Full apartment deep cleaning',
        'Washing machine drum bearing fix',
        'Bathroom geyser leak repair',
        'Ceiling fan capacitor and wiring fix',
        'Exterior facade weatherproof painting',
        'Wooden dining table restoration',
        'Inverter AC PCB fault troubleshooting',
        'Patio floor tile grouting and masonry',
        'Post-renovation house cleaning',
        'Refrigerator thermostat replacement',
        'Underground water tank valve replacement',
        'UPS changeover switch installation',
        'Bedroom accent wall texture paint',
        'Main entrance wooden door lock fitting',
        'Dual split AC seasonal maintenance',
        'Garage driveway concrete patching',
        'Sofa and carpet steam cleaning',
        'Microwave oven magnetron replacement',
        'Roof water tank overflow pipe fix',
        'Three-phase distribution board wiring',
        'Office hallway emulsion painting',
        'Kitchen cabinet sliding drawer repair',
        'Bedroom AC indoor unit water leakage',
        'Garden retaining wall brickwork',
        'Move-out villa deep sanitation',
        'Dishwasher drain pump repair',
        'Concealed shower mixer replacement',
        'Generator automatic transfer switch fix',
        'Staircase railing enamel painting',
        'Study desk custom shelving build',
        'Commercial cassette AC compressor check',
        'Balcony parapet plaster repair',
        'Water dispenser cooling unit repair',
        'Whole-house earthing and surge protection'
    ];
BEGIN
    -- Fix accidental missing space in name 17
    v_names[17] := 'Demo Ayesha Noor';

    SELECT array_agg(id ORDER BY id) INTO v_cat_ids FROM public.categories WHERE is_active = true;
    SELECT array_agg(id ORDER BY id) INTO v_area_ids FROM public.areas;

    v_num_cats := COALESCE(cardinality(v_cat_ids), 0);
    v_num_areas := COALESCE(cardinality(v_area_ids), 0);

    IF v_num_cats = 0 OR v_num_areas = 0 THEN
        RAISE EXCEPTION 'Seed prerequisite missing: Run db/seed/001_categories_areas.sql before running 002_admin_demo_data.sql.';
    END IF;

    -- 1. Insert 24 fake demo users into auth.users with @example.invalid emails and no password.
    -- The on_auth_user_created trigger automatically provisions public.profiles rows.
    -- Note: If auth.users inserts are restricted in a custom environment, the explicit public.profiles
    -- upsert below ensures profile rows still exist when foreign keys allow.
    FOR v_i IN 1..24 LOOP
        v_user_id := ('d0000000-0000-4000-8000-' || lpad(v_i::text, 12, '0'))::uuid;

        INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
        VALUES (
            v_user_id,
            'demo.user' || lpad(v_i::text, 2, '0') || '@example.invalid',
            jsonb_build_object('full_name', v_names[v_i]),
            now() - ((30 - (v_i % 25)) || ' days')::interval,
            now() - ((30 - (v_i % 25)) || ' days')::interval
        )
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.profiles (id, role, full_name, area_id, created_at, updated_at)
        VALUES (
            v_user_id,
            'user',
            v_names[v_i],
            v_area_ids[((v_i - 1) % v_num_areas) + 1],
            now() - ((30 - (v_i % 25)) || ' days')::interval,
            now() - ((30 - (v_i % 25)) || ' days')::interval
        )
        ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            area_id = EXCLUDED.area_id,
            created_at = EXCLUDED.created_at;

        INSERT INTO public.contact_details (profile_id, phone)
        VALUES (
            v_user_id,
            '+92300' || lpad((1000000 + v_i)::text, 7, '0')
        )
        ON CONFLICT (profile_id) DO UPDATE SET phone = EXCLUDED.phone;
    END LOOP;

    -- Choose an existing admin for audit attribution, falling back to demo user 24 if no admin exists yet
    SELECT id INTO v_admin_actor
    FROM public.profiles
    WHERE role = 'admin'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_admin_actor IS NULL THEN
        v_admin_actor := 'd0000000-0000-4000-8000-000000000024'::uuid;
    END IF;

    -- 2. Professional applications:
    -- Users 1..12: approved professionals
    -- Users 13..15: pending applications
    -- User 16: rejected application
    FOR v_i IN 1..16 LOOP
        v_user_id := ('d0000000-0000-4000-8000-' || lpad(v_i::text, 12, '0'))::uuid;

        IF v_i <= 12 THEN
            v_status := 'approved';
        ELSIF v_i <= 15 THEN
            v_status := 'pending';
        ELSE
            v_status := 'rejected';
        END IF;

        INSERT INTO public.professional_profiles (
            profile_id,
            bio,
            years_experience,
            status,
            verified,
            availability,
            applied_at,
            reviewed_at,
            reviewed_by,
            review_note,
            response_rate,
            rating_count,
            rating_sum,
            avg_rating_bayes,
            updated_at
        )
        VALUES (
            v_user_id,
            'Demo skilled specialist #' || v_i || ' providing residential and commercial maintenance services with verified tools and safety training.',
            3 + (v_i % 12),
            v_status,
            (v_status = 'approved'),
            'available',
            now() - ((28 - v_i) || ' days')::interval,
            CASE WHEN v_status IN ('approved', 'rejected') THEN now() - ((26 - v_i) || ' days')::interval ELSE NULL END,
            CASE WHEN v_status IN ('approved', 'rejected') THEN v_admin_actor ELSE NULL END,
            CASE
                WHEN v_status = 'approved' THEN 'Demo application verified and approved.'
                WHEN v_status = 'rejected' THEN 'Please provide clearer trade experience details and valid certification numbers.'
                ELSE NULL
            END,
            92.5,
            0,
            0,
            NULL,
            now() - ((25 - v_i) || ' days')::interval
        )
        ON CONFLICT (profile_id) DO UPDATE
        SET bio = EXCLUDED.bio,
            years_experience = EXCLUDED.years_experience,
            status = EXCLUDED.status,
            verified = EXCLUDED.verified,
            applied_at = EXCLUDED.applied_at,
            reviewed_at = EXCLUDED.reviewed_at,
            review_note = EXCLUDED.review_note;

        DELETE FROM public.professional_skills WHERE professional_id = v_user_id;
        INSERT INTO public.professional_skills (professional_id, category_id, skill_tags)
        VALUES
            (v_user_id, v_cat_ids[((v_i - 1) % v_num_cats) + 1], ARRAY['repair', 'installation']),
            (v_user_id, v_cat_ids[(v_i % v_num_cats) + 1], ARRAY['maintenance', 'inspection'])
        ON CONFLICT (professional_id, category_id) DO NOTHING;

        DELETE FROM public.professional_areas WHERE professional_id = v_user_id;
        INSERT INTO public.professional_areas (professional_id, area_id)
        VALUES
            (v_user_id, v_area_ids[((v_i - 1) % v_num_areas) + 1]),
            (v_user_id, v_area_ids[(v_i % v_num_areas) + 1]),
            (v_user_id, v_area_ids[((v_i + 1) % v_num_areas) + 1])
        ON CONFLICT (professional_id, area_id) DO NOTHING;
    END LOOP;

    -- 3. Insert 40 jobs across all 9 statuses over the last 30 days:
    -- 1..3:   Disputed (3 jobs)
    -- 4..11:  Completed (8 jobs)
    -- 12..16: In progress (5 jobs)
    -- 17..21: Assigned (5 jobs)
    -- 22..27: Offers received (6 jobs)
    -- 28..33: Open (6 jobs)
    -- 34..36: Draft (3 jobs)
    -- 37..38: Cancelled (2 jobs)
    -- 39..40: Expired (2 jobs)
    FOR v_i IN 1..40 LOOP
        v_job_id := ('d1000000-0000-4000-8000-' || lpad(v_i::text, 12, '0'))::uuid;
        v_cust_id := ('d0000000-0000-4000-8000-' || lpad((17 + ((v_i - 1) % 8))::text, 12, '0'))::uuid;
        v_pro_id := ('d0000000-0000-4000-8000-' || lpad((((v_i - 1) % 12) + 1)::text, 12, '0'))::uuid;
        v_created := now() - (((v_i - 1) % 30) || ' days')::interval - ((v_i % 8) || ' hours')::interval;
        v_urgency := CASE WHEN v_i % 4 = 0 THEN 'urgent' ELSE 'normal' END;

        IF v_i <= 3 THEN
            v_status := 'Disputed';
        ELSIF v_i <= 11 THEN
            v_status := 'Completed';
        ELSIF v_i <= 16 THEN
            v_status := 'In progress';
        ELSIF v_i <= 21 THEN
            v_status := 'Assigned';
        ELSIF v_i <= 27 THEN
            v_status := 'Offers received';
            v_pro_id := NULL;
        ELSIF v_i <= 33 THEN
            v_status := 'Open';
            v_pro_id := NULL;
        ELSIF v_i <= 36 THEN
            v_status := 'Draft';
            v_pro_id := NULL;
        ELSIF v_i <= 38 THEN
            v_status := 'Cancelled';
            v_pro_id := NULL;
        ELSE
            v_status := 'Expired';
            v_pro_id := NULL;
        END IF;

        INSERT INTO public.jobs (
            id,
            customer_id,
            title,
            description,
            category_id,
            area_id,
            budget_min,
            budget_max,
            urgency,
            status,
            assigned_professional_id,
            created_at,
            updated_at,
            expires_at
        )
        VALUES (
            v_job_id,
            v_cust_id,
            v_job_titles[v_i],
            'Demo job #' || v_i || ': ' || v_job_titles[v_i] || '. Customer requested certified technician with tools and transparent quote.',
            v_cat_ids[((v_i - 1) % v_num_cats) + 1],
            v_area_ids[((v_i - 1) % v_num_areas) + 1],
            1500 + (v_i * 100),
            3500 + (v_i * 150),
            v_urgency,
            v_status,
            v_pro_id,
            v_created,
            v_created + interval '2 hours',
            v_created + interval '7 days'
        )
        ON CONFLICT (id) DO UPDATE
        SET status = EXCLUDED.status,
            assigned_professional_id = EXCLUDED.assigned_professional_id,
            title = EXCLUDED.title,
            description = EXCLUDED.description;

        -- Baseline job_events entry when posted
        IF v_status <> 'Draft' THEN
            INSERT INTO public.job_events (
                id,
                job_id,
                from_status,
                to_status,
                actor_id,
                note,
                at
            )
            VALUES (
                ('d2000000-0000-4000-8000-' || lpad(v_i::text, 12, '0'))::uuid,
                v_job_id,
                'Draft',
                'Open',
                v_cust_id,
                'Job published by customer.',
                v_created
            )
            ON CONFLICT (id) DO NOTHING;
        END IF;

        -- Add offers for jobs that reached Offers received, Assigned, In progress, Completed, or Disputed
        IF v_i <= 27 THEN
            INSERT INTO public.offers (
                id,
                job_id,
                professional_id,
                price,
                inspection_fee,
                eta_minutes,
                message,
                status,
                created_at,
                updated_at
            )
            VALUES (
                ('d3000000-0000-4000-8000-' || lpad(v_i::text, 12, '0'))::uuid,
                v_job_id,
                ('d0000000-0000-4000-8000-' || lpad((((v_i - 1) % 12) + 1)::text, 12, '0'))::uuid,
                2200 + (v_i * 120),
                300,
                30 + (v_i % 30),
                'Demo offer #' || v_i || ': Available today with complete toolkit and spare parts.',
                CASE WHEN v_i <= 21 THEN 'accepted' ELSE 'pending' END,
                v_created + interval '30 minutes',
                v_created + interval '45 minutes'
            )
            ON CONFLICT (job_id, professional_id) DO NOTHING;
        END IF;
    END LOOP;

    -- 4. Detailed job_events with notes for the 3 Disputed jobs (jobs 1, 2, 3)
    INSERT INTO public.job_events (id, job_id, from_status, to_status, actor_id, note, at)
    VALUES
        (
            'd2000000-0000-4000-8000-000000000101'::uuid,
            'd1000000-0000-4000-8000-000000000001'::uuid,
            'In progress',
            'Disputed',
            'd0000000-0000-4000-8000-000000000017'::uuid,
            'Customer reported water joint still leaking after pipe replacement.',
            now() - interval '36 hours'
        ),
        (
            'd2000000-0000-4000-8000-000000000102'::uuid,
            'd1000000-0000-4000-8000-000000000002'::uuid,
            'In progress',
            'Disputed',
            'd0000000-0000-4000-8000-000000000018'::uuid,
            'Disagreement over additional breaker replacement charges not in initial quote.',
            now() - interval '20 hours'
        ),
        (
            'd2000000-0000-4000-8000-000000000103'::uuid,
            'd1000000-0000-4000-8000-000000000003'::uuid,
            'In progress',
            'Disputed',
            'd0000000-0000-4000-8000-000000000019'::uuid,
            'Customer states second coat of paint was not completed in hallway.',
            now() - interval '8 hours'
        )
    ON CONFLICT (id) DO NOTHING;

    -- 5. Conversations and chat messages for the 3 Disputed jobs and 2 active non-disputed jobs (jobs 12, 13)
    FOR v_i IN 1..5 LOOP
        IF v_i <= 3 THEN
            v_job_id := ('d1000000-0000-4000-8000-' || lpad(v_i::text, 12, '0'))::uuid;
            v_cust_id := ('d0000000-0000-4000-8000-' || lpad((16 + v_i)::text, 12, '0'))::uuid;
            v_pro_id := ('d0000000-0000-4000-8000-' || lpad(v_i::text, 12, '0'))::uuid;
        ELSE
            v_job_id := ('d1000000-0000-4000-8000-' || lpad((8 + v_i)::text, 12, '0'))::uuid;
            v_cust_id := ('d0000000-0000-4000-8000-' || lpad((17 + ((7 + v_i) % 8))::text, 12, '0'))::uuid;
            v_pro_id := ('d0000000-0000-4000-8000-' || lpad((((7 + v_i) % 12) + 1)::text, 12, '0'))::uuid;
        END IF;

        v_conv_id := ('d4000000-0000-4000-8000-' || lpad(v_i::text, 12, '0'))::uuid;

        INSERT INTO public.conversations (id, job_id, customer_id, professional_id, created_at)
        VALUES (v_conv_id, v_job_id, v_cust_id, v_pro_id, now() - interval '2 days')
        ON CONFLICT (job_id) DO NOTHING;

        SELECT id INTO v_conv_id FROM public.conversations WHERE job_id = v_job_id;

        INSERT INTO public.messages (id, conversation_id, sender_id, body, created_at)
        VALUES
            (
                ('d4100000-0000-4000-8000-' || lpad((v_i * 2 - 1)::text, 12, '0'))::uuid,
                v_conv_id,
                v_cust_id,
                CASE
                    WHEN v_i <= 3 THEN 'Hello, there is an issue with the completed work on disputed job #' || v_i || '. Please review.'
                    ELSE 'Hi, please let me know when you are arriving for job #' || (8 + v_i) || '.'
                END,
                now() - interval '30 hours'
            ),
            (
                ('d4100000-0000-4000-8000-' || lpad((v_i * 2)::text, 12, '0'))::uuid,
                v_conv_id,
                v_pro_id,
                CASE
                    WHEN v_i <= 3 THEN 'I inspected the site and shared photos of the installed parts for administrator review.'
                    ELSE 'I am on my way and will reach within 25 minutes.'
                END,
                now() - interval '28 hours'
            )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;

    -- 6. Reviews for Completed jobs (jobs 4..9)
    FOR v_i IN 4..9 LOOP
        v_job_id := ('d1000000-0000-4000-8000-' || lpad(v_i::text, 12, '0'))::uuid;
        v_cust_id := ('d0000000-0000-4000-8000-' || lpad((17 + ((v_i - 1) % 8))::text, 12, '0'))::uuid;
        v_pro_id := ('d0000000-0000-4000-8000-' || lpad((((v_i - 1) % 12) + 1)::text, 12, '0'))::uuid;

        INSERT INTO public.reviews (
            id,
            job_id,
            reviewer_id,
            professional_id,
            rating,
            comment,
            created_at
        )
        VALUES (
            ('d4500000-0000-4000-8000-' || lpad(v_i::text, 12, '0'))::uuid,
            v_job_id,
            v_cust_id,
            v_pro_id,
            4 + (v_i % 2),
            'Demo review for job #' || v_i || ': Punctual professional and clean workmanship.',
            now() - ((v_i - 2) || ' days')::interval
        )
        ON CONFLICT (job_id) DO NOTHING;
    END LOOP;

    -- 7. Insert 6 moderation reports in mixed statuses (open, reviewing, resolved, dismissed)
    INSERT INTO public.reports (
        id,
        reporter_id,
        target_user_id,
        target_job_id,
        reason,
        details,
        status,
        resolution_note,
        resolved_by,
        resolved_at,
        created_at
    )
    VALUES
        (
            'd5000000-0000-4000-8000-000000000001'::uuid,
            'd0000000-0000-4000-8000-000000000017'::uuid,
            'd0000000-0000-4000-8000-000000000001'::uuid,
            'd1000000-0000-4000-8000-000000000001'::uuid,
            'Unresolved pipe leakage after visit',
            'The kitchen joint started leaking within two hours of the technician leaving.',
            'open',
            NULL,
            NULL,
            NULL,
            now() - interval '35 hours'
        ),
        (
            'd5000000-0000-4000-8000-000000000002'::uuid,
            'd0000000-0000-4000-8000-000000000018'::uuid,
            'd0000000-0000-4000-8000-000000000002'::uuid,
            'd1000000-0000-4000-8000-000000000002'::uuid,
            'Unapproved extra charges requested on site',
            'Technician requested additional payment beyond the accepted offer price.',
            'open',
            NULL,
            NULL,
            NULL,
            now() - interval '18 hours'
        ),
        (
            'd5000000-0000-4000-8000-000000000003'::uuid,
            'd0000000-0000-4000-8000-000000000019'::uuid,
            NULL,
            'd1000000-0000-4000-8000-000000000028'::uuid,
            'Misleading job budget and scope description',
            'Job listing asks for full commercial rewiring under a minor repair budget.',
            'open',
            NULL,
            NULL,
            NULL,
            now() - interval '6 hours'
        ),
        (
            'd5000000-0000-4000-8000-000000000004'::uuid,
            'd0000000-0000-4000-8000-000000000020'::uuid,
            'd0000000-0000-4000-8000-000000000005'::uuid,
            NULL,
            'Late arrival for scheduled inspection',
            'Technician arrived 90 minutes after the agreed time slot without prior notice.',
            'reviewing',
            'Contacted both parties to verify arrival logs.',
            v_admin_actor,
            NULL,
            now() - interval '3 days'
        ),
        (
            'd5000000-0000-4000-8000-000000000005'::uuid,
            'd0000000-0000-4000-8000-000000000021'::uuid,
            'd0000000-0000-4000-8000-000000000008'::uuid,
            'd1000000-0000-4000-8000-000000000037'::uuid,
            'Customer requested off-platform payment',
            'Reported for attempting to bypass platform terms.',
            'resolved',
            'Issued formal warning and reminded user of marketplace policies.',
            v_admin_actor,
            now() - interval '4 days',
            now() - interval '5 days'
        ),
        (
            'd5000000-0000-4000-8000-000000000006'::uuid,
            'd0000000-0000-4000-8000-000000000022'::uuid,
            NULL,
            'd1000000-0000-4000-8000-000000000029'::uuid,
            'Suspected duplicate job posting',
            'Appears similar to another post in the same sector.',
            'dismissed',
            'Verified with customer that the two posts are for separate apartments.',
            v_admin_actor,
            now() - interval '6 days',
            now() - interval '7 days'
        )
    ON CONFLICT (id) DO NOTHING;

    -- 8. Insert sample admin_actions rows for the audit log
    INSERT INTO public.admin_actions (
        id,
        admin_id,
        action,
        target_type,
        target_id,
        details,
        created_at
    )
    VALUES
        (
            'd6000000-0000-4000-8000-000000000001'::uuid,
            v_admin_actor,
            'application_approved',
            'professional_application',
            'd0000000-0000-4000-8000-000000000001',
            '{"decision":"approved","note":"Demo application verified and approved."}'::jsonb,
            now() - interval '10 days'
        ),
        (
            'd6000000-0000-4000-8000-000000000002'::uuid,
            v_admin_actor,
            'application_approved',
            'professional_application',
            'd0000000-0000-4000-8000-000000000002',
            '{"decision":"approved","note":"Demo application verified and approved."}'::jsonb,
            now() - interval '9 days'
        ),
        (
            'd6000000-0000-4000-8000-000000000003'::uuid,
            v_admin_actor,
            'application_rejected',
            'professional_application',
            'd0000000-0000-4000-8000-000000000016',
            '{"decision":"rejected","note":"Please provide clearer trade experience details and valid certification numbers."}'::jsonb,
            now() - interval '7 days'
        ),
        (
            'd6000000-0000-4000-8000-000000000004'::uuid,
            v_admin_actor,
            'report_dismissed',
            'report',
            'd5000000-0000-4000-8000-000000000006',
            '{"status":"dismissed","note":"Verified with customer that the two posts are for separate apartments."}'::jsonb,
            now() - interval '6 days'
        ),
        (
            'd6000000-0000-4000-8000-000000000005'::uuid,
            v_admin_actor,
            'report_resolved',
            'report',
            'd5000000-0000-4000-8000-000000000005',
            '{"status":"resolved","note":"Issued formal warning and reminded user of marketplace policies."}'::jsonb,
            now() - interval '4 days'
        ),
        (
            'd6000000-0000-4000-8000-000000000006'::uuid,
            v_admin_actor,
            'report_reviewing',
            'report',
            'd5000000-0000-4000-8000-000000000004',
            '{"status":"reviewing","note":"Contacted both parties to verify arrival logs."}'::jsonb,
            now() - interval '3 days'
        )
    ON CONFLICT (id) DO NOTHING;
END $$;

COMMIT;
