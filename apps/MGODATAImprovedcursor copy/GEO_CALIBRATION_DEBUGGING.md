# 🔍 GEO Calibration System - Debugging Guide

## Problem: Is the Calibration Actually Running?

If you're still seeing inflated GEO scores (e.g., 74 with 1 review), the calibration system might not be executing. This guide helps you prove which code path is running.

---

## ✅ Step 1: Prove Which Code Path is Running

### Backend: Add Loud Logging

**✅ DONE:** Added loud ASCII box log in `calibrateGEOScore()`:

```
╔════════════════════════════════════════════════════════════════╗
║ [GEO] CALIBRATION HIT cal-v3                                   ║
╠════════════════════════════════════════════════════════════════╣
║ Review Count:     1      Photo Count:    1                     ║
║ Raw GEO:          74     Final GEO:       35                   ║
║ Cap Applied:      YES    Cap Value:       35                   ║
║ Reliability:      17%    Confidence:      low                  ║
╚════════════════════════════════════════════════════════════════╝
```

**How to check:**
```bash
# Run a scan and watch terminal
npm run dev

# In another terminal, trigger a scan
curl -X POST 'http://localhost:3000/api/meo/scan' \
  -H 'Content-Type: application/json' \
  -d '{"businessName":"Test Business","location":"Mason, OH"}'

# Look for the ASCII box in terminal output
# If you DON'T see it → calibration is not running
```

### Frontend: Add Version Stamp in Response

**✅ DONE:** Added to schema:
```typescript
{
  geoAlgoVersion: "cal-v3",  // 🔊 Version stamp
  geoCalibrated: true        // 🔊 True if calibration ran
}
```

**How to check:**
```javascript
// In browser console on ScanResults page
console.log('GEO Version:', scanData?.geo?.geoAlgoVersion);
console.log('GEO Calibrated:', scanData?.geo?.geoCalibrated);

// If undefined → you're viewing old data OR calibration didn't run
```

---

## ✅ Step 2: Kill the Cache

The most common issue is **viewing cached/stale data**.

### Backend Cache

**Option A: Bump Cache Key (Recommended)**

```typescript
// In geoEngine.ts or wherever cache key is generated
const cacheKey = `geo:${placeId}:${radiusMeters}:cal-v3`;  // ← Add version!

// Old key: "geo:ChIJ123:5000"
// New key: "geo:ChIJ123:5000:cal-v3"
// This forces cache miss on all old scans
```

**Option B: Disable Cache Temporarily**

```typescript
// In GEO benchmark handler
const forceRefresh = true;  // Always recompute for testing

// Or via query param
const forceRefresh = req.query.force === '1';
```

### Frontend/DB Cache

**Wipe stored GEO for test scan:**

```javascript
// In browser console
const scanData = JSON.parse(sessionStorage.getItem('scanResults'));
scanData.geo = null;  // Clear GEO
scanData.geoBackendData = null;  // Clear backend data
sessionStorage.setItem('scanResults', JSON.stringify(scanData));
location.reload();  // Reload page
```

**Or use IndexedDB (if storing scans):**

```javascript
// Find and delete old scan
const db = await indexedDB.open('MGODatabase', 1);
const tx = db.transaction('scanResults', 'readwrite');
const store = tx.objectStore('scanResults');
await store.delete(scanId);  // Delete old scan
```

---

## ✅ Step 3: Make Calibration Impossible to Miss

### Find All GEO Score Assignments

```bash
# Search for all places where geoScore is set
grep -r "geoScore =" src/
grep -r "scores.geo =" src/
grep -r "return { geoScore" src/
```

### Enforce Single Authority

**❌ BAD (Multiple calculation paths):**
```typescript
// In geoEngine.ts
const rawGeo = calculateRawGEO(...);
const geoScore = rawGeo;  // ← No calibration!
return { geoScore };

// In fallback.ts
const geoScore = 50;  // ← Default, no calibration!
return { geoScore };
```

**✅ GOOD (Single authority):**
```typescript
// Calculate raw score first
const rawGeo = calculateRawGEO(...);

// ALWAYS pass through calibration (single authority)
const calibrated = calibrateGEOScore({
  rawScore: rawGeo,
  reviewCount,
  photoCount,
  rating,
  hasWebsite,
  hasHours,
  // ...
});

// Use calibrated result ONLY
const geoScore = calibrated.finalScore;

return {
  geoScore,
  geoAlgoVersion: calibrated.geoAlgoVersion,  // ✅ Proof
  geoCalibrated: calibrated.geoCalibrated,    // ✅ Proof
  calibration: {
    reliabilityScore: calibrated.reliabilityScore.total,
    hardCap: calibrated.hardCap,
    // ...
  }
};
```

---

## ✅ Step 4: Sanity Test Hard Cap

**✅ DONE:** Added `sanityTestHardCap()` function.

