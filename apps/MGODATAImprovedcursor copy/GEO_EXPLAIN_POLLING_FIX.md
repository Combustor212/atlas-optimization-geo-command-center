# GEO Explain Polling Stuck State - Complete Fix

## Problem
GEO explain polling was stuck on "AI Query Analysis — taking longer than usual" with retry not resolving it. The polling never reached a valid completed state with `explain.version === 'v2'` and `queries.length > 0`.

## Root Causes Identified

### 1. **Missing `/api` Proxy in Vite Config**
   - The Vite dev server was NOT proxying `/api/*` routes to the backend
   - This could cause CORS issues or route failures in development
   - **Fixed**: Added `/api` proxy configuration in `vite.config.js`

### 2. **No Debug Visibility**
   - No way to see what polling was actually doing
   - Couldn't diagnose: wrong URL, 404s, pending forever, or normalization rejecting valid data
   - **Fixed**: Added comprehensive debug tracking in polling hook

### 3. **Inconsistent API URL Usage**
   - Some files used `VITE_API_URL`, others used `VITE_BACKEND_URL`
   - Absolute URLs bypassed Vite proxy
   - **Fixed**: Created centralized API config that uses relative URLs in dev (leveraging proxy)

### 4. **Normalization Too Strict**
   - Only accepted one exact response shape
   - Couldn't handle legacy formats or alternative field names
   - **Fixed**: Made normalization accept multiple shapes (explain/result, version/v, queries/q)

## Complete Implementation

### Frontend Changes

#### 1. **Created API Config Module** (`src/config/api.js`)
```javascript
export function getApiBaseUrl() {
  const isDev = import.meta.env.DEV;
  if (isDev) {
    return ''; // Use relative URLs - proxy handles routing
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
}

export function buildApiUrl(path) {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}
```

**Why**: Ensures polling uses proxy in dev, works in prod, consistent across codebase.

#### 2. **Enhanced Polling Hook** (`src/hooks/useGEOExplainPolling.js`)

**Added Debug Tracking:**
```javascript
const [debugInfo, setDebugInfo] = useState({
  attemptCount: 0,
  lastAttemptAt: null,
  lastHttpStatus: null,
  lastError: null,
  lastResponseKeys: [],
  lastStatusField: null,
  lastHasExplain: false,
  pollUrl: null
});
```

**Robust Normalization:**
```javascript
const normalizeGeoExplain = useCallback((resp) => {
  if (!resp) return null;

  // Try multiple paths to find explain data
  const candidate =
    resp?.explain ??
    resp?.result ??
    resp?.geo?.explain ??
    resp?.data?.explain ??
    resp?.data?.geo?.explain ??
    resp;

  // Unwrap if nested
  const unwrapped = candidate?.explain || candidate;

  if (!unwrapped) return null;

  // Normalize version field (can be 'version' or 'v')
  const version = unwrapped.version || unwrapped.v;
  
  // Normalize queries field (can be 'queries' or 'q', but q must be array)
  let queries = unwrapped.queries || unwrapped.q;
  if (!Array.isArray(queries)) {
    queries = [];
  }

  // Must have v2 and queries
  if (version !== 'v2' || queries.length === 0) {
    return null;
  }

  // Return normalized structure
  return {
    ...unwrapped,
    version: 'v2',
    queries: queries
  };
}, []);
```

**Enhanced Error Handling:**
- 404 now shows: "Explain job not found (expired or invalid jobId)"
- Timeout shows: "Timeout after N attempts"
- Each poll attempt updates debug info with HTTP status, response keys, status field, etc.

**Returns:**
```javascript
return {
  data,
  isLoading,
  error,
  isTimeout,
  retry,
  jobId,
  status,
  debug: debugInfo // DEV-ONLY visibility
};
```

#### 3. **Updated FullScreenScanLoader** (`src/components/FullScreenScanLoader.jsx`)

**Added Dev Debug Display:**
```javascript
{isDev && pollDebug && (
  <div className="mt-6 pt-4 border-t border-slate-200">
    <p className="text-xs font-mono text-slate-500 mb-1">
      <strong className="text-slate-700">Debug (dev):</strong>
    </p>
    <div className="text-xs font-mono text-slate-600 space-y-1">
      <p>poll#{pollDebug.attemptCount} • {pollDebug.lastHttpStatus || '—'} • {pollDebug.lastStatusField || 'no-status'}</p>
      <p>keys: [{pollDebug.lastResponseKeys?.join(', ') || 'none'}]</p>
      <p>hasExplain: {pollDebug.lastHasExplain ? 'yes' : 'no'}</p>
      {pollDebug.lastError && <p className="text-red-600">error: {pollDebug.lastError}</p>}
      {pollDebug.pollUrl && <p className="text-slate-400 break-all">url: {pollDebug.pollUrl}</p>}
    </div>
  </div>
)}
```

