# Auto-Scheduled White-Label Reports Setup

## Overview

Auto-scheduled reports generate PDF performance reports using React-PDF, store them in Supabase Storage, and optionally email them to recipients. The system uses templates (branding, sections) and schedules (frequency, time, recipients).

## 1. Database Migration

Run the migration:

```bash
# If using Supabase CLI
supabase db push

# Or run the SQL manually in Supabase Dashboard → SQL Editor
# File: supabase/migrations/20260221_auto_scheduled_reports.sql
```

## 2. Storage Bucket

Create the `reports` bucket in Supabase Dashboard:

1. Go to **Storage** → **New Bucket**
2. Name: `reports`
3. Public: **No**
4. File size limit: 10 MB
5. Allowed MIME types: `application/pdf`

## 3. Environment Variables

Add to `.env.local` (and Vercel for production):

```bash
# Required for cron (use a random secret, e.g. openssl rand -hex 32)
CRON_SECRET=your-secret-here

# Required for storage uploads (already used for other features)
SUPABASE_SERVICE_ROLE_KEY=...
```

## 4. Vercel Cron (Production)

`vercel.json` configures a cron job to run every minute. In Vercel:

1. Set `CRON_SECRET` in Project Settings → Environment Variables
2. Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` to the cron route
3. Cron runs at `* * * * *` (every minute)

## 5. Email Provider

Default: **log only** (no external service). Emails are logged to console.

To integrate a real provider (Resend, SendGrid, etc.):

```ts
// lib/reports/email.ts
import { setEmailProvider } from '@/lib/reports/email'

setEmailProvider({
  async sendReport(params) {
    // Call your email API
    return { ok: true }
  },
})
```

Call `setEmailProvider` at app startup (e.g. in a server init module).

## 6. Usage

### Admin (Dashboard)

- **Report Schedules** in sidebar → manage templates and schedules
- Create templates with name + optional company branding
- Create schedules: client, template, frequency (weekly/monthly), time, timezone, recipients
- Cron picks up due schedules and generates + emails reports

### Client (Portal)

- **Report History** link on portal → view past reports
- **Download PDF** uses signed URL from `/api/reports/download?runId=...`

## RLS

- **report_templates** / **report_schedules**: admin/staff manage all in agency
- **report_runs**: admin/staff manage all; clients can read only their own (client_id)
- Storage: uploads via service role (cron); downloads via API with auth check + signed URL

## Storage Path

PDFs are stored at: `{agency_id}/{client_id}/{run_id}.pdf`
