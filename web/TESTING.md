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

---

## 7. Admin Portal Setup & Verification Guide (`006_admin_portal.sql`)

### A. Database Migration & Demo Data
1. **Run Migration 006**:
   - Open the **Supabase SQL Editor**, paste the contents of `db/migrations/006_admin_portal.sql`, and click **Run**.
2. **Load Demo Data (Development Only)**:
   - Ensure `db/seed/001_categories_areas.sql` has been applied first.
   - Run `db/seed/002_admin_demo_data.sql` in the Supabase SQL Editor to create demo users (`@example.invalid`), 12 approved professionals, 3 pending and 1 rejected application, 40 jobs across all statuses over the last 30 days, offers, conversations, 3 disputed jobs with notes, 6 reports, and initial audit log rows.
3. **Remove Demo Data**:
   - Run `db/seed/999_remove_demo_data.sql` in the Supabase SQL Editor to cleanly delete all demo rows.

### B. Creating the Administrator Account (Steps Only)
1. Register the account on the live site (`/sign-in?mode=signup`) with your chosen email, or in **Supabase Dashboard $\rightarrow$ Authentication $\rightarrow$ Users $\rightarrow$ Add user**.
2. Run the following query in the **Supabase SQL Editor**:
   ```sql
   update public.profiles set role = 'admin' where id = (select id from auth.users where email = '<ADMIN_EMAIL>');
   ```
3. Change or rotate the administrator password before showing the portal to anyone.

### C. Manual Admin Portal Verification Checklist
- [ ] **Non-admin blocked**: A non-admin user cannot open `/admin` (redirected to `"/"`) and receives `403 Forbidden` when calling any `/admin/*` C# API endpoint.
- [ ] **Admin allowed**: An active admin (`profiles.role = 'admin'`, `is_suspended = false`) can access `/admin` and all `/admin/*` endpoints.
- [ ] **Admin post-login redirect**: Signing in on `/sign-in` (email or Google) as an admin sends the user directly to `/admin`.
- [ ] **Admin navigation UI**: When an admin visits public pages (`/`), the user menu displays an **Admin** link (`/admin`) and hides all **Become a professional** prompts.
- [ ] **Suspended account sign-out**: Signing in as a suspended user (`profiles.is_suspended = true`) immediately signs the user out on the server and displays a clear suspension message on `/sign-in`.
- [ ] **Application moderation**: Approving, rejecting (minimum 10-character note), or suspending applications in `/admin/applications` updates the applicant's status and writes an entry to the audit log (`admin_actions`).
- [ ] **Category management**: Creating, renaming, activating, and deactivating a category in `/admin/categories` updates `public.categories` and writes an entry to `admin_actions`.
- [ ] **Force-cancel & dispute resolution**: Force-cancelling a job in `/admin/jobs/[id]` and resolving a disputed job in `/admin/disputes/[id]` transition `jobs.status` (validated by `JobStateMachine`) and atomically write rows to `job_events` (with note) and `admin_actions`.
- [ ] **Dispute chat privacy**: On `/admin/disputes/[id]`, chat messages are visible while the job is `Disputed`, whereas non-disputed job conversations remain private under RLS.
- [ ] **Rate limiting (`429`)**: Sending requests beyond the configured sliding window (`60` requests per `60` seconds by default) returns `429 Too Many Requests` with a `Retry-After` header.
- [ ] **User suggestions & search**: Typing in the search box on `/admin/users` displays prefix suggestions (`GET /admin/users/suggest` via `Trie`) and full-text ranked results (`GET /admin/users/search` via `InvertedIndex` + `MergeSort`).
- [ ] **Analytics accuracy**: Funnel counts, top categories, top areas (`MinHeap.TopK` + `MergeSort`), and daily job counts on `/admin/analytics` match the database records.
- [ ] **Engine reload**: Clicking **Reload engine data** on `/admin` calls `POST /admin/engine/reload`, rebuilds the in-memory indices and caches, and increments the displayed engine state version.

---

## 8. Public Site Redesign & Honest Copy Manual Verification Checklist

