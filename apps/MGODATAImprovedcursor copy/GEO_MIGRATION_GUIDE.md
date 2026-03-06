# GEO Calibration System - Migration Guide

## Current Status

✅ **Completed:**
- Schema updates (`geoSchema.ts`)
- Reliability scorer (`reliabilityScorer.ts`)
- Niche query generator (`nicheQueryGenerator.ts`)
- Wins/losses classifier (`winsLossesClassifier.ts`)
- Documentation

⏳ **Requires Migration:**
- `src/geo/geoEngine.ts` - Update to use new schema
- `src/geo/rankingEngine.ts` - Add targetRank, targetInTop5, timestamp

---

## Compilation Errors to Fix

### Error 1: `geoEngine.ts` lines 101-102
```typescript
// BEFORE (❌ Wrong type)
topQueryWins: string[]
topQueryLosses: string[]

// AFTER (✅ Correct type)
topQueryWins: QueryRankResult[]  // Full objects with proof
topQueryLosses: QueryRankResult[]  // Full objects with proof
```

**Fix:**
```typescript
// Use classifier to generate wins/losses from rankResults
import { classifyWinsLosses } from './winsLossesClassifier';

const classification = classifyWinsLosses(rankResults, matchedCompetitors.length);

return {
  topQueryWins: classification.wins,
  topQueryLosses: classification.losses,
  uncertainQueries: classification.uncertain,
  // ...
};
```

### Error 2: `rankingEngine.ts` lines 97, 110
```typescript
// BEFORE (❌ Missing fields)
{
  query: string;
  bucket: QueryBucket;
  weight: number;
  top5: RankEntry[];
  confidence: number;
  // Missing: targetRank, targetInTop5, timestamp
}

// AFTER (✅ Complete)
{
  query: string;
  bucket: QueryBucket;
  weight: number;
  targetRank: number | null,        // NEW
  targetInTop5: boolean,             // NEW
  top5: RankEntry[];
  confidence: number;
  missingDataFlags: string[];
  auditPassed: boolean;
  auditNotes?: string;
  timestamp: string;                 // NEW
}
```

**Fix:**
```typescript
// After ranking, find target's position
const targetEntry = ranking.top5.find(e => e.placeId === targetPlaceId);
const targetRank = targetEntry ? targetEntry.rank : null;
const targetInTop5 = targetEntry !== null;

return {
  query: q.query,
  bucket: q.bucket,
  weight: q.weight,
  targetRank,           // ✅ Add this
  targetInTop5,         // ✅ Add this
  top5: ranking.top5.map(e => ({
    ...e,
    name: candidates.find(c => c.placeId === e.placeId)?.name || 'Unknown'  // ✅ Add name
  })),
  confidence: ranking.confidence,
  missingDataFlags: ranking.missingDataFlags,
  auditPassed: ranking.auditPassed,
  auditNotes: ranking.auditNotes,
  timestamp: new Date().toISOString()  // ✅ Add this
};
```

---

## Step-by-Step Migration

### Step 1: Update `rankingEngine.ts`

**File:** `src/geo/rankingEngine.ts`

**Changes needed:**
1. Add `name` field to `RankEntry` in `top5` array
2. Add `targetRank` calculation (find target in top5)
3. Add `targetInTop5` boolean
4. Add `timestamp` (ISO string)

**Example:**
```typescript
export async function rankQuery(
  query: GEOQuery,
  candidates: GEOCandidate[],
  targetPlaceId: string
): Promise<QueryRankResult> {
  // ... existing ranking logic ...
  
  // Find target's rank
  const targetEntry = result.top5.find(e => e.placeId === targetPlaceId);
  const targetRank = targetEntry ? targetEntry.rank : null;
  const targetInTop5 = targetEntry !== null;
  
  return {
    query: query.query,
    bucket: query.bucket,
    weight: query.weight,
    targetRank,           // ✅ NEW
    targetInTop5,         // ✅ NEW
    top5: result.top5.map(e => ({
      placeId: e.placeId,
      name: candidates.find(c => c.placeId === e.placeId)?.name || 'Unknown',  // ✅ NEW
      rank: e.rank,
      reasons: e.reasons,
      weaknesses: e.weaknesses
    })),
    confidence: result.confidence,
    missingDataFlags: result.missingDataFlags || [],
    auditPassed: result.auditPassed || true,
    auditNotes: result.auditNotes,
    timestamp: new Date().toISOString()  // ✅ NEW
  };
}
```

