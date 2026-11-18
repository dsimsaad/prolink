-- DEVELOPMENT ONLY: PROFESSIONAL DASHBOARD DEMO DATA
-- Purpose: Populate 12 realistic jobs owned by the Demo customers from db/seed/002_admin_demo_data.sql
--          in an existing approved test professional's categories and areas, along with:
--          pending offers on open jobs, one declined (rejected) offer, one withdrawn offer,
--          accepted offers on Assigned, In progress (one already marked done), and Completed jobs
--          (two with reviews, one without), job_events history, conversations, and notifications.
-- Prerequisites:
--   1. Migrations 001 through 013 applied.
--   2. db/seed/001_categories_areas.sql and db/seed/002_admin_demo_data.sql applied.
--   3. Edit v_pro_email below to match your existing approved test professional account.
-- Removal: Run db/seed/997_remove_professional_demo_data.sql to remove only the records created by this script.
-- DRAFT FOR HUMAN REVIEW BEFORE RUNNING

BEGIN;

DO $$
DECLARE
    -- Edit this single variable to the email of an existing approved test professional in auth.users:
    v_pro_email text := 'pro@example.com';

    v_pro_id uuid;
    v_is_approved boolean;

    v_cust1_id uuid := 'd0000000-0000-4000-8000-000000000017';
    v_cust2_id uuid := 'd0000000-0000-4000-8000-000000000018';
    v_cust3_id uuid := 'd0000000-0000-4000-8000-000000000019';
    v_cust4_id uuid := 'd0000000-0000-4000-8000-000000000020';
    v_other_pro_id uuid := 'd0000000-0000-4000-8000-000000000001';
    v_demo_cust_count int;

    v_cat_ids bigint[];
    v_area_ids bigint[];
    v_cat1 bigint;
    v_cat2 bigint;
    v_area1 bigint;
    v_area2 bigint;

    -- 12 Demo Job UUIDs (d8100000-0000-4000-8000-000000000001..0012)
    -- Jobs 1..2: Open (fresh opportunities with no offer yet from this professional)
    v_job_open_1 uuid       := 'd8100000-0000-4000-8000-000000000001';
    v_job_open_2 uuid       := 'd8100000-0000-4000-8000-000000000002';
    -- Jobs 3..4: Offers received (this professional has a pending offer)
    v_job_pending_1 uuid    := 'd8100000-0000-4000-8000-000000000003';
    v_job_pending_2 uuid    := 'd8100000-0000-4000-8000-000000000004';
    -- Job 5: Assigned to another demo pro (this professional's offer was declined/rejected)
    v_job_declined uuid     := 'd8100000-0000-4000-8000-000000000005';
    -- Job 6: Open (this professional submitted and withdrew an offer)
    v_job_withdrawn uuid    := 'd8100000-0000-4000-8000-000000000006';
    -- Job 7: Assigned to this professional (offer accepted, waiting to start work)
    v_job_assigned uuid     := 'd8100000-0000-4000-8000-000000000007';
    -- Job 8: In progress assigned to this professional (work started, not yet marked done)
    v_job_in_prog_1 uuid    := 'd8100000-0000-4000-8000-000000000008';
    -- Job 9: In progress assigned to this professional (already marked done, waiting for customer confirmation)
    v_job_in_prog_done uuid := 'd8100000-0000-4000-8000-000000000009';
    -- Jobs 10..11: Completed assigned to this professional (with customer reviews)
    v_job_comp_rev_1 uuid   := 'd8100000-0000-4000-8000-000000000010';
    v_job_comp_rev_2 uuid   := 'd8100000-0000-4000-8000-000000000011';
    -- Job 12: Completed assigned to this professional (no review yet)
    v_job_comp_unrev uuid   := 'd8100000-0000-4000-8000-000000000012';
BEGIN
    -- 1. Verify demo customers from db/seed/002_admin_demo_data.sql exist
    SELECT count(*) INTO v_demo_cust_count
    FROM public.profiles
    WHERE id IN (v_cust1_id, v_cust2_id, v_cust3_id, v_cust4_id);

    IF v_demo_cust_count < 4 THEN
        RAISE EXCEPTION 'Missing prerequisite Demo customers: Please run db/seed/002_admin_demo_data.sql first so Demo customers d0000000-0000-4000-8000-000000000017..0020 exist.';
    END IF;

    -- 2. Resolve test professional id from auth.users by email and verify approved status
    SELECT u.id INTO v_pro_id
    FROM auth.users AS u
    WHERE lower(u.email) = lower(trim(v_pro_email))
    LIMIT 1;

    IF v_pro_id IS NULL THEN
        RAISE EXCEPTION 'Test professional not found for email "%". Edit v_pro_email at the top of db/seed/004_professional_demo_data.sql to match an existing approved professional in auth.users.', v_pro_email;
    END IF;

    v_is_approved := public.is_approved_professional(v_pro_id);
    IF NOT COALESCE(v_is_approved, false) THEN
        RAISE EXCEPTION 'Account "%" (%) is not an approved, non-suspended professional. Approve the professional application first before running 004_professional_demo_data.sql.', v_pro_email, v_pro_id;
    END IF;

    IF v_pro_id IN (v_cust1_id, v_cust2_id, v_cust3_id, v_cust4_id) THEN
        RAISE EXCEPTION 'v_pro_email must point to a professional account distinct from the Demo customers (17..20).';
    END IF;

    IF v_pro_id = v_other_pro_id THEN
        v_other_pro_id := 'd0000000-0000-4000-8000-000000000002';
    END IF;

    -- 3. Read the professional's categories and areas (falling back to active categories/areas if none linked yet)
    SELECT array_agg(category_id ORDER BY category_id)
    INTO v_cat_ids
    FROM public.professional_skills
    WHERE professional_id = v_pro_id;

    IF COALESCE(cardinality(v_cat_ids), 0) = 0 THEN
        SELECT array_agg(id ORDER BY id) INTO v_cat_ids FROM public.categories WHERE is_active = true;
    END IF;

    SELECT array_agg(area_id ORDER BY area_id)
    INTO v_area_ids
    FROM public.professional_areas
    WHERE professional_id = v_pro_id;

    IF COALESCE(cardinality(v_area_ids), 0) = 0 THEN
        SELECT array_agg(id ORDER BY id) INTO v_area_ids FROM public.areas;
    END IF;

    IF COALESCE(cardinality(v_cat_ids), 0) = 0 OR COALESCE(cardinality(v_area_ids), 0) = 0 THEN
        RAISE EXCEPTION 'Missing categories or areas: Please run db/seed/001_categories_areas.sql first.';
    END IF;

    v_cat1 := v_cat_ids[1];
    v_cat2 := v_cat_ids[(1 % cardinality(v_cat_ids)) + 1];
    v_area1 := v_area_ids[1];
    v_area2 := v_area_ids[(1 % cardinality(v_area_ids)) + 1];

    -- Ensure Demo customers have valid 11-digit Pakistani mobile phones in contact_details
    INSERT INTO public.contact_details (profile_id, phone)
    VALUES
        (v_cust1_id, '03001112217'),
        (v_cust2_id, '03001112218'),
        (v_cust3_id, '03001112219'),
        (v_cust4_id, '03001112220')
    ON CONFLICT (profile_id) DO UPDATE SET phone = EXCLUDED.phone;

    -- Clean up any previous rows from this seed script before inserting fresh data
    DELETE FROM public.reviews WHERE id::text LIKE 'd8500000-0000-4000-8000-%';
    DELETE FROM public.conversations WHERE id::text LIKE 'd8400000-0000-4000-8000-%';
    DELETE FROM public.offers WHERE id::text LIKE 'd8300000-0000-4000-8000-%';
    DELETE FROM public.job_events WHERE id::text LIKE 'd8200000-0000-4000-8000-%';
    DELETE FROM public.notifications WHERE id::text LIKE 'd8600000-0000-4000-8000-%';
    DELETE FROM public.jobs WHERE id::text LIKE 'd8100000-0000-4000-8000-%';

    -- 4. Insert 12 jobs owned by Demo customers in the professional's categories and areas
    -- Job 1: Open (Urgent opportunity, no offer from this pro yet)
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        work_started_at, professional_marked_done_at, expires_at, created_at, updated_at
    ) VALUES (
        v_job_open_1, v_cust1_id,
        'Emergency main water line valve replacement',
        'The main gate valve near the underground tank is leaking continuously and cannot shut off water flow. Need urgent replacement with brass valve.',
        v_cat1, v_area1,
        2000, 4000, 'urgent', 'Open', NULL,
        NULL, NULL, now() + interval '6 days', now() - interval '3 hours', now() - interval '3 hours'
    );

    -- Job 2: Open (Normal opportunity, 1 offer from another pro so far)
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        work_started_at, professional_marked_done_at, expires_at, created_at, updated_at
    ) VALUES (
        v_job_open_2, v_cust2_id,
        'Lounge distribution panel inspection and earthing check',
        'Lights flicker briefly when heavy appliances start. Need a full check of neutral busbars and earthing rod resistance.',
        v_cat2, v_area2,
        2500, 5000, 'normal', 'Offers received', NULL,
        NULL, NULL, now() + interval '5 days', now() - interval '14 hours', now() - interval '10 hours'
    );

    -- Job 3: Offers received (Pending offer #1 from this professional)
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        work_started_at, professional_marked_done_at, expires_at, created_at, updated_at
    ) VALUES (
        v_job_pending_1, v_cust3_id,
        'Kitchen double sink mixer and drain trap installation',
        'Purchased a new pull-out kitchen mixer tap and heavy PVC P-trap. Need clean installation and leak test.',
        v_cat1, v_area1,
        1800, 3200, 'normal', 'Offers received', NULL,
        NULL, NULL, now() + interval '5 days', now() - interval '1 day', now() - interval '18 hours'
    );

    -- Job 4: Offers received (Pending offer #2 from this professional, urgent)
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        work_started_at, professional_marked_done_at, expires_at, created_at, updated_at
    ) VALUES (
        v_job_pending_2, v_cust4_id,
        'Overhead tank automatic level controller troubleshooting',
        'Water pump does not shut off automatically when the rooftop tank is full. Need float sensor and relay checked today.',
        v_cat2, v_area1,
        1500, 3000, 'urgent', 'Offers received', NULL,
        NULL, NULL, now() + interval '4 days', now() - interval '20 hours', now() - interval '12 hours'
    );

    -- Job 5: Assigned to another demo pro (this professional's offer was declined/rejected)
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        work_started_at, professional_marked_done_at, expires_at, created_at, updated_at
    ) VALUES (
        v_job_declined, v_cust1_id,
        'Outdoor security floodlight and motion sensor fitting',
        'Mount two LED floodlights above the garage entrance and wire them through a weatherproof motion sensor.',
        v_cat2, v_area2,
        2000, 3500, 'normal', 'Assigned', v_other_pro_id,
        NULL, NULL, now() + interval '3 days', now() - interval '4 days', now() - interval '3 days'
    );

    -- Job 6: Open (this professional submitted and withdrew an offer)
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        work_started_at, professional_marked_done_at, expires_at, created_at, updated_at
    ) VALUES (
        v_job_withdrawn, v_cust2_id,
        'Guest bathroom geyser pressure valve replacement',
        'Safety relief valve on the 35-gallon geyser drips hot water. Need replacement valve and inlet union check.',
        v_cat1, v_area2,
        1500, 2800, 'normal', 'Offers received', NULL,
        NULL, NULL, now() + interval '4 days', now() - interval '3 days', now() - interval '2 days'
    );

    -- Job 7: Assigned to this professional (waiting to start work)
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        work_started_at, professional_marked_done_at, expires_at, created_at, updated_at
    ) VALUES (
        v_job_assigned, v_cust3_id,
        'Master bathroom concealed flush cistern repair',
        'Concealed flush tank keeps running after use. Need syphon seal and fill valve serviced without damaging tiles.',
        v_cat1, v_area1,
        2500, 4500, 'urgent', 'Assigned', v_pro_id,
        NULL, NULL, now() + interval '5 days', now() - interval '2 days', now() - interval '1 day'
    );

    -- Job 8: In progress assigned to this professional (work started, not yet marked done)
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        work_started_at, professional_marked_done_at, expires_at, created_at, updated_at
    ) VALUES (
        v_job_in_prog_1, v_cust4_id,
        'UPS inverter changeover and dedicated kitchen socket line',
        'Run a dedicated 4mm line for the kitchen microwave and replace the manual UPS selector with an automatic changeover.',
        v_cat2, v_area1,
        3500, 6000, 'normal', 'In progress', v_pro_id,
        now() - interval '5 hours', NULL, now() + interval '4 days', now() - interval '3 days', now() - interval '5 hours'
    );

    -- Job 9: In progress assigned to this professional (already marked done, waiting for customer confirmation)
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        work_started_at, professional_marked_done_at, expires_at, created_at, updated_at
    ) VALUES (
        v_job_in_prog_done, v_cust1_id,
        'Centrifugal water pump seal and pressure switch replacement',
        'Domestic water pump leaks from the shaft seal and cycles rapidly. Need mechanical seal and pressure switch replaced.',
        v_cat1, v_area1,
        2800, 4800, 'urgent', 'In progress', v_pro_id,
        now() - interval '1 day', now() - interval '2 hours', now() + interval '3 days', now() - interval '4 days', now() - interval '2 hours'
    );

    -- Job 10: Completed assigned to this professional (with 5-star review)
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        work_started_at, professional_marked_done_at, expires_at, created_at, updated_at
    ) VALUES (
        v_job_comp_rev_1, v_cust2_id,
        'Complete bathroom sanitary fittings and shower mixer setup',
        'Installed new wall-hung basin, angle valves, and thermostatic shower mixer in renovated upstairs bathroom.',
        v_cat1, v_area1,
        4500, 7500, 'normal', 'Completed', v_pro_id,
        now() - interval '12 days', now() - interval '11 days', now() - interval '6 days', now() - interval '14 days', now() - interval '11 days'
    );

    -- Job 11: Completed assigned to this professional (with 5-star review)
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        work_started_at, professional_marked_done_at, expires_at, created_at, updated_at
    ) VALUES (
        v_job_comp_rev_2, v_cust3_id,
        'Three-phase main breaker and surge protector installation',
        'Installed voltage & surge protection device on the main distribution board and balanced phase loads.',
        v_cat2, v_area2,
        4000, 6500, 'normal', 'Completed', v_pro_id,
        now() - interval '20 days', now() - interval '19 days', now() - interval '14 days', now() - interval '22 days', now() - interval '19 days'
    );

    -- Job 12: Completed assigned to this professional (no review yet)
    INSERT INTO public.jobs (
        id, customer_id, title, description, category_id, area_id,
        budget_min, budget_max, urgency, status, assigned_professional_id,
        work_started_at, professional_marked_done_at, expires_at, created_at, updated_at
    ) VALUES (
        v_job_comp_unrev, v_cust4_id,
        'Roof rainwater drain pipe unblocking and cowl fitting',
        'Cleared blocked terrace drain line after heavy rain and fitted protective leaf guards.',
        v_cat1, v_area2,
        1800, 3000, 'normal', 'Completed', v_pro_id,
        now() - interval '6 days', now() - interval '5 days', now() - interval '1 day', now() - interval '8 days', now() - interval '5 days'
    );

    -- 5. Insert offers across the jobs (spread across recent weeks so the 8-week chart shows realistic activity)
    INSERT INTO public.offers (
        id, job_id, professional_id, price, inspection_fee, eta_minutes, message, status, created_at, updated_at
    ) VALUES
        -- Competing offer on Job 2 from another demo pro
        (
            'd8300000-0000-4000-8000-000000000001', v_job_open_2, v_other_pro_id,
            3400, 300, 60,
            'Available with earth resistance tester and clamp meter.',
            'pending', now() - interval '10 hours', now() - interval '10 hours'
        ),
        -- Pending offer #1 by test pro (on Job 3)
        (
            'd8300000-0000-4000-8000-000000000002', v_job_pending_1, v_pro_id,
            2400, 200, 40,
            'I can install the new pull-out mixer and PVC P-trap cleanly this afternoon with Teflon and silicone seals.',
            'pending', now() - interval '18 hours', now() - interval '18 hours'
        ),
        -- Pending offer #2 by test pro (on Job 4)
        (
            'd8300000-0000-4000-8000-000000000003', v_job_pending_2, v_pro_id,
            2200, 0, 30,
            'Carry replacement float switches and relay contactors in my kit. Can reach in 30 minutes.',
            'pending', now() - interval '12 hours', now() - interval '12 hours'
        ),
        -- Declined (rejected) offer by test pro on Job 5 + winning offer by other pro
        (
            'd8300000-0000-4000-8000-000000000004', v_job_declined, v_pro_id,
            3100, 300, 90,
            'Can mount both floodlights with weatherproof conduit and test sensor range.',
            'rejected', now() - interval '9 days', now() - interval '3 days'
        ),
        (
            'd8300000-0000-4000-8000-000000000005', v_job_declined, v_other_pro_id,
            2600, 0, 45,
            'Nearby with ladder and drill ready.',
            'accepted', now() - interval '4 days', now() - interval '3 days'
        ),
        -- Withdrawn offer by test pro on Job 6
        (
            'd8300000-0000-4000-8000-000000000006', v_job_withdrawn, v_pro_id,
            2100, 200, 60,
            'Can replace the geyser relief valve and check thermostat.',
            'withdrawn', now() - interval '16 days', now() - interval '15 days'
        ),
        -- Accepted offer on Job 7 (Assigned)
        (
            'd8300000-0000-4000-8000-000000000007', v_job_assigned, v_pro_id,
            3200, 300, 35,
            'Experienced with concealed cistern servicing through the flush plate opening without tile damage.',
            'accepted', now() - interval '2 days', now() - interval '1 day'
        ),
        -- Accepted offer on Job 8 (In progress)
        (
            'd8300000-0000-4000-8000-000000000008', v_job_in_prog_1, v_pro_id,
            4600, 300, 45,
            'Includes heavy-duty automatic changeover switch and neat ducting for the kitchen socket.',
            'accepted', now() - interval '3 days', now() - interval '2 days'
        ),
        -- Accepted offer on Job 9 (In progress, marked done)
        (
            'd8300000-0000-4000-8000-000000000009', v_job_in_prog_done, v_pro_id,
            3600, 200, 30,
            'Will fit genuine mechanical shaft seal and calibrate the pressure switch cutoff.',
            'accepted', now() - interval '4 days', now() - interval '3 days'
        ),
        -- Accepted offer on Job 10 (Completed with review)
        (
            'd8300000-0000-4000-8000-000000000010', v_job_comp_rev_1, v_pro_id,
            6200, 0, 50,
            'Complete fitting of basin, angle valves, and shower mixer with pressure testing.',
            'accepted', now() - interval '13 days', now() - interval '12 days'
        ),
        -- Accepted offer on Job 11 (Completed with review)
        (
            'd8300000-0000-4000-8000-000000000011', v_job_comp_rev_2, v_pro_id,
            5400, 400, 40,
            'Will install adjustable voltage protector and balance load across all three phases.',
            'accepted', now() - interval '21 days', now() - interval '20 days'
        ),
        -- Accepted offer on Job 12 (Completed without review)
        (
            'd8300000-0000-4000-8000-000000000012', v_job_comp_unrev, v_pro_id,
            2300, 0, 35,
            'Will clear the roof drain line with a flexible auger and fit drain guards.',
            'accepted', now() - interval '7 days', now() - interval '6 days'
        );

    -- 6. Insert conversations for all jobs assigned to the test professional
    INSERT INTO public.conversations (id, job_id, customer_id, professional_id, created_at)
    VALUES
        ('d8400000-0000-4000-8000-000000000001', v_job_assigned,     v_cust3_id, v_pro_id, now() - interval '1 day'),
        ('d8400000-0000-4000-8000-000000000002', v_job_in_prog_1,    v_cust4_id, v_pro_id, now() - interval '2 days'),
        ('d8400000-0000-4000-8000-000000000003', v_job_in_prog_done, v_cust1_id, v_pro_id, now() - interval '3 days'),
        ('d8400000-0000-4000-8000-000000000004', v_job_comp_rev_1,   v_cust2_id, v_pro_id, now() - interval '12 days'),
        ('d8400000-0000-4000-8000-000000000005', v_job_comp_rev_2,   v_cust3_id, v_pro_id, now() - interval '20 days'),
        ('d8400000-0000-4000-8000-000000000006', v_job_comp_unrev,   v_cust4_id, v_pro_id, now() - interval '6 days')
    ON CONFLICT (job_id) DO NOTHING;

    -- 7. Insert customer reviews on Jobs 10 and 11 (triggers update_professional_rating)
    INSERT INTO public.reviews (id, job_id, reviewer_id, professional_id, rating, comment, created_at)
    VALUES
        (
            'd8500000-0000-4000-8000-000000000001',
            v_job_comp_rev_1,
            v_cust2_id,
            v_pro_id,
            5,
            'Very neat sanitary fitting work. Arrived on schedule, tested every joint for leaks, and left the bathroom spotless.',
            now() - interval '10 days'
        ),
        (
            'd8500000-0000-4000-8000-000000000002',
            v_job_comp_rev_2,
            v_cust3_id,
            v_pro_id,
            5,
            'Diagnosed the phase imbalance quickly and installed the surge protector cleanly inside the main DB panel.',
            now() - interval '18 days'
        )
    ON CONFLICT (job_id) DO NOTHING;

    -- 8. Insert job_events history across the 12 jobs
    INSERT INTO public.job_events (id, job_id, from_status, to_status, actor_id, note, at)
    VALUES
        ('d8200000-0000-4000-8000-000000000001', v_job_open_1,       NULL,              'Open',            v_cust1_id, 'Urgent job published',                           now() - interval '3 hours'),
        ('d8200000-0000-4000-8000-000000000002', v_job_open_2,       NULL,              'Open',            v_cust2_id, 'Job published',                                  now() - interval '14 hours'),
        ('d8200000-0000-4000-8000-000000000003', v_job_open_2,       'Open',            'Offers received', v_other_pro_id, 'First offer submitted by professional',      now() - interval '10 hours'),
        ('d8200000-0000-4000-8000-000000000004', v_job_pending_1,    NULL,              'Open',            v_cust3_id, 'Job published',                                  now() - interval '1 day'),
        ('d8200000-0000-4000-8000-000000000005', v_job_pending_1,    'Open',            'Offers received', v_pro_id,   'First offer submitted by professional',          now() - interval '18 hours'),
        ('d8200000-0000-4000-8000-000000000006', v_job_pending_2,    NULL,              'Open',            v_cust4_id, 'Urgent job published',                           now() - interval '20 hours'),
        ('d8200000-0000-4000-8000-000000000007', v_job_pending_2,    'Open',            'Offers received', v_pro_id,   'First offer submitted by professional',          now() - interval '12 hours'),
        ('d8200000-0000-4000-8000-000000000008', v_job_declined,     NULL,              'Open',            v_cust1_id, 'Job published',                                  now() - interval '4 days'),
        ('d8200000-0000-4000-8000-000000000009', v_job_declined,     'Open',            'Assigned',        v_cust1_id, 'Offer accepted by customer',                     now() - interval '3 days'),
        ('d8200000-0000-4000-8000-000000000010', v_job_withdrawn,    NULL,              'Open',            v_cust2_id, 'Job published',                                  now() - interval '3 days'),
        ('d8200000-0000-4000-8000-000000000011', v_job_withdrawn,    'Open',            'Offers received', v_pro_id,   'First offer submitted by professional',          now() - interval '16 days'),
        ('d8200000-0000-4000-8000-000000000012', v_job_withdrawn,    'Offers received', 'Offers received', v_pro_id,   'Offer withdrawn by professional',                now() - interval '15 days'),
        ('d8200000-0000-4000-8000-000000000013', v_job_assigned,     NULL,              'Open',            v_cust3_id, 'Urgent job published',                           now() - interval '2 days'),
        ('d8200000-0000-4000-8000-000000000014', v_job_assigned,     'Open',            'Offers received', v_pro_id,   'First offer submitted by professional',          now() - interval '36 hours'),
        ('d8200000-0000-4000-8000-000000000015', v_job_assigned,     'Offers received', 'Assigned',        v_cust3_id, 'Offer accepted by customer',                     now() - interval '1 day'),
        ('d8200000-0000-4000-8000-000000000016', v_job_in_prog_1,    NULL,              'Open',            v_cust4_id, 'Job published',                                  now() - interval '3 days'),
        ('d8200000-0000-4000-8000-000000000017', v_job_in_prog_1,    'Open',            'Assigned',        v_cust4_id, 'Offer accepted by customer',                     now() - interval '2 days'),
        ('d8200000-0000-4000-8000-000000000018', v_job_in_prog_1,    'Assigned',        'In progress',     v_pro_id,   'Professional started work on site',              now() - interval '5 hours'),
        ('d8200000-0000-4000-8000-000000000019', v_job_in_prog_done, NULL,              'Open',            v_cust1_id, 'Urgent job published',                           now() - interval '4 days'),
        ('d8200000-0000-4000-8000-000000000020', v_job_in_prog_done, 'Open',            'Assigned',        v_cust1_id, 'Offer accepted by customer',                     now() - interval '3 days'),
        ('d8200000-0000-4000-8000-000000000021', v_job_in_prog_done, 'Assigned',        'In progress',     v_pro_id,   'Professional started work',                      now() - interval '1 day'),
        ('d8200000-0000-4000-8000-000000000022', v_job_in_prog_done, 'In progress',     'In progress',     v_pro_id,   'Replaced pump seal and pressure switch; tested', now() - interval '2 hours'),
        ('d8200000-0000-4000-8000-000000000023', v_job_comp_rev_1,   NULL,              'Open',            v_cust2_id, 'Job published',                                  now() - interval '14 days'),
        ('d8200000-0000-4000-8000-000000000024', v_job_comp_rev_1,   'Open',            'Assigned',        v_cust2_id, 'Offer accepted by customer',                     now() - interval '12 days'),
        ('d8200000-0000-4000-8000-000000000025', v_job_comp_rev_1,   'Assigned',        'In progress',     v_pro_id,   'Professional started work',                      now() - interval '12 days'),
        ('d8200000-0000-4000-8000-000000000026', v_job_comp_rev_1,   'In progress',     'Completed',       v_cust2_id, 'Customer confirmed job completion',              now() - interval '11 days'),
        ('d8200000-0000-4000-8000-000000000027', v_job_comp_rev_2,   NULL,              'Open',            v_cust3_id, 'Job published',                                  now() - interval '22 days'),
        ('d8200000-0000-4000-8000-000000000028', v_job_comp_rev_2,   'Open',            'Assigned',        v_cust3_id, 'Offer accepted by customer',                     now() - interval '20 days'),
        ('d8200000-0000-4000-8000-000000000029', v_job_comp_rev_2,   'Assigned',        'In progress',     v_pro_id,   'Professional started work',                      now() - interval '20 days'),
        ('d8200000-0000-4000-8000-000000000030', v_job_comp_rev_2,   'In progress',     'Completed',       v_cust3_id, 'Customer confirmed job completion',              now() - interval '19 days'),
        ('d8200000-0000-4000-8000-000000000031', v_job_comp_unrev,   NULL,              'Open',            v_cust4_id, 'Job published',                                  now() - interval '8 days'),
        ('d8200000-0000-4000-8000-000000000032', v_job_comp_unrev,   'Open',            'Assigned',        v_cust4_id, 'Offer accepted by customer',                     now() - interval '6 days'),
        ('d8200000-0000-4000-8000-000000000033', v_job_comp_unrev,   'Assigned',        'In progress',     v_pro_id,   'Professional started work',                      now() - interval '6 days'),
        ('d8200000-0000-4000-8000-000000000034', v_job_comp_unrev,   'In progress',     'Completed',       v_cust4_id, 'Customer confirmed job completion',              now() - interval '5 days');

    -- 9. Insert professional notifications (mix of unread and read across professional notification types)
    INSERT INTO public.notifications (id, user_id, type, payload, read_at, created_at)
    VALUES
        (
            'd8600000-0000-4000-8000-000000000001',
            v_pro_id,
            'new_job_match',
            jsonb_build_object('job_id', v_job_open_1, 'title', 'Emergency main water line valve replacement', 'urgency', 'urgent'),
            NULL,
            now() - interval '3 hours'
        ),
        (
            'd8600000-0000-4000-8000-000000000002',
            v_pro_id,
            'offer_accepted',
            jsonb_build_object('job_id', v_job_assigned, 'offer_id', 'd8300000-0000-4000-8000-000000000007', 'title', 'Master bathroom concealed flush cistern repair', 'status', 'Assigned'),
            NULL,
            now() - interval '1 day'
        ),
        (
            'd8600000-0000-4000-8000-000000000003',
            v_pro_id,
            'new_job_match',
            jsonb_build_object('job_id', v_job_open_2, 'title', 'Lounge distribution panel inspection and earthing check', 'urgency', 'normal'),
            NULL,
            now() - interval '14 hours'
        ),
        (
            'd8600000-0000-4000-8000-000000000004',
            v_pro_id,
            'offer_rejected',
            jsonb_build_object('job_id', v_job_declined, 'offer_id', 'd8300000-0000-4000-8000-000000000004', 'title', 'Outdoor security floodlight and motion sensor fitting'),
            now() - interval '2 days',
            now() - interval '3 days'
        ),
        (
            'd8600000-0000-4000-8000-000000000005',
            v_pro_id,
            'job_status_changed',
            jsonb_build_object('job_id', v_job_comp_unrev, 'title', 'Roof rainwater drain pipe unblocking and cowl fitting', 'status', 'Completed'),
            now() - interval '4 days',
            now() - interval '5 days'
        ),
        (
            'd8600000-0000-4000-8000-000000000006',
            v_pro_id,
            'review_received',
            jsonb_build_object('job_id', v_job_comp_rev_1, 'title', 'Complete bathroom sanitary fittings and shower mixer setup', 'rating', 5),
            now() - interval '9 days',
            now() - interval '10 days'
        );

    RAISE NOTICE 'Seeded 12 professional demo jobs, 12 offers, 34 job events, 6 conversations, 2 reviews, and 6 notifications for % (%).', v_pro_email, v_pro_id;
END $$;

COMMIT;
