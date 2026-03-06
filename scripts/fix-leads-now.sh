#!/bin/bash
# One-command fix for scan leads not appearing
# Run from repo root: ./scripts/fix-leads-now.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Fixing Scan Leads Flow ==="

# 1. Setup env vars (shared API key, URLs)
"$ROOT/scripts/setup-leads-env.sh"
echo ""

# 2. Ensure migrations are documented
echo "=== Run these in Supabase SQL Editor (if not already applied) ==="
echo ""
cat << 'SQL'
-- 1. Add 'scan' source (if 20260305 not run)
DO $$
DECLARE conname text;
BEGIN
  FOR conname IN
    SELECT c.conname FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'leads' AND c.contype = 'c' AND pg_get_constraintdef(c.oid) LIKE '%source%'
  LOOP
    EXECUTE format('ALTER TABLE leads DROP CONSTRAINT %I', conname);
  END LOOP;
END $$;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE leads ADD CONSTRAINT leads_source_check CHECK (source IN ('contact_form', 'scheduled_call', 'scan'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 2. Ensure my-agency exists
INSERT INTO agencies (name, slug) VALUES ('My Agency', 'my-agency') ON CONFLICT (slug) DO NOTHING;
SQL
echo ""
echo "=== Done ==="
echo ""
echo "Next steps:"
echo "1. Run the SQL above in Supabase Dashboard → SQL Editor"
echo "2. Restart MGO backend: cd \"apps/MGODATAImprovedcursor copy/mgo-scanner-backend\" && npm run dev"
echo "3. Restart Geo Command Center: npm run dev:geo"
echo "4. Run a scan from the Landing page (with email) - lead should appear in Dashboard → Leads"
