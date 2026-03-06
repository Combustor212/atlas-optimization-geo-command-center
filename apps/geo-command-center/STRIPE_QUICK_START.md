# Stripe Setup Checklist

Quick checklist to get Stripe connected and accepting payments.

## ✅ Quick Setup (5-10 minutes)

### 1. Create Stripe Account
- [ ] Go to [stripe.com](https://stripe.com) and sign up
- [ ] Verify your email
- [ ] Make sure you're in **Test Mode** (toggle in top-left)

### 2. Get Your API Keys
- [ ] Go to **Developers** → **API keys**
- [ ] Copy **Secret key** (starts with `sk_test_...`)
- [ ] Add to `.env.local`:
  ```bash
  STRIPE_SECRET_KEY=sk_test_51ABC123...
  ```

### 3. Set Up Webhooks (Local Development)

**Option A: Stripe CLI (Recommended)**
- [ ] Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
- [ ] Login: `stripe login`
- [ ] Start forwarding: `stripe listen --forward-to localhost:3001/api/stripe/webhook`
- [ ] Copy the webhook secret (whsec_...)
- [ ] Add to `.env.local`:
  ```bash
  STRIPE_WEBHOOK_SECRET=whsec_abc123...
  ```

**Option B: ngrok (Alternative)**
- [ ] Install ngrok: `brew install ngrok`
- [ ] Start ngrok: `ngrok http 3001`
- [ ] Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
- [ ] In Stripe Dashboard → Developers → Webhooks
- [ ] Add endpoint: `https://abc123.ngrok.io/api/stripe/webhook`
- [ ] Select events (see below)
- [ ] Copy signing secret to `.env.local`

### 4. Restart Your Dev Server
- [ ] Stop the server (Ctrl+C)
- [ ] Start it again: `npm run dev`
- [ ] Verify no errors in terminal

### 5. Test the Integration
- [ ] In another terminal: `stripe trigger payment_intent.succeeded`
- [ ] Check your Supabase `payments` table - should have a new record
- [ ] If it works, you're all set! 🎉

---

## 🎯 Required Webhook Events

When setting up webhooks in Stripe Dashboard, select these events:

```
✅ customer.subscription.created
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ invoice.paid
✅ payment_intent.succeeded
```

---

## 📋 Your Environment Variables

After setup, your `.env.local` should have at minimum:

```bash
# Supabase (you already have these)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Stripe (newly added)
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🧪 Test Cards

Use these test cards in Stripe Checkout:

| Card Number         | Scenario      |
|---------------------|---------------|
| 4242 4242 4242 4242 | ✅ Success    |
| 4000 0000 0000 0002 | ❌ Declined   |
| 4000 0025 0000 3155 | 🔐 3D Secure |

**Other fields:**
- Expiry: Any future date (12/34)
- CVC: Any 3 digits (123)
- ZIP: Any 5 digits (12345)

---

## 🚀 Going Live (When Ready)

### 1. Complete Stripe Account Setup
- [ ] Add business details
- [ ] Verify bank account
- [ ] Submit tax information

### 2. Switch to Live Mode
- [ ] Toggle to **Live Mode** in Stripe Dashboard
- [ ] Get new API keys (**Developers** → **API keys**)
- [ ] Update production environment variables:
  ```bash
  STRIPE_SECRET_KEY=sk_live_...  # NOT sk_test_
  ```

### 3. Set Up Production Webhook
- [ ] In **Live Mode**, go to **Developers** → **Webhooks**
- [ ] Add endpoint: `https://yourdomain.com/api/stripe/webhook`
- [ ] Select the same events as before
- [ ] Copy new **Live** webhook secret
- [ ] Update production env var:
  ```bash
  STRIPE_WEBHOOK_SECRET=whsec_...  # New live secret
  ```

### 4. Create Real Products
- [ ] Go to **Products** (in Live Mode)
- [ ] Create your actual pricing plans
- [ ] Note the Price IDs for your code

---

## 🔍 Troubleshooting

### Server won't start?
```bash
# Check your .env.local file
cat .env.local | grep STRIPE

# Make sure no extra spaces or quotes
STRIPE_SECRET_KEY=sk_test_abc123  # ✅ Correct
STRIPE_SECRET_KEY="sk_test_abc123" # ❌ Remove quotes
STRIPE_SECRET_KEY= sk_test_abc123  # ❌ Remove space after =
```

### Webhooks not working?
```bash
# Make sure stripe listen is running in another terminal
stripe listen --forward-to localhost:3001/api/stripe/webhook

# Check the webhook secret matches
cat .env.local | grep STRIPE_WEBHOOK_SECRET
```

### Test events not appearing in database?
```bash
# Check Supabase tables exist
# Go to Supabase Dashboard → Table Editor
# Verify "payments" and "subscriptions" tables exist

# Check server logs for errors
# Look at terminal running "npm run dev"
```

---

## 📞 Need Help?

See the full guide: [STRIPE_SETUP_GUIDE.md](./STRIPE_SETUP_GUIDE.md)

---

## ✨ You're Done!

Once you see payments in your Supabase `payments` table, Stripe is fully integrated! 🎊

Next steps:
1. Build your checkout flow
2. Create product pages
3. Test with real payment scenarios
4. Monitor in Stripe Dashboard
