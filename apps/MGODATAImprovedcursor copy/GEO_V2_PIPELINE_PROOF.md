# GEO Explain v2 Pipeline Proof Logging

## Comprehensive Runtime Value Logging Added

Every critical step now logs actual runtime values (not summaries).

### 1. Backend Job Completion
**File**: `mgo-scanner-backend/src/geo/explainJobs.ts` (line ~177)

**Log**: 
```
[GEO EXPLAIN DONE] { placeId, jobId, v, q, saved }
```

**Proves**: Explain job finished and saved v2 data with queries

---

### 2. Backend API Response State
**File**: `mgo-scanner-backend/src/api/geoExplainJob.ts` (line ~45)

**Log 1**: 
```
[GEO POLL API] RESP { jobId, status, hasExplain, v, q, keys }
```

**Proves**: Job state before building response

---

### 3. Backend API Response Body
**File**: `mgo-scanner-backend/src/api/geoExplainJob.ts` (line ~66)

**Log 2**: 
```
[GEO POLL API] BODY_KEYS ['explain'] v2 20
```

**Proves**: Exact keys in JSON response body sent to client

---

### 4. Frontend Raw Fetch Response
**File**: `mgodataImprovedthroughcursor/src/hooks/useGEOExplainPolling.js` (line ~56-57)

**Log 1**: 
```
[GEO POLL CLIENT] raw { explain: {...} }
```

**Log 2**: 
```
[GEO POLL CLIENT] raw_keys ['explain']
```

**Proves**: What frontend fetch actually received (not normalized yet)

---

### 5. Frontend Normalized Data
**File**: `mgodataImprovedthroughcursor/src/hooks/useGEOExplainPolling.js` (line ~73)

**Log**: 
```
[GEO POLL CLIENT] normalized { v: 'v2', q: 20, keys: [...] }
```

**Proves**: Normalization extracted explain data correctly

---

### 6. Frontend Polling Activation
**File**: `mgodataImprovedthroughcursor/src/pages/ScanResults.jsx` (line ~462)

**Log**: 
```
[ScanResults] polling hook active { explainJobId: 'xxx', geoStatus: 'generating', enabled: true }
```

**Proves**: Polling hook called with correct jobId and enabled status

---

### 7. Frontend State Merge
**File**: `mgodataImprovedthroughcursor/src/pages/ScanResults.jsx` (line ~627)

**Log**: 
```
[GEO MERGE] wrote { v: 'v2', q: 20, keys: [...] }
```

**Proves**: Polled data merged into `scanData.geo.explain`

---

### 8. Component Render
**File**: `mgodataImprovedthroughcursor/src/components/GEOWhyPanel.jsx` (line ~24)

**Log**: 
```
[GEOWhyPanel] render { hasExplain: true, version: 'v2', queriesLength: 20, hasExplainData: true }
```

**Proves**: Component received explain data via props

---

## Required Log Sequence (Working Pipeline)

When everything works correctly, you should see this exact sequence in the console:

```
1. [GEO EXPLAIN DONE] { placeId: 'ChIJxxx', jobId: 'explain_job_123', v: 'v2', q: 20, saved: true }

2. [ScanResults] polling hook active { explainJobId: 'explain_job_123', geoStatus: 'generating', enabled: true }

3. [GEO POLL API] RESP { jobId: 'explain_job_123', status: 'completed', hasExplain: true, v: 'v2', q: 20, keys: ['version', 'generatedAt', 'stats', 'queries', ...] }

4. [GEO POLL API] BODY_KEYS ['explain'] v2 20

5. [GEO POLL CLIENT] raw { explain: { version: 'v2', queries: [...], stats: {...}, ... } }

6. [GEO POLL CLIENT] raw_keys ['explain']

7. [GEO POLL CLIENT] normalized { v: 'v2', q: 20, keys: ['version', 'generatedAt', 'stats', 'queries', ...] }

8. [GEO MERGE] wrote { v: 'v2', q: 20, keys: ['version', 'generatedAt', 'stats', 'queries', ...] }

9. [GEOWhyPanel] render { hasExplain: true, version: 'v2', queriesLength: 20, hasExplainData: true, explainKeys: ['version', 'generatedAt', 'stats', 'queries', ...] }

10. UI Debug Line: debug: hasExplainData=true v=v2 q=20 isArray=true
```

---

## Diagnosis Rules

### CASE 1: No `[GEO EXPLAIN DONE]` log

**Problem**: Explain job never ran or crashed during execution

**Check**:
1. Is `OPENAI_API_KEY` set in backend `.env`?
2. Is explain job enqueued when scan completes? (Check `meoScan.ts` for `createExplainJob()` call)
3. Are there errors in backend logs before this point?

**Fix**: Ensure `createExplainJob(placeId, categoryResolution, locationLabel)` is called when `geo.status === 'ok'`

---

### CASE 2: `[GEO EXPLAIN DONE]` shows `v2/q:20` BUT `[GEO POLL API] RESP` shows `hasExplain: false`

**Problem**: Job completed but result not stored in job Map

