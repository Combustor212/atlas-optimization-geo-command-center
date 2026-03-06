# Environment Variables Reference

Complete guide to all environment variables used in GEO Command Center.

---

## 🔑 Required Variables

### Supabase (Required)

```bash
# Your Supabase project URL
# Get from: Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xyzabc.supabase.co

# Public anonymous key (safe to expose to client)
# Get from: Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service role key (NEVER expose to client, server-only)
# Get from: Supabase Dashboard → Settings → API → service_role
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ Security Note**: The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. Only use in server-side code.

---

## 💳 Stripe Integration

### Development (Test Mode)

```bash
# Test mode secret key
# Get from: Stripe Dashboard → Developers → API keys
STRIPE_SECRET_KEY=sk_test_...

# Test mode webhook signing secret
# Get from: Stripe Dashboard → Developers → Webhooks → Add endpoint
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Production (Live Mode)

```bash
# Live mode secret key
STRIPE_SECRET_KEY=sk_live_...

# Live mode webhook signing secret
STRIPE_WEBHOOK_SECRET=whsec_...
```

**How to get webhook secret:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter: `https://yourdomain.com/api/stripe/webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `payment_intent.succeeded`
5. Copy the "Signing secret"

---

## ⏰ Scheduled Reports (Vercel Cron)

Required for auto-scheduled white-label reports. Vercel Cron calls `/api/cron/reports` and sends this secret.

```bash
# Generate a random string (e.g. openssl rand -hex 32)
# Set in Vercel: Project → Settings → Environment Variables
CRON_SECRET=your-secret-here
```

Vercel sends `Authorization: Bearer <CRON_SECRET>`. The cron route validates this header.

---

## 📥 AGS Leads Funnel (Optional)

Enables lead capture from AGS Contact Us and Book a Call forms into the Geo Command Center Leads section.

```bash
# API key for AGS to submit leads (generate with: openssl rand -hex 32)
# Must match AGS_LEADS_API_KEY in MGO backend
AGS_LEADS_API_KEY=your-secret-api-key-here

# Agency slug to associate leads with (default: my-agency)
AGS_LEADS_AGENCY_SLUG=my-agency
```

**MGO Backend** (apps/MGODATAImprovedcursor copy/mgo-scanner-backend) also needs:
- `AGS_LEADS_API_KEY` - same value as above
- `GEO_COMMAND_CENTER_URL` or `VITE_GEO_COMMAND_CENTER_URL` - Geo Command Center URL (e.g. https://your-geo-app.vercel.app)

**AGS Frontend** (apps/MGODATAImprovedcursor copy/mgodataImprovedthroughcursor) needs:
- `VITE_GEO_COMMAND_CENTER_URL` - Geo Command Center URL for Book a Call scheduling (slots + schedule APIs)

---

## 📅 Optional: Book a Call - Google Meet Scheduling

Enables automatic Google Meet scheduling when users book a consultation from the AGS Get Support page.

```bash
# Service account JSON (entire key file as string)
# Get from: Google Cloud Console → IAM → Service Accounts → Create Key (JSON)
GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'

# Calendar ID (default: primary)
# Use "primary" for the main calendar, or the calendar email (e.g. info@atlasgrowths.com)
GOOGLE_CALENDAR_ID=primary
```

**Setup Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable "Google Calendar API"
3. Create a Service Account (IAM → Service Accounts → Create)
4. Download JSON key, copy entire content to `GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON`
5. Open Google Calendar (the account that owns the consultation calendar)
6. Share the calendar with the service account email (Edit access)
7. Set `GOOGLE_CALENDAR_ID` to the calendar ID (Settings → Integrate calendar → Calendar ID)

**OAuth (alternative to service account):** Admin connects Google once via Settings. No service account needed.

```bash
# OAuth 2.0 Client ID (for admin Connect Google Calendar)
GOOGLE_CALENDAR_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com

# OAuth 2.0 Client Secret
GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-abc123def456
```

**OAuth Setup Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable "Google Calendar API"
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URI: `http://localhost:3000/api/integrations/google-calendar/callback` (and production URL)
5. Add `GOOGLE_CALENDAR_CLIENT_ID` and `GOOGLE_CALENDAR_CLIENT_SECRET` to env
6. In Geo Command Center: Dashboard → Settings → Connect Google Calendar

**Without OAuth or service account:** The Book a Call form falls back to a request-based flow (email + lead capture; no automatic Meet link).

---

## 📊 Optional: Google Search Console API

