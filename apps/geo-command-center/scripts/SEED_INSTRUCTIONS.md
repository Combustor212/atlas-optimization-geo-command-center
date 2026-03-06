# Mock Data with Specific Payment Timeline

## Overview
This seed script creates mock data with a specific MRR growth pattern:
- **Feb 1-6**: $0 MRR (no subscriptions)
- **Feb 7**: First payment comes in - $497 MRR (1 client)
- **Feb 10**: Two more payments - $1,591 total MRR (3 clients)
- **Feb 16**: Remaining three payments - $3,879 total MRR (6 clients)
- **Feb 17-28**: Stable at $3,879 MRR

## Running the Seed Script

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `scripts/seed-payment-timeline.sql`
4. Paste and click **Run**
5. Check the output to verify data was created

### Option 2: Via psql Command Line
```bash
# If you have direct database access
psql postgresql://your-connection-string -f scripts/seed-payment-timeline.sql
```

### Option 3: Via Supabase CLI
```bash
supabase db reset  # Reset database
# Then run the seed script through the dashboard
```

## What Gets Created

### 6 Clients
1. **Johns Plumbing Services LLC** - $497/mo (starts Feb 7)
2. **Elite HVAC Solutions Inc** - $697/mo (starts Feb 10)
3. **Green Lawn Care Professional Services** - $397/mo (starts Feb 10)
4. **Bright Smile Dental Care** - $797/mo (starts Feb 16)
5. **QuickFix Auto Repair & Service** - $597/mo (starts Feb 16)
6. **SafeGuard Security Systems LLC** - $897/mo (starts Feb 16)

### Subscriptions
- 6 active subscriptions with MRR values
- Properly dated `current_period_start` and `current_period_end`
- Status: `active`

### Payments
- 6 subscription payments (one per client on their start date)
- 3 setup fees ($500, $750, $1,000)
- Total revenue collected: $6,129

### Locations
- 1 location per client (6 total)
- Realistic business data (avg ticket, daily jobs, etc.)

## MRR Chart Display

After running this script, your **MRR Growth Over Time** chart will show:

```
Feb 1-6:   $0 ━━━━━━━━━━━━━━━━━━━━━━━━
Feb 7:     $497 ──────┐
Feb 8-9:   $497       │
Feb 10:    $1,591 ────┤
Feb 11-15: $1,591     │
Feb 16-28: $3,879 ────┘ (final MRR)
```

## Revenue Chart Display

Your **Revenue Collected Over Time** chart will show spikes on:
- **Feb 7**: $997 ($497 subscription + $500 setup)
- **Feb 10**: $1,844 ($697 + $397 subscriptions + $750 setup)
- **Feb 16**: $3,291 ($797 + $597 + $897 subscriptions + $1,000 setup)

## Verification Queries

### Check Total MRR
```sql
SELECT SUM(mrr) as total_mrr, COUNT(*) as active_subs
FROM subscriptions
WHERE status = 'active';
-- Expected: $3,879 MRR, 6 subscriptions
```

### Check Payment Timeline
```sql
SELECT 
  paid_at::DATE as payment_date,
  SUM(amount) as daily_revenue,
  COUNT(*) as num_payments
FROM payments
GROUP BY paid_at::DATE
ORDER BY paid_at::DATE;
-- Expected: Feb 7, Feb 10, Feb 16 with revenue
```

### Check Daily MRR Progression
```sql
SELECT 
  date,
  COALESCE(SUM(s.mrr), 0) as total_mrr
FROM generate_series('2026-02-01'::DATE, '2026-02-28'::DATE, '1 day'::INTERVAL) as date
LEFT JOIN subscriptions s 
  ON date::DATE >= s.current_period_start::DATE
  AND date::DATE <= COALESCE(s.current_period_end::DATE, '2026-12-31'::DATE)
  AND s.status = 'active'
GROUP BY date
ORDER BY date;
```

## Troubleshooting

### Script fails with "agency not found"
The script automatically creates an agency if none exists. If you have an existing agency and want to use it, the script will use the first one found.

### Data already exists
The script clears all existing mock data for the agency before inserting new data. It's safe to run multiple times.

### Subscriptions not showing in chart
1. Make sure you're viewing the correct month (February 2026)
2. Select "This Month" in the date range selector
3. Refresh the page to reload data
4. Check that the subscriptions have `status = 'active'`

### Wrong timezone
The script uses Pacific Time (PST/PDT). Payments are timestamped with `-08` offset. Adjust if needed for your timezone.

## Clean Up

To remove all mock data:
```sql
-- Get your agency ID first
SELECT id, name FROM agencies;

-- Then delete everything for that agency
DELETE FROM payments WHERE agency_id = 'YOUR-AGENCY-ID';
DELETE FROM subscriptions WHERE agency_id = 'YOUR-AGENCY-ID';
DELETE FROM locations WHERE client_id IN (
  SELECT id FROM clients WHERE agency_id = 'YOUR-AGENCY-ID'
);
DELETE FROM clients WHERE agency_id = 'YOUR-AGENCY-ID';
```

## Next Steps

After seeding the data:
1. Navigate to your dashboard at `/dashboard`
2. You should see the MRR and Revenue charts with the new data
3. Select different date ranges to see how the charts adapt
4. Hover over data points to see specific dates and values
5. Try the "Custom" date range to select Feb 1-28 for full view
