# Book a Call – Setup Guide

Lightweight Calendly-style flow: visitors book Google Meet calls without logging in. Admin connects Google once; backend creates events with Meet links.

## Architecture

- **Visitors:** No login. Select date/time, enter name + email, submit.
- **Admin:** Connects Google Calendar once in Geo Command Center → Settings.
- **Backend:** Uses stored refresh token to create Calendar events with Meet links.

## Required: Supabase Migration

Run the migration to create `google_calendar_oauth_tokens` and `bookings` tables:

```bash
cd apps/geo-command-center
npx supabase db push
# Or apply manually in Supabase SQL Editor:
```

```sql
-- From supabase/migrations/20260310_google_calendar_oauth_bookings.sql
CREATE TABLE IF NOT EXISTS google_calendar_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id)
);

CREATE INDEX idx_google_calendar_tokens_agency ON google_calendar_oauth_tokens(agency_id);
ALTER TABLE google_calendar_oauth_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "google_calendar_tokens_agency" ON google_calendar_oauth_tokens
  FOR ALL USING (agency_id = get_user_agency_id())
  WITH CHECK (agency_id = get_user_agency_id());

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  google_event_id TEXT,
  google_meet_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_agency ON bookings(agency_id);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_agency" ON bookings
  FOR ALL USING (agency_id = get_user_agency_id())
  WITH CHECK (agency_id = get_user_agency_id());
```

## Required: Google OAuth Redirect URI

In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → your OAuth 2.0 Client:

Add this **Authorized redirect URI**:

- Local: `http://localhost:3000/api/integrations/google-calendar/callback`
- Production: `https://your-domain.com/api/integrations/google-calendar/callback`

## Environment Variables

Add to `apps/geo-command-center/.env.local`:

```bash
# Google Calendar OAuth (for Book a Call)
GOOGLE_CALENDAR_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-your-secret

# Optional: Calendar ID (default: primary)
GOOGLE_CALENDAR_ID=primary
```

Existing vars (unchanged):

- `AGS_LEADS_AGENCY_SLUG` – agency for leads/bookings (default: `my-agency`)
- `NEXT_PUBLIC_APP_URL` – base URL for OAuth redirect (e.g. `http://localhost:3000`)

## Test Locally

1. **Apply migration** (see above).

2. **Start Geo Command Center:**
   ```bash
   cd apps/geo-command-center
   npm run dev
   ```
   Runs at http://localhost:3000.

3. **Start AGS frontend:**
   ```bash
   cd apps/MGODATAImprovedcursor\ copy/mgodataImprovedthroughcursor
   npm run dev
   ```
   Runs at http://localhost:5173.

4. **Connect Google Calendar:**
   - Log in to Geo Command Center as admin.
   - Go to **Settings**.
   - Click **Connect Google Calendar**.
   - Complete Google OAuth.

5. **Book a call (visitor flow):**
   - Open http://localhost:5173/get-support.
   - Click **Book a Call**.
   - Select date → time slot → enter name, email, phone.
   - Submit. You should receive a Meet link.

6. **Verify:**
   - Check `bookings` table in Supabase.
   - Check `leads` table for the lead record.
   - Confirm Google Calendar event with Meet link.

## Files Changed / Created

### New Files

- `supabase/migrations/20260310_google_calendar_oauth_bookings.sql`
- `src/lib/integrations/google-calendar-oauth.ts`
- `src/app/api/integrations/google-calendar/connect/route.ts`
- `src/app/api/integrations/google-calendar/callback/route.ts`
- `src/components/integrations/ConnectGoogleCalendarButton.tsx`
- `src/components/integrations/GoogleCalendarCallbackBanner.tsx`
- `src/app/(dashboard)/dashboard/settings/page.tsx`
- `BOOK_A_CALL_SETUP.md` (this file)

### Modified Files

- `src/lib/google/calendar.ts` – OAuth support, double-booking check
- `src/app/api/booking/slots/route.ts` – pass agencyId
- `src/app/api/booking/schedule/route.ts` – validation, double-booking, bookings table
- `src/components/dashboard/Sidebar.tsx` – Settings nav item
- `ENV_VARIABLES.md` – OAuth env docs

### Unchanged (per requirements)

- AGS GetSupport page – no changes
- Leads flow – preserved
- Auth – unchanged