**Shows in DEV mode:**
- `poll#12 200 pending keys:[status,jobId]` (still waiting)
- `poll#7 200 completed keys:[explain,jobId]` (should complete)
- `poll#3 404 — keys:[]` (job not found)
- `poll#0 — — error: Network error` (fetch failed)

#### 4. **Updated ScanResults** (`src/pages/ScanResults.jsx`)

**Pass Debug to Loader:**
```javascript
const {
  data: polledExplainData,
  isLoading: isPollingLoading,
  error: pollingError,
  isTimeout: isPollingTimeout,
  retry: retryPolling,
  debug: pollDebug // NEW
} = useGEOExplainPolling(explainJobId, shouldPollGEO);

// ...

if (scanPhase !== 'ready') {
  return (
    <FullScreenScanLoader 
      scanData={scanData}
      isTimeout={isPollingTimeout}
      error={pollingError}
      pollDebug={pollDebug} // Pass debug info
      onRetry={() => {
        if (explainJobId && retryPolling) {
          retryPolling();
        } else {
          if (!explainJobId) {
            toast.error('Missing explainJobId - backend issue. Reload page.');
          }
          window.location.reload();
        }
      }}
    />
  );
}
```

**Retry Preserves JobId:**
- Retry only calls `retryPolling()` which resets polling state
- Does NOT wipe `scanData` or `explainJobId`
- Shows toast if `explainJobId` is missing (backend issue)

#### 5. **Updated Vite Config** (`vite.config.js`)

**Added `/api` Proxy:**
```javascript
proxy: {
  // Proxy API routes to backend (CRITICAL for polling to work)
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    secure: false,
  },
  // ... other proxies
}
```

**Why**: Ensures all `/api/*` requests in dev are proxied to backend, avoiding CORS and routing issues.

### Backend Changes

#### 1. **Added Dev Logging** (`mgo-scanner-backend/src/api/geoExplainJob.ts`)

```typescript
// DEV-ONLY: Log each poll request for debugging
if (process.env.NODE_ENV === 'development') {
  const hasExplain = !!(job.result && job.status === 'completed');
  const explainKeys = hasExplain ? Object.keys(job.result || {}) : [];
  logger.info(`[GEO Poll] jobId=${jobId.slice(0, 8)}... status=${job.status} hasExplain=${hasExplain} explainKeys=[${explainKeys.join(',')}]`);
}
```

**Console output in dev:**
```
[GEO Poll] jobId=geo_expl... status=pending hasExplain=false explainKeys=[]
[GEO Poll] jobId=geo_expl... status=running hasExplain=false explainKeys=[]
[GEO Poll] jobId=geo_expl... status=completed hasExplain=true explainKeys=[version,generatedAt,stats,queries,geoScore,percentile,nicheLabel,locationLabel,industryClassification]
```

#### 2. **Verified Job Persistence** (`mgo-scanner-backend/src/geo/explainJobs.ts`)

**Confirmed:**
- ✅ Jobs are stored in `explainJobs` Map
- ✅ Status transitions: `pending` → `running` → `completed` or `failed`
- ✅ Result is saved as `job.result` with correct structure
- ✅ TTL is 1 hour (cleanup every 10 minutes)
- ✅ Response includes `{ status: 'completed', jobId, explain: result }`

**No changes needed** - backend logic was already correct!

## Diagnostic Flow (Use Debug Line)

### Scenario 1: Polling Never Starts
**Debug shows:** No lines, attemptCount = 0

**Diagnosis:**
- `shouldPollGEO` is false
- Check: `explainJobId` missing or `hasValidExplain` already true

**Fix:** Backend didn't return `explainJobId`, or explain already loaded from storage

### Scenario 2: Poll Returns 404
**Debug shows:** `poll#1 404 — keys:[]`

**Diagnosis:**
- Job not found in backend memory
- Either: wrong jobId, job expired (>1 hour), or backend restarted

**Fix:** 
- Check backend logs for job creation
- Check if `explainJobId` in frontend matches backend
- If backend restarted, jobs are lost (in-memory) → reload page to trigger new scan

### Scenario 3: Poll Returns 200 with `status: pending` Forever
**Debug shows:** `poll#25 200 pending keys:[status,jobId]`

