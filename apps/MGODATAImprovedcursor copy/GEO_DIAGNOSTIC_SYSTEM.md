# GEO Explain Poll Diagnostic System

## Overview
Comprehensive diagnostic system that **always** identifies the root cause of GEO explain polling issues with deterministic error codes, human-readable reasons, and exact fixes.

## Implementation Summary

### Files Modified/Created

**Frontend:**
- ✅ `src/utils/geoPollDiagnostics.js` (NEW) - Diagnosis logic with error codes
- ✅ `src/hooks/useGEOExplainPolling.js` - Enhanced debug tracking
- ✅ `src/components/FullScreenScanLoader.jsx` - Structured debug panel

**Backend:**
- ✅ `mgo-scanner-backend/src/api/geoExplainJob.ts` - Structured logging

## Debug Panel Output (DEV Only)

The loader shows this compact, structured panel in development:

```
Debug (dev)

Request:
req: GET /api/geo/explain-job/geo_explain_1736...
http: 200 OK
attempt: #12 / 45 • elapsed: 24s • next: 2000ms

Identity:
scanId: scan_1736649123456_abc1...
placeId: ChIJN1t_tDeuEmsRU...
jobId: geo_explain_1736649123_xyz...

Backend State:
backend.status: pending
hasExplain: no
explain.version: none
queries: 0
response.keys: [status, jobId, createdAt, updatedAt]

Diagnosis:
GEO_PENDING_TOO_LONG
Backend status=pending for 24s

Fix:
Backend job likely stuck; check worker execution logs; verify GEO benchmark completes; add server-side timeout to mark failed
```

## Diagnosis Codes (Deterministic)

### 1. GEO_POLL_NOT_STARTED
**When:** `attemptCount === 0` AND `explainJobId` exists
**Reason:** Poll hook mounted but no requests sent
**Fix:** Check shouldPollGEO condition; ensure polling enabled when jobId exists and explain not ready

**Example Output:**
```
Request:
req: GET /api/geo/explain-job/geo_explain...
http: — —
attempt: #0 / 45 • elapsed: 0s • next: 2000ms

Diagnosis:
GEO_POLL_NOT_STARTED
Poll hook mounted but no requests sent

Fix:
Check shouldPollGEO condition; ensure polling enabled when jobId exists and explain not ready
```

**Root Causes:**
- `shouldPollGEO` is false (check: `!!explainJobId && !hasValidExplain`)
- Hook not actually running (React StrictMode double-mount issue?)
- JobId exists but polling gated by other condition

---

### 2. GEO_JOBID_MISSING
**When:** No `explainJobId` BUT `geoScore` exists AND `attemptCount === 0`
**Reason:** GEO score exists but explainJobId missing from scan response
**Fix:** Scan endpoint not returning explainJobId; check backend scan response body; ensure scanData not reset on retry

**Example Output:**
```
Request:
req: GET none
http: — —
attempt: #0 / 45 • elapsed: 0s • next: 2000ms

Identity:
scanId: scan_1736649123456_abc123
placeId: ChIJN1t_tDeuEmsRU...
jobId: none

Backend State:
backend.status: unknown
hasExplain: no
explain.version: none
queries: 0
response.keys: [none]

Diagnosis:
GEO_JOBID_MISSING
GEO score exists but explainJobId missing from scan response

Fix:
Scan endpoint not returning explainJobId; check backend scan response body; ensure scanData not reset on retry
```

**Root Causes:**
- Backend scan didn't create explain job (check `createExplainJob` call)
- ScanData reset on retry (losing jobId)
- Backend response missing `explainJobId` field

---

### 3. GEO_POLL_404
**When:** `lastHttpStatus === 404`
**Reason:** Explain job not found in backend store
**Fix:** Job expired (>1hr) OR wrong URL/proxy OR jobId prefix mismatch; verify Vite /api proxy; check backend key prefix; confirm jobId in backend logs

