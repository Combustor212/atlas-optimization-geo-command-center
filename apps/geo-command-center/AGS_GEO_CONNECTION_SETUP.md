# AGS ↔ GEO Command Center — Copy/Paste Setup

Connect AGS and GEO Command Center so logins are shared and users flow from AGS into GEO.

---

## Part 1: Supabase SQL (Run in Supabase Dashboard → SQL Editor)

### Step 1A: Base Schema (if your project is fresh / no tables yet)

Copy the **entire contents** of `supabase/schema.sql` and paste into Supabase SQL Editor, then run.

If you get errors like "relation already exists", your base schema is already applied — skip to Step 1B.

### Step 1B: Create Your First Admin User

1. Go to **Supabase Dashboard → Authentication → Users**
2. Click **"Add user"** → **"Create new user"**
3. Enter email and password (this will be your login for both AGS and GEO)
4. Check **"Auto Confirm User"**
5. Click **Create user**
6. Copy the new user's **UUID** (from the Users table)

7. In **SQL Editor**, run this (replace `YOUR_USER_UUID` with the UUID from step 6):

```sql
-- Create agency and set user as admin
INSERT INTO agencies (name, slug) 
VALUES ('My Agency', 'my-agency') 
ON CONFLICT (slug) DO NOTHING;

UPDATE profiles 
SET 
  role = 'admin',
  agency_id = (SELECT id FROM agencies WHERE slug = 'my-agency' LIMIT 1)
WHERE id = 'YOUR_USER_UUID';
```

---

## Part 2: Environment Variables

### GEO Command Center — `apps/geo-command-center/.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Get these from: Supabase Dashboard → **Settings → API**

### AGS — `apps/MGODATAImprovedcursor copy/mgodataImprovedthroughcursor/.env.local`

**Local development:**
```bash
VITE_API_URL=http://localhost:3002
VITE_BACKEND_URL=http://localhost:3002
VITE_GEO_COMMAND_CENTER_URL=http://localhost:3000
```

**Production** (after deploying GEO Command Center, e.g. to Vercel):
```bash
VITE_API_URL=https://your-mgo-backend.com
VITE_BACKEND_URL=https://your-mgo-backend.com
VITE_GEO_COMMAND_CENTER_URL=https://your-geo-command-center.vercel.app
```

---

## Part 3: Run Both Apps

**Terminal 1 — GEO Command Center:**
```bash
npm run dev:geo
```
Runs at http://localhost:3000

**Terminal 2 — AGS:**
```bash
npm run dev:mgo-frontend
```
Runs at http://localhost:5173 (or next available port)

---

## What’s Connected

| Flow | What happens |
|------|---------------|
| **Unified login** | AGS Sign In → redirects to GEO Command Center login (Supabase) → same credentials work for both |
| **Dashboard** | AGS Dashboard → redirects to GEO Command Center dashboard |
| **Roles** | Agency users → `/dashboard`; client users → `/portal` |

---

## New Account Creation (Supabase)

**Enable in Supabase:** Authentication → Providers → Email → **Enable Email Signup** (on by default)

New users created on AGS are stored in the same Supabase project. The `handle_new_user` trigger creates a profile with `role: staff`. They can sign in on AGS or GEO Command Center with the same credentials.

---

## Data Funnel: Leads from AGS Contact Us

When someone fills out **Send us a message** or **Book a Call** on AGS Contact Us, the lead is funneled into Geo Command Center → **Leads** (admin only).

**Setup:** Run `supabase/migrations/20260229_leads.sql` in Supabase. Set `AGS_LEADS_API_KEY` and `AGS_LEADS_AGENCY_SLUG` in Geo Command Center; `AGS_LEADS_API_KEY` and `GEO_COMMAND_CENTER_URL` in MGO Backend. See ENV_VARIABLES.md.

---

## Data Funnel (Current vs Future)

**Current:** Auth and redirects are shared. Users sign in on GEO and use GEO for clients, locations, and reports. AGS is the marketing/landing front; GEO is the app.

**Future data funnel:** To sync AGS scan results into GEO (e.g. auto-create clients/locations from scans), you’d need:

1. An API route in GEO Command Center that accepts scan data (with auth)
2. The AGS backend (mgo-scanner-backend) to POST scan results to that GEO API
3. GEO logic to create/update clients and locations from that data

That flow would require additional development beyond this setup.
