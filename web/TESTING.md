# ProLink Dual-Role & Professional Application Testing Guide

This checklist details manual and automated verification procedures for the unified account model and dual-role professional application flow implemented in migration `005_dual_role_professional_applications.sql`.

---

## Architecture Overview
- **Unified Account Model**: Every user registers with account authorization `profiles.role = 'user'` (or `'admin'`). There is no role selection during signup. All users can post jobs as customers.
- **Professional Lifecycle**: A user applies to offer professional services via the `/become-professional` route which executes the atomic `apply_as_professional(...)` RPC. The application status resides in `public.professional_profiles.status` (`'pending'`, `'approved'`, `'rejected'`, or `'suspended'`).
- **No Dashboard Route**: There is no `/dashboard`, `/pro`, or separate dashboard portal. All authenticated users land on `"/"` or safe allow-listed `?next=` paths (`"/"` and `"/become-professional"`).

---

## Test Checklist

### 1. Unified Signup (Email & Google OAuth)
* **Goal**: Ensure new users register without a role choice and are provisioned as standard `user` accounts.
* **Steps**:
  1. Navigate to `http://localhost:3000/sign-in?mode=signup` or click **Sign In** on the navbar and switch to the **Sign Up** tab.
  2. Verify:
     - Form has inputs for **Full Name**, **Email Address**, and **Password**.
     - There is **no** role selector, toggle, or customer vs. professional switch.
     - Button reads **Create account**.
  3. Fill in details and click **Create account** (or authenticate with Google).
* **Expected Result**:
  - In `public.profiles`, a new row is created with `role = 'user'`.
  - No `professional_profiles` row is created automatically.
  - Browser redirects directly to `/`.

---

### 2. Backwards-Compatible `?role=professional` Redirect
* **Goal**: Verify legacy links pointing to `/sign-up?role=professional` smoothly guide the user to the professional application.
* **Steps**:
  1. Open an incognito browser window and navigate to `http://localhost:3000/sign-in?mode=signup&role=professional` (or `/sign-up?role=professional`).
  2. Sign in with existing credentials or complete signup for a new account.
* **Expected Result**:
  - The legacy `?role=professional` parameter is automatically detected and mapped to `next=/become-professional`.
  - After successful authentication, the user is redirected straight to `/become-professional`.

---

### 3. Open Redirect Prevention & Strict `?next=` Allow-List
* **Goal**: Prevent open redirect vulnerabilities and navigation to non-existent routes.
* **Steps**:
  1. Test external URL: `http://localhost:3000/sign-in?next=https://malicious.com`
  2. Test scheme-relative URL: `http://localhost:3000/sign-in?next=//malicious.com`
  3. Test non-existent route: `http://localhost:3000/sign-in?next=/dashboard`
  4. Test allow-listed path: `http://localhost:3000/sign-in?next=/become-professional`
* **Expected Result**:
  - Cases 1, 2, and 3 are blocked by `sanitizeNextPath()` and safely fall back to `"/"`.
  - Case 4 is permitted and navigates the authenticated user to `"/become-professional"`.

---

### 4. Navbar & User Menu Behavior
* **Logged-Out Visitor**:
  - Navbar displays: ProLink Logo $\rightarrow$ Nav Links $\rightarrow$ "Become a professional" (outline button) $\rightarrow$ "Sign In" (text link) $\rightarrow$ "Post a Job" (green button).
  - Clicking "Become a professional" opens `/sign-up?next=/become-professional`.
* **Logged-In User (`state: 'none'`)**:
  - "Sign In" link is replaced by the compact User Menu button showing user's initial and name.
  - Clicking the user menu displays a dropdown:
    - User name and "Customer Account" badge.
    - "Become a professional" link (`/become-professional`).
    - "Sign out" button.
  - No links to `/dashboard` or `/profile` exist.
