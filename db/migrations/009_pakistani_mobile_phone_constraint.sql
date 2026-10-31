-- Purpose: Enforce Pakistani mobile numbers in contact_details for every client.
-- Stored format is 11 digits: 03XXXXXXXXX.

ALTER TABLE public.contact_details
    ADD CONSTRAINT contact_details_pakistani_mobile_phone_check
    CHECK (phone ~ '^03[0-9]{9}$');