### A. Responsive Viewports & Layout Rhythm
- [ ] **Mobile (375px)**:
  - Header displays logo, hamburger button (minimum 44×44px touch target), and clean drawer.
  - Hero headline wraps naturally; eyebrow, subtext, CTA buttons, and badge pills stack neatly without horizontal overflow.
  - Hero image (`/images/home-hero.webp`) scales with rounded corners and the "Example" offer card docks cleanly below the image without obscuring the subject.
  - Popular Services collapses to a single column (1 col); trade cards show distinct icons on soft-tinted tiles with full readability.
  - How It Works connects vertically with numbered brand circles and dotted line connector.
  - Auth pages (`/sign-in`, `/sign-up`, `/become-professional/sign-in`, `/onboarding`) collapse `.auth-visual` gracefully, presenting the form at full usable width.
- [ ] **Tablet (768px)**:
  - Hero adapts to a balanced two-column or stacked layout without awkward whitespace.
  - Popular Services displays a clean 2-column grid.
  - How It Works shows balanced 3-step cards with sample dispatch and quote snippets.
- [ ] **Desktop (1280px+)**:
  - Header displays full navigation with subtle backdrop blur and elevation on scroll (`.is-scrolled`).
  - Desktop "Become a Professional" button maintains exact original brand green (`--forest: #0f6b3e`) and styling.
  - Hero features mint-to-cream gradient, subtle organic SVG accents, and offset background frame.
  - Popular Services grid displays in 3 columns × 2 rows; cards lift subtly on hover (`translateY(-4px)`).
  - Auth visual side panel (`.auth-visual`) renders rich gradient, `/images/auth-craft.webp`, and honest benefit points.

### B. Accessibility, Focus & Motion
- [ ] **Keyboard-only Navigation**: Tab order flows logically across all interactive elements (skip link, header links, hero actions, service cards, footer, forms); visible focus rings appear on all active elements (`:focus-visible`).
- [ ] **Prefers-Reduced-Motion**: When `prefers-reduced-motion: reduce` is enabled in system settings, all animations (floating card, pulse, scroll reveals) immediately disable (`animation: none`, `transition-duration: 0.01ms`).
- [ ] **Color Contrast (WCAG AA)**:
  - Dark forest text (`--ink: #073820`, `--forest-deep: #0a4f30`) on white and mint backgrounds exceeds `10:1` contrast.
  - Secondary teal and amber accent highlights exceed minimum contrast ratios for graphical controls and emphasis.
  - Gradient CTA banners use high-contrast white text (`--on-dark: #ffffff`) and white action buttons with dark forest text (`6.58:1` contrast).

### C. Header States & Navigation
- [ ] **Logged-Out Visitor**: Header displays "Services", "Features", "About", "FAQs", "Contact", "Sign In", and the untouched "Become a Professional" button.
- [ ] **Logged-In Customer**: Header displays user avatar / dropdown with role "Customer", link to Dashboard (`/user`), and Sign Out action.
- [ ] **Logged-In Professional**:
  - `state === "approved"`: Displays "Approved Professional" badge (no "verified" badge).
  - `state === "pending"`: Displays "Application Under Review".
- [ ] **Logged-In Administrator**: Displays "Administrator" badge and direct link to `/admin`.

### D. Honest Copy & Claim Verification
- [ ] **No Unsupported Claims on Public Surfaces**:
  - Hero eyebrow: "Local skilled professionals, in one place" (no "Pakistan's Verified Skilled Artisans Network").
  - Hero badges: "Compare offers before you hire", "Your phone number stays private until you accept an offer", "Mark a job urgent to be matched first" (no CNIC/biometric/4.9 claims).
  - Single hero example card: Labelled "Example" with sample PKR pricing, inspection fee, arrival time; zero ratings, zero job counts.
  - Services: Exactly 8 categories strictly matching `db/seed/001_categories_areas.sql` in order (`Plumbing`, `Electrical`, `Painting`, `Carpentry`, `AC repair and installation`, `Masonry`, `Home cleaning`, `Appliance repair`).
  - Trust section: "Reviewed before they offer services", "Private by default", "Transparent Pricing" (no police/NADRA/escrow/guarantee wording).
  - About page: Honest facts card ("Pilot city: Lahore", "Offers you can compare", "Phone numbers stay private until you accept") replacing fake stats.
  - Footer: Displays project disclosure: *"ProLink is a university semester project. Some features are still in development. Sample content is for demonstration only."*
  - Auth & Onboarding: Free of fake testimonials ("Khurram Abbas"), fake ratings ("4.92 / 5"), and unused lab technician image (`hero-technician.jpg`).

