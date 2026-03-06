# ✅ GEO Wins/Losses Fix Implementation Plan

## Problem
GEO is displaying "Top Query Wins" like "top rated Establishment..." even when the business is NOT actually top-ranked. Need to fix so UI can never claim a win without evidence.

## Solution Overview

### 1. Define Win/Loss with Strict Rules (Backend)

**WIN Criteria (ALL must be true):**
- `targetRank <= 3` (Top 3)
- `confidence >= 0.6`
- `competitorSetSize >= 8`

**LOSS Criteria:**
- `targetRank >= 8` OR `targetInTop5 === false`
- `confidence >= 0.6`
- `competitorSetSize >= 8`

**UNCERTAIN:**
- `confidence < 0.6` (regardless of rank)

**NEUTRAL:**
- Everything else (ranks 4-7 with good confidence)

### 2. Backend Schema Updates

**`QueryRankResult` interface:**
```typescript
{
  query: string;
  bucket: QueryBucket;
  weight: number;
  targetRank: number | null; // NEW: Rank of target (1-based), null if not in top5
  targetInTop5: boolean;      // NEW: True if target is in top5
  top5: Array<{
    placeId: string;
    name: string;             // NEW: Business name for display
    rank: number;
    reasons: string[];
    weaknesses: string[];
  }>;
  confidence: number;
  timestamp: string;          // NEW: ISO timestamp
}
```

**`GEOBenchmarkResponse` interface:**
```typescript
{
  // ... existing fields ...
  nicheLabel: string;                    // NEW: User-facing label
  topQueryWins: QueryRankResult[];       // CHANGED: Full objects with proof
  topQueryLosses: QueryRankResult[];     // CHANGED: Full objects with proof
  uncertainQueries: QueryRankResult[];   // NEW: Low confidence queries
  geoStatus: 'valid' | 'invalid_niche' | 'insufficient_competitors' | 'low_confidence'; // NEW
}
```

### 3. Wins/Losses Classifier (`winsLossesClassifier.ts`)

**New file with functions:**
- `classifyWinsLosses()` - Apply strict rules to classify queries
- `validateNicheLabel()` - Check for "Establishment" or generic terms
- `checkForEstablishmentInQueries()` - Detect niche resolution failure
- `determineGEOStatus()` - Set overall GEO status

### 4. UI Updates

**Query Item Component:**
```jsx
<QueryItem query={rankResult} type="win|loss" />

// Shows:
// - Query text
// - Rank badge: "#2 of 18" or "Not in top 5"
// - Confidence badge if < 0.8
// - On hover/expand: Top 3 businesses for that query
```

**Empty State:**
```jsx
{wins.length === 0 && (
  <p>No top-3 wins yet (based on current competitor set)</p>
)}
```

**Invalid Niche Banner:**
```jsx
{geoStatus === 'invalid_niche' && (
  <Alert variant="destructive">
    Category unresolved — rerun scan
  </Alert>
)}
```

### 5. Acceptance Tests

✅ If target is not ranked top 3 for a query, it never appears in "Wins"
✅ If target doesn't appear in top5, it shows "Not in top 5" under losses
✅ If there are zero wins, UI shows "No top-3 wins yet..."
✅ GEO never displays "Establishment" queries; if it happens, panel shows "invalid_niche" error

## Implementation Steps

1. ✅ Update `geoSchema.ts` - Add `targetRank`, `targetInTop5`, `nicheLabel`, `geoStatus`
2. ✅ Create `winsLossesClassifier.ts` - Strict classification logic
3. ⏳ Update GEO engine to populate `targetRank` and `targetInTop5` in rank results
4. ⏳ Update GEO engine to use classifier and set `geoStatus`
5. ⏳ Update `GEOScoreWhyPanel.jsx` to show rank badges and handle empty states
6. ⏳ Add "Establishment" detection and error banner
7. ⏳ Test all acceptance criteria

## Files to Modify

**Backend:**
- ✅ `src/geo/geoSchema.ts` - Schema updates
- ✅ `src/geo/winsLossesClassifier.ts` - NEW: Classification logic
- ⏳ `src/geo/geoEngine.ts` - Use classifier, populate targetRank
- ⏳ `src/geo/queryGenerator.ts` - Ensure no "Establishment" in queries

**Frontend:**
- ⏳ `src/components/GEOScoreWhyPanel.jsx` - UI updates for proof display
- ⏳ `src/components/ui/QueryItem.jsx` - NEW: Query item with rank badge

## Next Actions

1. Update GEO engine to populate `targetRank` and `targetInTop5`
2. Integrate `winsLossesClassifier` into GEO benchmark
3. Update frontend to display rank badges and handle empty states
4. Add "Establishment" detection and error banner
5. Run acceptance tests




