# Stripe Integration Setup Guide

## Overview

MGO now supports **admin-configurable Stripe billing** with encrypted storage of API keys. This guide explains how to set up and configure Stripe for your MGO installation.

---

## 🔐 Security First

All Stripe secret keys and webhook secrets are **encrypted at rest** using AES-256-GCM. The encryption is powered by a master key that you control.

### Required Environment Variables

Add these to your `.env` file:

```bash
# CRITICAL: Generate a secure 32-byte encryption key
# Run this command to generate one:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

ENCRYPTION_MASTER_KEY=your_64_character_hex_string_here

# Database path (will be created automatically)
DATABASE_PATH=./data/mgo.db
```

**⚠️ NEVER commit `ENCRYPTION_MASTER_KEY` to version control!**

---

## 📋 Prerequisites

1. **Stripe Account**: Sign up at [stripe.com](https://stripe.com)
2. **API Keys**: Get them from [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/test/apikeys)
3. **Webhook Secret**: Create a webhook endpoint (see below)

---

## 🚀 Quick Start

### Step 1: Generate Encryption Master Key

```bash
cd mgo-scanner-backend
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and add it to your `.env` file:

```bash
ENCRYPTION_MASTER_KEY=abc123...your_key_here
```

### Step 2: Start the Backend

```bash
npm run dev
```

The database and required tables will be created automatically.

### Step 3: Configure Stripe via Admin UI

1. Navigate to: `http://localhost:5173/admin/billing`
2. Select **Test Mode** or **Live Mode**
3. Paste your Stripe keys:
   - **Secret Key**: `sk_test_...` or `sk_live_...`
   - **Publishable Key**: `pk_test_...` or `pk_live_...`
   - **Webhook Secret**: `whsec_...` (optional, configure after setting up webhooks)
4. Click **Test Connection** to verify
5. Click **Save Configuration**

---

## 🔗 Webhook Setup

Stripe webhooks notify your backend about subscription events (payments, cancellations, etc.).

### Create Webhook Endpoint

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **Add endpoint**
3. Enter your endpoint URL:
   - **Test Mode**: `https://your-domain.com/api/stripe/webhook`
   - **Local Development**: Use [Stripe CLI](https://stripe.com/docs/stripe-cli) or [ngrok](https://ngrok.com/)
4. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`
5. Copy the **Signing Secret** (`whsec_...`)
6. Paste it into the Admin UI

### Local Testing with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to your local backend
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will print a webhook signing secret you can use for testing.

---

## 💳 Plan Configuration

Map your MGO plans to Stripe Price IDs:

1. In Stripe Dashboard, create Products and Prices:
   - **Basic Plan**: `price_1abc...`
   - **Pro Plan**: `price_1def...`
   - **Elite Plan**: `price_1ghi...`

2. In Admin UI → Billing → Plan Mappings:
   - Add each plan with its corresponding Stripe Price ID

---

## 🔄 Multi-Tenant Support

MGO supports **per-tenant Stripe configurations**. Each business/location can have its own Stripe account.

- All config operations accept a `tenant_id` parameter
- Default tenant: `'default'`
- For multi-location businesses, use `tenant_id = location_id`

---

## 🧪 Testing

### Test Encryption

```bash
npm test -- encryption
```

### Test Stripe Connection

Use the **Test Connection** button in Admin UI, or:

```bash
curl -X POST http://localhost:3000/api/stripe/test-connection \
  -H "Content-Type: application/json" \
  -d '{"secret_key": "sk_test_...", "publishable_key": "pk_test_..."}'
```

### Test Checkout Flow

1. Navigate to pricing page
2. Click **Upgrade** button
3. Redirects to Stripe Checkout
4. Use test card: `4242 4242 4242 4242`
5. After payment, redirects to success page
6. Check database: `stripe_subscriptions` table should have new row

---

## 🛠️ API Endpoints

### Admin Endpoints

- `POST /api/admin/stripe/config` - Save/update Stripe configuration
- `GET /api/admin/stripe/config` - Get all configurations
- `POST /api/admin/stripe/test-connection` - Test API keys
- `PUT /api/admin/stripe/active-mode` - Switch between test/live mode
- `POST /api/admin/stripe/plan-mapping` - Map MGO plans to Stripe Price IDs

### Customer Endpoints

- `POST /api/stripe/create-checkout-session` - Create Stripe Checkout session
- `POST /api/stripe/create-portal-session` - Create Customer Portal session
- `POST /api/stripe/webhook` - Stripe webhook handler (called by Stripe)

---

## 📊 Database Schema

### `stripe_configs`
- Encrypted secret keys
- Per-tenant configuration
- Test vs Live mode toggle

### `stripe_customers`
- Maps MGO user IDs to Stripe customer IDs

### `stripe_subscriptions`
- Tracks active subscriptions
- Stores status, period, plan info

### `stripe_webhook_events`
- Idempotency tracking
- Prevents duplicate processing

### `plan_mappings`
- MGO plan keys → Stripe Price IDs

---

## 🔒 Security Best Practices

1. **Never log secret keys** - Use `[REDACTED]` in logs
2. **Rotate keys periodically** - Update via Admin UI
3. **Use separate keys for test/live** - Never mix environments
4. **Verify webhook signatures** - Always call `stripe.webhooks.constructEvent()`
5. **Audit access logs** - Track who updates Stripe configs

---

## 🆘 Troubleshooting

### "ENCRYPTION_MASTER_KEY not found"
- Add the env variable to your `.env` file
- Restart the backend server

### "Invalid Stripe API key"
- Check that key starts with `sk_test_` or `sk_live_`
- Verify key is from correct Stripe account
- Use **Test Connection** button to validate

### "Webhook signature verification failed"
- Ensure webhook secret is correct
- Check that endpoint URL matches Stripe webhook config
- For local testing, use Stripe CLI

### "Subscription not updating"
- Check webhook events table: `SELECT * FROM stripe_webhook_events`
- Verify webhook is configured for correct events
- Check backend logs for errors

---

## 🔄 Migration / Backup

### Export Config
```bash
sqlite3 data/mgo.db ".dump stripe_configs" > stripe_backup.sql
```

### Import Config
```bash
sqlite3 data/mgo.db < stripe_backup.sql
```

**⚠️ Note**: Encrypted keys are tied to your `ENCRYPTION_MASTER_KEY`. If you change the master key, you must re-enter all Stripe keys via Admin UI.

---

## 📚 Additional Resources

- [Stripe API Docs](https://stripe.com/docs/api)
- [Checkout Session Docs](https://stripe.com/docs/payments/checkout)
- [Customer Portal Docs](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Webhook Docs](https://stripe.com/docs/webhooks)
- [Testing Docs](https://stripe.com/docs/testing)

---

## ✅ Checklist

- [ ] `ENCRYPTION_MASTER_KEY` set in `.env`
- [ ] Backend running and database initialized
- [ ] Stripe API keys configured via Admin UI
- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] Webhook secret added to Admin UI
- [ ] Plan mappings configured
- [ ] Test checkout flow completed successfully
- [ ] Webhook events being processed correctly



