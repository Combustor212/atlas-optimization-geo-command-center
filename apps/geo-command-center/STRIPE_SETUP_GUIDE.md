# Stripe Integration Setup Guide

Complete guide to connecting Stripe to your GEO Command Center and receiving payments.

## 📋 What You Need from Stripe

To fully integrate Stripe and start receiving payments, you need **4 key pieces of information**:

### 1. **Stripe Secret Key** (Required)
- Used to authenticate API requests from your server
- Format: `sk_test_...` (test mode) or `sk_live_...` (live mode)

### 2. **Stripe Webhook Secret** (Required)
- Used to verify webhook signatures
- Format: `whsec_...`

### 3. **Stripe Price IDs** (Optional - for subscriptions)
- Created when you set up subscription products
- Format: `price_...`

### 4. **Stripe Customer Portal** (Optional - for customer management)
- Allows customers to manage their subscriptions

---

## 🚀 Step-by-Step Setup

### Step 1: Create a Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Click "Sign up"
3. Complete the registration process
4. **Important**: Start in Test Mode (toggle in top-left of dashboard)

---

### Step 2: Get Your API Keys

#### A. Secret Key (Test Mode)

1. In Stripe Dashboard, go to **Developers** → **API keys**
2. Find the **Secret key** section (starts with `sk_test_...`)
3. Click "Reveal test key token"
4. Copy the entire key
5. Add to your `.env.local`:
   ```bash
   STRIPE_SECRET_KEY=sk_test_51ABC123...
   ```

#### B. Publishable Key (Optional - for client-side)

1. On the same page, find **Publishable key** (starts with `pk_test_...`)
2. Copy it
3. Add to your `.env.local` if you plan to use Stripe Elements:
   ```bash
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...
   ```

---

### Step 3: Set Up Webhook Endpoint

Webhooks notify your app about events (new payments, subscription updates, etc.)

#### For Local Development (Using Stripe CLI)

1. **Install Stripe CLI**:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows (with Scoop)
   scoop install stripe
   
   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward webhooks to your local server**:
   ```bash
   stripe listen --forward-to localhost:3001/api/stripe/webhook
   ```

4. **Copy the webhook signing secret** (starts with `whsec_...`)
   ```bash
   # It will display something like:
   # Your webhook signing secret is whsec_abc123...
   ```

5. **Add to `.env.local`**:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_abc123...
   ```

#### For Production (Using Stripe Dashboard)

1. Go to **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Enter your production webhook URL:
   ```
   https://yourdomain.com/api/stripe/webhook
   ```
4. Select events to listen to:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `payment_intent.succeeded`
   - ✅ `invoice.payment_failed` (optional)
   - ✅ `payment_intent.payment_failed` (optional)

5. Click **"Add endpoint"**
6. Copy the **Signing secret** (whsec_...)
7. Add to your production environment variables

---

### Step 4: Create Products and Prices (For Subscriptions)

If you want to charge recurring subscription fees:

1. Go to **Products** → **Add product**
2. Fill in details:
   - **Name**: "GEO Management - Basic Plan" (or whatever you want)
   - **Description**: "Monthly subscription for GEO tracking services"
3. Set pricing:
   - **Pricing model**: Standard pricing
   - **Price**: Enter amount (e.g., $299.00)
   - **Billing period**: Recurring → Monthly (or Yearly)
4. Click **"Save product"**
5. Copy the **Price ID** (starts with `price_...`)
6. Store it somewhere safe - you'll use this in your code

#### Example: Create Multiple Plans

```
Basic Plan:
- Name: "GEO Management - Basic"
- Price: $299/month
- Price ID: price_basic123...

Pro Plan:
- Name: "GEO Management - Pro"
- Price: $599/month
- Price ID: price_pro456...

Enterprise Plan:
- Name: "GEO Management - Enterprise"
- Price: $999/month
- Price ID: price_enterprise789...
```

---

### Step 5: Enable Stripe Customer Portal (Optional)

Allows customers to manage subscriptions, update payment methods, view invoices:

1. Go to **Settings** → **Billing** → **Customer portal**
2. Click **"Activate test link"** or **"Activate"**
3. Configure settings:
   - ✅ Allow customers to cancel subscriptions
   - ✅ Allow customers to update payment methods
   - ✅ Allow customers to view invoices
   - ✅ Allow customers to switch plans (optional)
4. Save settings

---

## 📝 Complete Environment Variables

After completing all steps, your `.env.local` should look like:

```bash
# ============================================
# Stripe Configuration
# ============================================

# Secret key for API requests
STRIPE_SECRET_KEY=sk_test_51ABC123DEF456...

# Webhook signing secret
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...

# Optional: Publishable key for client-side Stripe.js
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123DEF456...

