#!/bin/bash
# Setup environment variables for AGS → Geo Command Center leads flow
# Run from repo root: ./scripts/setup-leads-env.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Generate API key (same key used by both Geo Command Center and MGO backend)
API_KEY=$(openssl rand -hex 32)
echo "Generated AGS_LEADS_API_KEY"

# Defaults (pass as args for production: GEO_URL MGO_URL AGENCY_SLUG)
GEO_URL="${1:-http://localhost:3000}"
MGO_URL="${2:-http://localhost:3002}"
AGENCY_SLUG="${3:-my-agency}"

append_or_update() {
  local file="$1"
  local key="$2"
  local val="$3"
  touch "$file"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|^${key}=.*|${key}=${val}|" "$file"
    else
      sed -i "s|^${key}=.*|${key}=${val}|" "$file"
    fi
  else
    echo "${key}=${val}" >> "$file"
  fi
}

# 1. MGO Backend
MGO_ENV="$ROOT/apps/MGODATAImprovedcursor copy/mgo-scanner-backend/.env"
mkdir -p "$(dirname "$MGO_ENV")"
append_or_update "$MGO_ENV" "AGS_LEADS_API_KEY" "$API_KEY"
append_or_update "$MGO_ENV" "GEO_COMMAND_CENTER_URL" "$GEO_URL"
echo "✓ Updated $MGO_ENV"

# 2. Geo Command Center
GEO_ENV="$ROOT/apps/geo-command-center/.env.local"
append_or_update "$GEO_ENV" "AGS_LEADS_API_KEY" "$API_KEY"
append_or_update "$GEO_ENV" "AGS_LEADS_AGENCY_SLUG" "$AGENCY_SLUG"
echo "✓ Updated $GEO_ENV"

# 3. AGS Frontend (VITE_AGS_LEADS_API_KEY lets contact/call forms post directly to Geo)
AGS_ENV="$ROOT/apps/MGODATAImprovedcursor copy/mgodataImprovedthroughcursor/.env.local"
append_or_update "$AGS_ENV" "VITE_API_URL" "$MGO_URL"
append_or_update "$AGS_ENV" "VITE_GEO_COMMAND_CENTER_URL" "$GEO_URL"
append_or_update "$AGS_ENV" "VITE_AGS_LEADS_API_KEY" "$API_KEY"
echo "✓ Updated $AGS_ENV"

echo ""
echo "Done. Restart MGO backend and rebuild AGS frontend for production."
echo "Usage: $0 [GEO_URL] [MGO_URL] [AGENCY_SLUG]"
echo "  e.g. $0 https://geo.vercel.app https://mgo-backend.railway.app my-agency"