### Step 2: Update `geoEngine.ts`

**File:** `src/geo/geoEngine.ts`

**Changes needed:**
1. Import calibration functions
2. Filter competitors by nicheKey
3. Use `generateNicheQueries()` instead of generic queries
4. Use `classifyWinsLosses()` for wins/losses
5. Use `calibrateGEOScore()` for final score
6. Use `determineGEOStatus()` for validation

**Example:**
```typescript
import { generateNicheQueries } from './nicheQueryGenerator';
import { classifyWinsLosses, determineGEOStatus } from './winsLossesClassifier';
import { calibrateGEOScore } from './reliabilityScorer';

export async function runGEOBenchmark(
  placeId: string,
  options: { radiusMeters: number; nicheLabel: string; nicheKey: string; city: string }
): Promise<GEOBenchmarkResponse> {
  const { radiusMeters, nicheLabel, nicheKey, city } = options;
  
  // 1. Fetch target + competitors
  const { target, competitors } = await fetchCompetitors(placeId, radiusMeters);
  
  // 2. Filter competitors by niche match
  const matchedCompetitors = competitors.filter(c => c.nicheKey === nicheKey);
  
  logger.info('[GEO Engine] Competitor matching', {
    total: competitors.length,
    matched: matchedCompetitors.length,
    niche: nicheLabel
  });
  
  // 3. Generate niche-specific queries
  const queries = generateNicheQueries({
    nicheLabel,
    nicheKey,
    city,
    targetQueryCount: 40
  });
  
  // 4. Rank queries
  const rankResults = await Promise.all(
    queries.map(q => rankQuery(q, [target, ...matchedCompetitors], target.placeId))
  );
  
  // 5. Calculate raw GEO score
  const rawGEOScore = calculateRawGEOScore(rankResults, matchedCompetitors);
  
  // 6. Apply calibration
  const calibrated = calibrateGEOScore({
    rawScore: rawGEOScore,
    reviewCount: target.reviewCount,
    photoCount: target.photoCount,
    rating: target.rating,
    hasWebsite: target.hasWebsite,
    hasHours: target.hasHours,
    hasRecentReviews: null, // Can be enhanced
    competitorMedianPhotos: calculateMedian(matchedCompetitors.map(c => c.photoCount)),
    matchedCompetitorCount: matchedCompetitors.length,
    totalCompetitorCount: competitors.length
  });
  
  // 7. Classify wins/losses
  const classification = classifyWinsLosses(rankResults, matchedCompetitors.length);
  
  // 8. Determine GEO status
  const geoStatus = determineGEOStatus({
    nicheLabel,
    competitorSetSize: matchedCompetitors.length,
    avgConfidence: classification.stats.avgConfidence,
    hasEstablishmentInQueries: false // Already validated in query generation
  });
  
  // 9. Return full response
  return {
    target,
    competitors: matchedCompetitors,  // Only matched competitors
    niche: nicheLabel,
    nicheLabel,                       // ✅ NEW
    nicheCanonical: nicheKey,
    locationLabel: city,
    radiusMeters,
    queries,
    rankResults,
    geoScore: calibrated.finalScore,  // ✅ Calibrated score
    percentile: calculatePercentile(calibrated.finalScore, matchedCompetitors),
    scoreBreakdown: {
      sovTop3: calculateSOV(rankResults, 3),
      sovTop5: calculateSOV(rankResults, 5),
      evidenceStrengthIndex: calibrated.reliabilityScore.total,
      rawScore: calibrated.rawScore,
      finalScore: calibrated.finalScore
    },
    drivers: [], // Calculate from calibration
    fixFirst: [], // Generate from drivers
    topQueryWins: classification.wins,           // ✅ Full objects
    topQueryLosses: classification.losses,       // ✅ Full objects
    uncertainQueries: classification.uncertain,  // ✅ NEW
    confidence: calibrated.confidenceLevel,
    confidenceReasons: calibrated.confidenceReasons,
    geoStatus,                                   // ✅ NEW
    lastRefreshedAt: new Date().toISOString(),
    cacheKey: `geo:${placeId}:${radiusMeters}`,
    debug: {
      debugStamp: `GEO_${Date.now()}`,
      runId: `run_${Date.now()}`,
      dataSource: 'backend',
      cacheHit: false,
      forceRefresh: false,
      openAICalls: queries.length,
      openAITokens: 0, // Track this
      processingTimeMs: 0, // Track this
      competitorCount: matchedCompetitors.length,
      queryCount: queries.length
    }
  };
}
```