Enables automated organic traffic data import.

```bash
# OAuth 2.0 Client ID
# Get from: Google Cloud Console → APIs & Services → Credentials
GSC_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com

# OAuth 2.0 Client Secret
GSC_CLIENT_SECRET=GOCSPX-abc123def456

# OAuth redirect URI (must match Google Console settings)
GSC_REDIRECT_URI=https://yourdomain.com/api/integrations/gsc/callback
```

**Setup Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select project
3. Enable "Google Search Console API"
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI
6. Copy Client ID and Secret

---

## 📈 Optional: Google Analytics 4 API

Enables automated traffic and conversion tracking.

```bash
# GA4 Property ID
# Get from: GA4 → Admin → Property Settings
GA4_PROPERTY_ID=123456789

# Service Account credentials (JSON format)
# Get from: Google Cloud Console → IAM → Service Accounts
GA4_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"..."}'
```

**Setup Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable "Google Analytics Data API"
3. Create Service Account
4. Download JSON key file
5. Copy entire JSON content as string to env variable
6. In GA4, grant service account "Viewer" access

---

## 🗺️ Optional: Local Falcon API

Enables automated local search rank tracking.

```bash
# Local Falcon API Key
# Get from: https://localfalcon.com/dashboard/api
LOCAL_FALCON_API_KEY=lf_live_abc123def456

# Optional: Custom API endpoint
LOCAL_FALCON_API_URL=https://api.localfalcon.com/v1
```

**Setup Steps:**
1. Sign up at [Local Falcon](https://localfalcon.com/)
2. Go to Dashboard → API Settings
3. Generate new API key
4. Copy to environment variable

---

## 🔐 Optional: Security & Monitoring

### Rate Limiting (Upstash Redis)

```bash
# Upstash Redis URL for rate limiting
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### Error Tracking (Sentry)

```bash
# Sentry DSN for error tracking
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

### Session Replay (LogRocket)

```bash
# LogRocket App ID
NEXT_PUBLIC_LOGROCKET_APP_ID=abc123/your-app
```

---

## 🌍 Environment-Specific Configuration

### Development (.env.local)

```bash
# Use test/development keys
NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
STRIPE_SECRET_KEY=sk_test_...
```

### Staging (.env.staging)

```bash
# Use staging database
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
STRIPE_SECRET_KEY=sk_test_...
```

### Production (.env.production)

```bash
# Use production database and live Stripe keys
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
STRIPE_SECRET_KEY=sk_live_...
```

---

## 📋 Complete .env.local Template

```bash
# ============================================
# REQUIRED - Supabase
# ============================================
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ============================================
# REQUIRED - Stripe
# ============================================
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# ============================================
# OPTIONAL - Google Search Console
# ============================================
GSC_CLIENT_ID=
GSC_CLIENT_SECRET=
GSC_REDIRECT_URI=

# ============================================
# OPTIONAL - Google Analytics 4
# ============================================
GA4_PROPERTY_ID=
GA4_SERVICE_ACCOUNT_KEY=

# ============================================
# OPTIONAL - Local Falcon
# ============================================
LOCAL_FALCON_API_KEY=
LOCAL_FALCON_API_URL=https://api.localfalcon.com/v1

# ============================================
# OPTIONAL - Book a Call (Google Meet)
# ============================================
# Option A: OAuth (admin connects in Settings)
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
# Option B: Service account (legacy)
GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON=
GOOGLE_CALENDAR_ID=primary

# ============================================
# OPTIONAL - Monitoring & Security
# ============================================
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_LOGROCKET_APP_ID=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## ⚠️ Security Best Practices

1. **Never commit `.env.local`** to version control
2. **Use different keys** for development/staging/production
3. **Rotate keys regularly** (every 90 days recommended)
4. **Limit service role key usage** to server-side only
5. **Use environment variables** in Vercel/hosting platform
6. **Enable 2FA** on all service accounts
7. **Monitor webhook deliveries** in Stripe Dashboard
8. **Set up alerts** for failed API calls

---

## 🔄 Updating Environment Variables

### Local Development

1. Update `.env.local`
2. Restart dev server: `npm run dev`

### Vercel Deployment

1. Go to Project Settings → Environment Variables
2. Add/Update variable
3. Redeploy: `vercel --prod`

### Manual Verification

```bash
# Check if variables are loaded
npm run dev
# In browser console:
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```

---

## 📚 Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase Environment Setup](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Stripe API Keys](https://stripe.com/docs/keys)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