---

## 9. Network Integration & Contact Desk Verification Checklist

### A. Live Status Page (`/status`)
- [ ] **With `NEXT_PUBLIC_STATUS_FEED_URL` unset (Vercel Production Default)**:
  - Navigate to `http://localhost:3000/status`.
  - Verify the browser makes **zero** WebSocket connection attempts (check Network tab $\rightarrow$ WS filter).
  - Status badge shows `Demo only`.
  - Informational text clearly states: *"The live feed is available in the local demo only."*
  - No `127.0.0.1` or `ws://` addresses appear anywhere in the UI.
- [ ] **With `NEXT_PUBLIC_STATUS_FEED_URL="ws://127.0.0.1:9099"` set (Local Demo)**:
  - Run `python network/status_feed.py`.
  - Open `/status`: badge displays `● Connected`.
  - Up to 50 latest events are shown in the "Demo events" section with clean `from_status → to_status` and timestamp.
  - Stop the Python server (`Ctrl+C`): badge switches to `○ Offline` and automatically retries with exponential backoff up to ~30 seconds without crashing.
  - Malformed WebSocket frames (e.g., non-JSON) are discarded safely without breaking page state.

### B. Contact Form & SMTP Integration (`/contact` & `/api/contact`)
- [ ] **Local SMTP (`SUPPORT_SMTP_HOST=127.0.0.1`, `SUPPORT_SMTP_PORT=2525`)**:
  - Start the local Python server: `python -m aiosmtpd -n -l 127.0.0.1:2525 -c aiosmtpd.handlers.Mailbox mailbox`.
  - Submit a message on `http://localhost:3000/contact`.
  - Form submits successfully (`sentViaSmtp: true`).
  - The message arrives under `network/mailbox/new/` as a valid RFC 5322 email with clean subject and headers.
- [ ] **Production / Gmail SMTP Settings (Deployed Preview)**:
  - Configure `SUPPORT_SMTP_HOST=smtp.gmail.com`, `SUPPORT_SMTP_PORT=587`, `SUPPORT_SMTP_USER`, and `SUPPORT_SMTP_PASSWORD`.
  - Submit the contact form.
  - NodeMailer connects using STARTTLS (`requireTLS: true`) and delivers the inquiry to `SUPPORT_INBOX`.
- [ ] **No SMTP Variables Configured**:
  - Leave `SUPPORT_SMTP_HOST` unset.
  - Submit the contact form.
  - The message is safely retained in internal storage first; the visitor receives a success response with mailto/Gmail fallback links.
  - Zero internal errors, zero leaked server paths or credentials in console or response.
- [ ] **Spam Protections Verified**:
  - Honeypot: Submitting with `hp_field` populated returns success silently but drops email dispatch.
  - Min fill time: Submitting faster than 2 seconds returns success silently without email dispatch.
  - Rate limit: 4th submission within 24 hours from same IP returns `429 Too Many Requests`.

---

## 10. Customer Dashboard & C# Customer API Verification Checklist (`010_customer_dashboard.sql`)