**Example Output:**
```
Request:
req: GET /api/geo/explain-job/geo_explain_1736649123_xyz
http: 404 Not Found
attempt: #3 / 45 • elapsed: 6s • next: 2000ms

Identity:
scanId: scan_1736649123456_abc123
placeId: ChIJN1t_tDeuEmsRU...
jobId: geo_explain_1736649123_xyz

Backend State:
backend.status: unknown
hasExplain: no
explain.version: none
queries: 0
response.keys: []

Diagnosis:
GEO_POLL_404
Explain job not found in backend store

Fix:
Job expired (>1hr) OR wrong URL/proxy OR jobId prefix mismatch; verify Vite /api proxy; check backend key prefix; confirm jobId in backend logs
```

**Root Causes:**
- Job expired from memory (>1 hour TTL)
- Wrong base URL (absolute vs relative, bypassing proxy)
- JobId prefix mismatch (frontend sends `geo_explain_X`, backend stores `explain_X`)
- Backend restarted (in-memory store lost)

**Verification:**
1. Check backend logs for `[GEO Explain Jobs] Created job jobId=...`
2. Compare jobId in frontend vs backend
3. Check if job exists: `explainJobs.has(jobId)`

---

### 4. GEO_POLL_401_403
**When:** `lastHttpStatus === 401` OR `403`
**Reason:** Authentication/authorization failed
**Fix:** Session/cookies not sent; ensure same-origin via /api proxy or credentials:include; check CORS config

**Example Output:**
```
Request:
req: GET /api/geo/explain-job/geo_explain_1736649123_xyz
http: 403 Forbidden
attempt: #1 / 45 • elapsed: 2s • next: 2000ms

Diagnosis:
GEO_POLL_401_403
Authentication/authorization failed

Fix:
Session/cookies not sent; ensure same-origin via /api proxy or credentials:include; check CORS config
```

**Root Causes:**
- Missing auth middleware on poll endpoint (should be public)
- CORS blocking credentials
- Absolute URL bypassing proxy (credentials not sent)

---

### 5. GEO_POLL_5XX
**When:** `lastHttpStatus >= 500`
**Reason:** Backend error {statusCode}
**Fix:** Backend threw exception; check backend logs for stack trace; error: {message}

**Example Output:**
```
Request:
req: GET /api/geo/explain-job/geo_explain_1736649123_xyz
http: 500 Internal Server Error
attempt: #2 / 45 • elapsed: 4s • next: 2000ms

Backend State:
backend.status: unknown
hasExplain: no
explain.version: none
queries: 0
response.keys: []

Diagnosis:
GEO_POLL_5XX
Backend error 500

Fix:
Backend threw exception; check backend logs for stack trace; error: Failed to fetch explain job

Last Error:
Failed to fetch explain job
```

**Root Causes:**
- Uncaught exception in poll endpoint
- Database/Redis connection error
- Job data corrupted

**Backend Action:**
Check logs for:
```
[ERROR] [GEO Explain Job API] ...
<stack trace>
```

---

### 6. GEO_PENDING_TOO_LONG
**When:** `status === 200` AND `backend.status === 'pending'|'generating'|'running'` AND `elapsedSeconds > 60`
**Reason:** Backend status={status} for {elapsed}s
**Fix:** Backend job likely stuck; check worker execution logs; verify GEO benchmark completes; add server-side timeout to mark failed

**Example Output:**
```
Request:
req: GET /api/geo/explain-job/geo_explain_1736649123_xyz
http: 200 OK
attempt: #35 / 45 • elapsed: 1m 10s • next: 2000ms

Backend State:
backend.status: running
hasExplain: no
explain.version: none
queries: 0
response.keys: [status, jobId, createdAt, updatedAt]

Diagnosis:
GEO_PENDING_TOO_LONG
Backend status=running for 70s

Fix:
Backend job likely stuck; check worker execution logs; verify GEO benchmark completes; add server-side timeout to mark failed
```

