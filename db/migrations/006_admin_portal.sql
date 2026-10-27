-- Purpose: Add admin portal schema additions, account suspension columns, audit log, reports table, admin RPCs, RLS policies, and indexes.
-- Run order: 6 (run after 001_core_schema.sql, 002_functions_triggers.sql, 003_rls.sql, 004_google_onboarding.sql, and 005_dual_role_professional_applications.sql).
-- DRAFT FOR HUMAN REVIEW BEFORE RUNNING

-- 1. Account suspension columns on profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS suspended_reason text,
    ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

COMMENT ON COLUMN public.profiles.is_suspended IS 'True when an administrator has suspended the user account.';
COMMENT ON COLUMN public.profiles.suspended_reason IS 'Explanation recorded by the administrator when suspending the user.';
COMMENT ON COLUMN public.profiles.suspended_at IS 'Timestamp when the account was most recently suspended.';

-- Extend protect_sensitive_columns so clients cannot modify suspension fields directly
CREATE OR REPLACE FUNCTION public.protect_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF CURRENT_USER IN ('authenticated', 'anon') THEN
        IF TG_TABLE_NAME = 'profiles' THEN
            IF NEW.role IS DISTINCT FROM OLD.role THEN
                RAISE EXCEPTION 'Unauthorized: Modifying role directly is restricted to administrators and system processes.'
                    USING ERRCODE = '42501';
            END IF;

            IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
               OR NEW.suspended_reason IS DISTINCT FROM OLD.suspended_reason
               OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at THEN
                RAISE EXCEPTION 'Unauthorized: Modifying account suspension columns directly is prohibited.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;

        IF TG_TABLE_NAME = 'professional_profiles' THEN
            IF NEW.status IS DISTINCT FROM OLD.status THEN
                RAISE EXCEPTION 'Unauthorized: Modifying application status directly is prohibited. Use apply_as_professional() or administrative review.'
                    USING ERRCODE = '42501';
            END IF;

            IF NEW.verified IS DISTINCT FROM OLD.verified THEN
                RAISE EXCEPTION 'Unauthorized: Modifying verification status directly is prohibited.'
                    USING ERRCODE = '42501';
            END IF;

            IF NEW.applied_at IS DISTINCT FROM OLD.applied_at
               OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
               OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
               OR NEW.review_note IS DISTINCT FROM OLD.review_note THEN
                RAISE EXCEPTION 'Unauthorized: Modifying application review metadata directly is prohibited.'
                    USING ERRCODE = '42501';
            END IF;

            IF NEW.response_rate IS DISTINCT FROM OLD.response_rate
               OR NEW.rating_count IS DISTINCT FROM OLD.rating_count
               OR NEW.rating_sum IS DISTINCT FROM OLD.rating_sum
               OR NEW.avg_rating_bayes IS DISTINCT FROM OLD.avg_rating_bayes THEN
                RAISE EXCEPTION 'Unauthorized: Modifying rating aggregations directly is prohibited.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Suspended accounts cannot act as approved professionals even if their professional status is approved
CREATE OR REPLACE FUNCTION public.is_approved_professional(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.professional_profiles pp
        JOIN public.profiles p ON p.id = pp.profile_id
        WHERE pp.profile_id = uid
          AND pp.status = 'approved'
          AND p.is_suspended = false
    );
$$;

COMMENT ON FUNCTION public.is_approved_professional(uuid) IS 'Returns true only when the user has an approved professional profile and is not suspended.';

-- 2. Administrative audit log table and internal logging helper
CREATE TABLE IF NOT EXISTS public.admin_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text NOT NULL,
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_actions IS 'Immutable audit trail of all administrative mutations.';

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_actions_select_admin" ON public.admin_actions;
CREATE POLICY "admin_actions_select_admin"
    ON public.admin_actions
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Internal helper called by admin functions to record an audit log entry
CREATE OR REPLACE FUNCTION public.log_admin_action(
    p_action text,
    p_target_type text,
    p_target_id text,
    p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id uuid;
    v_action_id uuid;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only platform administrators can record admin actions.'
            USING ERRCODE = '42501';
    END IF;

    v_admin_id := (SELECT auth.uid());

    INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, details, created_at)
    VALUES (
        v_admin_id,
        TRIM(COALESCE(p_action, '')),
        TRIM(COALESCE(p_target_type, '')),
        TRIM(COALESCE(p_target_id, '')),
        COALESCE(p_details, '{}'::jsonb),
        now()
    )
    RETURNING id INTO v_action_id;

    RETURN v_action_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb) FROM public;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb) FROM authenticated;

