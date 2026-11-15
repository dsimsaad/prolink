-- DEVELOPMENT ONLY: CUSTOMER DASHBOARD DEMO DATA
-- Purpose: Populate 8 realistic customer jobs across statuses (Draft, Open without offers,
--          Open with 3 offers, Assigned, In progress, Completed with review, Completed without review,
--          and Cancelled), along with offers, job_events history, conversations, a review, and notifications
--          for an existing test customer account.
-- Prerequisites:
--   1. Migrations 001 through 010 applied.
--   2. db/seed/001_categories_areas.sql and db/seed/002_admin_demo_data.sql applied.
--   3. Edit v_customer_email below to match your registered test customer email.
-- Removal: Run db/seed/998_remove_customer_demo_data.sql to remove only the records created by this script.
-- DRAFT FOR HUMAN REVIEW BEFORE RUNNING

BEGIN;

DO $$
DECLARE
    -- Edit this single variable to the email of an existing test customer in auth.users:
    v_customer_email text := 'customer@example.com';

    v_customer_id uuid;
    v_pro1_id uuid := 'd0000000-0000-4000-8000-000000000001';
    v_pro2_id uuid := 'd0000000-0000-4000-8000-000000000002';
    v_pro3_id uuid := 'd0000000-0000-4000-8000-000000000003';
    v_demo_pro_count int;
    v_cat_ids bigint[];
    v_area_ids bigint[];

    v_job_draft uuid            := 'd7100000-0000-4000-8000-000000000001';
    v_job_open_empty uuid       := 'd7100000-0000-4000-8000-000000000002';
    v_job_open_offers uuid      := 'd7100000-0000-4000-8000-000000000003';
    v_job_assigned uuid         := 'd7100000-0000-4000-8000-000000000004';
    v_job_in_progress uuid      := 'd7100000-0000-4000-8000-000000000005';
    v_job_completed_review uuid := 'd7100000-0000-4000-8000-000000000006';
    v_job_completed_unrev uuid  := 'd7100000-0000-4000-8000-000000000007';
    v_job_cancelled uuid        := 'd7100000-0000-4000-8000-000000000008';
