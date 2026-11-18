-- Purpose: Align mobile phone check constraint on contact_details across customer, professional, and admin roles.
-- Enforces valid 11-digit Pakistani mobile numbers starting with active prefixes (030-035, 037) and disallowing 036, 038, 039.

ALTER TABLE public.contact_details
    DROP CONSTRAINT IF EXISTS contact_details_pakistani_mobile_phone_check;

ALTER TABLE public.contact_details
    ADD CONSTRAINT contact_details_pakistani_mobile_phone_check
    CHECK (phone ~ '^03[0-57][0-9]{8}$');