### A. Database Migration, Demo Seed & RLS Verification
- [ ] **Run Migration 010**:
  - Execute [`db/migrations/010_customer_dashboard.sql`](file:///Users/mrcom/Documents/prolink/db/migrations/010_customer_dashboard.sql) in the Supabase SQL Editor.
- [ ] **Run RLS Test Suite (`Tests 1–36`)**:
  - Execute [`db/tests/rls_tests.sql`](file:///Users/mrcom/Documents/prolink/db/tests/rls_tests.sql) in the Supabase SQL Editor and verify `TEST 33` through `TEST 36` report `PASS`:
    - `TEST 33`: Customer can read their own `jobs`, `offers`, and `job_events`, and cannot read another customer's.
    - `TEST 34`: Customer cannot read a professional's phone in `contact_details` before an offer is accepted, and can after acceptance (`status = 'Assigned'`).
    - `TEST 35`: Customer can mark only their own notifications as read (`read_at`).
    - `TEST 36`: Trigger `trg_protect_notifications_columns` blocks authenticated clients from modifying non-`read_at` columns (`type`, `payload`, `user_id`, `created_at`) on `public.notifications`.
- [ ] **Seed Customer Demo Data (Development Only)**:
  - Ensure [`db/seed/001_categories_areas.sql`](file:///Users/mrcom/Documents/prolink/db/seed/001_categories_areas.sql) and [`db/seed/002_admin_demo_data.sql`](file:///Users/mrcom/Documents/prolink/db/seed/002_admin_demo_data.sql) are loaded.
  - Edit `v_customer_email` at the top of [`db/seed/003_customer_demo_data.sql`](file:///Users/mrcom/Documents/prolink/db/seed/003_customer_demo_data.sql) to match your test customer account and run it in the SQL Editor.
  - Verify 8 jobs across statuses (`Draft`, `Open` without offers, `Open` with 3 offers, `Assigned`, `In progress`, `Completed` with review, `Completed` without review, `Cancelled`), 9 offers, 18 `job_events`, 4 `conversations`, 1 review, and 5 notifications are created.
  - Run [`db/seed/998_remove_customer_demo_data.sql`](file:///Users/mrcom/Documents/prolink/db/seed/998_remove_customer_demo_data.sql) when finished to remove only those customer demo rows.

### B. Canonical Route & Auth Guard Checks
- [ ] **Logged-out guard**: Visiting `/dashboard` or any `/dashboard/*` subroute while signed out redirects to `/sign-in?next=/dashboard...`.
- [ ] **Suspended account guard**: Visiting `/dashboard` as a suspended user (`profiles.is_suspended = true`) signs the user out and redirects to `/sign-in?error=...`.
- [ ] **Legacy `/user` redirects**: Visiting `/user`, `/user/overview`, `/user/post-job`, `/user/jobs`, `/user/jobs/[id]`, or `/user/profile` redirects to the corresponding `/dashboard` path.
- [ ] **Post-login & CTA links**: Signing in as a customer or clicking **Post a Job** / **My dashboard** across the public pages navigates to `/dashboard` or `/dashboard/jobs/new`.

### C. Customer Dashboard Flows (`/dashboard/*`)
- [ ] **Overview (`/dashboard`)**:
  - Displays personalized greeting, 4 stat cards (*Active jobs*, *Offers waiting*, *In progress*, *Completed*), **Needs your attention** list, and **Recent activity** from `job_events` (or the 3-step empty state when the customer has zero jobs).
- [ ] **Create & Edit Jobs (`/dashboard/jobs/new` & `/dashboard/jobs/[id]/edit`)**:
  - Validates title (`5–120` chars), description (`20–2000` chars), active category, Lahore area, urgency (`normal` | `urgent`), and optional non-negative PKR budget (`budgetMin <= budgetMax`).
  - Displays honest pricing note: *"Prices are agreed directly with the professional; ProLink does not process payments."*
  - **Save as draft** creates a `Draft` job (`POST /jobs` with `publish: false`); **Post job** creates an `Open` job (`publish: true`) with 7-day `expires_at` and notifies up to 5 matching professionals.
  - Drafts can be edited on `/dashboard/jobs/[id]/edit` (`PATCH /jobs/{id}`) and published (`POST /jobs/{id}/publish`); non-drafts redirect to `/dashboard/jobs/[id]`.
- [ ] **My Jobs (`/dashboard/jobs`)**:
  - Filters jobs by status tabs (*All*, *Open*, *Offers received*, *In progress*, *Completed*, *Closed*) and title search (`20` per page).
- [ ] **Job Detail, Offer Sorting & Lifecycle Actions (`/dashboard/jobs/[id]`)**:
  - Sorts offers by *Lowest price*, *Shortest arrival time*, and *Highest rating* using the single comparator (`web/src/lib/customer/offer-sort.ts`).
  - Displays `"New"` when a professional has `rating_count === 0` (never fake stars).
  - **Accept offer** (`POST /jobs/{id}/offers/{offerId}/accept`) confirms via `<dialog>`, marks the offer `accepted`, rejects other pending offers, assigns the professional, creates the `conversations` row, and reveals the professional's phone number from `contact_details` alongside a disabled **Chat (coming soon)** button.
  - **Cancel job** (`POST /jobs/{id}/cancel`) works from `Draft`, `Open`, `Offers received`, and `Assigned`.
  - **Mark as completed** (`POST /jobs/{id}/complete`) transitions `In progress` $\rightarrow$ `Completed`.
  - **Report a problem** (`POST /jobs/{id}/dispute`) requires a reason of at least 10 characters and transitions `Assigned` or `In progress` $\rightarrow$ `Disputed`.
  - **Leave a review** (`POST /jobs/{id}/review`) submits a 1–5 star rating and optional comment once on `Completed` jobs and renders the submitted review afterward.
- [ ] **Notifications (`/dashboard/notifications`)**:
  - Lists notifications with friendly descriptions and job links, marks individual or all notifications as read (`read_at`), and updates the header unread badge in real time.
- [ ] **Messages (`/dashboard/messages`) & Profile (`/dashboard/profile`)**:
  - `/dashboard/messages` explains that real-time chat is coming soon and lists accepted jobs with links to view the assigned professional's contact details.
  - `/dashboard/profile` updates `full_name`, `area_id`, and 11-digit Pakistani mobile `phone` (`03XXXXXXXXX`) in `contact_details`, allows changing password via `supabase.auth.updateUser`, shows the professional application status card, and displays the support email for account deletion requests.

---

## 11. Professional Dashboard & C# Professional API Verification Checklist (`013_professional_dashboard.sql`)

### A. Database Migration, RLS Suite & Demo Seed Verification
- [ ] **Run Migration 013**:
  - Execute [`db/migrations/013_professional_dashboard.sql`](file:///d:/UET%20STUDY/Third%20Semester/prolink/db/migrations/013_professional_dashboard.sql) in the Supabase SQL Editor.
- [ ] **Run RLS Test Suite (`Tests 37–42`)**:
  - Execute [`db/tests/rls_tests.sql`](file:///d:/UET%20STUDY/Third%20Semester/prolink/db/tests/rls_tests.sql) in the Supabase SQL Editor and verify `TEST 37` through `TEST 42` report `PASS`:
    - `TEST 37`: Approved professional can read `Open` and `Offers received` jobs and jobs assigned to them, and cannot read `Draft` jobs or jobs assigned to another professional.
    - `TEST 38`: `pending` or `suspended` professional cannot read `Open` jobs they do not own.
    - `TEST 39`: Professional can read their own offers, cannot read another professional's offers, and `job_offer_counts` returns only active (`pending` + `accepted`) counts without exposing competitor details.
    - `TEST 40`: Professional cannot read a customer's phone in `contact_details` before their offer is accepted, and can after acceptance (`status = 'Assigned'`).
    - `TEST 41`: `update_my_professional_profile` updates bio, years, availability, skills, areas, and phone, cannot change `status` or `verified`, and rejects non-approved users.
    - `TEST 42`: `my_professional_stats` returns accurate offer, job, review, agreed value, and 8-week bucket counts for the caller only.
- [ ] **Seed Professional Demo Data (Development Only)**:
  - Edit `v_pro_email` at the top of [`db/seed/004_professional_demo_data.sql`](file:///d:/UET%20STUDY/Third%20Semester/prolink/db/seed/004_professional_demo_data.sql) to match your test professional account and run it in the SQL Editor.
  - Verify 6 open opportunities, 4 offers (`pending`, `accepted`, `rejected`, `withdrawn`), 3 assigned jobs (`Assigned`, `In progress`, `Completed`), `job_events`, 2 reviews, and 5 notifications are created.
  - Run [`db/seed/997_remove_professional_demo_data.sql`](file:///d:/UET%20STUDY/Third%20Semester/prolink/db/seed/997_remove_professional_demo_data.sql) when finished to remove only those demo rows.

### B. Access Guards, Mode Switch & Canonical Routes (`/pro/*`)
- [ ] **Route Guards**:
  - Visiting `/pro` while logged out redirects to `/sign-in?next=/pro`.
  - Visiting `/pro` as an admin redirects to `/admin`.
  - Visiting `/pro` as a suspended user or suspended professional signs out and redirects to `/sign-in?error=...`.
  - Visiting `/pro` with professional state `none`, `pending`, or `rejected` redirects to `/become-professional`.
- [ ] **`Hire | Work` Mode Switch & Links**:
  - Approved professionals see the `Hire | Work` mode switch in both `/dashboard` and `/pro` (header and sidebar).
  - `BecomeProfessionalCta` in the `approved` state displays `"Switch to professional mode"` and links to `/pro`.
  - Legacy `/pro/overview`, `/pro/feed`, `/pro/feed/[id]`, and `/pro/active` redirect to `/pro`, `/pro/opportunities`, `/pro/opportunities/[id]`, and `/pro/jobs`.

### C. Professional Dashboard Flows (`/pro/*`)
- [ ] **Availability Toggle (`ProShell`)**:
  - Switching between `Available`, `Busy`, and `Offline` updates `professional_profiles.availability` immediately and displays a warning banner when `Busy` or `Offline`.
- [ ] **Overview (`/pro`)**:
  - Shows greeting, 4 stat cards (*New opportunities*, *Pending offers*, *Active jobs*, *Completed jobs*), **Needs your attention**, recent notifications, profile completeness hint, and 3-step empty guide for first-time professionals.
- [ ] **Opportunities Feed (`/pro/opportunities`) & Detail (`/pro/opportunities/[id]`)**:
  - Defaults to the professional's categories and areas with a *"Show all categories & areas"* switch, category filter (own skills first), area filter, urgency filter, budget filter, keyword search, and *"Hide jobs I already quoted"* toggle.
  - Sorts urgent opportunities first, then newest (`web/src/lib/pro/opportunity-sort.ts`).
  - Opportunity detail shows only the customer's first name (never phone or email) and active offer count from `job_offer_counts`.
  - Submitting an offer (`POST /pro/jobs/{id}/offers`) validates price (`1–10,000,000` PKR), inspection fee (`0–100,000` PKR), arrival time (`10–10,080` minutes with live friendly preview), and optional message (`0–500` chars).
  - Pending offers on open jobs can be edited (`PATCH /pro/offers/{id}`) or withdrawn (`POST /pro/offers/{id}/withdraw`) with `<dialog>` confirmation.
- [ ] **My Offers (`/pro/offers`)**:
  - Displays `Pending`, `Accepted`, `Declined`, and `Withdrawn` tabs with inline edit and withdraw dialogs for pending offers on open jobs.
- [ ] **My Jobs (`/pro/jobs`) & Job Detail (`/pro/jobs/[id]`)**:
  - Lists assigned jobs under `Active`, `Completed`, and `Closed` tabs.
  - Job detail reveals the customer's phone number from `contact_details` (`tel:` link) alongside a disabled **Chat (coming soon)** button.
  - **Start work** (`POST /pro/jobs/{id}/start`) transitions `Assigned` $\rightarrow$ `In progress` and sets `work_started_at`.
  - **Mark work as done** (`POST /pro/jobs/{id}/mark-done`) sets `professional_marked_done_at`, notifies the customer (`work_marked_done`), shows *"Waiting for the customer to confirm"* on `/pro/jobs/[id]`, and surfaces a confirmation banner at the top of `/dashboard/jobs/[id]` and first in `/dashboard` **Needs your attention**.
  - **Report a problem** (`POST /pro/jobs/{id}/dispute`) validates reason (`>= 10` chars) and transitions to `Disputed`.
- [ ] **Reviews (`/pro/reviews`), Performance (`/pro/performance`), Notifications (`/pro/notifications`), Messages (`/pro/messages`), & Profile (`/pro/profile`)**:
  - `/pro/reviews` shows real customer reviews and displays `"New"` when `rating_count === 0`.
  - `/pro/performance` displays stats from `my_professional_stats()`, notes *"Quoted value, not tracked payments"*, and renders the 8-week offers bar chart.
  - `/pro/profile` saves bio (`30–1000`), years (`0–60`), availability, categories (`1–5`), areas (`1–12`), and phone (`03XXXXXXXXX`) via `update_my_professional_profile`, shows read-only *"Reviewed by our team"* status and *"How customers see you"* preview card, and provides password change, sign-out, and support contact details.





