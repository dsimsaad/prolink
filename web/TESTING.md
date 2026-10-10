# ProLink Authentication & Onboarding Testing Guide

This checklist details manual and automated verification procedures for Google OAuth authentication and the one-time role selection onboarding flow.

---

## Prerequisites
1. Execute migration [`db/migrations/004_google_onboarding.sql`](file:///Users/mrcom/Documents/prolink/db/migrations/004_google_onboarding.sql) in your Supabase SQL Editor.
2. Configure Google OAuth credentials in **Supabase Dashboard $\rightarrow$ Authentication $\rightarrow$ Providers $\rightarrow$ Google**:
   - Enable Google provider.
   - Enter your Google Client ID and Google Client Secret.
3. Configure redirect URLs in **Supabase Dashboard $\rightarrow$ Authentication $\rightarrow$ URL Configuration**:
   - Site URL: `http://localhost:3000` (or production URL).
   - Redirect URLs: `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback`.

---

## Test Checklist

### 1. Google Login Initial Creation & Flag Verification
* **Steps**:
  1. Navigate to `http://localhost:3000/sign-in`.
  2. Click **Google** ("Continue with Google").
  3. Authenticate with a new Google test account.
* **Expected Result**:
  - Browser is redirected to `/auth/callback`, which exchanges the OAuth authorization code.
  - Supabase triggers `handle_new_user()`.
  - In `public.profiles`, a new row is provisioned with:
    - `role`: `'customer'` (baseline default).
    - `onboarding_completed`: `false`.
    - `full_name`: Google profile name (or email prefix if name is absent).
  - The callback detects `onboarding_completed === false` and immediately redirects to `/onboarding`.

---

### 2. Role Onboarding: Selecting Customer
* **Steps**:
  1. On `/onboarding`, select **I want to hire services (Customer)**.
  2. Click **Confirm & Continue**.
* **Expected Result**:
  - The client calls `supabase.rpc('complete_onboarding', { p_role: 'customer' })`.
  - `public.profiles.role` remains `'customer'`.
  - `public.profiles.onboarding_completed` updates to `true`.
  - Browser redirects to `/` (dashboard).
  - Refreshing or navigating back to `/onboarding` redirects straight to `/`.

---

### 3. Role Onboarding: Selecting Professional
* **Steps**:
  1. Sign in with a new Google test account.
  2. On `/onboarding`, select **I am a service professional (Tradesperson)**.
  3. Click **Confirm & Continue**.
* **Expected Result**:
  - The client calls `supabase.rpc('complete_onboarding', { p_role: 'professional' })`.
  - In `public.profiles`, `role` is updated to `'professional'`, and `onboarding_completed` is set to `true`.
  - A corresponding row is automatically created in `public.professional_profiles` with `profile_id = user.id`.
  - Browser redirects to `/` (dashboard).

---

### 4. Integrity Check: Calling `complete_onboarding` a Second Time
* **Steps**:
  1. With an account that has already completed onboarding, open Developer Tools $\rightarrow$ Console in your browser.
  2. Run the following command:
     ```javascript
     const { createBrowserClient } = await import('@supabase/ssr');
     const supabase = createBrowserClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
     );
     const res = await supabase.rpc('complete_onboarding', { p_role: 'professional' });
     console.log(res);
     ```
* **Expected Result**:
  - The RPC call **fails** with error code `22023`.
  - Error message: `Onboarding already completed: Role cannot be modified once set.`
  - The user's role remains unchanged.

---

### 5. Integrity Check: Direct Client Mutation of Protected Columns
* **Steps**:
  1. Open the browser console while signed in as any user.
  2. Attempt to directly update `onboarding_completed` or escalate `role`:
     ```javascript
     const { data, error } = await supabase
       .from('profiles')
       .update({ onboarding_completed: false })
       .eq('id', (await supabase.auth.getUser()).data.user.id);
     console.log('Update onboarding_completed result:', error);

     const { error: roleError } = await supabase
       .from('profiles')
       .update({ role: 'admin' })
       .eq('id', (await supabase.auth.getUser()).data.user.id);
     console.log('Update role result:', roleError);
     ```
* **Expected Result**:
  - Both queries **fail** with SQLSTATE `42501` (Unauthorized).
  - Database trigger `protect_sensitive_columns` catches the modification initiated by the client role (`authenticated`) and blocks it.

---

### 6. Account Linking: Google Login with Existing Password Account Email
* **Behavior Report (What Happens in Supabase Auth)**:
  - **Case A: Automatic Account Linking Enabled (Supabase Default)**:
    If an existing user registered via email/password (`user@example.com`), and later clicks **Google** using the same email address:
    1. Supabase detects that the email matches an existing verified account.
    2. Supabase adds the Google OAuth provider identity to the existing `auth.users` identity array.
    3. The user's UUID (`id`) remains unchanged.
    4. Since the existing account already has `onboarding_completed = true` (from migration `004` or initial registration), `/auth/callback` verifies `onboarding_completed === true` and routes the user directly to the dashboard `/` without requesting onboarding again.
  - **Case B: Email Unconfirmed / Account Linking Disabled**:
    If the email on the password account is unconfirmed or linking is disabled in project configuration, Supabase denies the OAuth exchange and returns an error:
    `An account with this email address already exists` (`error_code=email_exists`).
    The callback catches the error and redirects to `/sign-in?error=Could+not+authenticate+user`, displaying the alert message in the existing auth error banner.