**Root Causes:**
- GEO benchmark hanging (API timeout, infinite loop)
- Query evaluator stuck (rate limiting, external API down)
- No server-side timeout to fail job

**Backend Action:**
Check logs for:
```
[GEO Explain Jobs] Starting generation jobId=...
// No completion log after 60s
```

Look for stuck promises, API timeouts, or missing error handling.

---

### 7. GEO_COMPLETED_NO_EXPLAIN
**When:** `status === 200` AND `backend.status === 'completed'` AND `!hasExplain`
**Reason:** Backend marked completed but explain field missing
**Fix:** Job completion not saving result; verify explainJobs.ts persist step; check job.result assignment; response keys: {keys}

**Example Output:**
```
Request:
req: GET /api/geo/explain-job/geo_explain_1736649123_xyz
http: 200 OK
attempt: #18 / 45 • elapsed: 36s • next: 2000ms

Backend State:
backend.status: completed
hasExplain: no
explain.version: none
queries: 0
response.keys: [status, jobId, createdAt, updatedAt]

Diagnosis:
GEO_COMPLETED_NO_EXPLAIN
Backend marked completed but explain field missing

Fix:
Job completion not saving result; verify explainJobs.ts persist step; check job.result assignment; response keys: status,jobId,createdAt,updatedAt
```

**Root Causes:**
- `job.result` not assigned in `generateExplainData`
- Response not including `explain` field when completed
- Result saved to wrong key

**Backend Fix:**
In `explainJobs.ts`, verify:
```typescript
job.status = 'completed';
job.result = explainData;  // ← THIS LINE
job.updatedAt = new Date().toISOString();
```

In `geoExplainJob.ts`, verify:
```typescript
const body = (job.status === 'completed' && job.result)
  ? { 
      status: 'completed',
      jobId: job.jobId,
      explain: job.result  // ← THIS LINE
    }
  : { ... };
```

---

### 8. GEO_EXPLAIN_SHAPE_MISMATCH
**When:** `status === 200` AND `hasExplain === true` BUT (`version !== 'v2'` OR `queriesCount === 0`)
**Reason:** Explain present but version/queries invalid
**Fix:** Normalizer rejecting payload; version={version} queries={count}; check explain keys: {keys}; verify backend saves {version:'v2', queries:[...]}

**Example Output:**
```
Request:
req: GET /api/geo/explain-job/geo_explain_1736649123_xyz
http: 200 OK
attempt: #20 / 45 • elapsed: 40s • next: 2000ms

Backend State:
backend.status: completed
hasExplain: yes
explain.version: v1
queries: 0
response.keys: [status, jobId, explain]

Diagnosis:
GEO_EXPLAIN_SHAPE_MISMATCH
Explain present but version/queries invalid

Fix:
Normalizer rejecting payload; version=v1 queries=0; check explain keys: status,jobId,explain; verify backend saves {version:'v2', queries:[...]}
```

**Root Causes:**
- Backend returning old format (`version: 'v1'`)
- Backend not saving queries array
- Queries array is empty (generation logic bug)
- Frontend normalizer too strict

**Backend Fix:**
In `explainJobs.ts`, verify:
```typescript
const explainData: GEOExplainData = {
  version: 'v2',  // ← Must be 'v2'
  generatedAt: new Date().toISOString(),
  stats,
  queries: queryResults,  // ← Must be array with length > 0
  geoScore: benchmarkResult.geoScore ?? 0,
  // ...
};
```

---

### 9. GEO_SUCCESS
**When:** `explainVersion === 'v2'` AND `queriesCount > 0`
**Reason:** Valid explain with {count} queries
**Fix:** none

