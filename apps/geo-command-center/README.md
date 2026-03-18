# GEO Command Center - README

## 🎯 Overview

**GEO Command Center** is a production-ready SaaS dashboard for agencies managing multi-location GEO performance, revenue tracking, and client relationships. Built to scale to 500+ clients with clean separation and professional-grade architecture.

## ✨ Core Features

### 📊 Agency Master Dashboard
- **Real-time Metrics**: Total MRR, cash collected, setup revenue, active clients
- **Performance Tracking**: Locations managed, churn rate, average revenue per client
- **Visual Analytics**: MRR growth charts, revenue collection trends
- **Stripe Integration**: Automated subscription and payment tracking

### 👥 Client Performance Dashboard
- **Multi-location Overview**: Track all locations for each client
- **Ranking Intelligence**: Map pack positions, rank changes, trending analysis
- **Traffic Metrics**: Organic clicks from Google Search Console
- **Call & Review Tracking**: Manual and API-based tracking
- **Revenue Impact Estimation**: Calculate ROI from ranking improvements

### 🗺️ GEO Tracking Engine
- **Ranking Heatmap**: Visual representation of map pack positions
- **Historical Data**: Track ranking changes over time
- **Multi-keyword Support**: Primary and secondary keyword tracking
- **Generative AI Visibility**: Track business mentions in AI-powered search (ChatGPT, Gemini, Perplexity)
- **Search Visibility Growth**: Monitor SERP features, featured snippets, and knowledge panels
- **Visibility Scoring**: Comprehensive 0-100 scoring system for AI and traditional search
- **API Integration Ready**: Local Falcon, GSC, GA4 placeholders

### 💰 Revenue Impact Calculator
- **Business Metrics**: Average ticket, daily jobs, conversion rates
- **Ranking Scenarios**: Model revenue impact from rank improvements
- **CTR Benchmarks**: Industry-standard click-through rates by position
- **ROI Projections**: Monthly and annual revenue forecasts

### 📈 Subscriptions Management
- **Stripe Sync**: Automatic subscription status tracking
- **MRR Dashboard**: View active, past due, trialing subscriptions
- **Webhook Integration**: Real-time payment and subscription updates

### 📄 Exportable Reports
- **Professional PDF Reports**: Comprehensive performance summaries
- **Executive Summaries**: Key metrics and highlights
- **ROI Analysis**: Revenue impact calculations
- **Client-facing**: Clean, branded reports for clients

### 🔐 Client Portal
- **Self-Service Access**: Clients view their own performance
- **Location Performance**: Rankings, traffic, calls, reviews
- **Revenue Growth**: Estimated monthly revenue lift
- **Report Generation**: Download PDF reports

### 🎨 Design System
- **Dark Theme**: Modern black/white/deep blue color scheme
- **Stripe-style**: Clean spacing, rounded cards, smooth animations
- **Professional**: Enterprise-grade UI/UX
- **Responsive**: Mobile, tablet, desktop optimized

## 🏗️ Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: TailwindCSS, CSS Variables, Custom Animations
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth
- **Payments**: Stripe (subscriptions + webhooks)
- **Charts**: Recharts
- **PDF Generation**: @react-pdf/renderer
- **API Integrations**: Google Search Console, GA4, Local Falcon (ready)

## 📁 Project Structure

```
apps/geo-command-center/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Authentication pages
│   │   ├── (dashboard)/     # Agency dashboard
│   │   ├── (portal)/        # Client portal
│   │   └── api/             # API routes & webhooks
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   ├── dashboard/       # Dashboard components
│   │   ├── clients/         # Client management
│   │   ├── rankings/        # Ranking tracking
│   │   ├── traffic/         # Traffic metrics
│   │   ├── calls/           # Call tracking
│   │   ├── reviews/         # Review tracking
│   │   ├── charts/          # Data visualizations
│   │   └── reports/         # PDF report generation
│   ├── lib/
│   │   ├── supabase/        # Supabase client & server
│   │   ├── data/            # Data fetching functions
│   │   ├── integrations/    # API integrations
│   │   ├── stripe.ts        # Stripe configuration
│   │   └── utils.ts         # Utility functions
│   └── types/
│       └── database.ts      # TypeScript types
├── supabase/
│   └── schema.sql           # Database schema
├── DEPLOYMENT.md            # Deployment guide
├── ENV_VARIABLES.md         # Environment setup
└── package.json
```

