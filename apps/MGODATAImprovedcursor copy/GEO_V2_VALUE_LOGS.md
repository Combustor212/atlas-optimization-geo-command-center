# GEO Explain v2 Real Value Logging

## Architecture Note

**IMPORTANT**: This codebase does NOT persist scans to a database. Scans are ephemeral:
- Initial scan response is stored in frontend sessionStorage
- Explain jobs run in background and store results in in-memory Map (backend)
- Frontend polls `/api/geo/explain-job/:jobId` to retrieve explain data
- Frontend merges polled explain data into the UI

Therefore, there is NO "saved_to_scan" step in the traditional sense - explain data flows from polling, not from updating a persistent scan record.

## Added Real Value Logs

### BACKEND LOG 1: Explain Job Completion
**File**: `mgo-scanner-backend/src/geo/explainJobs.ts` (line ~177)
**Log**: 
```javascript
console.log('[GEO EXPLAIN] completed', {
  jobId,
  placeId,
  version: explainData?.version,
  queries: explainData?.queries?.length,
  hasStats: !!explainData?.stats
});
```
**Purpose**: Confirms explain job finished and has v2 data with queries

### BACKEND LOG 2: Initial Scan Response
**File**: `mgo-scanner-backend/src/api/meoScan.ts` (line ~360)
**Log**:
```javascript
console.log('[SCAN API] returning', {
  placeId,
  geoStatus,
  geoExplainVersion: finalGeo?.explain?.version,
  geoExplainQueries: finalGeo?.explain?.queries?.length,
  explainJobId: geoJobId
});
```
**Purpose**: Shows what initial scan returns (explain will be placeholder/null, explainJobId present)

### BACKEND LOG 3: Explain Job Polling Response
**File**: `mgo-scanner-backend/src/api/geoExplainJob.ts` (line ~45)
**Log**:
```javascript
console.log('[SCAN API] geo.explain', {
  version: job.result?.version,
  queriesLength: job.result?.queries?.length,
  status: job.status,
  hasResult: !!job.result
});
```
**Purpose**: Shows explain data being returned when frontend polls

### FRONTEND LOG 4: UI Data Reception
**File**: `mgodataImprovedthroughcursor/src/pages/ScanResults.jsx` (line ~996)
**Log**:
```javascript
console.log('UI scanData.geo.explain', {
  version: scanData?.geo?.explain?.version,
  queries: scanData?.geo?.explain?.queries?.length,
  keys: scanData?.geo?.explain ? Object.keys(scanData.geo.explain) : null,
  polledVersion: polledExplainData?.version,
  polledQueries: polledExplainData?.queries?.length
});
```
**Purpose**: Shows what explain data frontend received (from initial scan + from polling)

## Expected Log Sequence (Working Pipeline)

### When Running a New Scan:

1. **Initial scan completes** (~1-2 seconds):
   ```
   [SCAN API] returning {
     placeId: "ChIJxxx",
     geoStatus: "ok",
     geoExplainVersion: undefined,
     geoExplainQueries: undefined,
     explainJobId: "explain_job_123"
   }
   ```

2. **Frontend loads with initial data**:
   ```
   UI scanData.geo.explain {
     version: undefined,
     queries: undefined,
     keys: ["summary", "topImpactDrivers", ...], // v1 placeholder
     polledVersion: undefined,
     polledQueries: undefined
   }
   ```

3. **Frontend starts polling** (hook logs):
   ```
   [GEO Polling] Starting poll for job { jobId: "explain_job_123" }
   [GEO Polling] Job status: { jobId: "...", status: "running", hasResult: false }
   ```

4. **Explain job completes** (~8-12 seconds after scan):
   ```
   [GEO EXPLAIN] completed {
     jobId: "explain_job_123",
     placeId: "ChIJxxx",
     version: "v2",
     queries: 20,
     hasStats: true
   }
   ```

5. **Frontend polls and gets result**:
   ```
   [SCAN API] geo.explain {
     version: "v2",
     queriesLength: 20,
     status: "completed",
     hasResult: true
   }
   ```

6. **Hook sets polled data** (hook logs):
   ```
   [GEO Polling] Explain data ready { geoScore: 93 }
   ```

7. **UI re-renders with polled data**:
   ```
   UI scanData.geo.explain {
     version: undefined,       // From initial scan (still placeholder)
     queries: undefined,       // From initial scan (still placeholder)
     keys: ["summary", ...],   // From initial scan (v1 structure)
     polledVersion: "v2",      // ✓ From polling
     polledQueries: 20         // ✓ From polling
   }
   ```

8. **GEOWhyPanel receives merged data**:
   - Props: `geo.explain = scanData.geo.explain || polledExplainData`
   - Should resolve to `polledExplainData` (v2 with 20 queries)
   - Panel checks: `geo.explain.version === 'v2'` → true
   - Panel renders: summary strip + query table

## Troubleshooting Cases

### CASE A: No `[GEO EXPLAIN] completed` log
**Problem**: Explain job never ran or crashed
**Fix**: 
- Check backend logs for errors in explainJobs.ts
- Verify OpenAI API key is set
- Check queryGenerator and queryEvaluator for errors

### CASE B: `[GEO EXPLAIN] completed` shows `queries: 0`
**Problem**: Query generation or evaluation failed
**Fix**:
- Check queryGenerator.ts - should generate 20 queries
- Verify OpenAI API calls succeed in queryEvaluator.ts
- Check for rate limit errors

### CASE C: `[SCAN API] geo.explain` shows `version: undefined`
**Problem**: Explain job completed but result not stored in Map or job expired
**Fix**:
- Verify explainJobs Map stores job.result correctly
- Check if job expired (1 hour TTL)
- Verify jobId matches between creation and polling

### CASE D: `UI scanData.geo.explain` shows `polledVersion: undefined`
**Problem**: Frontend polling not working or not merging data
**Fix**:
- Check browser network tab for `/api/geo/explain-job/:jobId` requests
- Verify useGEOExplainPolling hook is enabled (status === 'generating')
- Check if polling timed out (20 second limit)
- Verify hook sets `data` when status === 'completed'

### CASE E: `polledVersion: "v2"` and `polledQueries: 20` BUT panel empty
**Problem**: GEOWhyPanel not reading polled data correctly
**Fix**:
- Verify GEOWhyPanel receives: `geo.explain = scanData.geo.explain || polledExplainData`
- Check if empty state condition is too strict
- Verify panel checks `geo.explain?.version === 'v2'` (not `geo.explain.version`)

## Key Insight: Polling is Required

The initial scan response will NEVER contain v2 explain data. The frontend MUST poll to get it.

The merge logic in ScanResults.jsx is:
```javascript
geo={{
  ...scanData.geo,
  explain: scanData.geo.explain || polledExplainData || null
}}
```

Since `scanData.geo.explain` is v1 placeholder (truthy), it will be used instead of `polledExplainData`.

**THIS IS THE BUG**: The `||` operator will use the first truthy value, which is the v1 placeholder.

**FIX**: Should check for v2 specifically:
```javascript
explain: (scanData.geo.explain?.version === 'v2' ? scanData.geo.explain : polledExplainData) || null
```

OR prioritize polled data:
```javascript
explain: polledExplainData || scanData.geo.explain || null
```


