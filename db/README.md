# ProLink Database (`db/`)

## Purpose
Database management, schema definitions, migration scripts, Row Level Security (RLS) policies, and seed data for the Supabase-hosted PostgreSQL instance. The version-controlled SQL files in this directory are the single source of truth for the database schema.

## Planned Owner
- **Lead**: P1 (Product / Data Lead)

## Planned Structure & Files
```text
db/
├── migrations/                  Numbered SQL migration files executed in sequence
│   ├── 001_schema.sql           Core tables (profiles, categories, jobs, offers, reviews, messages)
│   ├── 002_rls.sql              Row Level Security policies protecting user and transactional data
│   ├── 003_indexes.sql          B-tree and GiST/GIN indexes for performance optimization
│   └── 004_triggers.sql         Audit timestamp triggers and realtime hooks
└── seed/                        Seed data for local testing and demonstration
    ├── 01_categories.sql        Pre-populated service categories (plumbing, electrical, painting, etc.)
    ├── 02_demo_users.sql        Demo customer and professional accounts
    └── 03_demo_jobs.sql         Demo job postings and initial offers
```

## What Will Go Inside
- **`migrations/`**: Sequentially numbered SQL scripts (`001_...`, `002_...`). Each migration is idempotent and maintains the relational schema, constraints, and RLS policies.
- **`seed/`**: Curated datasets for populating initial platform categories, test users, sample job listings, and sample reviews.

## How to Run: TODO
1. ProLink uses a hosted Supabase PostgreSQL instance (no local Supabase CLI is required).
2. Open the **SQL Editor** in your Supabase Project Dashboard.
3. Apply migration files in sequential order (`001_schema.sql` -> `002_rls.sql` -> ...).
4. Run the seed scripts in `seed/` if initializing a clean staging/demo database.
5. **Important Rule**: Always write and test changes in a local `.sql` file in this repository before applying to Supabase. Never alter tables in the Supabase dashboard without committing the corresponding migration file here.
