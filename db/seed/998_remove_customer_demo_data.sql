-- DEVELOPMENT ONLY: REMOVE CUSTOMER DEMO DATA
-- Purpose: Remove only the records created by db/seed/003_customer_demo_data.sql.
-- DRAFT FOR HUMAN REVIEW BEFORE RUNNING

BEGIN;

DELETE FROM public.reviews
WHERE id = 'd7500000-0000-4000-8000-000000000001'::uuid
   OR job_id::text LIKE 'd7100000-0000-4000-8000-%';

DELETE FROM public.messages
WHERE conversation_id::text LIKE 'd7400000-0000-4000-8000-%';

DELETE FROM public.conversations
WHERE id::text LIKE 'd7400000-0000-4000-8000-%'
   OR job_id::text LIKE 'd7100000-0000-4000-8000-%';

DELETE FROM public.offers
WHERE id::text LIKE 'd7300000-0000-4000-8000-%'
   OR job_id::text LIKE 'd7100000-0000-4000-8000-%';

DELETE FROM public.job_events
WHERE id::text LIKE 'd7200000-0000-4000-8000-%'
   OR job_id::text LIKE 'd7100000-0000-4000-8000-%';

DELETE FROM public.notifications
WHERE id::text LIKE 'd7600000-0000-4000-8000-%';

DELETE FROM public.jobs
WHERE id::text LIKE 'd7100000-0000-4000-8000-%';

COMMIT;
