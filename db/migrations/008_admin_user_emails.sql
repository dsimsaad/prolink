-- Purpose: Allow administrators to view auth email addresses in the user directory.
-- Run after 006_admin_portal.sql.

CREATE OR REPLACE FUNCTION public.admin_get_user_emails(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only platform administrators can view user email addresses.'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT u.id, u.email::text
    FROM auth.users AS u
    WHERE u.id = ANY(COALESCE(p_user_ids, ARRAY[]::uuid[]));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_user_emails(uuid[]) FROM public;
REVOKE EXECUTE ON FUNCTION public.admin_get_user_emails(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_user_emails(uuid[]) TO authenticated;