**Check**:
1. Is `job.result = explainData;` executed in `explainJobs.ts`?
2. Is `job.status = 'completed';` executed?
3. Is the job Map key correct (jobId matches)?

**Fix**: Verify job completion code:
```typescript
job.status = 'completed';
job.result = explainData; // Must be assigned
job.updatedAt = new Date().toISOString();
```

---

### CASE 3: `[GEO POLL API] BODY_KEYS` shows `['explain'] v2 20` BUT `[GEO POLL CLIENT] raw` shows `['status', 'jobId']`

**Problem**: Frontend hitting different endpoint than backend route

**Check**:
1. What URL is the hook fetching? (Should be `/api/geo/explain-job/:jobId`)
2. Is there another route handling the same path?
3. Is the backend route registered correctly in Express?

**Fix**: 
- Verify hook fetch URL: `${BACKEND_URL}/api/geo/explain-job/${jobId}`
- Verify route registration in `index.ts`: `app.get('/api/geo/explain-job/:jobId', handleGetExplainJob);`

---

### CASE 4: `[GEO POLL CLIENT] normalized` shows `v2/q:20` BUT no `[GEO MERGE] wrote`

**Problem**: Merge useEffect not triggering or validation failing

**Check**:
1. Is `polledExplainData` state updated by hook?
2. Is `useEffect([polledExplainData])` dependency correct?
3. Did merge skip due to validation? (Check for `[GEO MERGE] skipped:` logs)

**Fix**:
- If skipped due to version: Check `polledExplainData.version === 'v2'`
- If skipped due to queries: Check `Array.isArray(polledExplainData.queries)` and `length > 0`
- If no logs at all: Check useEffect deps include `polledExplainData`

---

### CASE 5: `[GEO MERGE] wrote` shows `v2/q:20` BUT `[GEOWhyPanel]` shows `version: null`

**Problem**: Component not receiving merged data from props

**Check**:
1. Is `<GEOWhyPanel explain={scanData?.geo?.explain} />` correct?
2. Is `scanData` state updated after merge?
3. Is sessionStorage overwriting state on reload?

**Fix**:
- Verify prop: `explain={scanData?.geo?.explain ?? null}`
- Check if `setScanData` was called in merge useEffect
- Disable sessionStorage hydration for `geo.explain` temporarily

---

### CASE 6: `[GEOWhyPanel]` shows `version: 'v2', queriesLength: 20, hasExplainData: true` BUT UI still shows empty state

**Problem**: Component logic blocking render despite having data

**Check**:
1. What does `hasExplainData` condition check?
2. Is the component returning early before reaching table render?
3. Is there a conditional wrapper hiding the panel?

**Fix**:
- Verify: `const hasExplainData = version === 'v2' && queries.length > 0;`
- Remove any early returns after data is confirmed present
- Check parent component for conditional rendering

---

## Acceptance Criteria

You must provide console log output showing:

1. **Backend completion**: `[GEO EXPLAIN DONE] { v: 'v2', q: 20 }`
2. **Backend response**: `[GEO POLL API] BODY_KEYS ['explain'] v2 20`
3. **Frontend reception**: `[GEO POLL CLIENT] normalized { v: 'v2', q: 20 }`
4. **Frontend merge**: `[GEO MERGE] wrote { v: 'v2', q: 20 }`
5. **Component render**: `[GEOWhyPanel] render { version: 'v2', queriesLength: 20, hasExplainData: true }`
6. **UI proof**: Dev debug line shows `hasExplainData=true v=v2 q=20 isArray=true`
7. **Visual proof**: Query table with 20 rows visible (no empty state)

---

## Next Steps

1. **Run new scan** with browser console open (verbose mode)
2. **Copy all logs** from console (both backend terminal and browser)
3. **Identify first missing/incorrect log** in the sequence
4. **Apply fix** from diagnosis rules above
5. **Re-run scan** until all logs show correct values
6. **Screenshot/copy** final working log sequence
7. **Remove all debug logs** after verification

---

## Cleanup After Verification

Once pipeline is verified working, remove the following:

**Backend**:
- `console.log('[GEO EXPLAIN DONE]', ...)` from `explainJobs.ts`
- `console.log('[GEO POLL API] RESP', ...)` from `geoExplainJob.ts`
- `console.log('[GEO POLL API] BODY_KEYS', ...)` from `geoExplainJob.ts`

**Frontend**:
- `console.log('[GEO POLL CLIENT] raw', ...)` from `useGEOExplainPolling.js`
- `console.log('[GEO POLL CLIENT] raw_keys', ...)` from `useGEOExplainPolling.js`
- `console.log('[GEO POLL CLIENT] normalized', ...)` from `useGEOExplainPolling.js`
- `console.log('[ScanResults] polling hook active', ...)` from `ScanResults.jsx`
- `console.log('[GEO MERGE] wrote', ...)` from `ScanResults.jsx` (or convert to proper logger)
- `console.log('[GEOWhyPanel] render', ...)` from `GEOWhyPanel.jsx`
- Dev debug lines: `debug: hasExplainData=...` from `GEOWhyPanel.jsx`

Replace critical logs with proper logger calls (e.g., `logger.info()`) if needed for production monitoring.


