# What You Need From Stripe - Visual Guide

```
┌─────────────────────────────────────────────────────────────────┐
│                     STRIPE DASHBOARD                             │
│                    https://dashboard.stripe.com                  │
└─────────────────────────────────────────────────────────────────┘

                               │
                               ▼

┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Get API Keys                                            │
│  Location: Developers → API keys                                 │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Secret Key (Server-side)                                  │ │
│  │  sk_test_51ABC123DEF456GHI789...                          │ │
│  │  → Copy to: STRIPE_SECRET_KEY in .env.local               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Publishable Key (Client-side, optional)                  │ │
│  │  pk_test_51ABC123DEF456GHI789...                          │ │
│  │  → Copy to: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY           │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

                               │
                               ▼

┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Set Up Webhooks                                         │
│  Location: Developers → Webhooks                                 │
│                                                                   │
│  FOR LOCAL DEVELOPMENT (Recommended):                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Terminal Command:                                         │ │
│  │  $ stripe listen --forward-to localhost:3001/api/stripe/webhook│
│  │                                                            │ │
│  │  Output:                                                   │ │
│  │  > Ready! Your webhook signing secret is whsec_abc123...  │ │
│  │                                                            │ │
│  │  → Copy whsec_abc123... to: STRIPE_WEBHOOK_SECRET         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  FOR PRODUCTION:                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  1. Click "Add endpoint"                                   │ │
│  │  2. Enter: https://yourdomain.com/api/stripe/webhook      │ │
│  │  3. Select events:                                         │ │
│  │     ✅ customer.subscription.created                       │ │
│  │     ✅ customer.subscription.updated                       │ │
│  │     ✅ customer.subscription.deleted                       │ │
│  │     ✅ invoice.paid                                        │ │
│  │     ✅ payment_intent.succeeded                            │ │
│  │  4. Copy webhook signing secret                            │ │
│  │  → Add to production environment variables                 │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

                               │
                               ▼

┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Create Products (Optional - for subscriptions)         │
│  Location: Products → Add product                                │
│                                                                   │
│  Example Products:                                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  📦 Basic Plan                                             │ │
│  │  Name: GEO Management - Basic                              │ │
│  │  Price: $299/month                                         │ │
│  │  Price ID: price_1ABC123...                                │ │
│  │  → Store this ID in your code                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  📦 Pro Plan                                               │ │
│  │  Name: GEO Management - Pro                                │ │
│  │  Price: $599/month                                         │ │
│  │  Price ID: price_1DEF456...                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  📦 Enterprise Plan                                        │ │
│  │  Name: GEO Management - Enterprise                         │ │
│  │  Price: $999/month                                         │ │
│  │  Price ID: price_1GHI789...                                │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

                               │
                               ▼

┌─────────────────────────────────────────────────────────────────┐
│  YOUR .env.local FILE                                            │
│                                                                   │
│  # Stripe Configuration                                          │
│  STRIPE_SECRET_KEY=sk_test_51ABC123DEF456...                    │
│  STRIPE_WEBHOOK_SECRET=whsec_abc123def456...                    │
│                                                                   │
│  # Optional                                                      │
│  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...         │
└─────────────────────────────────────────────────────────────────┘

                               │
                               ▼

┌─────────────────────────────────────────────────────────────────┐
│  RESTART YOUR SERVER                                             │
│                                                                   │
│  $ npm run dev                                                   │
│                                                                   │
│  ✅ Stripe is now connected!                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 What Each Key Does

### 1. **STRIPE_SECRET_KEY** (Required)
- **What it is**: Authenticates your server to make API calls to Stripe
- **Where it's used**: Server-side code only (creating charges, subscriptions, etc.)
- **Security**: Never expose to client-side code or commit to git
- **Format**: `sk_test_...` (test) or `sk_live_...` (production)

### 2. **STRIPE_WEBHOOK_SECRET** (Required)
- **What it is**: Verifies that webhook events are actually from Stripe
- **Where it's used**: Your webhook endpoint `/api/stripe/webhook`
- **Security**: Prevents attackers from faking webhook events
- **Format**: `whsec_...`

### 3. **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** (Optional)
- **What it is**: Used for client-side Stripe.js (payment forms, checkout)
- **Where it's used**: Frontend code (React components)
- **Security**: Safe to expose (it's public)
- **Format**: `pk_test_...` (test) or `pk_live_...` (production)

### 4. **Price IDs** (Optional - for subscriptions)
- **What they are**: Identifiers for your subscription plans
- **Where they're used**: When creating checkout sessions or subscriptions
- **Format**: `price_...`

---

## 💡 How Payment Flow Works

```
┌─────────────┐
│   Customer  │
└──────┬──────┘
       │
       │ 1. Enters card info
       ▼