### Step 3: Update API Handler

**File:** `src/api/geoBenchmark.ts` (if exists)

**Changes:**
```typescript
import { runGEOBenchmark } from '../geo/geoEngine';
import { resolveCategory, getLocationLabel } from '../geo/categoryResolver';

export async function handleGEOBenchmark(req: Request, res: Response) {
  const placeId = req.query.placeId as string;
  const radius = parseInt(req.query.radius as string) || 5000;
  
  // 1. Get place details
  const place = await getPlaceDetails(placeId);
  
  // 2. Resolve category
  const category = await resolveCategory(place);
  
  // 3. Check if niche is valid
  if (category.nicheKey === 'local_business' || category.confidence < 0.5) {
    return res.status(400).json({
      error: 'Invalid niche',
      message: 'Category could not be resolved accurately. Please rerun scan.',
      geoStatus: 'invalid_niche'
    });
  }
  
  // 4. Get location
  const locationLabel = getLocationLabel(place.formatted_address);
  const city = locationLabel.split(',')[0].trim();
  
  // 5. Run GEO benchmark with calibration
  const result = await runGEOBenchmark(placeId, {
    radiusMeters: radius,
    nicheLabel: category.nicheLabel,
    nicheKey: category.nicheKey,
    city
  });
  
  res.json(result);
}
```

---

## Testing Checklist

After migration, verify:

- [ ] Code compiles without errors (`npm run build`)
- [ ] `targetRank` is correctly populated in rank results
- [ ] `topQueryWins` only contains queries where target ranked ≤3
- [ ] Hard cap is applied (1 review → max 35 GEO)
- [ ] Queries are niche-specific (no "Establishment")
- [ ] Competitors are filtered by niche
- [ ] `geoStatus` is set correctly
- [ ] Calibration explanations are included in response

---

## Quick Reference: Key Functions

| Function | File | Purpose |
|----------|------|---------|
| `calculateReliabilityScore()` | reliabilityScorer.ts | 0-1 score from data quality |
| `applyHardCap()` | reliabilityScorer.ts | Enforces 35/45/55 caps |
| `calibrateGEOScore()` | reliabilityScorer.ts | Full calibration pipeline |
| `generateNicheQueries()` | nicheQueryGenerator.ts | Niche-specific queries |
| `validateQueries()` | nicheQueryGenerator.ts | Check for "Establishment" |
| `classifyWinsLosses()` | winsLossesClassifier.ts | WIN/LOSS/UNCERTAIN rules |
| `determineGEOStatus()` | winsLossesClassifier.ts | Validation status |

---

## Example Output (After Migration)

```json
{
  "geoScore": 35,
  "nicheLabel": "Supplement store",
  "topQueryWins": [],
  "topQueryLosses": [
    {
      "query": "best supplement store near Mason",
      "targetRank": null,
      "targetInTop5": false,
      "top5": [
        {"name": "Vitamin World", "rank": 1},
        {"name": "GNC", "rank": 2},
        {"name": "Nutrition Zone", "rank": 3}
      ],
      "confidence": 0.75,
      "timestamp": "2025-12-18T..."
    }
  ],
  "geoStatus": "valid",
  "confidence": "low",
  "confidenceReasons": [
    "Hard cap applied: Only 1 review. Insufficient data for reliable GEO score.",
    "Only 12 niche-matched competitors (need 8+ for high confidence)"
  ],
  "calibration": {
    "reliabilityScore": {
      "total": 0.17,
      "reviewVolumeScore": 0.15,
      "photoScore": 0.2
    },
    "hardCap": {
      "capApplied": true,
      "capValue": 35,
      "rawScore": 74,
      "finalScore": 35,
      "capReason": "Only 1 review. Insufficient data for reliable GEO score."
    }
  }
}
```

---

## Status

✅ **Calibration System:** Complete
⏳ **Migration:** Requires updating `geoEngine.ts` and `rankingEngine.ts`
📝 **Documentation:** Complete

**Next Step:** Apply changes to existing GEO engine files following this guide.




