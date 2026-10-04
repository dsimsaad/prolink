# ProLink — Hire Trusted Professionals, Fast

> Pakistan's premier customer-driven service marketplace (prolink.pk). Post jobs, get verified local offers, compare transparent quotes, and hire top-rated professionals for plumbing, electrical, AC repair, cleaning, carpentry, and more.

---

## 🌟 Key Architecture & Scope

ProLink is built from scratch as a deployment-quality frontend prototype inspired by **Fiverr**, **Upwork**, **Urban Company**, **Stripe**, and **Linear**.

### 1. Customer-Driven Marketplace Model
Unlike classified ad boards, professionals do NOT post ads.
- **Customers** post jobs specifying location, urgency, and budget.
- **Intelligent matching** routes requests to relevant, verified, nearby artisans.
- **Professionals** submit custom, binding offers (labor price, inspection fee, arrival window, message).
- **Customers** compare offers side-by-side in a compare drawer, accept one, track the pro's route on a custom stylized map, and release escrow funds on completion with a review.
- **Admin** governs users, inspects CNIC verification queues, audits jobs, and tunes AI matching weights.

### 2. Built Views & Portals
- **Guest Home Page**: Full-length, rich, Fiverr-inspired marketing portal (19 sections including hero with live activity, 10 popular service cards, how it works mockups, split sections, testimonials, FAQs).
- **Personalized Customer Home**: Greets logged-in customer, active jobs stepper, action-needed banner, rebook past pros, and quick search.
- **Dedicated Auth**: Split layout sign in with demo autofill chips, role toggle join, 5-step professional onboarding with CNIC upload previews, SMS OTP verification, and dedicated staff 2FA login (`/admin/login`).
- **Customer Portal**: Overview, KPI metrics strip, active technician GPS tracker with route and ETA, offers inbox with side-by-side compare drawer, spending analytics (area, donut, bar charts), post a job wizard with live NLP category suggestion, job details with vertical timeline, and rate/review modal.
- **Professional Portal**: Overview with availability toggle, level progress bar, live matched jobs feed, job details & offer composer (suggested price benchmark and itemized breakdown), my offers with withdrawal, and active jobs workspace (status updates, progress photos, completion request).
- **Admin Portal**: Executive overview with GMV and revenue trends, density map bubbles, users management drawer, verification queue with document auditor (approve/reject), jobs & offers monitor with force-cancel/flagging, and AI matching weight sliders with live re-rank preview.
- **Shared `<PlaceholderPage>`**: Every other nav link, footer link, and directory search gracefully resolves to a polished preview with breadcrumbs, spot illustration, and return action.

---

## 🎨 Design System: "ProLink Forest Green on Pure White"

- **Canvas**: `#FFFFFF` (pure white) with `#F4FAF6` section tints
- **Cards**: Flat white `#FFFFFF` with 1px border `#DCE8E0` (zero drop-shadow AI slop)
- **Primary Forest**: `#0F6B3E` (hover: `#0B5632`, active: `#084626`)
- **Secondary Leaf**: `#2FAE60` (mint tint: `#E6F4EA`, sage: `#A9D3B5`)
- **Headings & Body Ink**: `#0C2A1B` / `#34453B`, muted: `#6A7B70`
- **Typography**: Figtree for headings and body; JetBrains Mono for tabular numbers and metrics
- **Custom Stylized Map Component**: Pure SVG minimal map with Islamabad and Lahore sectors, custom route lines, arrival ETA chips, and urgency pins without third-party map dependencies.

---

## 🔑 Demo Login Credentials

The sign in page (`/sign-in`) includes 1-click autofill chips:

| Role | Email / Identifier | Password | Access / Landing View |
| :--- | :--- | :--- | :--- |
| **Customer** | `mustafa.hashmi@gmail.com` | `Customer2026!` | Customer Portal (`/customer/overview`) |
| **Professional** | `tariq.m.services@gmail.com` | `Electrician2026!` | Professional Portal (`/pro/overview`) |
| **Super Admin** | `admin@prolink.pk` | `HQAdmin2026!` | Admin Console (`/admin/overview`) |

*(You can also freely switch roles and test scenarios at any time via the Dev Toolbar in the bottom-left corner).*

---

## 🔄 End-to-End Demo Path

1. **Guest Experience**: Browse guest home, click **Post a Job** in the hero.
2. **Post a Job**: Fill in title (e.g., *"Water tank leakage"*), watch the intelligent category suggestion automatically trigger "Plumbing", enter budget, and submit.
3. **Customer Sign Up**: Complete phone OTP step and 3-slide welcome tour to reach your personalized customer portal.
4. **Compare Offers**: Navigate to `/customer/jobs/job-102` (Bathroom leak), click "+ Compare" on offers, open the **Compare Drawer**, and click **Accept & Book Pro**.
5. **Switch to Professional (Tariq)**: Use the bottom-left Dev Toolbar to switch to **Pro**. Open **Active Jobs** (`/pro/active`), progress the status from *On the Way* -> *Work Started* -> *Work Finished*, and click *Request Completion*.
6. **Switch back to Customer**: Notice the completion alert, click **Mark Completed & Review**, give 5 stars with tags, and release the held escrow funds.
7. **Pro Onboarding to Verification Queue**: Go to `/join`, switch to **Work & Earn (Professional)**, complete the 5-step onboarding with CNIC details to reach the *Verification in Progress* screen. Switch to **Admin** (`/admin/verification`) and click **Approve & Grant Verified Pro Badge** to activate the artisan live.

---

## 🔌 Swapping with a Real Backend (ASP.NET Core / Node.js)

All API calls are consolidated in `/src/services/api.ts` with typed DTOs mirroring REST endpoints:
- `getJobs(filter)` -> `GET /api/jobs`
- `createJob(dto)` -> `POST /api/jobs`
- `getOffersForJob(jobId)` -> `GET /api/jobs/{id}/offers`
- `submitOffer(dto)` -> `POST /api/offers`
- `acceptOffer(offerId)` -> `POST /api/offers/{id}/accept`
- `updateProWorkLog(jobId, log)` -> `PATCH /api/jobs/{id}/work-log`
- `completeJobAndReview(jobId, review)` -> `POST /api/jobs/{id}/complete`
- `getAdminStats()` -> `GET /api/admin/stats`
- `approveVerification(id, notes)` -> `POST /api/admin/verifications/{id}/approve`

To hook up an ASP.NET Core or Express backend, simply update `/src/services/api.ts` to replace the in-memory array operations with `fetch('/api/...')` calls without modifying any UI component.