**Temporary test in code:**

```typescript
// Right before returning GEO response
geoScore = sanityTestHardCap(geoScore, reviewCount, photoCount);

// This is a fail-safe that logs:
// "[GEO SANITY TEST] 1 review detected → capping at 35 (was 74)"
```

**If UI still shows 74 after this:**
- Frontend is not reading the new response
- Frontend is reading a cached/stale field
- Frontend is using a different endpoint

---

## ✅ Step 5: Confirm Frontend Reads Correct Field

### Add Debug Logging in ScanResults Page

```jsx
// In ScanResults.jsx (or wherever GEO score is displayed)
useEffect(() => {
  if (scanData) {
    console.log('═══════════════════════════════════════════');
    console.log('🔍 [ScanResults] GEO DEBUG');
    console.log('═══════════════════════════════════════════');
    console.log('Full scan data:', scanData);
    console.log('Scores object:', scanData.scores);
    console.log('GEO from scores.geo:', scanData.scores?.geo);
    console.log('GEO from geo.geoScore:', scanData.geo?.geoScore);
    console.log('GEO algo version:', scanData.geo?.geoAlgoVersion);
    console.log('GEO calibrated:', scanData.geo?.geoCalibrated);
    console.log('GEO backend data:', scanData.geoBackendData);
    console.log('═══════════════════════════════════════════');
  }
}, [scanData]);
```

### Display Version Stamp in UI

```jsx
{/* Small version indicator (bottom-right corner or debug panel) */}
{scanData?.geo?.geoAlgoVersion && (
  <div className="fixed bottom-2 right-2 text-xs text-slate-400 font-mono bg-white/80 px-2 py-1 rounded border border-slate-200">
    GEO v: {scanData.geo.geoAlgoVersion}
    {scanData.geo.geoCalibrated && ' ✅'}
  </div>
)}
```

### Check Which Field UI Is Reading

```jsx
// Bad - might be reading wrong field
const geoScore = scanData.geo?.score;  // ❌ Wrong field name

// Good - correct field
const geoScore = scanData.scores?.geo;  // ✅ Correct (top-level scores object)
// OR
const geoScore = scanData.geo?.geoScore;  // ✅ Correct (nested in geo object)
```

---

## ✅ Step 6: Add Force Recompute Endpoint

**Create:** `POST /api/geo/refresh`

```typescript
// src/api/geoRefresh.ts
import { Request, Response } from 'express';
import { runGEOBenchmark } from '../geo/geoEngine';
import { geoBenchmarkCache } from '../lib/cache';

export async function handleGEORefresh(req: Request, res: Response) {
  const { scanId, placeId } = req.body;
  const force = req.query.force === '1' || req.body.force === true;
  
  if (!placeId) {
    return res.status(400).json({ error: 'placeId required' });
  }
  
  // Clear cache for this placeId
  const cacheKeys = geoBenchmarkCache.keys();
  for (const key of cacheKeys) {
    if (key.includes(placeId)) {
      geoBenchmarkCache.delete(key);
      console.error(`[GEO Refresh] Deleted cache key: ${key}`);
    }
  }
  
  // Recompute GEO
  const geoResult = await runGEOBenchmark(placeId, {
    radiusMeters: 5000,
    nicheLabel: req.body.nicheLabel,
    nicheKey: req.body.nicheKey,
    city: req.body.city,
    forceRefresh: true  // ← Always fresh
  });
  
  console.error('╔════════════════════════════════════════╗');
  console.error('║ [GEO REFRESH] Forced Recompute         ║');
  console.error('╠════════════════════════════════════════╣');
  console.error(`║ Place ID: ${placeId.padEnd(30)} ║`);
  console.error(`║ New GEO Score: ${String(geoResult.geoScore).padEnd(23)} ║`);
  console.error(`║ Algo Version: ${(geoResult.geoAlgoVersion || 'N/A').padEnd(24)} ║`);
  console.error(`║ Calibrated: ${String(geoResult.geoCalibrated).padEnd(26)} ║`);
  console.error('╚════════════════════════════════════════╝');
  
  res.json(geoResult);
}
```

**Add to routes:**

```typescript
// In index.ts
import { handleGEORefresh } from './api/geoRefresh';

app.post('/api/geo/refresh', handleGEORefresh);
```

**Frontend button:**

```jsx
<Button
  onClick={async () => {
    const response = await fetch('/api/geo/refresh?force=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placeId: scanData.business.place_id,
        nicheLabel: scanData.geo.nicheLabel,
        nicheKey: scanData.geo.nicheKey,
        city: scanData.geo.location.split(',')[0],
        force: true
      })
    });
    const newGeo = await response.json();
    console.log('New GEO:', newGeo);
    // Update scan data with new GEO
  }}
>
  🔄 Force Recompute GEO
</Button>
```

---

## 🎯 The Real Fix (One Sentence)