┌─────────────────┐
│  Stripe Checkout│  (Hosted by Stripe)
│  or Payment Form│
└──────┬──────────┘
       │
       │ 2. Payment processed
       ▼
┌─────────────────┐
│     Stripe      │
└──────┬──────────┘
       │
       │ 3. Sends webhook event
       ▼
┌────────────────────────────┐
│  Your Server               │
│  /api/stripe/webhook       │
│                            │
│  - Verifies with           │
│    STRIPE_WEBHOOK_SECRET   │
│  - Processes event         │
│  - Saves to database       │
└──────┬─────────────────────┘
       │
       │ 4. Records payment
       ▼
┌─────────────────┐
│    Supabase     │
│  (Database)     │
│                 │
│  - payments     │
│  - subscriptions│
└─────────────────┘
```

---

## 📊 What Your App Tracks

Your GEO Command Center automatically tracks:

### From Stripe → Your Database

1. **Subscriptions** (`subscriptions` table)
   - Stripe subscription ID
   - MRR (Monthly Recurring Revenue)
   - Status (active, canceled, past_due)
   - Billing interval (month/year)
   - Current period start/end dates

2. **Payments** (`payments` table)
   - Stripe payment ID
   - Amount
   - Type (subscription, setup, one_time)
   - Payment date
   - Associated client/agency

3. **Revenue Metrics** (calculated)
   - Total MRR
   - Cash collected this month
   - Setup revenue
   - Average revenue per client

---

## 🧪 Testing Payment Flow

### 1. With Stripe CLI (Recommended)

```bash
# Terminal 1: Forward webhooks
stripe listen --forward-to localhost:3001/api/stripe/webhook

# Terminal 2: Start your app
npm run dev

# Terminal 3: Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger invoice.paid
stripe trigger customer.subscription.created
```

### 2. Check Database

After triggering events:
```
Supabase Dashboard → Table Editor → payments
→ Should see new payment records

Supabase Dashboard → Table Editor → subscriptions
→ Should see subscription records
```

### 3. View in App

```
http://localhost:3001/dashboard
→ See updated MRR and revenue metrics

http://localhost:3001/dashboard/subscriptions
→ View all subscriptions
```

---

## ✅ Checklist Summary

- [ ] Get `STRIPE_SECRET_KEY` from Stripe Dashboard
- [ ] Get `STRIPE_WEBHOOK_SECRET` from Stripe CLI or Dashboard
- [ ] Add both to `.env.local`
- [ ] Restart dev server
- [ ] Test with `stripe trigger payment_intent.succeeded`
- [ ] Verify payment appears in Supabase `payments` table
- [ ] **Done!** You can now accept payments 🎉

---

## 🚀 Ready to Go Live?

When you're ready for real payments:

1. Complete Stripe account verification
2. Switch to Live Mode in Stripe Dashboard
3. Get new **Live** API keys (sk_live_... and whsec_...)
4. Update production environment variables
5. Test with real card (use small amount first!)
6. Monitor Stripe Dashboard for payments

---

Need more details? See:
- [STRIPE_SETUP_GUIDE.md](./STRIPE_SETUP_GUIDE.md) - Complete setup guide
- [STRIPE_QUICK_START.md](./STRIPE_QUICK_START.md) - Quick checklist
