-- Migration: 011_customer_job_mutations.sql
-- Purpose: Add Row Level Security (RLS) policies allowing authenticated customers to create,
--          update, cancel, dispute, accept offers, and review their own jobs directly.
--          This enables the frontend customer portal to work seamlessly with Supabase
--          both when the C# backend engine is active and as a direct resilient fallback.
-- DRAFT FOR HUMAN REVIEW BEFORE RUNNING IN SUPABASE SQL EDITOR

-- 1. Customer Job Creation Policy
DROP POLICY IF EXISTS "jobs_insert_customer" ON public.jobs;
CREATE POLICY "jobs_insert_customer"
    ON public.jobs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        customer_id = (SELECT auth.uid())
        AND status IN ('Draft', 'Open')
    );

COMMENT ON POLICY "jobs_insert_customer" ON public.jobs IS
    'Allows authenticated customers to create new jobs as either Draft or Open under their own user ID.';

-- 2. Customer Job Update Policy (for draft edits, publishing, cancellations, completions, disputes)
DROP POLICY IF EXISTS "jobs_update_customer" ON public.jobs;
CREATE POLICY "jobs_update_customer"
    ON public.jobs
    FOR UPDATE
    TO authenticated
    USING (
        customer_id = (SELECT auth.uid())
        OR public.is_admin()
    )
    WITH CHECK (
        customer_id = (SELECT auth.uid())
        OR public.is_admin()
    );

COMMENT ON POLICY "jobs_update_customer" ON public.jobs IS
    'Allows customers to update their own jobs (e.g. edit draft, publish, cancel, dispute, complete).';

-- 3. Job Events Insert Policy (records state transition audit logs)
DROP POLICY IF EXISTS "job_events_insert_customer" ON public.job_events;
CREATE POLICY "job_events_insert_customer"
    ON public.job_events
    FOR INSERT
    TO authenticated
    WITH CHECK (
        actor_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = job_events.job_id
              AND (
                  j.customer_id = (SELECT auth.uid())
                  OR j.assigned_professional_id = (SELECT auth.uid())
              )
        )
        OR public.is_admin()
    );

COMMENT ON POLICY "job_events_insert_customer" ON public.job_events IS
    'Allows customers, assigned professionals, and admins to log job state transitions in job_events.';

-- 4. Customer Offer Acceptance / Rejection Policy
DROP POLICY IF EXISTS "offers_update_customer" ON public.offers;
CREATE POLICY "offers_update_customer"
    ON public.offers
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = offers.job_id
              AND j.customer_id = (SELECT auth.uid())
        )
        OR professional_id = (SELECT auth.uid())
        OR public.is_admin()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = offers.job_id
              AND j.customer_id = (SELECT auth.uid())
        )
        OR professional_id = (SELECT auth.uid())
        OR public.is_admin()
    );

COMMENT ON POLICY "offers_update_customer" ON public.offers IS
    'Allows customers to accept or reject offers submitted to their own jobs.';

-- 5. Customer Conversation Creation Policy (when offer is accepted)
DROP POLICY IF EXISTS "conversations_insert_customer" ON public.conversations;
CREATE POLICY "conversations_insert_customer"
    ON public.conversations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        customer_id = (SELECT auth.uid())
        OR professional_id = (SELECT auth.uid())
        OR public.is_admin()
    );

COMMENT ON POLICY "conversations_insert_customer" ON public.conversations IS
    'Allows participants or admins to initiate a 1-on-1 job conversation.';

-- 6. Customer Review Insert Policy (verified 1 review per completed job)
DROP POLICY IF EXISTS "reviews_insert_customer" ON public.reviews;
CREATE POLICY "reviews_insert_customer"
    ON public.reviews
    FOR INSERT
    TO authenticated
    WITH CHECK (
        reviewer_id = (SELECT auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = reviews.job_id
              AND j.customer_id = (SELECT auth.uid())
              AND j.status = 'Completed'
        )
    );

COMMENT ON POLICY "reviews_insert_customer" ON public.reviews IS
    'Allows customers to submit a verified rating and review for completed jobs.';