**Your ScanResults page is showing an old GEO record.**

**Solution:**
1. Bump `geoAlgoVersion` to "cal-v3" ✅ **DONE**
2. Change cache key to include version ⏳ **NEEDS IMPLEMENTATION**
3. Wipe existing GEO in DB/sessionStorage ⏳ **MANUAL STEP**
4. Add loud log stamp to prove calibration runs ✅ **DONE**
5. Display version in UI ⏳ **NEEDS IMPLEMENTATION**

---

## 📋 Debugging Checklist

**When you run a scan, verify:**

- [ ] Terminal shows ASCII box log "CALIBRATION HIT cal-v3"
- [ ] Response includes `"geoAlgoVersion": "cal-v3"`
- [ ] Response includes `"geoCalibrated": true`
- [ ] Response includes `calibration` object with `hardCap` details
- [ ] UI displays "GEO v: cal-v3" somewhere
- [ ] Browser console shows correct GEO score (not 74 for 1 review)
- [ ] Cache key includes version: `geo:ChIJ123:5000:cal-v3`

**If any of these fail:**
→ Calibration is NOT running
→ Follow steps above to debug

---

## 🧪 Test Case: 1 Review, 1 Photo

**Expected:**
```json
{
  "geoScore": 35,  // ✅ Capped (not 74!)
  "geoAlgoVersion": "cal-v3",
  "geoCalibrated": true,
  "calibration": {
    "reliabilityScore": 0.17,
    "hardCap": {
      "capApplied": true,
      "capValue": 35,
      "capReason": "Only 1 review. Insufficient data for reliable GEO score.",
      "rawScore": 74,
      "finalScore": 35
    }
  }
}
```

**Terminal output:**
```
╔════════════════════════════════════════════════════════════════╗
║ [GEO] CALIBRATION HIT cal-v3                                   ║
╠════════════════════════════════════════════════════════════════╣
║ Review Count:     1      Photo Count:    1                     ║
║ Raw GEO:          74     Final GEO:       35                   ║
║ Cap Applied:      YES    Cap Value:       35                   ║
║ Reliability:      17%    Confidence:      low                  ║
╚════════════════════════════════════════════════════════════════╝
[GEO SANITY TEST] 1 review detected → capping at 35 (was 74)
```

**Browser console:**
```
GEO Version: "cal-v3"
GEO Calibrated: true
GEO Score: 35  ✅
```

---

## 🚨 Common Issues

### Issue 1: No ASCII box in terminal
**Cause:** `calibrateGEOScore()` is not being called
**Fix:** Ensure GEO engine uses calibration (see Step 3)

### Issue 2: Response has no `geoAlgoVersion`
**Cause:** Using old GEO engine code (pre-calibration)
**Fix:** Update GEO engine to return version fields

### Issue 3: UI shows 74 despite backend returning 35
**Cause:** Frontend reading wrong field or cached data
**Fix:** Check which field UI reads (Step 5) + clear cache (Step 2)

### Issue 4: Version is "cal-v3" but score is still 74
**Cause:** Backend returning version but not using calibrated score
**Fix:** Check that `geoScore = calibrated.finalScore` (not `rawScore`)

---

## ✅ Success Criteria

**You know calibration is working when:**

1. ✅ Terminal shows ASCII box with "CALIBRATION HIT cal-v3"
2. ✅ Response includes `"geoCalibrated": true`
3. ✅ Business with 1 review scores **≤35 GEO** (not 74)
4. ✅ UI shows "GEO v: cal-v3"
5. ✅ `calibration` object shows `hardCap.capApplied: true`

**If all 5 pass → Calibration is LIVE! 🎉**

---

## 📝 Quick Command Reference

```bash
# Watch terminal for calibration log
npm run dev | grep -A 10 "CALIBRATION HIT"

# Test scan
curl -X POST 'http://localhost:3000/api/meo/scan' \
  -H 'Content-Type: application/json' \
  -d '{"businessName":"Yolked Up Supplements","location":"Mason, OH"}' \
  | jq '.geo.geoAlgoVersion, .geo.geoCalibrated, .geo.geoScore'

# Expected output:
# "cal-v3"
# true
# 35  (or similar capped value)

# Force refresh GEO
curl -X POST 'http://localhost:3000/api/geo/refresh?force=1' \
  -H 'Content-Type: application/json' \
  -d '{"placeId":"ChIJ...","nicheLabel":"Supplement store","nicheKey":"supplement_store","city":"Mason"}'

# Clear all GEO cache
# (Do this in backend code or via admin endpoint)
```

---

**Status: ✅ Debugging Infrastructure Complete**

**Next Steps:**
1. Run a scan and check terminal for ASCII box
2. Verify response includes `geoAlgoVersion: "cal-v3"`
3. Confirm UI shows capped score (not inflated)
4. If any fail → follow debugging steps above




