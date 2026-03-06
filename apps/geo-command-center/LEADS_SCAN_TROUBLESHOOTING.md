# Scan Leads Not Appearing – Troubleshooting

When businesses run a free scan on AGS, leads should flow to Geo Command Center → **Dashboard → Leads → From Scan**. If you don't see them, follow this checklist.

> **Preservation**: The leads flow is working. See `.cursor/rules/leads-flow-preservation.mdc` for what must not be changed (ports, `getAllLeadsForAdmin`, non-blocking form submission, etc.).

## Quick Fix (run from repo root)

```bash
./scripts/fix-leads-now.sh
```

Then run the SQL it prints in **Supabase Dashboard → SQL Editor**, restart MGO backend and Geo Command Center, and run a scan.

---

## 1. Check `leadForwardStatus` in Scan Response

After running a scan, open DevTools → Network → select the `meo/scan` request → Response. Look for:

```json
"meta": {
  "leadForwardStatus": "forwarded" | "skipped_no_email" | "skipped_no_key" | "failed",
  ...
}
```

| Status | Meaning | Fix |
|--------|---------|-----|
| `forwarded` | Lead was sent to Geo Command Center | If still not visible, check steps 4–6 below |
| `skipped_no_email` | Request had no email | Ensure the scan form collects email (FrontendOnlyScanner on Landing) |
| `skipped_no_key` | `AGS_LEADS_API_KEY` not set in MGO backend | Add to `mgo-scanner-backend/.env` |
| `failed` | Geo API returned error | Check MGO backend logs; see step 3 |

---

## 2. MGO Backend Environment Variables

In `apps/MGODATAImprovedcursor copy/mgo-scanner-backend/.env`:

```bash
# REQUIRED for scan leads to reach Geo Command Center
AGS_LEADS_API_KEY=<same-key-as-geo-command-center>
GEO_COMMAND_CENTER_URL=http://localhost:3000   # or your Geo production URL
```

- Generate key: `openssl rand -hex 32`
- Key must match Geo Command Center’s `AGS_LEADS_API_KEY`
- Restart the MGO backend after changing `.env`

---

## 3. Geo Command Center Environment Variables

In `apps/geo-command-center/.env.local`:

```bash
AGS_LEADS_API_KEY=<same-key-as-mgo-backend>
AGS_LEADS_AGENCY_SLUG=my-agency   # Must exist in agencies table
```

- Run in Supabase: `SELECT id, slug FROM agencies;`
- Use a slug that exists (e.g. `my-agency`)

---

## 4. Agency and User Setup

Leads are scoped by `agency_id`. Your admin user must belong to the same agency that receives leads.

**In Supabase SQL Editor:**

```sql
-- Check agencies
SELECT id, name, slug FROM agencies;

-- Check your profile's agency (replace YOUR_EMAIL)
SELECT p.id, p.agency_id, p.role, a.slug
FROM profiles p
LEFT JOIN agencies a ON a.id = p.agency_id
WHERE p.id IN (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL');
```

- Your `agency_id` must match the agency with slug `AGS_LEADS_AGENCY_SLUG`
- If missing: create agency and link profile (see `LEADS_DEBUG.sql`)

---

## 5. Test the Leads API Directly

```bash
# Replace with your values
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -H "x-ags-leads-api-key: YOUR_API_KEY" \
  -d '{"source":"scan","email":"test@example.com","business_name":"Test Co","message":"Test","metadata":{"city":"Cincinnati","state":"OH"}}'
```

- `401`: API key mismatch or not set
- `500 "Agency configuration error"`: No agency with `AGS_LEADS_AGENCY_SLUG`
- `200` with `{"success":true,"id":"..."}`: API works; check Leads page

---

## 6. Migrations Applied

Run these in Supabase SQL Editor (in order):

1. `supabase/migrations/20260229_leads.sql`
2. `supabase/migrations/20260305_leads_scan_source.sql`

---

## 7. Scan Flow Summary

1. User runs free scan on **Landing** (FrontendOnlyScanner) → must enter **email**
2. Navigate to **ScanResults** → `scanner()` sends `POST /api/meo/scan` with email
3. MGO backend `meoScan.ts` → if email present, `forwardLeadToGeoCommandCenter()`
4. Geo Command Center `POST /api/leads` → insert into `leads` table
5. Dashboard Leads page → `getLeads(agencyId)` → filter `source = 'scan'`

---

## Quick Debug: Insert Test Lead

To confirm the Leads page works, insert a test lead in Supabase:

```sql
INSERT INTO leads (agency_id, source, name, email, phone, business_name, message, metadata)
SELECT a.id, 'scan', 'Test Business', 'test@example.com', '+1 555-123-4567',
  'Test Business LLC', 'Free scan completed. Scores: MEO 75, SEO 60, GEO 70',
  '{"city": "Cincinnati", "state": "OH"}'::jsonb
FROM agencies a WHERE a.slug = 'my-agency' LIMIT 1;
```

If this appears on the Leads page but scan leads do not, the issue is in the MGO → Geo forward (steps 1–3).