**Diagnosis:**
- Job created but never completes
- Backend generation stuck or threw uncaught error

**Fix:**
- Check backend logs for generation errors
- Check if GEO benchmark is hanging
- Backend may need restart if worker thread deadlocked

### Scenario 4: Poll Returns 200 with `hasExplain: yes` But UI Stuck
**Debug shows:** `poll#7 200 completed keys:[status,jobId,explain] hasExplain:yes`

**Diagnosis:**
- Backend returned explain, but normalization rejected it
- Check: `explain.version !== 'v2'` or `queries.length === 0`

**Fix:**
- Check backend logs for actual explain structure
- Verify `job.result` has `{ version: 'v2', queries: [...] }`
- Frontend normalization should now accept this

### Scenario 5: Poll Returns 200 with Explain, UI Shows Results ✅
**Debug shows:** `poll#5 200 completed keys:[status,jobId,explain] hasExplain:yes`

**Then:** Loader disappears, scan results page renders with GEO queries table

**Success!** This is the expected flow.

## Testing Instructions

### 1. Start Backend
```bash
cd mgo-scanner-backend
npm run dev
```

**Verify:** Backend running on `http://localhost:3000`

### 2. Start Frontend
```bash
cd mgodataImprovedthroughcursor
npm run dev
```

**Verify:** Frontend running on `http://localhost:5173` (or similar)

### 3. Run a New Scan
1. Go to landing page
2. Enter a business (e.g., "Starbucks, San Francisco")
3. Submit scan

### 4. Observe Loader
- **Should show:** Full-screen loader with 3 subsystems
- **Should see (in dev):** Debug line at bottom:
  - `poll#1 200 pending keys:[status,jobId]`
  - `poll#2 200 pending keys:[status,jobId]`
  - `poll#3 200 pending keys:[status,jobId]`
  - ... (continues every 2 seconds)
  - `poll#15 200 completed keys:[status,jobId,explain]`
  - **Then:** Loader disappears, results page shows

### 5. Test Retry
1. If timeout occurs (after 90s)
2. Click "Retry" button
3. **Should see:** attemptCount resets to 0, polling resumes
4. **Should NOT:** Lose jobId or reload page

### 6. Test Refresh During Generation
1. While loader is showing (polling in progress)
2. Refresh page (F5 or Cmd+R)
3. **Should see:** Loader resumes, polling continues with same jobId
4. **Should NOT:** Start new scan or show partial results

### 7. Backend Console Verification
**Should see in backend console:**
```
[GEO Explain Jobs] Created job jobId=geo_explain_... placeId=ChIJ...
[GEO Explain Jobs] Starting generation jobId=geo_explain_...
[GEO Poll] jobId=geo_expl... status=pending hasExplain=false explainKeys=[]
[GEO Poll] jobId=geo_expl... status=running hasExplain=false explainKeys=[]
[GEO Explain Jobs] Industry classified jobId=geo_explain_... industry=...
[GEO Explain Jobs] Generated queries jobId=geo_explain_... count=20
[GEO Explain Jobs] Query evaluation complete jobId=geo_explain_...
[GEO Explain Jobs] Generation completed jobId=geo_explain_... geoScore=...
[GEO Poll] jobId=geo_expl... status=completed hasExplain=true explainKeys=[version,generatedAt,stats,queries,geoScore,percentile,nicheLabel,locationLabel,industryClassification]
```

## Failure Scenarios & Fixes

### If Poll Still Stuck on "taking longer than usual"

**1. Check Debug Line**
   - Look at `lastHttpStatus`, `lastResponseKeys`, `lastStatusField`

**2. If `poll#0` never increments:**
   - Polling not enabled
   - Check: `explainJobId` in ScanResults state
   - Fix: Backend didn't return explainJobId → check scan response

**3. If `404` errors:**
   - Wrong URL or job expired
   - Check: `pollUrl` in debug line
   - Fix: Ensure `/api` proxy is working, restart dev server

**4. If `200 pending` forever:**
   - Backend generation stuck
   - Check: Backend console for errors
   - Fix: Check GEO benchmark, may need backend restart

**5. If `200 completed` but UI stuck:**
   - Normalization rejecting valid explain
   - Check: Backend console for explain structure
   - Fix: Verify `version: 'v2'` and `queries: [...]` present

### If CORS Errors
- **Symptom:** Console shows CORS policy error
- **Fix:** Ensure `/api` proxy is in `vite.config.js` and dev server restarted

