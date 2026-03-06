# Quick Start Guide - GEO Command Center

This guide will get you up and running in **under 10 minutes**.

## ⚡ 5-Minute Setup

### Step 1: Prerequisites Check

```bash
node --version  # Should be 18 or higher
npm --version   # Should be 8 or higher
```

### Step 2: Install Dependencies

```bash
cd apps/geo-command-center
npm install
```

### Step 3: Set Up Supabase

1. **Create account**: Go to https://supabase.com and sign up
2. **Create new project**: Click "New Project"
3. **Run database schema**:
   - Go to SQL Editor in Supabase Dashboard
   - Copy/paste contents from `supabase/schema.sql`
   - Click "Run"
4. **Get credentials**:
   - Go to Settings → API
   - Copy "Project URL" and "anon public" key

### Step 4: Configure Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# For now, use test Stripe keys
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
```

### Step 5: Create First Admin User

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → Use email/password
3. In SQL Editor, run:

```sql
-- Create agency
INSERT INTO agencies (name, slug) 
VALUES ('My Agency', 'my-agency')
RETURNING id;

-- Update user profile (replace with your user ID and agency ID from above)
UPDATE profiles 
SET role = 'admin', 
    agency_id = 'your-agency-id-here'
WHERE id = 'your-user-id-here';
```

### Step 6: Launch

```bash
npm run dev
```

Open http://localhost:3000 and login!

---

## 🎯 First Steps After Login

### 1. Add Your First Client

1. Click "Clients" in sidebar
2. Click "+ Add Client"
3. Enter client name and email
4. Save

### 2. Add a Location

1. Click on the client you just created
2. Click "+ Add Location"
3. Enter location details:
   - Name (e.g., "Downtown Office")
   - Address
   - Business type
   - Avg repair ticket ($)
   - Avg daily jobs

### 3. Add Ranking Data

1. In the client detail page, find the location
2. Click "+ Add Ranking"
3. Enter:
   - Keyword (e.g., "plumber near me")
   - Map pack position (1-20)
   - Source: Manual

### 4. Try the Revenue Calculator

1. Click "Revenue Calculator" in sidebar
2. Adjust the inputs:
   - Average ticket size
   - Current rank
   - Target rank
3. See instant revenue impact estimates

---

## 🚀 Quick Feature Tour

### Agency Dashboard
- View MRR, revenue, active clients
- See growth charts
- Monitor churn rate

### Client Management
- Add/edit clients
- Track multiple locations per client
- View performance metrics
- Generate PDF reports

### GEO Tracking
- Ranking heatmap
- Trend analysis
- Keyword tracking
- API integration ready

### Data Entry Forms
All accessible from client detail page:
- **Rankings**: Track map pack positions
- **Traffic**: Organic clicks and impressions
- **Calls**: Call volume tracking
- **Reviews**: Review count and ratings

---

## 🔧 Common Tasks

### Adding Test Data

```sql
-- Add a test client
INSERT INTO clients (agency_id, name, email) 
VALUES ('your-agency-id', 'Test Business', 'test@example.com');

-- Add test location
INSERT INTO locations (client_id, name, address, city, state, zip)
VALUES ('client-id', 'Main Office', '123 Main St', 'New York', 'NY', '10001');

-- Add test ranking
INSERT INTO rankings (location_id, keyword, keyword_type, map_pack_position, recorded_at)
VALUES ('location-id', 'plumber near me', 'primary', 3, NOW());

-- Add test traffic
INSERT INTO traffic_metrics (location_id, organic_clicks, impressions, ctr, recorded_at)
VALUES ('location-id', 245, 1500, 16.33, NOW()::date);
```

### Setting Up Stripe (Production)

1. Get real Stripe account at https://stripe.com
2. Get API keys from Dashboard → Developers
3. Update `.env.local` with real keys
4. Set up webhook:
   - Dashboard → Developers → Webhooks
   - Add endpoint: `http://localhost:3000/api/stripe/webhook` (dev)
   - Select all subscription and payment events
   - Copy webhook secret to `.env.local`

### Enabling API Integrations

See `ENV_VARIABLES.md` for detailed setup:
- Google Search Console: OAuth setup
- Google Analytics 4: Service account
- Local Falcon: API key from dashboard

---

## 🐛 Troubleshooting

### "No agency found" error
```sql
-- Check user profile
SELECT * FROM profiles WHERE id = 'your-user-id';

-- If agency_id is null, update it:
UPDATE profiles SET agency_id = 'your-agency-id' WHERE id = 'your-user-id';
```

### Stripe webhook not working
- Make sure webhook secret matches
- Check Stripe Dashboard → Webhooks → Recent Deliveries
- Verify endpoint URL is correct

### Can't login
- Check Supabase Dashboard → Authentication → Users
- Make sure user email is confirmed
- Try "Forgot Password" to reset

### Build errors
```bash
rm -rf .next node_modules
npm install
npm run dev
```

---

## 📚 Next Steps

1. **Read full documentation**:
   - `DEPLOYMENT.md` - Production deployment
   - `ENV_VARIABLES.md` - All environment variables
   - `README.md` - Full feature overview

2. **Customize branding**:
   - Update logo in `components/dashboard/Sidebar.tsx`
   - Adjust colors in `app/globals.css`

3. **Set up production**:
   - Deploy to Vercel
   - Configure production Stripe
   - Set up custom domain

4. **Enable integrations**:
   - Google Search Console for automated traffic
   - GA4 for analytics
   - Local Falcon for rank tracking

---

## 💡 Pro Tips

- **Use the calculator** to estimate revenue impact before pitching clients
- **Generate PDF reports** monthly for client updates
- **Track rankings weekly** for best trend data
- **Set up Stripe properly** before onboarding real clients
- **Backup your database** regularly via Supabase

---

## 🆘 Getting Help

1. Check `DEPLOYMENT.md` for deployment issues
2. Check `ENV_VARIABLES.md` for configuration
3. Review Supabase logs in dashboard
4. Check Stripe webhook delivery logs
5. Review browser console for client-side errors

---

## 🎉 You're Ready!

Your GEO Command Center is now running. Start adding clients, tracking rankings, and demonstrating ROI!

**Default credentials**: Use the email/password you created in Supabase Auth.

---

**Questions?** Review the documentation files in this directory.
