-- ==============================================================================
-- Migration: 003_rls.sql
-- Purpose: Enable Row Level Security (RLS), define security policies, and configure Realtime
-- Order: 3 of 3 migrations
-- Status: DRAFT FOR HUMAN REVIEW BEFORE RUNNING
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Enable RLS on All Public Tables
-- ------------------------------------------------------------------------------

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. Lookup Tables (Categories, Areas, Area Edges)
-- ------------------------------------------------------------------------------

-- Public read access for lookup data
CREATE POLICY "categories_read_public"
    ON public.categories
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "categories_admin_all"
    ON public.categories
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "areas_read_public"
    ON public.areas
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "areas_admin_all"
    ON public.areas
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "area_edges_read_public"
    ON public.area_edges
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "area_edges_admin_all"
    ON public.area_edges
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. Profiles & Contact Details
-- ------------------------------------------------------------------------------

-- Authenticated users can view all profiles (names, roles, avatar links)
CREATE POLICY "profiles_read_authenticated"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Users can update their own profile information (role changes blocked by trigger)
CREATE POLICY "profiles_update_owner"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = (SELECT auth.uid()))
    WITH CHECK (id = (SELECT auth.uid()));

-- Admins can update any profile
CREATE POLICY "profiles_admin_update"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Contact Details: Controlled by can_see_contact() function
CREATE POLICY "contact_details_select"
    ON public.contact_details
    FOR SELECT
    TO authenticated
    USING (public.can_see_contact(profile_id));

CREATE POLICY "contact_details_insert_owner"
    ON public.contact_details
    FOR INSERT
    TO authenticated
    WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY "contact_details_update_owner"
    ON public.contact_details
    FOR UPDATE
    TO authenticated
    USING (profile_id = (SELECT auth.uid()))
    WITH CHECK (profile_id = (SELECT auth.uid()));

-- ------------------------------------------------------------------------------
-- 4. Professional Extensions (Profile, Skills, Areas)
-- ------------------------------------------------------------------------------

-- Professional Profiles: Publicly readable for verified browsing and ranking
CREATE POLICY "professional_profiles_read_authenticated"
    ON public.professional_profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "professional_profiles_update_owner"
    ON public.professional_profiles
    FOR UPDATE
    TO authenticated
    USING (profile_id = (SELECT auth.uid()))
    WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY "professional_profiles_admin_update"
    ON public.professional_profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Professional Skills: Readable by all, manageable by owner
CREATE POLICY "professional_skills_read"
    ON public.professional_skills
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "professional_skills_insert_owner"
    ON public.professional_skills
    FOR INSERT
    TO authenticated
    WITH CHECK (professional_id = (SELECT auth.uid()));

CREATE POLICY "professional_skills_update_owner"
    ON public.professional_skills
    FOR UPDATE
    TO authenticated
    USING (professional_id = (SELECT auth.uid()))
    WITH CHECK (professional_id = (SELECT auth.uid()));

CREATE POLICY "professional_skills_delete_owner"
    ON public.professional_skills
    FOR DELETE
    TO authenticated
    USING (professional_id = (SELECT auth.uid()));

-- Professional Service Areas: Readable by all, manageable by owner
CREATE POLICY "professional_areas_read"
    ON public.professional_areas
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "professional_areas_insert_owner"
    ON public.professional_areas
    FOR INSERT
    TO authenticated
    WITH CHECK (professional_id = (SELECT auth.uid()));

CREATE POLICY "professional_areas_update_owner"
    ON public.professional_areas
    FOR UPDATE
    TO authenticated
    USING (professional_id = (SELECT auth.uid()))
    WITH CHECK (professional_id = (SELECT auth.uid()));

CREATE POLICY "professional_areas_delete_owner"
    ON public.professional_areas
    FOR DELETE
    TO authenticated
    USING (professional_id = (SELECT auth.uid()));

-- ------------------------------------------------------------------------------
-- 5. Jobs & Offers (Client Read-Only; Writes handled via backend service-role)
-- ------------------------------------------------------------------------------

-- Jobs visibility matrix:
-- 1. Customer who created the job
-- 2. Professionals when job is open or receiving offers
-- 3. Assigned professional
-- 4. Administrators
CREATE POLICY "jobs_select_authorized"
    ON public.jobs
    FOR SELECT
    TO authenticated
    USING (
        customer_id = (SELECT auth.uid())
        OR
        (
            status IN ('Open', 'Offers received')
            AND EXISTS (
                SELECT 1
                FROM public.profiles
                WHERE id = (SELECT auth.uid())
                  AND role = 'professional'
            )
        )
        OR
        assigned_professional_id = (SELECT auth.uid())
        OR
        public.is_admin()
    );

-- Offers visibility matrix:
-- 1. Offering professional
-- 2. Customer who posted the corresponding job
-- 3. Administrators
CREATE POLICY "offers_select_authorized"
    ON public.offers
    FOR SELECT
    TO authenticated
    USING (
        professional_id = (SELECT auth.uid())
        OR
        EXISTS (
            SELECT 1
            FROM public.jobs j
            WHERE j.id = offers.job_id
              AND j.customer_id = (SELECT auth.uid())
        )
        OR
        public.is_admin()
    );

-- ------------------------------------------------------------------------------
-- 6. Messaging (Conversations & Messages)
-- ------------------------------------------------------------------------------

-- Conversations visibility: Participants or admin
CREATE POLICY "conversations_select_participants"
    ON public.conversations
    FOR SELECT
    TO authenticated
    USING (
        customer_id = (SELECT auth.uid())
        OR professional_id = (SELECT auth.uid())
        OR public.is_admin()
    );

-- Messages: Participants can read messages in their conversation
CREATE POLICY "messages_select_participants"
    ON public.messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND (
                  c.customer_id = (SELECT auth.uid())
                  OR c.professional_id = (SELECT auth.uid())
                  OR public.is_admin()
              )
        )
    );

-- Messages: Sender can insert message only if participant in the conversation
CREATE POLICY "messages_insert_sender"
    ON public.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = (SELECT auth.uid())
        AND
        EXISTS (
            SELECT 1
            FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND (
                  c.customer_id = (SELECT auth.uid())
                  OR c.professional_id = (SELECT auth.uid())
              )
        )
    );

-- ------------------------------------------------------------------------------
-- 7. Reviews, Notifications, and Audit Events
-- ------------------------------------------------------------------------------

-- Reviews: Readable by all authenticated users; writes managed via backend
CREATE POLICY "reviews_select_authenticated"
    ON public.reviews
    FOR SELECT
    TO authenticated
    USING (true);

-- Notifications: Strictly private to recipient
CREATE POLICY "notifications_select_owner"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- Recipient can mark notification as read (update read_at)
CREATE POLICY "notifications_update_read_owner"
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

-- Job Events: Audit log visible only to administrators
CREATE POLICY "job_events_select_admin"
    ON public.job_events
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 8. Supabase Realtime Publication Setup
-- ------------------------------------------------------------------------------

-- Ensure supabase_realtime publication includes tables requiring instant push notifications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;
