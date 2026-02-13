# GEO Command Center

Production-ready internal agency dashboard for multi-location GEO performance and revenue impact tracking.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS**
- **Supabase** (Postgres + Auth)
- **Stripe** (subscriptions + webhooks)
- **Recharts** (data visualization)
- **@react-pdf/renderer** (PDF reports)

## Features

### Agency Master Dashboard
- Total MRR, Cash Collected, Setup Revenue
- Active Clients, Locations Managed
- Churn Rate, Avg Revenue Per Client
- MRR Growth & Revenue Collected graphs
- Stripe webhooks for auto-sync

### Client Performance Dashboard
- Overview: locations, avg map rank, organic clicks, calls, reviews, est. revenue lift
- Location-level view with rank change, clicks, calls, reviews
- Performance badges (Growth / Stable / Decline)
- Generate PDF report

### Revenue Impact Calculator
- Avg repair ticket, avg daily jobs
- Ranking improvement inputs
- Traffic increase & conversion rate
- Before/After, % increase, dollar impact

### GEO Tracking Engine
- Heatmap-style ranking view
- Primary/secondary keywords
- Map pack position tracking
- Placeholder for Local Falcon, GSC, GA4

### Client-Facing Portal
- Clean, minimal performance view
- Locations, ranking improvements, calls, reviews
- Estimated revenue growth
- Monthly performance graph
- PDF report download

### Permission Levels
- **Admin** — agency owner
- **Staff** — agency team
- **Client** — client portal access only

## Quick Start

```bash
npm install
cp .env.example .env.local
# Fill in Supabase & Stripe credentials
npm run dev
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full setup instructions.

## Build

For CI/CD, ensure env vars are set. Build will succeed with placeholder values:

```bash
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... npm run build
```
