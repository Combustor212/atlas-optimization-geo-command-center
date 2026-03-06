# Scan Results Stuck State Fix - Implementation Summary

## Problem Statement
The ScanResults page was showing partial results (GEO score) while GEO Explain remained stuck in "Generating..." state. The queries/prompts table never rendered, creating a poor user experience.

## Root Causes Identified
1. **Multiple sources of truth**: Frontend used sessionStorage + state + poll result inconsistently
2. **Premature rendering**: UI showed partial results before all subsystems were ready
3. **Invalid state persistence**: SessionStorage trapped stale "generating" placeholder objects
4. **Polling not enabled correctly**: Condition for enabling polling was too restrictive
5. **No timeout handling**: No visible retry mechanism when explain generation took too long

## Solution Implementation

### 1. Single Source of Truth (`scanPhase`)
Added computed `scanPhase` in `ScanResults.jsx`:
```javascript
const scanPhase = (() => {
  if (!scanData) return 'loading';
  
  const hasMEO = scanData.scores?.meo != null;
  const hasGEOScore = scanData.geo?.score != null;
  const hasGEOExplain = hasValidExplainV2(scanData.geo?.explain);
  
  // Error states
  if (scanData.geo?.status === 'failed') return 'error';
  
  // Ready = all subsystems complete
  if (hasMEO && hasGEOScore && hasGEOExplain) return 'ready';
  
  // Partial = have some data but not all
  if (hasMEO || hasGEOScore) return 'partial';
  
  // Loading = initial state
  return 'loading';
})();
```

**Phases:**
- `loading`: Initial state, no data yet
- `partial`: Have some data (MEO and/or GEO score) but not explain
- `ready`: ALL subsystems complete (MEO + GEO score + GEO explain with queries)
- `error`: Explicit failure

### 2. Full-Gate Rendering with `FullScreenScanLoader`
Created new component: `src/components/FullScreenScanLoader.jsx`

**Features:**
- Full-screen unified loader with checklist of subsystems
- Shows real-time status for each subsystem:
  - ✅ Maps Score (MEO)
  - ✅ AI Visibility Score (GEO)
  - ✅ AI Query Analysis (GEO Prompts)
- Timeout handling with "Retry" button
- Error states with clear messaging
- Smooth animations

**Usage in ScanResults:**
```javascript
if (scanPhase !== 'ready') {
  return (
    <FullScreenScanLoader 
      scanData={scanData}
      isTimeout={isPollingTimeout}
      error={pollingError}
      onRetry={() => {
        if (explainJobId) {
          retryPolling();
        } else {
          window.location.reload();
        }
      }}
    />
  );
}
```

### 3. Normalize & Merge Explain Data
Added `normalizeExplain()` helper:
```javascript
function normalizeExplain(explainData) {
  if (!explainData) return null;
  
  // Check if it's valid v2 with queries
  const isValidV2 = 
    explainData.version === 'v2' && 
    Array.isArray(explainData.queries) && 
    explainData.queries.length > 0;
  
  if (!isValidV2) return null;
  
  return explainData;
}
```

**Used in three places:**
1. **SessionStorage load**: Discard invalid explains on page load
2. **Polling merge**: Only merge valid v2 explains into state
3. **Readiness check**: Determine if explain is actually ready

### 4. Fixed Polling Logic
**Before:**
```javascript
const shouldPollGEO = derivedGEOStatus === 'generating' && scanData?.geo?.explainJobId;
```

**After:**
```javascript
const explainJobId = scanData?.geo?.explainJobId;
const hasValidExplain = hasValidExplainV2(scanData?.geo?.explain);
const shouldPollGEO = !!explainJobId && !hasValidExplain;
```

**Key change**: Poll whenever we have a jobId AND don't have a valid explain yet, regardless of status string.

### 5. SessionStorage Fixes
**On load** (`useEffect` in `loadAndSaveScan`):
```javascript
if (data.geo?.explain) {
  const normalized = normalizeExplain(data.geo.explain);
  if (!normalized) {
    // Invalid explain - discard it
    data.geo.explain = null;
  }
}
```

**On merge** (polling useEffect):
```javascript
const normalizedExplain = normalizeExplain(polledExplainData);
if (!normalizedExplain) {
  return; // Skip merge
}

// Only persist when valid
sessionStorage.setItem('scanResults', JSON.stringify(updated));
```

**Never stored:**
- Placeholder objects like `{ status: 'generating' }`
- Non-v2 explain objects
- Explains without queries array
- Empty or invalid explains