BEGIN
    -- 1. Verify demo professionals from db/seed/002_admin_demo_data.sql exist
    SELECT count(*) INTO v_demo_pro_count
    FROM public.professional_profiles
    WHERE profile_id IN (v_pro1_id, v_pro2_id, v_pro3_id)
      AND status = 'approved';

    IF v_demo_pro_count < 3 THEN
        RAISE EXCEPTION 'Missing prerequisite demo professionals: Please run db/seed/002_admin_demo_data.sql first so approved demo professionals d0000000-0000-4000-8000-000000000001..0003 exist.';
    END IF;

    -- 2. Resolve test customer id from auth.users by email
    SELECT u.id INTO v_customer_id
    FROM auth.users AS u
    WHERE lower(u.email) = lower(trim(v_customer_email))
    LIMIT 1;

    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Test customer not found for email "%". Edit v_customer_email at the top of db/seed/003_customer_demo_data.sql to match an existing account in auth.users.', v_customer_email;
    END IF;

    IF v_customer_id IN (v_pro1_id, v_pro2_id, v_pro3_id) THEN
        RAISE EXCEPTION 'v_customer_email must point to a customer account distinct from the demo professionals.';
    END IF;

    -- 3. Load active categories and areas
    SELECT array_agg(id ORDER BY id) INTO v_cat_ids FROM public.categories WHERE is_active = true;
    SELECT array_agg(id ORDER BY id) INTO v_area_ids FROM public.areas;

    IF COALESCE(cardinality(v_cat_ids), 0) = 0 OR COALESCE(cardinality(v_area_ids), 0) = 0 THEN
        RAISE EXCEPTION 'Missing categories or areas: Please run db/seed/001_categories_areas.sql first.';
    END IF;

    -- Remove any previous records from this script before inserting fresh rows
    DELETE FROM public.reviews WHERE id = 'd7500000-0000-4000-8000-000000000001'::uuid;
    DELETE FROM public.conversations WHERE id::text LIKE 'd7400000-0000-4000-8000-%';
    DELETE FROM public.offers WHERE id::text LIKE 'd7300000-0000-4000-8000-%';
    DELETE FROM public.job_events WHERE id::text LIKE 'd7200000-0000-4000-8000-%';
    DELETE FROM public.notifications WHERE id::text LIKE 'd7600000-0000-4000-8000-%';
    DELETE FROM public.jobs WHERE id::text LIKE 'd7100000-0000-4000-8000-%';

    -- 4. Insert 8 jobs across statuses for the test customer
    -- Job 1: Draft
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        expires_at, created_at, updated_at
    ) VALUES (
        v_job_draft, v_customer_id,
        'Replace bathroom exhaust fan and check duct',
        'The exhaust fan in the guest bathroom is noisy and barely pulls air. Need a replacement fitted and wiring checked.',
        v_cat_ids[1], v_area_ids[1],
        1500, 3000, 'normal', 'Draft', NULL,
        NULL, now() - interval '1 day', now() - interval '1 day'
    );

    -- Job 2: Open without offers
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        expires_at, created_at, updated_at
    ) VALUES (
        v_job_open_empty, v_customer_id,
        'Wooden kitchen cabinet hinge alignment',
        'Four upper cabinet doors in the kitchen sag and do not close flush. Need soft-close hinges adjusted or replaced.',
        v_cat_ids[(1 % cardinality(v_cat_ids)) + 1], v_area_ids[1],
        2000, 4000, 'normal', 'Open', NULL,
        now() + interval '6 days', now() - interval '18 hours', now() - interval '18 hours'
    );

    -- Job 3: Open with 3 offers from demo professionals
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        expires_at, created_at, updated_at
    ) VALUES (
        v_job_open_offers, v_customer_id,
        'Split AC cooling check and indoor unit service',
        '1.5 ton inverter split AC in the lounge is blowing warm air on peak afternoons. Need pressure test, filter wash, and coil cleaning.',
        v_cat_ids[(2 % cardinality(v_cat_ids)) + 1], v_area_ids[(1 % cardinality(v_area_ids)) + 1],
        2500, 5000, 'urgent', 'Open', NULL,
        now() + interval '5 days', now() - interval '2 days', now() - interval '6 hours'
    );

    -- Job 4: Assigned
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        expires_at, created_at, updated_at
    ) VALUES (
        v_job_assigned, v_customer_id,
        'Kitchen sink P-trap leak and mixer tap replacement',
        'Water drips under the kitchen sink cabinet whenever the tap runs for more than a minute. Need new P-trap seal and mixer fitting.',
        v_cat_ids[1], v_area_ids[1],
        1800, 3500, 'urgent', 'Assigned', v_pro1_id,
        now() + interval '4 days', now() - interval '3 days', now() - interval '1 day'
    );

    -- Job 5: In progress
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        expires_at, created_at, updated_at
    ) VALUES (
        v_job_in_progress, v_customer_id,
        'Main distribution board breaker replacement',
        'Two circuit breakers on the ground-floor distribution panel trip repeatedly when the iron and microwave run together.',
        v_cat_ids[(3 % cardinality(v_cat_ids)) + 1], v_area_ids[1],
        3000, 6000, 'normal', 'In progress', v_pro2_id,
        now() + interval '3 days', now() - interval '5 days', now() - interval '4 hours'
    );

    -- Job 6: Completed with a review
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        expires_at, created_at, updated_at
    ) VALUES (
        v_job_completed_review, v_customer_id,
        'Living room accent wall emulsion repainting',
        'Scrape minor damp patches, apply primer, and paint two coats of matte emulsion on the main living room wall.',
        v_cat_ids[(4 % cardinality(v_cat_ids)) + 1], v_area_ids[(2 % cardinality(v_area_ids)) + 1],
        6000, 10000, 'normal', 'Completed', v_pro1_id,
        now() - interval '3 days', now() - interval '12 days', now() - interval '8 days'
    );

    -- Job 7: Completed without a review (ready for customer to leave a review)
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        expires_at, created_at, updated_at
    ) VALUES (
        v_job_completed_unrev, v_customer_id,
        'Roof water tank automatic float switch installation',
        'Overhead water tank overflows every morning. Need a heavy-duty float switch wired to the ground pump controller.',
        v_cat_ids[1], v_area_ids[1],
        2000, 3500, 'normal', 'Completed', v_pro3_id,
        now() - interval '1 day', now() - interval '7 days', now() - interval '2 days'
    );

    -- Job 8: Cancelled
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        expires_at, created_at, updated_at
    ) VALUES (
        v_job_cancelled, v_customer_id,
        'Patio floor tile re-grouting and sealant',
        'Outdoor patio tiles have loose grout lines after monsoon rain. Decided to postpone until next month.',
        v_cat_ids[(5 % cardinality(v_cat_ids)) + 1], v_area_ids[1],
        4000, 7500, 'normal', 'Cancelled', NULL,
        now() - interval '5 days', now() - interval '14 days', now() - interval '13 days'
    );

    -- 5. Insert offers with varied prices, inspection fees, and arrival times
    -- 3 pending offers on Job 3 (Open with 3 offers)
    INSERT INTO public.offers (
        id, job_id, professional_id, price, inspection_fee, eta_minutes, message, status, created_at, updated_at
    ) VALUES
    (
        'd7300000-0000-4000-8000-000000000001', v_job_open_offers, v_pro1_id,
        3200, 300, 35,
        'I carry a digital manifold gauge and pressure washer for inverter units. Can reach in 35 minutes.',
        'pending', now() - interval '18 hours', now() - interval '18 hours'
    ),
    (
        'd7300000-0000-4000-8000-000000000002', v_job_open_offers, v_pro2_id,
        2800, 0, 60,
        'Full indoor and outdoor chemical wash plus gas pressure check included. No separate inspection charge.',
        'pending', now() - interval '12 hours', now() - interval '12 hours'
    ),
    (
        'd7300000-0000-4000-8000-000000000003', v_job_open_offers, v_pro3_id,
        3800, 500, 25,
        'Nearby in your sector right now with full AC service kit and spare capacitors.',
        'pending', now() - interval '6 hours', now() - interval '6 hours'
    ),
    -- Accepted + rejected offers on Job 4 (Assigned)
    (
        'd7300000-0000-4000-8000-000000000004', v_job_assigned, v_pro1_id,
        2400, 200, 30,
        'Can replace the P-trap and fit the new mixer tap this afternoon.',
        'accepted', now() - interval '2 days', now() - interval '1 day'
    ),
    (
        'd7300000-0000-4000-8000-000000000005', v_job_assigned, v_pro2_id,
        2900, 300, 50,
        'Available with plumbing tools and Teflon seals.',
        'rejected', now() - interval '2 days', now() - interval '1 day'
    ),
    -- Accepted offer on Job 5 (In progress)
    (
        'd7300000-0000-4000-8000-000000000006', v_job_in_progress, v_pro2_id,
        4200, 400, 40,
        'Will test circuit load with a clamp meter and install genuine breakers.',
        'accepted', now() - interval '4 days', now() - interval '3 days'
    ),
    -- Accepted offer on Job 6 (Completed with review)
    (
        'd7300000-0000-4000-8000-000000000007', v_job_completed_review, v_pro1_id,
        7800, 0, 45,
        'Includes scraping, wall putty, primer, and two clean coats with drop cloths.',
        'accepted', now() - interval '11 days', now() - interval '10 days'
    ),
    -- Accepted offer on Job 7 (Completed without review)
    (
        'd7300000-0000-4000-8000-000000000008', v_job_completed_unrev, v_pro3_id,
        2600, 250, 35,
        'Will install a sealed float switch and test automatic pump cutoff.',
        'accepted', now() - interval '6 days', now() - interval '5 days'
    ),
    -- Rejected offer on Job 8 (Cancelled)
    (
        'd7300000-0000-4000-8000-000000000009', v_job_cancelled, v_pro1_id,
        5500, 300, 60,
        'Can inspect patio grout lines and apply waterproof tile joint filler.',
        'rejected', now() - interval '13 days', now() - interval '13 days'
    );

    -- 6. Insert conversations for assigned, in-progress, and completed jobs
    INSERT INTO public.conversations (id, job_id, customer_id, professional_id, created_at)
    VALUES
        ('d7400000-0000-4000-8000-000000000001', v_job_assigned,         v_customer_id, v_pro1_id, now() - interval '1 day'),
        ('d7400000-0000-4000-8000-000000000002', v_job_in_progress,      v_customer_id, v_pro2_id, now() - interval '3 days'),
        ('d7400000-0000-4000-8000-000000000003', v_job_completed_review, v_customer_id, v_pro1_id, now() - interval '10 days'),
        ('d7400000-0000-4000-8000-000000000004', v_job_completed_unrev,  v_customer_id, v_pro3_id, now() - interval '5 days')
    ON CONFLICT (job_id) DO NOTHING;

    -- 7. Insert review for Job 6 (Completed with review)
    INSERT INTO public.reviews (id, job_id, reviewer_id, professional_id, rating, comment, created_at)
    VALUES (
        'd7500000-0000-4000-8000-000000000001',
        v_job_completed_review,
        v_customer_id,
        v_pro1_id,
        5,
        'Arrived on time, protected the furniture with sheets, and finished the wall painting cleanly.',
        now() - interval '7 days'
    )
    ON CONFLICT (job_id) DO NOTHING;

    -- 8. Insert job_events history across the customer's jobs
    INSERT INTO public.job_events (id, job_id, from_status, to_status, actor_id, note, at)
    VALUES
        ('d7200000-0000-4000-8000-000000000001', v_job_draft,            NULL,              'Draft',           v_customer_id, 'Saved as draft',                             now() - interval '1 day'),
        ('d7200000-0000-4000-8000-000000000002', v_job_open_empty,       NULL,              'Open',            v_customer_id, 'Job published',                              now() - interval '18 hours'),
        ('d7200000-0000-4000-8000-000000000003', v_job_open_offers,      NULL,              'Open',            v_customer_id, 'Urgent job published',                       now() - interval '2 days'),
        ('d7200000-0000-4000-8000-000000000004', v_job_assigned,         NULL,              'Open',            v_customer_id, 'Job published',                              now() - interval '3 days'),
        ('d7200000-0000-4000-8000-000000000005', v_job_assigned,         'Open',            'Assigned',        v_customer_id, 'Accepted offer from Demo Ahmed Khan',        now() - interval '1 day'),
        ('d7200000-0000-4000-8000-000000000006', v_job_in_progress,      NULL,              'Open',            v_customer_id, 'Job published',                              now() - interval '5 days'),
        ('d7200000-0000-4000-8000-000000000007', v_job_in_progress,      'Open',            'Assigned',        v_customer_id, 'Accepted offer from Demo Bilal Tariq',       now() - interval '3 days'),
        ('d7200000-0000-4000-8000-000000000008', v_job_in_progress,      'Assigned',        'In progress',     v_pro2_id,     'Professional started work on site',          now() - interval '4 hours'),
        ('d7200000-0000-4000-8000-000000000009', v_job_completed_review, NULL,              'Open',            v_customer_id, 'Job published',                              now() - interval '12 days'),
        ('d7200000-0000-4000-8000-000000000010', v_job_completed_review, 'Open',            'Assigned',        v_customer_id, 'Accepted offer from Demo Ahmed Khan',        now() - interval '10 days'),
        ('d7200000-0000-4000-8000-000000000011', v_job_completed_review, 'Assigned',        'In progress',     v_pro1_id,     'Work started',                               now() - interval '9 days'),
        ('d7200000-0000-4000-8000-000000000012', v_job_completed_review, 'In progress',     'Completed',       v_customer_id, 'Customer confirmed job completion',          now() - interval '8 days'),
        ('d7200000-0000-4000-8000-000000000013', v_job_completed_unrev,  NULL,              'Open',            v_customer_id, 'Job published',                              now() - interval '7 days'),
        ('d7200000-0000-4000-8000-000000000014', v_job_completed_unrev,  'Open',            'Assigned',        v_customer_id, 'Accepted offer from Demo Usman Raza',        now() - interval '5 days'),
        ('d7200000-0000-4000-8000-000000000015', v_job_completed_unrev,  'Assigned',        'In progress',     v_pro3_id,     'Work started',                               now() - interval '3 days'),
        ('d7200000-0000-4000-8000-000000000016', v_job_completed_unrev,  'In progress',     'Completed',       v_customer_id, 'Customer confirmed job completion',          now() - interval '2 days'),
        ('d7200000-0000-4000-8000-000000000017', v_job_cancelled,        NULL,              'Open',            v_customer_id, 'Job published',                              now() - interval '14 days'),
        ('d7200000-0000-4000-8000-000000000018', v_job_cancelled,        'Open',            'Cancelled',       v_customer_id, 'Cancelled by customer before assignment',    now() - interval '13 days');

    -- 9. Insert customer notifications (mix of unread and read)
    INSERT INTO public.notifications (id, user_id, type, payload, read_at, created_at)
    VALUES
        (
            'd7600000-0000-4000-8000-000000000001',
            v_customer_id,
            'offer_received',
            jsonb_build_object('job_id', v_job_open_offers, 'title', 'Split AC cooling check and indoor unit service', 'price', 3800),
            NULL,
            now() - interval '6 hours'
        ),
        (
            'd7600000-0000-4000-8000-000000000002',
            v_customer_id,
            'offer_received',
            jsonb_build_object('job_id', v_job_open_offers, 'title', 'Split AC cooling check and indoor unit service', 'price', 2800),
            NULL,
            now() - interval '12 hours'
        ),
        (
            'd7600000-0000-4000-8000-000000000003',
            v_customer_id,
            'job_status_changed',
            jsonb_build_object('job_id', v_job_in_progress, 'title', 'Main distribution board breaker replacement', 'status', 'In progress'),
            NULL,
            now() - interval '4 hours'
        ),
        (
            'd7600000-0000-4000-8000-000000000004',
            v_customer_id,
            'offer_accepted',
            jsonb_build_object('job_id', v_job_assigned, 'title', 'Kitchen sink P-trap leak and mixer tap replacement'),
            now() - interval '20 hours',
            now() - interval '1 day'
        ),
        (
            'd7600000-0000-4000-8000-000000000005',
            v_customer_id,
            'job_status_changed',
            jsonb_build_object('job_id', v_job_completed_unrev, 'title', 'Roof water tank automatic float switch installation', 'status', 'Completed'),
            now() - interval '1 day',
            now() - interval '2 days'
        );

    RAISE NOTICE 'Seeded 8 customer demo jobs, 9 offers, 18 job events, 4 conversations, 1 review, and 5 notifications for % (%).', v_customer_email, v_customer_id;
END $$;

COMMIT;
