# Book a Call – Local Testing Guide

Step-by-step instructions to test the AGS Book a Call flow locally.

## Prerequisites

- Node.js 18+
- Supabase project with migrations applied
- Google Cloud project with Calendar API enabled

## 1. Environment Variables

### Geo Command Center (`apps/geo-command-center/.env.local`)

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AGS Leads
AGS_LEADS_API_KEY=your-secret-api-key
AGS_LEADS_AGENCY_SLUG=my-agency

# Google Calendar OAuth (required for Book a Call)
GOOGLE_CALENDAR_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-your-secret

# OAuth redirect base (required for callback)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Service account fallback (if not using OAuth)
# GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
# GOOGLE_CALENDAR_ID=primary
```

### AGS Frontend (`apps/MGODATAImprovedcursor copy/mgodataImprovedthroughcursor/.env.local`)

```bash
# Geo Command Center URL (booking APIs)
VITE_GEO_COMMAND_CENTER_URL=http://localhost:3000

# Optional: Direct lead submit to Geo (contact/call forms)
# VITE_AGS_LEADS_API_KEY=your-secret-api-key
```

## 2. Supabase Setup

Ensure the `bookings` and `google_calendar_oauth_tokens` tables exist. Run in Supabase SQL Editor:

```sql
-- See supabase/migrations/20260310_google_calendar_oauth_bookings.sql
-- Or run: npx supabase db push
```

Verify agency exists:

```sql
SELECT id, name, slug FROM agencies WHERE slug = 'my-agency';
```

## 3. Connect Admin Google Account

1. Start Geo Command Center: `cd apps/geo-command-center && npm run dev`
2. Log in as admin
3. Go to **Dashboard → Settings**
4. Click **Connect Google Calendar**
5. Sign in with the Google account that owns the calendar for consultations
6. Grant calendar access
7. You should be redirected back with "Google Calendar connected successfully"

**Google Cloud Console setup:**

- APIs & Services → Credentials → OAuth 2.0 Client ID (Web application)
- Authorized redirect URI: `http://localhost:3000/api/integrations/google-calendar/callback`
- Enable Google Calendar API

## 4. Simulate a Booking

1. Start AGS frontend: `cd "apps/MGODATAImprovedcursor copy/mgodataImprovedthroughcursor" && npm run dev`
2. Open http://localhost:5173/get-support
3. Click **Book a Call**
4. Select a date (next 14 weekdays)
5. Select an available time slot
6. Fill in: Name, Email, Phone, Business (optional), Message (optional)
7. Click **Confirm Booking**

**Expected success response:**

```json
{
  "success": true,
  "meet_link": "https://meet.google.com/xxx-xxxx-xxx",
  "event_id": "abc123...",
  "start_time": "2025-03-07T14:00:00.000Z",
  "end_time": "2025-03-07T14:30:00.000Z"
}
```

**Confirmation screen shows:**

- "Meeting Scheduled!"
- Date and time (e.g., "Friday, March 7, 2025 at 10:00 AM – 10:30 AM EST")
- "Join Google Meet" button

## 5. View Logs if Event Creation Fails

### Geo Command Center (Next.js)

- **Terminal:** Errors are logged to the console where `npm run dev` runs
- **Booking errors:** Look for `Booking schedule error:` in the terminal
- **OAuth errors:** Check `Google Calendar callback error:` or `Google Calendar token upsert error:`

### Common failures

| Symptom | Cause | Fix |
|--------|-------|-----|
| 503 "Booking is not configured" | No OAuth tokens or service account | Connect Google Calendar in Settings |
| "Google Meet link was not created" | Calendar API didn't return conferenceData | Ensure `conferenceDataVersion: 1` is used; check calendar supports Meet |
| "Agency not configured" | `AGS_LEADS_AGENCY_SLUG` doesn't match DB | Run `SELECT slug FROM agencies` and set correct slug |
| 409 "Time slot no longer available" | Double booking | Slot was taken; choose another |
| 400 "Cannot book a slot in the past" | Start time is in the past | Select a future slot |
| 400 "Invalid email format" | Email doesn't match pattern | Use valid email (e.g. user@example.com) |

### Supabase

- **bookings table:** `SELECT * FROM bookings ORDER BY created_at DESC LIMIT 5;`
- **OAuth tokens:** `SELECT agency_id, created_at FROM google_calendar_oauth_tokens;` (tokens are masked in UI)

## 6. cURL Example (Direct API Test)

```bash
# Get slots for a date
curl "http://localhost:3000/api/booking/slots?date=2025-03-10"

# Create a booking
curl -X POST http://localhost:3000/api/booking/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+15551234567",
    "slotStart": "2025-03-10T14:00:00.000Z",
    "slotEnd": "2025-03-10T14:30:00.000Z",
    "business": "Acme Corp",
    "message": "Test booking"
  }'
```

## 7. Security Checklist

- [x] Google tokens (refresh_token, access_token) are stored only in Supabase `google_calendar_oauth_tokens`; never sent to frontend
- [x] All Google Calendar API calls run on the backend (schedule, slots routes)
- [x] No `GOOGLE_CALENDAR_CLIENT_SECRET` or `GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON` in client code
- [x] OAuth connect/callback routes require admin auth
- [x] Booking endpoints are public (by design) but validate input and use server-side tokens only
