# GEO Explain v2 Pipeline Debugging

## Added Console Logs to Trace Data Flow

### Phase 1: Explain Job Execution (Backend)
**File**: `/mgo-scanner-backend/src/geo/explainJobs.ts`

**Added logs**:
1. Line ~112: `console.log('[GEO EXPLAIN] starting', { jobId, placeId })`
   - Logs when explain job begins
   
2. Line ~157: `console.log('[GEO EXPLAIN] completed', { jobId, queries: queryResults.length, mentions, top3 })`
   - Logs after queries are evaluated
   
3. Line ~170: `console.log('[GEO EXPLAIN] saving', { version, queriesLength, stats, geoScore })`
   - Logs before saving explain data to job result

### Phase 2: Scan API Returns Explain (Backend)
**File**: `/mgo-scanner-backend/src/api/geoExplainJob.ts`

**Added log**:
1. Line ~45: `console.log('[SCAN API] geo.explain', { version, queriesLength, status, hasResult })`
   - Logs when explain job is polled via `/api/geo/explain-job/:jobId`
   - Shows version and query count being returned

### Phase 3: Frontend Receives Explain (Frontend)
**File**: `/mgodataImprovedthroughcursor/src/pages/ScanResults.jsx`

**Added log**:
1. Line ~996: `console.log('GEO EXPLAIN IN UI', { hasGeo, hasInitialExplain, hasPolledExplain, explainVersion, queriesLength })`
   - Logs what explain data frontend received
   - Shows whether data came from initial scan or polling

### Phase 4: Component Rendering
**File**: `/mgodataImprovedthroughcursor/src/components/GEOWhyPanel.jsx`

**No changes needed** - Component already has correct logic:
- Line 43: Checks `geo.explain.version === 'v2'` to determine if explain data exists
- Shows empty state if v2 data not present
- Shows summary strip, intent table, and query rows when data exists

## Expected Log Sequence

### When Running a New Scan

1. **Scan starts**:
   ```
   [GEO EXPLAIN] starting { jobId: 'xxx', placeId: 'xxx' }
   ```

2. **Queries evaluated** (after ~8-12 seconds):
   ```
   [GEO EXPLAIN] completed { jobId: 'xxx', queries: 20, mentions: 15, top3: 10 }
   ```

3. **Data saved**:
   ```
   [GEO EXPLAIN] saving { version: 'v2', queriesLength: 20, stats: {...}, geoScore: 93 }
   ```

4. **Frontend polls explain job**:
   ```
   [SCAN API] geo.explain { version: 'v2', queriesLength: 20, status: 'completed', hasResult: true }
   ```

5. **Frontend receives data**:
   ```
   GEO EXPLAIN IN UI { hasGeo: true, hasInitialExplain: false, hasPolledExplain: true, explainVersion: 'v2', queriesLength: 20 }
   ```

## Troubleshooting Guide

### Issue: No `[GEO EXPLAIN] starting` log
**Problem**: Explain job never triggered
**Fix**: Check where `createExplainJob()` is called in scan API. Ensure it's being invoked when `geo.status === 'ok'`.

### Issue: `[GEO EXPLAIN] completed` shows queries: 0
**Problem**: Query generation or evaluation failed
**Fix**: Check queryGenerator and queryEvaluator for errors. Verify OpenAI API key is set.

### Issue: `[SCAN API] geo.explain` shows version: undefined
**Problem**: Explain job result not stored properly or wrong data structure
**Fix**: Verify `job.result` assignment in explainJobs.ts line ~178.

### Issue: `GEO EXPLAIN IN UI` shows hasPolledExplain: false
**Problem**: Frontend polling hook not working or explain job not found
**Fix**: 
1. Verify `useGEOExplainPolling` hook is polling correct jobId
2. Check browser network tab for `/api/geo/explain-job/:jobId` requests
3. Ensure explain job isn't expiring (1 hour TTL)

### Issue: `GEO EXPLAIN IN UI` shows explainVersion: undefined
**Problem**: Polled data doesn't have version field or wrong structure
**Fix**: Verify explain job API returns `result.version` correctly. Check job.result shape.

### Issue: Empty state still shows after logs confirm data
**Problem**: Component render logic blocking display
**Fix**: Verify GEOWhyPanel receives `geo.explain.version === 'v2'` and `geo.explain.queries.length > 0`.

## Data Flow Diagram

```
┌─────────────┐
│ Scan Request│
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ meoScan.ts          │
│ Creates explain job │
│ Returns explainJobId│
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ explainJobs.ts      │
│ [GEO EXPLAIN]       │
│   starting          │
│   completed         │
│   saving            │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Job stored in       │
│ in-memory Map       │
│ { jobId -> result } │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Frontend polls:     │
│ /api/geo/           │
│   explain-job/:id   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ geoExplainJob.ts    │
│ [SCAN API]          │
│   geo.explain       │
│ Returns job.result  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ useGEOExplainPolling│
│ Hook stores:        │
│ polledExplainData   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ ScanResults.jsx     │
│ GEO EXPLAIN IN UI   │
│ Merges explain data │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ GEOWhyPanel.jsx     │
│ Renders if v2 data  │
│ - Summary strip     │
│ - Intent table      │
│ - Query rows (20)   │
└─────────────────────┘
```

## Next Steps

1. Run a new scan
2. Open browser console and backend logs
3. Verify all 5 console.log statements appear
4. If any log missing, follow troubleshooting guide
5. Once all logs confirm data flow, remove console.log statements