**Example Output:**
```
Request:
req: GET /api/geo/explain-job/geo_explain_1736649123_xyz
http: 200 OK
attempt: #15 / 45 • elapsed: 30s • next: 2000ms

Backend State:
backend.status: completed
hasExplain: yes
explain.version: v2
queries: 20
response.keys: [status, jobId, explain]

Diagnosis:
GEO_SUCCESS
Valid explain with 20 queries

Fix:
none
```

**Result:** Loader exits, full scan results page renders with GEOWhyPanel showing queries table.

---

## Backend Logging (DEV Only)

Backend logs this structured line on each poll request:

```
[GEO_POLL] jobId=geo_explain_... http=200 status=pending hasExplain=false version=none q=0
[GEO_POLL] jobId=geo_explain_... http=200 status=running hasExplain=false version=none q=0
[GEO_POLL] jobId=geo_explain_... http=200 status=completed hasExplain=true version=v2 q=20
```

**Fields match frontend:**
- `jobId` - first 12 chars
- `http` - HTTP status code
- `status` - backend job status (pending/running/completed/failed)
- `hasExplain` - whether `job.result` exists
- `version` - `job.result.version` or `job.result.v`
- `q` - `job.result.queries.length`

**Correlation:**
Frontend debug panel shows same fields, so you can compare:
```
Frontend: backend.status=pending hasExplain=no version=none queries=0
Backend:  [GEO_POLL] status=pending hasExplain=false version=none q=0
```

## Testing Each Diagnosis Code

### Test GEO_POLL_NOT_STARTED
**Setup:** Comment out `shouldPollGEO` logic
```javascript
// const shouldPollGEO = !!explainJobId && !hasValidExplain;
const shouldPollGEO = false; // Force disabled
```
**Expected:** Debug shows `attempt: #0`, diagnosis `GEO_POLL_NOT_STARTED`

---

### Test GEO_JOBID_MISSING
**Setup:** Backend doesn't return explainJobId
In `mgo-scanner-backend/src/api/meoScan.ts`:
```typescript
// Comment out:
// explainJobId: jobId,
```
**Expected:** Debug shows `jobId: none`, diagnosis `GEO_JOBID_MISSING`

---

### Test GEO_POLL_404
**Setup:** Use wrong jobId
In ScanResults, manually set:
```javascript
scanData.geo.explainJobId = 'wrong_job_id_123';
```
**Expected:** Debug shows `http: 404`, diagnosis `GEO_POLL_404`

---

### Test GEO_POLL_5XX
**Setup:** Backend throws error
In `geoExplainJob.ts`:
```typescript
export function handleGetExplainJob(req: Request, res: Response): void {
  throw new Error('Test error'); // Add this
  // ...
}
```
**Expected:** Debug shows `http: 500`, diagnosis `GEO_POLL_5XX`

---

### Test GEO_PENDING_TOO_LONG
**Setup:** Backend never completes
In `explainJobs.ts`, comment out:
```typescript
// job.status = 'completed';
// job.result = explainData;
```
**Expected:** After 60s, debug shows diagnosis `GEO_PENDING_TOO_LONG`

---

### Test GEO_COMPLETED_NO_EXPLAIN
**Setup:** Backend marks completed but doesn't send explain
In `geoExplainJob.ts`:
```typescript
const body = (job.status === 'completed' && job.result)
  ? { 
      status: 'completed',
      jobId: job.jobId,
      // explain: job.result  // Comment out
    }
  : { ... };
```
**Expected:** Debug shows `backend.status: completed`, `hasExplain: no`, diagnosis `GEO_COMPLETED_NO_EXPLAIN`

---

### Test GEO_EXPLAIN_SHAPE_MISMATCH
**Setup:** Backend returns wrong version
In `explainJobs.ts`:
```typescript
const explainData: GEOExplainData = {
  version: 'v1',  // Wrong version
  // ...
};
```
**Expected:** Debug shows `explain.version: v1`, diagnosis `GEO_EXPLAIN_SHAPE_MISMATCH`

---

