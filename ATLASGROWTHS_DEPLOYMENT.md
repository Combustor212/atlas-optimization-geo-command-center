# Atlas Growths Deployment Guide

Deploy **atlasgrowths.com** with:
- **Public site** (atlasgrowths.com) — AGS marketing/landing (Vite app, port 5173 locally)
- **Admin dashboard** (admin.atlasgrowths.com) — Geo Command Center (Next.js, port 3000 locally), **login required**

---

## Architecture

| Domain | App | Auth | Purpose |
|--------|-----|------|---------|
| **atlasgrowths.com** | Vite (AGS) | Public | Marketing, landing, Get Support, scans |
| **admin.atlasgrowths.com** | Geo Command Center | Supabase login required | Admin dashboard, clients, leads, GEO tracking |

The admin app already enforces auth: unauthenticated users are redirected to `/login`.

---

## Step 1: Deploy Public Site (atlasgrowths.com)

### 1.1 Create Vercel Project for AGS Frontend

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import your repo
3. **Root Directory**: `apps/MGODATAImprovedcursor copy/mgodataImprovedthroughcursor`
4. **Framework Preset**: Vite (auto-detected)
5. **Build Command**: `npm run build` (default)
6. **Output Directory**: `dist` (default)

### 1.2 Environment Variables (Public Site)

Add in Vercel → Project Settings → Environment Variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_GEO_COMMAND_CENTER_URL` | `https://admin.atlasgrowths.com` | Links to admin dashboard (Book a Call, funnel) |
| `VITE_AGS_LEADS_API_KEY` | *(same as Geo)* | For contact/call forms posting to Geo leads |
| `VITE_API_URL` | `https://your-mgo-backend-url.com` | MGO scanner backend (if deployed) |
| `VITE_APP_URL` | `https://atlasgrowths.com` | Base URL for the public site |

**Production `.env` example** (for reference; set these in Vercel UI):

```
VITE_GEO_COMMAND_CENTER_URL=https://admin.atlasgrowths.com
VITE_APP_URL=https://atlasgrowths.com
VITE_AGS_LEADS_API_KEY=<match Geo's AGS_LEADS_API_KEY>
```

### 1.3 Custom Domain

1. Vercel → Project → **Settings** → **Domains**
2. Add `atlasgrowths.com` and `www.atlasgrowths.com`
3. Configure DNS per Vercel instructions (A/CNAME records)

---

## Step 2: Deploy Admin Dashboard (admin.atlasgrowths.com)

### 2.1 Create Vercel Project for Geo Command Center

1. **Add New** → **Project** (same or different repo)
2. **Root Directory**: `apps/geo-command-center`
3. **Framework Preset**: Next.js (auto-detected)

### 2.2 Environment Variables (Admin)

Add all variables from `apps/geo-command-center/.env.local`, and set production URLs:

| Variable | Production Value |
|----------|-------------------|
| `NEXT_PUBLIC_APP_URL` | `https://admin.atlasgrowths.com` |
| `GEO_COMMAND_CENTER_URL` | `https://admin.atlasgrowths.com` |

**Supabase** (Auth → URL Configuration):

- Site URL: `https://admin.atlasgrowths.com`
- Redirect URLs: `https://admin.atlasgrowths.com/**`, `https://atlasgrowths.com/**`

**Google Calendar OAuth** (if using Book a Call):

- Authorized redirect URI: `https://admin.atlasgrowths.com/api/integrations/google-calendar/callback`

### 2.3 Custom Domain

1. Add domain `admin.atlasgrowths.com`
2. Configure DNS (CNAME to `cname.vercel-dns.com` or as instructed)

---

## Step 3: Auth Protection (Admin)

Geo Command Center already protects admin routes:

- **`/dashboard/*`** — Requires login; redirects to `/login` if not authenticated
- **`/portal/*`** — Client portal (client role)
- **`/login`** — Public login page

No extra config is needed. Supabase handles sessions and the dashboard layout enforces auth.

---

## Step 4: Create Admin Users

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Add user(s) with email/password
3. In SQL Editor, set role and agency:

```sql
UPDATE profiles 
SET role = 'admin', agency_id = (SELECT id FROM agencies WHERE slug = 'my-agency' LIMIT 1)
WHERE id = 'user-uuid-from-supabase-auth';
```

---

## Step 5: MGO Backend (Optional)

If the public site uses scan/API features, deploy the MGO scanner backend and set:

- `VITE_API_URL` on the public site
- `GEO_COMMAND_CENTER_URL=https://admin.atlasgrowths.com` in the MGO backend `.env`
- `AGS_LEADS_API_KEY` matching Geo Command Center

---

## Summary

| What | Where |
|------|-------|
| Public site | atlasgrowths.com → Vite app |
| Admin dashboard | admin.atlasgrowths.com → Geo Command Center |
| Admin login | Supabase auth, enforced by dashboard layout |
| Leads flow | Public forms → Geo Command Center `/api/leads` |

---

## Quick Checklist

- [ ] Public Vercel project: root `apps/MGODATAImprovedcursor copy/mgodataImprovedthroughcursor`
- [ ] Admin Vercel project: root `apps/geo-command-center`
- [ ] Domain atlasgrowths.com → public project
- [ ] Domain admin.atlasgrowths.com → admin project
- [ ] `VITE_GEO_COMMAND_CENTER_URL=https://admin.atlasgrowths.com` on public site
- [ ] Supabase redirect URLs include both domains
- [ ] Admin users created in Supabase with `role = 'admin'`