-- 3. Add note column to job_events for cancellation and dispute resolution explanations
ALTER TABLE public.job_events
    ADD COLUMN IF NOT EXISTS note text;

COMMENT ON COLUMN public.job_events.note IS 'Optional explanation note attached to a job state transition.';

-- 4. Moderation reports table and RLS policies
CREATE TABLE IF NOT EXISTS public.reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
    reason text NOT NULL CHECK (length(TRIM(reason)) >= 3),
    details text,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
    resolution_note text,
    resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_reports_target_required CHECK (
        target_user_id IS NOT NULL OR target_job_id IS NOT NULL
    )
);

COMMENT ON TABLE public.reports IS 'User-submitted moderation reports targeting a user, a job, or both.';

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
CREATE POLICY "reports_insert_own"
    ON public.reports
    FOR INSERT
    TO authenticated
    WITH CHECK (reporter_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "reports_select_own_or_admin" ON public.reports;
CREATE POLICY "reports_select_own_or_admin"
    ON public.reports
    FOR SELECT
    TO authenticated
    USING (
        reporter_id = (SELECT auth.uid())
        OR public.is_admin()
    );

-- 5. Case-insensitive uniqueness on category names
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_lower
    ON public.categories (LOWER(TRIM(name)));

-- 6. Admin RPC: Suspend or unsuspend a user account
CREATE OR REPLACE FUNCTION public.admin_set_user_suspended(
    p_user_id uuid,
    p_suspended boolean,
    p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id uuid;
    v_target_role text;
    v_clean_reason text;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only platform administrators can suspend or unsuspend users.'
            USING ERRCODE = '42501';
    END IF;

    v_admin_id := (SELECT auth.uid());

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid target: User ID is required.'
            USING ERRCODE = '22023';
    END IF;

    IF p_user_id = v_admin_id THEN
        RAISE EXCEPTION 'Invalid target: Administrators cannot suspend or unsuspend themselves.'
            USING ERRCODE = '42501';
    END IF;

    SELECT role INTO v_target_role
    FROM public.profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: No profile exists for user %.', p_user_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_target_role = 'admin' THEN
        RAISE EXCEPTION 'Invalid target: Administrators cannot suspend another administrator.'
            USING ERRCODE = '42501';
    END IF;

    v_clean_reason := TRIM(COALESCE(p_reason, ''));
    IF COALESCE(p_suspended, false) = true AND v_clean_reason = '' THEN
        RAISE EXCEPTION 'Reason required: A non-empty reason is required when suspending a user.'
            USING ERRCODE = '22023';
    END IF;

    IF COALESCE(p_suspended, false) = true THEN
        UPDATE public.profiles
        SET is_suspended = true,
            suspended_reason = v_clean_reason,
            suspended_at = now(),
            updated_at = now()
        WHERE id = p_user_id;

        PERFORM public.log_admin_action(
            'user_suspended',
            'user',
            p_user_id::text,
            jsonb_build_object('suspended', true, 'reason', v_clean_reason)
        );
    ELSE
        UPDATE public.profiles
        SET is_suspended = false,
            suspended_reason = NULL,
            suspended_at = NULL,
            updated_at = now()
        WHERE id = p_user_id;

        PERFORM public.log_admin_action(
            'user_unsuspended',
            'user',
            p_user_id::text,
            jsonb_build_object('suspended', false, 'reason', NULLIF(v_clean_reason, ''))
        );
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_suspended(uuid, boolean, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_suspended(uuid, boolean, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_suspended(uuid, boolean, text) TO authenticated;

-- 7. Admin RPC: Create a category
CREATE OR REPLACE FUNCTION public.admin_create_category(
    p_name text,
    p_parent_id bigint DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_clean_name text;
    v_new_id bigint;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only platform administrators can create categories.'
            USING ERRCODE = '42501';
    END IF;

    v_clean_name := TRIM(COALESCE(p_name, ''));
    IF length(v_clean_name) < 2 OR length(v_clean_name) > 60 THEN
        RAISE EXCEPTION 'Invalid category name: Name must be between 2 and 60 characters.'
            USING ERRCODE = '22023';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.categories
        WHERE LOWER(TRIM(name)) = LOWER(v_clean_name)
    ) THEN
        RAISE EXCEPTION 'Duplicate category name: A category named "%" already exists.', v_clean_name
            USING ERRCODE = '23505';
    END IF;

    IF p_parent_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.categories WHERE id = p_parent_id
    ) THEN
        RAISE EXCEPTION 'Parent category not found: No category exists with id %.', p_parent_id
            USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.categories (name, parent_id, is_active)
    VALUES (v_clean_name, p_parent_id, true)
    RETURNING id INTO v_new_id;

    PERFORM public.log_admin_action(
        'category_created',
        'category',
        v_new_id::text,
        jsonb_build_object('name', v_clean_name, 'parent_id', p_parent_id)
    );

    RETURN v_new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_create_category(text, bigint) FROM public;
REVOKE EXECUTE ON FUNCTION public.admin_create_category(text, bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_create_category(text, bigint) TO authenticated;

-- 8. Admin RPC: Update a category
CREATE OR REPLACE FUNCTION public.admin_update_category(
    p_id bigint,
    p_name text,
    p_is_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_clean_name text;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only platform administrators can update categories.'
            USING ERRCODE = '42501';
    END IF;

    IF p_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.categories WHERE id = p_id
    ) THEN
        RAISE EXCEPTION 'Category not found: No category exists with id %.', p_id
            USING ERRCODE = 'P0002';
    END IF;

    v_clean_name := TRIM(COALESCE(p_name, ''));
    IF length(v_clean_name) < 2 OR length(v_clean_name) > 60 THEN
        RAISE EXCEPTION 'Invalid category name: Name must be between 2 and 60 characters.'
            USING ERRCODE = '22023';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.categories
        WHERE LOWER(TRIM(name)) = LOWER(v_clean_name)
          AND id <> p_id
    ) THEN
        RAISE EXCEPTION 'Duplicate category name: Another category named "%" already exists.', v_clean_name
            USING ERRCODE = '23505';
    END IF;

    UPDATE public.categories
    SET name = v_clean_name,
        is_active = COALESCE(p_is_active, is_active)
    WHERE id = p_id;

    PERFORM public.log_admin_action(
        'category_updated',
        'category',
        p_id::text,
        jsonb_build_object('name', v_clean_name, 'is_active', p_is_active)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_category(bigint, text, boolean) FROM public;
REVOKE EXECUTE ON FUNCTION public.admin_update_category(bigint, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_update_category(bigint, text, boolean) TO authenticated;

-- 9. Admin RPC: Resolve or update a moderation report
CREATE OR REPLACE FUNCTION public.admin_resolve_report(
    p_report_id uuid,
    p_status text,
    p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id uuid;
    v_clean_status text;
    v_clean_note text;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only platform administrators can resolve reports.'
            USING ERRCODE = '42501';
    END IF;

    v_admin_id := (SELECT auth.uid());
    v_clean_status := LOWER(TRIM(COALESCE(p_status, '')));
    v_clean_note := TRIM(COALESCE(p_note, ''));

    IF v_clean_status NOT IN ('reviewing', 'resolved', 'dismissed') THEN
        RAISE EXCEPTION 'Invalid report status: Status must be reviewing, resolved, or dismissed.'
            USING ERRCODE = '22023';
    END IF;

    IF v_clean_status IN ('resolved', 'dismissed') AND v_clean_note = '' THEN
        RAISE EXCEPTION 'Resolution note required: A note is required when resolving or dismissing a report.'
            USING ERRCODE = '22023';
    END IF;

    IF p_report_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.reports WHERE id = p_report_id
    ) THEN
        RAISE EXCEPTION 'Report not found: No report exists with id %.', p_report_id
            USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.reports
    SET status = v_clean_status,
        resolution_note = COALESCE(NULLIF(v_clean_note, ''), resolution_note),
        resolved_by = v_admin_id,
        resolved_at = CASE
            WHEN v_clean_status IN ('resolved', 'dismissed') THEN now()
            ELSE resolved_at
        END
    WHERE id = p_report_id;

    PERFORM public.log_admin_action(
        'report_' || v_clean_status,
        'report',
        p_report_id::text,
        jsonb_build_object('status', v_clean_status, 'note', NULLIF(v_clean_note, ''))
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text, text) TO authenticated;

-- 10. Update review_professional_application so it also records an admin_actions row
CREATE OR REPLACE FUNCTION public.review_professional_application(
    p_professional_id uuid,
    p_decision text,
    p_note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_admin_id uuid;
    v_sanitized_decision text;
    v_clean_note text;
    v_existing_status text;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only platform administrators can review professional applications.'
            USING ERRCODE = '42501';
    END IF;

    v_admin_id := (SELECT auth.uid());

    v_sanitized_decision := LOWER(TRIM(COALESCE(p_decision, '')));
    IF v_sanitized_decision NOT IN ('approved', 'rejected', 'suspended') THEN
        RAISE EXCEPTION 'Invalid decision: Review decision must be ''approved'', ''rejected'', or ''suspended''.'
            USING ERRCODE = '22023';
    END IF;

    v_clean_note := TRIM(COALESCE(p_note, ''));
    IF v_sanitized_decision IN ('rejected', 'suspended') AND v_clean_note = '' THEN
        RAISE EXCEPTION 'Review note required: An explanation note is mandatory when rejecting or suspending an application.'
            USING ERRCODE = '22023';
    END IF;

    SELECT status INTO v_existing_status
    FROM public.professional_profiles
    WHERE profile_id = p_professional_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found: No professional profile exists for user %.', p_professional_id
            USING ERRCODE = 'P0002';
    END IF;

    IF p_professional_id = v_admin_id THEN
        RAISE EXCEPTION 'Conflict of interest: Administrators cannot review their own professional application.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.professional_profiles
    SET status = v_sanitized_decision,
        verified = (v_sanitized_decision = 'approved'),
        reviewed_by = v_admin_id,
        reviewed_at = now(),
        review_note = NULLIF(v_clean_note, ''),
        updated_at = now()
    WHERE profile_id = p_professional_id;

    INSERT INTO public.notifications (user_id, type, payload)
    VALUES (
        p_professional_id,
        'professional_application_reviewed',
        jsonb_build_object(
            'decision', v_sanitized_decision,
            'note', NULLIF(v_clean_note, ''),
            'reviewed_at', now()
        )
    );

    PERFORM public.log_admin_action(
        'application_' || v_sanitized_decision,
        'professional_application',
        p_professional_id::text,
        jsonb_build_object(
            'decision', v_sanitized_decision,
            'previous_status', v_existing_status,
            'note', NULLIF(v_clean_note, '')
        )
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.review_professional_application(uuid, text, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.review_professional_application(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.review_professional_application(uuid, text, text) TO authenticated;

-- 11. Admin RPC: Dashboard overview summary metrics
CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_total_users bigint;
    v_new_users_7d bigint;
    v_pros_by_status jsonb;
    v_jobs_by_status jsonb;
    v_jobs_7d bigint;
    v_open_reports bigint;
    v_disputed_jobs bigint;
    v_pending_apps bigint;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only platform administrators can view overview metrics.'
            USING ERRCODE = '42501';
    END IF;

    SELECT count(*),
           count(*) FILTER (WHERE created_at >= now() - interval '7 days')
    INTO v_total_users, v_new_users_7d
    FROM public.profiles;

    SELECT jsonb_build_object(
        'pending', count(*) FILTER (WHERE status = 'pending'),
        'approved', count(*) FILTER (WHERE status = 'approved'),
        'rejected', count(*) FILTER (WHERE status = 'rejected'),
        'suspended', count(*) FILTER (WHERE status = 'suspended')
    ),
    count(*) FILTER (WHERE status = 'pending')
    INTO v_pros_by_status, v_pending_apps
    FROM public.professional_profiles;

    SELECT jsonb_build_object(
        'Draft', count(*) FILTER (WHERE status = 'Draft'),
        'Open', count(*) FILTER (WHERE status = 'Open'),
        'Offers received', count(*) FILTER (WHERE status = 'Offers received'),
        'Assigned', count(*) FILTER (WHERE status = 'Assigned'),
        'In progress', count(*) FILTER (WHERE status = 'In progress'),
        'Completed', count(*) FILTER (WHERE status = 'Completed'),
        'Cancelled', count(*) FILTER (WHERE status = 'Cancelled'),
        'Expired', count(*) FILTER (WHERE status = 'Expired'),
        'Disputed', count(*) FILTER (WHERE status = 'Disputed')
    ),
    count(*) FILTER (WHERE created_at >= now() - interval '7 days'),
    count(*) FILTER (WHERE status = 'Disputed')
    INTO v_jobs_by_status, v_jobs_7d, v_disputed_jobs
    FROM public.jobs;

    SELECT count(*) FILTER (WHERE status = 'open')
    INTO v_open_reports
    FROM public.reports;

    RETURN jsonb_build_object(
        'total_users', COALESCE(v_total_users, 0),
        'new_users_last_7_days', COALESCE(v_new_users_7d, 0),
        'professionals_by_status', COALESCE(v_pros_by_status, '{}'::jsonb),
        'jobs_by_status', COALESCE(v_jobs_by_status, '{}'::jsonb),
        'jobs_last_7_days', COALESCE(v_jobs_7d, 0),
        'open_reports', COALESCE(v_open_reports, 0),
        'disputed_jobs', COALESCE(v_disputed_jobs, 0),
        'pending_applications', COALESCE(v_pending_apps, 0)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_overview() FROM public;
REVOKE EXECUTE ON FUNCTION public.admin_overview() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;

-- 12. Admin RPC: Daily job creation counts over a contiguous day window (up to 60 days, including zero days)
CREATE OR REPLACE FUNCTION public.admin_jobs_by_day(
    p_days int DEFAULT 30
)
RETURNS TABLE (
    day date,
    job_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only platform administrators can query daily job statistics.'
            USING ERRCODE = '42501';
    END IF;

    IF p_days IS NULL OR p_days < 1 OR p_days > 60 THEN
        RAISE EXCEPTION 'Invalid range: p_days must be between 1 and 60.'
            USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    SELECT
        series.day::date AS day,
        count(j.id)::bigint AS job_count
    FROM generate_series(
        CURRENT_DATE - (p_days - 1),
        CURRENT_DATE,
        interval '1 day'
    ) AS series(day)
    LEFT JOIN public.jobs j
        ON (j.created_at AT TIME ZONE 'UTC')::date = series.day::date
    GROUP BY series.day
    ORDER BY series.day ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_jobs_by_day(int) FROM public;
REVOKE EXECUTE ON FUNCTION public.admin_jobs_by_day(int) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_jobs_by_day(int) TO authenticated;

-- 13. Admin read policies across marketplace tables and privacy-preserving message access
-- Admins can read profiles, professional_profiles, professional_skills, professional_areas,
-- contact_details, jobs, offers, conversations, and job_events.
-- Admins can read messages ONLY when the conversation belongs to a job whose status is 'Disputed'.

DROP POLICY IF EXISTS "messages_select_participants" ON public.messages;
CREATE POLICY "messages_select_participants"
    ON public.messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.conversations c
            LEFT JOIN public.jobs j ON j.id = c.job_id
            WHERE c.id = messages.conversation_id
              AND (
                  c.customer_id = (SELECT auth.uid())
                  OR c.professional_id = (SELECT auth.uid())
                  OR (
                      public.is_admin()
                      AND j.status = 'Disputed'
                  )
              )
        )
    );

-- Ensure explicit admin SELECT coverage on job_events
DROP POLICY IF EXISTS "job_events_select_admin" ON public.job_events;
CREATE POLICY "job_events_select_admin"
    ON public.job_events
    FOR SELECT
    TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1
            FROM public.jobs j
            WHERE j.id = job_events.job_id
              AND (
                  j.customer_id = (SELECT auth.uid())
                  OR j.assigned_professional_id = (SELECT auth.uid())
              )
        )
    );

-- 14. Indexes for administrative list and filter queries
CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at_desc
    ON public.jobs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_status_created_at
    ON public.reports (status, created_at);

CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at_desc
    ON public.admin_actions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_created_at
    ON public.profiles (created_at);

CREATE INDEX IF NOT EXISTS idx_job_events_job_id_at
    ON public.job_events (job_id, at);
