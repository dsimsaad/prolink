-- DEVELOPMENT ONLY: REMOVE PROFESSIONAL DEMO DATA
-- Purpose: Remove only the records created by db/seed/004_professional_demo_data.sql.
-- DRAFT FOR HUMAN REVIEW BEFORE RUNNING

BEGIN;

DELETE FROM public.reviews
WHERE id::text LIKE 'd8500000-0000-4000-8000-%'
   OR job_id::text LIKE 'd8100000-0000-4000-8000-%';

DELETE FROM public.messages
WHERE conversation_id::text LIKE 'd8400000-0000-4000-8000-%';

DELETE FROM public.conversations
WHERE id::text LIKE 'd8400000-0000-4000-8000-%'
   OR job_id::text LIKE 'd8100000-0000-4000-8000-%';

DELETE FROM public.offers
WHERE id::text LIKE 'd8300000-0000-4000-8000-%'
   OR job_id::text LIKE 'd8100000-0000-4000-8000-%';

DELETE FROM public.job_events
WHERE id::text LIKE 'd8200000-0000-4000-8000-%'
   OR job_id::text LIKE 'd8100000-0000-4000-8000-%';

DELETE FROM public.notifications
WHERE id::text LIKE 'd8600000-0000-4000-8000-%';

DELETE FROM public.jobs
WHERE id::text LIKE 'd8100000-0000-4000-8000-%';

COMMIT;
