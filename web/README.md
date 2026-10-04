# ProLink Frontend (`web/`)

## Purpose
Next.js web application for ProLink, providing the responsive user interface for customers, professionals, and administrators. It handles user authentication and session management via Supabase, realtime chat, job posting flows, offer negotiation, reviews, and admin management dashboards.

## Planned Owner
- **Lead**: P2 (Frontend Lead)

## Planned Structure
> **Note**: This directory intentionally contains only this `README.md`. When initializing the project, run `create-next-app` directly into this directory so scaffolding does not conflict with existing files.

Planned layout after initialization:
```text
web/
├── public/                     Static assets (images, icons, fonts)
├── src/
│   ├── app/                    Next.js App Router routes
│   │   ├── (auth)/
│   │   │   ├── login/          Customer and Professional login page
│   │   │   └── register/       User registration & onboarding
│   │   ├── jobs/               Job posting, browsing, and detail views
│   │   ├── offers/             Offer creation, negotiation, and acceptance
│   │   ├── chat/               Realtime direct messaging via Supabase
│   │   ├── profile/            User profiles and portfolio management
│   │   └── admin/              Admin dashboard (users, categories, reports)
│   ├── components/             Reusable UI and layout components
│   │   ├── ui/                 Buttons, modals, inputs, cards
│   │   └── layout/             Navbar, footer, sidebar
│   ├── lib/
│   │   ├── supabase/           Supabase client (browser and server client helpers)
│   │   └── api/                Single centralized API client for Core Engine and Insight Service
│   ├── hooks/                  Custom React hooks
│   └── types/                  TypeScript shared types and interfaces
├── next.config.ts
├── package.json
└── tsconfig.json
```

## What Will Go Inside
- **App Router (`src/app`)**: Route definitions for login, register, jobs, offers, chat, profile, admin.
- **Component Library (`src/components`)**: Modular UI components.
- **Supabase Integration (`src/lib/supabase`)**: Client and server-side Supabase SDK initialization with Row Level Security (RLS) enforcement.
- **API Client (`src/lib/api`)**: Unified fetch/HTTP client pointing to `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_INSIGHT_URL`.
- **Hooks & Types (`src/hooks`, `src/types`)**: Reusable state hooks and TypeScript contracts.

## How to Run: TODO
Run these commands when ready to initialize the frontend:

```bash
# 1. Scaffolding (run from project root or inside web/ as appropriate)
npx create-next-app@latest web --typescript --app --tailwind --eslint --use-npm

# 2. Navigate to web directory
cd web

# 3. Install Supabase client dependencies
npm install @supabase/supabase-js @supabase/ssr

# 4. Start local development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
