-- Purpose: Enforce Pakistani mobile numbers in contact_details for every client.
-- Stored format is 11 digits: 03XXXXXXXXX (active prefixes 030-035, 037).

ALTER TABLE public.contact_details
    ADD CONSTRAINT contact_details_pakistani_mobile_phone_check
    CHECK (phone ~ '^03[0-57][0-9]{8}$');
