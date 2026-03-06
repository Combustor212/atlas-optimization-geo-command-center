# GEO_JOBID_MISSING Fix – Manual Test Instructions

## Summary of Changes

### Backend (mgo-scanner-backend)

1. **meoScan.ts**
   - Wrapped `resolveCategory` + `createExplainJob` in try/catch
   - On `resolveCategory` throw or null: use `getFallbackCategory(placeDetails)` (place.types → internal category, else `local_business`)
   - Always returns a `geo` object with `explainJobId`, `retryable`, `error` when applicable
   - Added logging for category resolution and job creation

2. **geoExplainJob.ts – regenerate-explain**
   - `placeId` required; `categoryOverride` optional
   - If no category: fetches place details, runs `resolveCategory`, uses `getFallbackCategory` on failure
   - Returns `{ jobId }` on success

3. **resolveCategory.ts**
   - Exported `getFallbackCategory(placeDetails)` for use when category cannot be resolved

### Frontend

4. **ScanResults.jsx**
   - Recovery `useEffect`: calls regenerate with `placeId` only when category is null
   - Retry handler: when `!explainJobId`, calls `/api/geo/regenerate-explain` with `placeId` (and optional `categoryOverride`)
   - On success, updates `scanData.geo.explainJobId` and starts polling

5. **functions.js – normalizeGeo**
   - When `geo` is missing: injects minimal geo with `retryable: true` and logs a warning

6. **geoPollDiagnostics.js**
   - Added `GEO_RESPONSE_INCOMPLETE` for missing geo object

---

## Manual Test 1: Scan on Business with Missing Category

**Goal:** Scan should still succeed and return `geo` with `status: 'queued'` or `'failed'` and `retryable: true`.

1. Start backend: `cd mgo-scanner-backend && npm run dev`
2. Start frontend: `cd mgodataImprovedthroughcursor && npm run dev`
3. Run a scan on a business that tends to have unresolved category (e.g. obscure niche)
4. **Expected:**
   - Scan completes
   - Response includes `geo` with `explainJobId` or `geo.status === 'failed'` and `geo.retryable === true`
   - No `GEO_JOBID_MISSING` if job was created; if job creation failed, `retryable` is true

---

## Manual Test 2: Retry Creates Job and Starts Polling

**Goal:** Retry should create a GEO job and start polling when `explainJobId` was missing.

1. Simulate missing jobId (e.g. temporarily mock backend to omit `explainJobId`, or use a business that triggers fallback + job failure)
2. On the loader screen with "GEO analysis could not start" error, click **Retry**
3. **Expected:**
   - POST to `/api/geo/regenerate-explain` with `placeId` (and optional `categoryOverride`)
   - Response `{ jobId }` received
   - `scanData.geo.explainJobId` updated
   - Polling starts
   - GEO explain loads when job completes

---

## Manual Test 3: Regenerate Without Category (placeId Only)

**Goal:** Regenerate endpoint works with only `placeId`.

```bash
curl -X POST http://localhost:3002/api/geo/regenerate-explain \
  -H "Content-Type: application/json" \
  -d '{"placeId":"ChIJN1t_tDeuEmsRUsoyG83frY4","locationLabel":"Sydney, Australia"}'
```

**Expected:** `{ "success": true, "jobId": "geo_explain_..." }`

---

## Manual Test 4: Backend Response Missing Geo

**Goal:** Frontend handles missing `geo` without crashing.

1. Temporarily modify backend to omit `geo` from scan response
2. Run scan
3. **Expected:**
   - `normalizeGeo` injects minimal geo with `retryable: true`
   - Dev console shows: "Backend response missing geo object"
   - Retry still works if `placeId` is available from `scanData.business`
