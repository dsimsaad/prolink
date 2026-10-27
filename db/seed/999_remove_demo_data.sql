-- Purpose: Remove all development demo records created by db/seed/002_admin_demo_data.sql.
-- Run order: Run on demand when cleaning up demo data before production or re-seeding.
-- DRAFT FOR HUMAN REVIEW BEFORE RUNNING

BEGIN;

-- 1. Remove demo admin audit entries
DELETE FROM public.admin_actions
WHERE id::text LIKE 'd6000000-0000-4000-8000-%'
   OR target_id LIKE 'd0000000-0000-4000-8000-%'
   OR target_id LIKE 'd1000000-0000-4000-8000-%'
   OR target_id LIKE 'd5000000-0000-4000-8000-%';

-- 2. Remove demo reports
DELETE FROM public.reports
WHERE id::text LIKE 'd5000000-0000-4000-8000-%'
   OR reporter_id::text LIKE 'd0000000-0000-4000-8000-%';

-- 3. Remove demo reviews (must be deleted before demo jobs due to ON DELETE RESTRICT)
DELETE FROM public.reviews
WHERE id::text LIKE 'd4500000-0000-4000-8000-%'
   OR job_id::text LIKE 'd1000000-0000-4000-8000-%'
   OR reviewer_id::text LIKE 'd0000000-0000-4000-8000-%';

-- 4. Remove demo messages and conversations
DELETE FROM public.messages
WHERE id::text LIKE 'd4100000-0000-4000-8000-%'
   OR sender_id::text LIKE 'd0000000-0000-4000-8000-%';

DELETE FROM public.conversations
WHERE id::text LIKE 'd4000000-0000-4000-8000-%'
   OR job_id::text LIKE 'd1000000-0000-4000-8000-%';

-- 5. Remove demo offers and job events
DELETE FROM public.offers
WHERE id::text LIKE 'd3000000-0000-4000-8000-%'
   OR job_id::text LIKE 'd1000000-0000-4000-8000-%'
   OR professional_id::text LIKE 'd0000000-0000-4000-8000-%';

DELETE FROM public.job_events
WHERE id::text LIKE 'd2000000-0000-4000-8000-%'
   OR job_id::text LIKE 'd1000000-0000-4000-8000-%';

-- 6. Remove demo jobs
DELETE FROM public.jobs
WHERE id::text LIKE 'd1000000-0000-4000-8000-%'
   OR customer_id::text LIKE 'd0000000-0000-4000-8000-%';

-- 7. Remove demo notifications, skills, areas, professional profiles, and contact details
DELETE FROM public.notifications
WHERE user_id::text LIKE 'd0000000-0000-4000-8000-%';

DELETE FROM public.professional_skills
WHERE professional_id::text LIKE 'd0000000-0000-4000-8000-%';

DELETE FROM public.professional_areas
WHERE professional_id::text LIKE 'd0000000-0000-4000-8000-%';

DELETE FROM public.professional_profiles
WHERE profile_id::text LIKE 'd0000000-0000-4000-8000-%';

DELETE FROM public.contact_details
WHERE profile_id::text LIKE 'd0000000-0000-4000-8000-%';

-- 8. Remove demo profiles and auth.users entries
DELETE FROM public.profiles
WHERE id::text LIKE 'd0000000-0000-4000-8000-%'
   OR full_name LIKE 'Demo %';

DELETE FROM auth.users
WHERE id::text LIKE 'd0000000-0000-4000-8000-%'
   OR email LIKE '%@example.invalid';

COMMIT;