### 6. Timeout & Retry Capability
**Updated polling hook** (`useGEOExplainPolling.js`):
- Increased `MAX_POLL_TIME_MS` from 20s to 90s (per requirements)
- Adjusted `POLL_INTERVAL_MS` from 1.5s to 2s (reduce server load)
- Added `status` field to return value:
  ```javascript
  const status = 
    error ? 'error' :
    isTimeout ? 'timeout' :
    data ? 'done' :
    isLoading ? 'polling' :
    'idle';
  ```

**Retry behavior:**
```javascript
onRetry={() => {
  if (explainJobId) {
    retryPolling(); // Use hook's retry
  } else {
    window.location.reload(); // Full page reload
  }
}}
```

### 7. GEOWhyPanel (Already Correct)
The `GEOWhyPanel` component was already implemented correctly:
- ✅ Renders only from `explain` prop
- ✅ No internal polling logic
- ✅ No sessionStorage access
- ✅ Clean validation: `hasData = explain?.version === 'v2' && Array.isArray(explain?.queries) && explain.queries.length > 0`

## Files Modified

### Created
- `src/components/FullScreenScanLoader.jsx` (new component)

### Modified
- `src/pages/ScanResults.jsx`:
  - Added `normalizeExplain()` and `hasValidExplainV2()` helpers
  - Added `scanPhase` computation (single source of truth)
  - Fixed polling condition to use `hasValidExplainV2`
  - Fixed explain merge to only accept valid v2 data
  - Fixed sessionStorage to discard invalid explains
  - Added full-gate rendering with `FullScreenScanLoader`
  - Removed debug console.logs

- `src/hooks/useGEOExplainPolling.js`:
  - Increased timeout from 20s to 90s
  - Adjusted poll interval to 2s
  - Added `status` field to return value

### Unchanged (Already Correct)
- `src/components/GEOWhyPanel.jsx`: Already renders purely from props

## Acceptance Criteria Met

✅ **1. New scan shows only full loader until ready**
- `scanPhase !== 'ready'` renders `FullScreenScanLoader`
- No partial results shown

✅ **2. Automatic switch to full results when explain completes**
- Polling `useEffect` merges valid explain into state
- `scanPhase` automatically becomes 'ready'
- React re-renders with full results

✅ **3. Page refresh doesn't reintroduce stuck "generating"**
- SessionStorage load discards invalid explains
- Only valid v2 explains with queries are kept

✅ **4. Clear timeout message + retry functionality**
- `FullScreenScanLoader` shows timeout state when `isTimeout === true`
- Retry button calls `retryPolling()` or `window.location.reload()`
- Error state shows red alert with retry option

## Testing Recommendations

### Manual Testing
1. **New scan**: Run a scan and observe loader showing all 3 subsystems
2. **Refresh during generation**: Refresh page while explain is generating
3. **Timeout**: Wait 90+ seconds to see timeout state
4. **Retry**: Click retry button when timeout occurs
5. **Successful completion**: Verify full results render after explain completes

### Edge Cases to Test
- Network failure during polling
- Backend returns invalid explain format
- Backend returns explain without queries
- Multiple refreshes in quick succession
- Browser back/forward navigation

### Console Verification
No errors should appear. Removed all debug logs except critical errors.

## Performance Impact
- **Reduced polling frequency**: 2s interval (was 1.5s) = 25% fewer requests
- **Increased timeout**: 90s (was 20s) = better UX for slow explain generation
- **Single re-render**: Explain merge happens once when valid data received
- **No infinite loops**: Dependencies are stable, no useEffect loops

## Security Considerations
- ✅ No sensitive data in localStorage/sessionStorage beyond scan results
- ✅ Poll endpoint is read-only (GET)
- ✅ No user input in polling logic
- ✅ jobId is server-generated, not user-controlled

## Rollback Plan
If issues occur:
1. Revert `ScanResults.jsx` changes (keep old rendering logic)
2. Keep `FullScreenScanLoader.jsx` (can be used in future)
3. Keep polling hook changes (longer timeout is better)

Git commands:
```bash
git diff HEAD~1 src/pages/ScanResults.jsx
git checkout HEAD~1 -- src/pages/ScanResults.jsx
```

## Future Enhancements
1. **Server-sent events (SSE)**: Replace polling with push notifications
2. **Progress bar**: Show % completion during explain generation
3. **Partial explain rendering**: Show queries as they complete (requires backend changes)
4. **Offline support**: Cache completed explains in IndexedDB
5. **Analytics**: Track how often timeouts occur, avg generation time

## Conclusion
This implementation provides a robust, user-friendly solution to the stuck scan state issue. By enforcing a single source of truth, validating all data, and using full-gate rendering, we ensure users never see partial or stale results. The unified loader provides clear feedback on what's happening and allows retry on timeout/failure.


