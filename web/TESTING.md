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