# Optional: Your Stripe price IDs
STRIPE_PRICE_ID_BASIC=price_1ABC123...
STRIPE_PRICE_ID_PRO=price_1DEF456...
STRIPE_PRICE_ID_ENTERPRISE=price_1GHI789...
```

---

## 💳 What the Integration Does

Your GEO Command Center uses Stripe for:

### 1. **Subscription Management**
- Automatically tracks client subscriptions
- Records MRR (Monthly Recurring Revenue)
- Updates subscription status (active, canceled, past_due)

### 2. **Payment Tracking**
- Records all payments in your database
- Distinguishes between:
  - **Setup fees** (one-time)
  - **Subscription payments** (recurring)
  - **One-time payments**

### 3. **Revenue Dashboard**
- Displays total MRR
- Shows cash collected this month
- Tracks setup revenue
- Calculates average revenue per client

### 4. **Webhook Processing**
The webhook endpoint (`/api/stripe/webhook`) automatically:
- Creates subscription records
- Updates subscription status
- Records payments
- Syncs with your Supabase database

---

## 🧪 Testing the Integration

### 1. Test with Stripe CLI

While `stripe listen` is running:

```bash
# Trigger a test subscription event
stripe trigger customer.subscription.created

# Trigger a test payment event
stripe trigger payment_intent.succeeded
```

### 2. Test with Stripe Dashboard

1. Go to **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Click **"Send test webhook"**
4. Select event type (e.g., `invoice.paid`)
5. Click **"Send test webhook"**

### 3. Check Your Database

After triggering events, check your Supabase tables:
- `subscriptions` - should have new records
- `payments` - should have payment records

### 4. Use Test Cards

Stripe provides test card numbers:

```
✅ Success: 4242 4242 4242 4242
❌ Decline: 4000 0000 0000 0002
🔄 3D Secure: 4000 0025 0000 3155

Expiry: Any future date (e.g., 12/34)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "STRIPE_SECRET_KEY is not set"

**Solution**: 
- Check your `.env.local` file has the key
- Restart your dev server: `npm run dev`
- Make sure no extra spaces or quotes

### Issue 2: Webhook signature verification failed

**Solution**:
- For local development, make sure `stripe listen` is running
- Copy the webhook secret from the CLI output
- Update `.env.local` with the new secret
- Restart your dev server

### Issue 3: Events not showing in database

**Solution**:
- Check webhook is receiving events (Stripe Dashboard → Webhooks → click endpoint)
- Verify `STRIPE_WEBHOOK_SECRET` matches
- Check Supabase tables have correct schema
- Look at server logs for errors

### Issue 4: Can't find Price ID

**Solution**:
- Go to Stripe Dashboard → Products
- Click on your product
- Click on the price row
- Copy the ID (starts with `price_...`)

---

## 🔐 Security Best Practices

### Development
- ✅ Use Test Mode keys (`sk_test_...`)
- ✅ Use `stripe listen` for local webhooks
- ✅ Never commit `.env.local` to git

### Production
- ✅ Switch to Live Mode keys (`sk_live_...`)
- ✅ Set up production webhook endpoint
- ✅ Use environment variables in your hosting platform
- ✅ Enable HTTPS for webhook endpoint
- ✅ Monitor webhook delivery in Stripe Dashboard
- ✅ Set up email alerts for failed payments

---

## 📊 Monitoring & Testing

### Check Webhook Deliveries

1. Stripe Dashboard → Developers → Webhooks
2. Click on your endpoint
3. View delivery attempts and responses

### View Recent Payments

1. Stripe Dashboard → Payments
2. See all successful and failed payments
3. Filter by date, amount, status

### Monitor Subscriptions

1. Stripe Dashboard → Subscriptions
2. See all active subscriptions
3. View MRR metrics

---

## 🎯 Next Steps

After setting up Stripe:

1. **Test subscription creation** - Create a test subscription using Stripe Checkout
2. **Verify webhook** - Check that data appears in your Supabase tables
3. **Create products** - Set up your actual pricing plans
4. **Test payment flows** - Use test cards to verify everything works
5. **Go live** - Switch to live mode when ready

---

## 🔗 Helpful Links

- [Stripe Dashboard](https://dashboard.stripe.com/)
- [Stripe API Docs](https://stripe.com/docs/api)
- [Stripe Testing Cards](https://stripe.com/docs/testing)
- [Stripe CLI Docs](https://stripe.com/docs/stripe-cli)
- [Webhook Event Types](https://stripe.com/docs/api/events/types)

---

## 💬 Need Help?

If you encounter issues:

1. Check the server logs (terminal running `npm run dev`)
2. Check Stripe Dashboard → Developers → Logs
3. Review webhook delivery attempts
4. Verify environment variables are loaded

Your integration is ready to accept payments! 🎉