## 🗄️ Database Schema

12 Core Tables:
1. **agencies** - Agency/company records
2. **clients** - Client businesses
3. **locations** - Physical business locations
4. **subscriptions** - Stripe subscription tracking
5. **payments** - Payment history
6. **rankings** - GEO ranking data
7. **traffic_metrics** - GSC/GA4 traffic data
8. **revenue_estimates** - Revenue impact calculations
9. **reviews** - Review tracking
10. **calls_tracked** - Call tracking data
11. **generative_ai_visibility** - AI-powered search visibility tracking
12. **search_visibility** - Comprehensive search visibility & SERP features

Plus: **profiles** (user management with roles)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase and Stripe credentials

# Run development server
npm run dev

# Open browser
open http://localhost:3000
```

## 📦 Environment Variables

Copy `.env.example` → `.env.local` and fill in all required values. See the example file for inline documentation on each variable.

### Scan System (REQUIRED — scans will fail without these)

| Variable | Purpose |
|---|---|
| `GOOGLE_MAPS_API_KEY` | Place search, place details, competitor fetch via Google Places API |
| `OPENAI_API_KEY` | GEO AI Visibility scoring (gpt-4o). Without this, GEO defaults to MEO score |

### Dashboard & Auth (REQUIRED)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side, lead writes, admin queries) |

### Leads Funnel (REQUIRED for scan/contact/call leads from AGS)

| Variable | Purpose |
|---|---|
| `AGS_LEADS_API_KEY` | Shared secret between Geo Command Center, MGO backend, and AGS frontend. Generate: `openssl rand -hex 32` |
| `AGS_LEADS_AGENCY_SLUG` | Agency slug for storing scan leads (default: `my-agency`). Must exist in `agencies` table |

### Billing (REQUIRED for subscription features)

| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

### Optional Integrations

- Google Search Console API credentials
- Google Analytics 4 API credentials
- Local Falcon API key

> **Deployment note:** If `GOOGLE_MAPS_API_KEY` or `OPENAI_API_KEY` are missing in production, the scan endpoint logs clear warnings and returns degraded results — it will not crash. Missing `SUPABASE_SERVICE_ROLE_KEY` causes lead capture to fail silently (scan result is still returned).

## 🔐 Security Features

- Row Level Security (RLS) on all tables
- Role-based access control (admin, staff, client)
- Agency data separation
- Secure Stripe webhooks
- Authentication via Supabase Auth
- Service role key protection

## 🎯 Permission Levels

- **Admin**: Full agency access, manage staff and clients
- **Staff**: View and manage agency data
- **Client**: View only their own locations and data

## 📊 API Integrations

### Google Search Console
- Automated organic traffic import
- Click, impression, CTR tracking
- Date range filtering

### Google Analytics 4
- Session and user tracking
- Conversion tracking
- Real-time data

### Local Falcon
- Automated rank tracking
- Grid-based local pack rankings
- Competitor analysis

## 🚢 Deployment

See `DEPLOYMENT.md` for comprehensive deployment instructions.

**Recommended:**
- Deploy to Vercel for zero-config deployment
- Use Supabase for database hosting
- Configure Stripe webhooks for production

## 📈 Scalability

- **Database**: Optimized indexes for 500+ clients
- **Queries**: Efficient data fetching with proper joins
- **RLS**: Clean agency separation
- **Caching**: Ready for Redis integration
- **CDN**: Static assets via Vercel Edge Network

## 🧪 Testing

```bash
# Run linter
npm run lint

# Build check
npm run build

# Type checking
npx tsc --noEmit
```

## 📝 License

Proprietary - All rights reserved

## 🔗 Resources

- [Deployment Guide](./DEPLOYMENT.md)
- [Environment Variables](./ENV_VARIABLES.md)
- [Database Schema](./supabase/schema.sql)

---

Built as a production-ready $10M SaaS foundation. No mock data, no shortcuts, just clean, scalable architecture.
