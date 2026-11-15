-- Migration: 010_customer_dashboard.sql
-- Purpose: Add customer dashboard indexes, default 7-day job expiration, and column guard so
--          authenticated users can only update read_at on their own notifications.
-- Existing policies verified:
--   * offers_select_authorized (003_rls.sql) lets customers SELECT offers on their own jobs.
--   * job_events_select_admin (006_admin_portal.sql) lets customers SELECT job_events on their own jobs.
--   * professional_profiles_read_authenticated (005_dual_role_professional_applications.sql) lets customers SELECT approved professionals.
--   * contact_details_select (003_rls.sql) + public.can_see_contact(uuid) (002_functions_triggers.sql) lets a customer SELECT
--     the assigned professional's phone only when a job between them is in Assigned, In progress, Completed, or Disputed.
--   * notifications_select_owner and notifications_update_read_owner (003_rls.sql) let a user SELECT and UPDATE their own notifications.
-- DRAFT FOR HUMAN REVIEW BEFORE RUNNING

-- 1. Restrict authenticated notification updates to read_at only
CREATE OR REPLACE FUNCTION public.protect_notification_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF (SELECT auth.uid()) IS NOT NULL THEN
        IF NEW.id IS DISTINCT FROM OLD.id
           OR NEW.user_id IS DISTINCT FROM OLD.user_id
           OR NEW.type IS DISTINCT FROM OLD.type
           OR NEW.payload IS DISTINCT FROM OLD.payload
           OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
            RAISE EXCEPTION 'Unauthorized: Clients may only update read_at on their notifications.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.protect_notification_columns() IS 'Ensures authenticated clients can only modify read_at when updating notifications.';

DROP TRIGGER IF EXISTS trg_protect_notifications_columns ON public.notifications;
CREATE TRIGGER trg_protect_notifications_columns
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_notification_columns();

-- 2. Add customer job and offer lookup indexes if absent
CREATE INDEX IF NOT EXISTS idx_jobs_customer_created_at_desc
    ON public.jobs (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_offers_job_id_status
    ON public.offers (job_id, status);

-- 3. Default jobs.expires_at to seven days after creation when not explicitly supplied
ALTER TABLE public.jobs
    ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days');