* **Sign Out**:
  - Clicking "Sign out" calls `supabase.auth.signOut()`, resets local auth state, and refreshes the page back to the logged-out view.

---

### 5. Navbar & Landing CTA State Machine
Verify the CTA appearance across professional lifecycle states:
| State | Navbar CTA Button | User Menu Item | Landing Section (above footer) |
|---|---|---|---|
| **logged_out** | "Become a professional" | *N/A (Shows "Sign In")* | Visible ("Grow your work with ProLink") |
| **none** | "Become a professional" | "Become a professional" | Visible ("Grow your work with ProLink") |
| **pending** | *Hidden (No prominent button)* | "Application pending" | *Hidden* |
| **approved** | *Hidden (No prominent button)* | "Professional active" | *Hidden* |
| **rejected** | "Reapply as professional" (amber) | "View application" | Visible with admin feedback quote |
| **suspended** | *Hidden (No prominent button)* | "Account on hold" | *Hidden* |

---

### 6. `/become-professional` Protected Route & Lifecycle Views

#### A. Logged-Out Access
* **Step**: Navigate directly to `http://localhost:3000/become-professional` in a logged-out session.
* **Expected Result**: Server component redirects immediately to `/sign-in?mode=signup&next=/become-professional`.

#### B. Initial Application (`state: 'none'`)
* **Steps**:
  1. Sign in as a user with no professional profile and go to `/become-professional`.
  2. Verify the form fields:
     - Trade Categories: Multi-select pills (Plumbing, Electrical, AC Repair, etc.). Enforces 1 to 5 selections.
     - Coverage Areas: Multi-select pills. Enforces 1 to 12 selections.
     - Years of Experience: Number input (0 to 60).
     - Bio: Textarea with live character counter (enforces 30 to 1,000 characters).
     - Phone: Pre-filled from `contact_details` if available (enforces 10 to 15 digits).
     - Confirmation checkbox: Required before submit.
  3. Fill out valid data and click **Submit application**.
* **Expected Result**:
  - Client invokes `supabase.rpc('apply_as_professional', { p_bio, p_years, p_category_ids, p_area_ids, p_phone })`.
  - Page updates dynamically to the **Under Review** status card.

#### C. Pending Application (`state: 'pending'`)
* **Steps**: Visit `/become-professional` while an application is pending.
* **Expected Result**:
  - Displays calm review card with ⏳ badge: "Your application is being reviewed".
  - Shows summary of submitted trade categories, coverage areas, experience, phone, and submission date.
  - "Return to home" button links back to `"/"`. No edit form is visible.

#### D. Rejected Application & Reapplication (`state: 'rejected'`)
* **Steps**:
  1. Have an admin reject the application with a note (e.g., `"Please provide more details regarding your HVAC certification."`).
  2. Visit `/become-professional` as the user.
* **Expected Result**:
  - Header displays amber warning badge: "Application Needs Update".
  - Reviewer feedback callout renders: `Feedback: "Please provide more details regarding your HVAC certification."`.
  - Form fields are pre-filled with previous inputs (skills, areas, bio, years, phone).
  - Submit button reads **Update and reapply**.
  - Submitting calls `apply_as_professional` RPC, resets status to `'pending'`, and returns to the pending review card.

#### E. Approved Professional (`state: 'approved'`)
* **Steps**: Visit `/become-professional` with an approved account.
* **Expected Result**:
  - Displays celebratory card with green check badge: "You're an approved ProLink professional!".
  - Body text notes: "Your professional tools (job feed, quoting, profile) are coming in the next release. In the meantime, you can continue using ProLink as a customer."
  - "Return to home" button links back to `"/"`.

#### F. Suspended Professional (`state: 'suspended'`)
* **Steps**: Visit `/become-professional` with a suspended account.
* **Expected Result**:
  - Displays notice card with red alert badge: "Professional account on hold".
  - Shows admin note if present and contact instructions for `support@prolink.pk`.
