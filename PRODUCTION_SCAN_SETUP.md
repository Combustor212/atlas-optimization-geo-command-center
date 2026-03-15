# Production Scan Setup (AGS → Geo Command Center)

This guide explains how to configure the AGS frontend for production scans when Geo Command Center hosts the scan API at `admin.atlasgrowths.com`.

## Problem: "GEO analysis could not start — backend did not return a job ID"

This error appears when:
1. **Wrong VITE_API_URL** – Using a full path (e.g. `.../api/meo/scan`) instead of the base URL
2. **CORS** – Geo Command Center scan endpoints not allowing cross-origin requests
3. **OPENAI_API_KEY missing** – Geo Command Center can't run GEO AI visibility (returns fallback score only)

## Fixes Applied

### 1. API URL normalization (`apps/.../mgodataImprovedthroughcursor/src/config/api.js`)

`getApiBaseUrl()` now normalizes `VITE_API_URL` to the origin. If you mistakenly set:

```
VITE_API_URL=https://admin.atlasgrowths.com/api/meo/scan
```

We strip the path and use `https://admin.atlasgrowths.com`, so `buildApiUrl('/api/meo/scan')` correctly produces `https://admin.atlasgrowths.com/api/meo/scan`.

### 2. CORS on scan endpoints

`/api/meo/scan` and `/api/geo/regenerate-explain` now include CORS headers so the AGS production site (different domain) can call them.

### 3. Correct env configuration

**AGS Frontend** (mgodataImprovedthroughcursor) – production build:

```env
# BASE URL only – NOT the full path
VITE_API_URL=https://admin.atlasgrowths.com

# Geo Command Center for booking, etc.
VITE_GEO_COMMAND_CENTER_URL=https://admin.atlasgrowths.com
```

**Geo Command Center** (admin.atlasgrowths.com) – server env:

```env
GOOGLE_PLACES_API_KEY=...   # Required for MEO + place lookup
OPENAI_API_KEY=...          # Required for full GEO AI visibility (explain)
```

Without `OPENAI_API_KEY`, scans still return MEO + a fallback GEO score, but no AI explain. The "job ID" error won't appear if the scan succeeds; it appears when the scan fails (wrong URL, CORS, etc.) and the frontend falls back to local calculation.

## Deployment Checklist

1. **AGS production**: Set `VITE_API_URL=https://admin.atlasgrowths.com` (or your Geo Command Center URL)
2. **Geo Command Center production**: Set `OPENAI_API_KEY` and `GOOGLE_PLACES_API_KEY`
3. **Rebuild** both apps after env changes (Vite embeds env at build time)
4. **Retry GEO**: If a scan shows the error, click "Retry GEO" – it calls `/api/geo/regenerate-explain` which runs GEO sync and returns the explain directly
