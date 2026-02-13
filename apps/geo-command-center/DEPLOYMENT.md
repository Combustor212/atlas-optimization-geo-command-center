# GEO Command Center — Deployment Guide

## Prerequisites

- Node.js 18+
- Supabase account
- Stripe account

## 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → Run the schema from `supabase/schema.sql`
3. In **Authentication** → **Providers**, enable Email
4. Copy from **Settings** → **API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role → `SUPABASE_SERVICE_ROLE_KEY` (keep secret)

## 2. Stripe Setup

1. Create products/prices in [Stripe Dashboard](https://dashboard.stripe.com)
2. Add metadata to products: `agency_id`, `client_id` (when applicable)
3. Create a webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `payment_intent.succeeded`
5. Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`
6. Copy API key → `STRIPE_SECRET_KEY`

## 3. Environment Variables

Copy `.env.example` to `.env.local` and fill:

```bash
cp .env.example .env.local
```

**Build requirement**: For `npm run build` to succeed in CI, these env vars must be set (can use placeholders like `https://x.supabase.co` and `sk_test_x`).

## 4. Local Development

```bash
npm install
npm run dev
```

## 5. Production Build

```bash
npm run build
npm run start
```

## 6. Deploy to Vercel

1. Connect your repo to Vercel
2. Add all env vars in Vercel project settings
3. Deploy

## 7. First User Setup

1. Sign up via the app (creates auth user)
2. The trigger creates a profile; first login runs `getOrCreateAgencyForUser`
3. Upgrade your profile to `admin` in Supabase:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE id = 'your-user-uuid';
   ```

## 8. Client Portal Access

To give a client portal access:

1. Create a client record linked to your agency
2. Create a Supabase auth user for them (or invite via email)
3. Update their profile:
   ```sql
   UPDATE profiles SET client_id = 'client-uuid', role = 'client' WHERE id = 'their-user-uuid';
   ```
