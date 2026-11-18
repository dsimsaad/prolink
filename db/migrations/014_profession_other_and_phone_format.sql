-- Add a catch-all trade category and use one consistent phone format everywhere.

INSERT INTO public.categories (name, is_active)
VALUES ('Others', true)
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- Replace the legacy carrier-prefix rule with the sole phone requirement.
ALTER TABLE public.contact_details
    DROP CONSTRAINT IF EXISTS contact_details_pakistani_mobile_phone_check;

ALTER TABLE public.contact_details
    DROP CONSTRAINT IF EXISTS contact_details_phone_format_check;

ALTER TABLE public.contact_details
    ADD CONSTRAINT contact_details_phone_format_check
    CHECK (phone ~ '^0[0-9]{10}$');

-- Bring the already-deployed application RPC into line with the new format.
DO $$
DECLARE
    v_definition text;
BEGIN
    SELECT pg_get_functiondef(
        'public.submit_professional_application(text, text, text, text, text, text, integer, bigint[], text[], bigint[], text, text)'::regprocedure
    ) INTO v_definition;

    IF v_definition IS NOT NULL THEN
        v_definition := replace(v_definition, '^[0-9]{4}-[0-9]{7}$', '^0[0-9]{10}$');
        v_definition := replace(v_definition, 'Phone number must follow the format XXXX-XXXXXXX.', 'Phone number must start with 0 and contain exactly 11 digits.');
        EXECUTE v_definition;
    END IF;
END;
$$;