### Test GEO_SUCCESS
**Setup:** Normal successful flow
Run a real scan with valid business.
**Expected:** After 30-60s, debug shows `version: v2`, `queries: 20`, diagnosis `GEO_SUCCESS`, then loader exits and results page renders.

---

## Acceptance Tests (Must Pass)

### ✅ A) 404 → Proper Diagnosis
**Test:** Use wrong jobId
**Expected:** 
- Loader shows `GEO_POLL_404`
- Fix mentions "Job expired OR wrong URL/proxy OR jobId prefix mismatch"
- No infinite polling

### ✅ B) Completed → Exits Within 1 Render
**Test:** Backend returns completed with valid explain
**Expected:**
- Debug shows `GEO_SUCCESS`
- Loader unmounts immediately (within 1 React render cycle)
- ScanResults renders with GEOWhyPanel showing queries table

### ✅ C) Missing JobId → Clear Error
**Test:** Backend doesn't return explainJobId
**Expected:**
- Loader shows `GEO_JOBID_MISSING`
- Fix says "Scan endpoint not returning explainJobId"
- Polling never starts (attempt stays 0)

### ✅ D) Never Stuck with "Generating..."
**Test:** Any failure scenario
**Expected:**
- Debug panel ALWAYS shows diagnosis code
- Fix ALWAYS has actionable next step
- Never stuck with generic "generating" and no guidance

---

## UI Behavior Rules

### 1. Full-Gate Rendering
**Before `scanPhase === 'ready'`:** Show FullScreenScanLoader
**After `scanPhase === 'ready'`:** Show full ScanResults page

**Never show partial results** (e.g., GEO score visible but explain pending)

### 2. Retry Button Behavior
**Must:**
- Keep `scanId`, `placeId`, `explainJobId` intact
- Reset only: `attemptCount`, `error`, `isTimeout`
- Immediately trigger `fetchJobStatus()`
- Resume polling

**Implementation:**
```javascript
const retry = useCallback(() => {
  setIsTimeout(false);
  setIsLoading(true);
  setError(null);
  setData(null);
  attemptCountRef.current = 0;
  pollStartTimeRef.current = Date.now();
  // ... reset debug info
  fetchJobStatus(); // Immediate
  pollIntervalRef.current = setInterval(fetchJobStatus, POLL_INTERVAL_MS);
}, [fetchJobStatus, jobId]);
```

### 3. Hard Errors Stop Polling
**Codes that stop polling:**
- `GEO_POLL_404`
- `GEO_POLL_401_403`
- `GEO_POLL_5XX`
- `GEO_JOBID_MISSING`
- `GEO_COMPLETED_NO_EXPLAIN`
- `GEO_EXPLAIN_SHAPE_MISMATCH`

**Codes that continue polling:**
- `GEO_GENERATING` (normal state)
- `GEO_PENDING_TOO_LONG` (warning but continue until timeout)

**After hard error:**
- Polling stops (`clearTimers()`)
- Loader shows error state with diagnosis + fix
- Retry button allows manual retry

---

## Production Considerations

### Debug Panel Visibility
**Dev Only:** `import.meta.env.DEV === true`
**Production:** Debug panel hidden, but diagnosis still computed for error handling

### Performance
**Polling frequency:** 2 seconds (45 attempts max in 90s)
**Diagnostic overhead:** Minimal (simple object property checks)
**No console spam:** Only structured backend log in dev

### Error Recovery
**Transient errors (5XX, timeout):** Retry button
**Permanent errors (404, shape mismatch):** Show fix instructions, may require page reload or new scan

---

## Summary

This diagnostic system provides:
1. ✅ **Proof of what happened** (request info, identity, backend state)
2. ✅ **Root cause with specific code** (deterministic classification)
3. ✅ **Exact fix** (actionable next steps)
4. ✅ **Never stuck** (always shows diagnosis + fix)

**No more guessing.** The debug panel tells you exactly what's wrong and how to fix it.