### If "Explain job not found" Error
- **Symptom:** 404 immediately
- **Cause:** Backend restarted (jobs are in-memory) or jobId mismatch
- **Fix:** Reload page to trigger new scan

## Files Modified

### Created
- ✅ `mgodataImprovedthroughcursor/src/config/api.js` (new)
- ✅ `GEO_EXPLAIN_POLLING_FIX.md` (this document)

### Modified
- ✅ `mgodataImprovedthroughcursor/src/hooks/useGEOExplainPolling.js`
  - Added debug tracking
  - Robust normalization (accepts multiple response shapes)
  - Uses centralized API config
  - Better error messages

- ✅ `mgodataImprovedthroughcursor/src/components/FullScreenScanLoader.jsx`
  - Added dev debug display
  - Shows poll status, HTTP code, response keys

- ✅ `mgodataImprovedthroughcursor/src/pages/ScanResults.jsx`
  - Passes pollDebug to loader
  - Retry preserves jobId
  - Shows toast if explainJobId missing

- ✅ `mgodataImprovedthroughcursor/vite.config.js`
  - Added `/api` proxy configuration

- ✅ `mgo-scanner-backend/src/api/geoExplainJob.ts`
  - Added dev-only logging for each poll request

### Verified (No Changes Needed)
- ✅ `mgo-scanner-backend/src/geo/explainJobs.ts`
  - Job creation, persistence, and status transitions are correct

## Expected Behavior (Success Path)

1. **User submits scan**
   - Backend creates scan, returns `explainJobId`
   - Frontend shows FullScreenScanLoader

2. **Polling starts (every 2 seconds)**
   - Frontend calls `/api/geo/explain-job/:jobId`
   - Backend returns `{ status: 'pending', jobId }`
   - Loader shows "AI Query Analysis" as loading

3. **Backend generates explain (30-60 seconds)**
   - Backend runs GEO benchmark, evaluates queries
   - Job status transitions to 'completed'
   - `job.result` saved with v2 explain

4. **Polling receives completed response**
   - Frontend receives `{ status: 'completed', jobId, explain: {...} }`
   - Normalization validates: `version === 'v2'` and `queries.length > 0`
   - Data merged into scanData state

5. **Loader exits, results render**
   - `scanPhase` becomes 'ready'
   - FullScreenScanLoader unmounts
   - ScanResults page renders with GEOWhyPanel showing queries

## Rollback Plan

If issues persist:

```bash
# Revert frontend changes
git checkout HEAD~1 -- mgodataImprovedthroughcursor/src/hooks/useGEOExplainPolling.js
git checkout HEAD~1 -- mgodataImprovedthroughcursor/src/pages/ScanResults.jsx
git checkout HEAD~1 -- mgodataImprovedthroughcursor/src/components/FullScreenScanLoader.jsx
git checkout HEAD~1 -- mgodataImprovedthroughcursor/vite.config.js

# Keep new files (no harm)
# - src/config/api.js (unused if reverted)

# Revert backend changes
git checkout HEAD~1 -- mgo-scanner-backend/src/api/geoExplainJob.ts
```

## Performance & Security

**Performance:**
- ✅ Polling interval: 2 seconds (reasonable)
- ✅ Max timeout: 90 seconds (sufficient for explain generation)
- ✅ Cleanup: Jobs expire after 1 hour (prevents memory leak)

**Security:**
- ✅ jobId is server-generated, not user-controlled
- ✅ No sensitive data exposed in debug info
- ✅ Debug display only in DEV mode (`import.meta.env.DEV`)
- ✅ Poll endpoint is read-only (GET)

## Next Steps (Optional Enhancements)

1. **Server-Sent Events (SSE)**
   - Replace polling with push notifications
   - Reduces server load, instant updates

2. **Progress Tracking**
   - Backend streams progress updates
   - Show "15 of 20 queries evaluated"

3. **Redis/Database Storage**
   - Replace in-memory Map with Redis
   - Jobs survive backend restarts

4. **Graceful Degradation**
   - If explain fails, show score only
   - Add "Generate Explain" button for retry

## Conclusion

This fix provides:
- ✅ **Visibility**: Dev debug line shows exactly what's happening
- ✅ **Robustness**: Accepts multiple response shapes, handles errors gracefully
- ✅ **Correctness**: Proper proxy config, centralized API URLs, preserved jobId on retry
- ✅ **Testability**: Clear diagnostic flow based on debug output

The polling should now reliably complete, or fail with clear, actionable errors.


