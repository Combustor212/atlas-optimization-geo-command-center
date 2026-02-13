# Atlas Optimization & GEO Command Center

Unified repository containing both the **GEO Command Center** (agency dashboard for GEO performance tracking) and **Atlas GS** (CRM with businesses, deals, contracts, invoices, and tasks).

## Projects

### 1. GEO Command Center (`apps/geo-command-center`)

Production-ready internal agency dashboard for multi-location GEO performance and revenue impact tracking.

**Stack:** Next.js 14, TypeScript, Supabase (Auth + Postgres), Stripe, Recharts, PDF reports

**Features:**
- Agency master dashboard (MRR, clients, revenue graphs)
- Client performance & location tracking
- GEO tracking engine with ranking heatmaps
- Revenue impact calculator
- Client-facing portal with PDF reports

```bash
cd apps/geo-command-center
npm install
cp .env.example .env.local
# Add Supabase & Stripe credentials
npm run dev
```

### 2. Atlas GS (`apps/atlas-gs`)

CRM and task management system for agencies.

**Stack:** Next.js 14, TypeScript, Supabase, Prisma, NextAuth

**Features:**
- Businesses, deals pipeline, contracts, invoices
- Work items / tasks with assignments
- Activity logging

```bash
cd apps/atlas-gs
npm install
cp .env.example .env.local
# Add Supabase, DATABASE_URL, NextAuth config
npx prisma generate
npm run dev
```

## Quick Start

Each app runs independently. Choose the project you need and follow its setup above.

## Environment Variables

Both apps use Supabase. Get credentials from [supabase.com/dashboard](https://supabase.com/dashboard) → Project Settings → API.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
