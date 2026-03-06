# Real Competitors - Phase A Implementation

## Overview

Implemented **Phase A: Local Competitors (Nearby)** - Shows REAL competitors from Google Places API with verifiable placeIds. No fake names. No inference from text.

## Hard Rule

> **Every competitor MUST have a placeId. If placeId is missing, the competitor is discarded.**

---

## Architecture

### Phase A (✅ IMPLEMENTED): Local Competitors (Nearby)
- Shows real businesses within radius from target location
- Data comes directly from Google Places Nearby Search API
- Every competitor has verifiable placeId
- No AI inference, no text parsing

### Phase B (🔮 FUTURE): Query-Based Winners
- Will track which competitors appear most in AI search results per query
- Will show "wins X queries" language
- Will require Places Text Search integration during GEO explain generation

---

## Backend Implementation

### File: `mgo-scanner-backend/src/api/nearbyCompetitors.ts`

**New API Endpoint:**
```
GET /api/geo/competitors/nearby
```

**Query Parameters:**
- `placeId` (required): Target business placeId
- `radius` (optional): Search radius in meters (default 5000, max 10000)
- `limit` (optional): Max competitors to return (default 10, max 20)

**Response Format:**
```typescript
{
  success: true,
  competitors: [
    {
      placeId: string,        // ✅ Google's immutable identifier
      name: string,
      address: string,
      rating: number | null,
      userRatingsTotal: number | null,
      types: string[],
      distanceMeters: number,
      lat: number,
      lng: number
    }
  ],
  target: {
    placeId: string,
    name: string,
    lat: number,
    lng: number,
    primaryType: string
  },
  radiusMeters: number,
  count: number
}
```

**Error Response:**
```typescript
{
  success: false,
  error: string,
  message: string
}
```

### Implementation Flow

1. **Validate Input**
   - Ensure `placeId` query param exists
   - Cap `radius` at 10000m
   - Cap `limit` at 20

2. **Fetch Target Business Details**
   ```typescript
   const targetPlace = await getPlaceDetailsForExplain(placeId);
   ```
   - Gets lat/lng for nearby search
   - Gets primary type/category for filtering

3. **Call Google Places Nearby Search**
   ```typescript
   const nearbyUrl = new URL(`${PLACES_API_BASE}/nearbysearch/json`);
   nearbyUrl.searchParams.set('location', `${targetLat},${targetLng}`);
   nearbyUrl.searchParams.set('radius', radiusMeters.toString());
   nearbyUrl.searchParams.set('type', primaryType); // e.g., 'coffee_shop'
   nearbyUrl.searchParams.set('key', API_KEY);
   ```

4. **Filter & Map Results**
   - ✅ Must have `place_id` (discard if missing)
   - ✅ Must have `geometry.location` (discard if missing)
   - ❌ Exclude target itself (`place_id === targetPlaceId`)
   - Calculate distance using Haversine formula
   - Slice to `limit` count

5. **Return Verified Competitors**
   - All returned competitors have `placeId`
   - All are real businesses from Google's database
   - No AI generation, no inference

### Route Registration

**File: `mgo-scanner-backend/src/index.ts`**

```typescript
import { handleGetNearbyCompetitors } from './api/nearbyCompetitors';

// GEO Nearby Competitors endpoint (Phase A: Real competitors from Places API)
app.get('/api/geo/competitors/nearby', handleGetNearbyCompetitors);
```

---

## Frontend Implementation

### File: `mgodataImprovedthroughcursor/src/api/functions.js`

**New API Function:**

```javascript
/**
 * Get nearby competitors from Google Places API - Phase A
 * Returns REAL competitors with verifiable placeIds
 */
export const getNearbyCompetitors = async ({ placeId, radius = 5000, limit = 10 }) => {
  if (!placeId) {
    return { success: false, error: 'placeId is required', competitors: [] };
  }

  try {
    const url = `${API_BASE_URL}/api/geo/competitors/nearby?placeId=${encodeURIComponent(placeId)}&radius=${radius}&limit=${limit}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.message || `HTTP ${response.status}`,
        competitors: [] 
      };
    }

    const data = await response.json();
    return data;

  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Failed to fetch competitors',
      competitors: [] 
    };
  }
};
```

**Key Points:**
- Uses centralized `API_BASE_URL` from config
- Returns empty `competitors` array on error (graceful degradation)
- Error handling at every step
- No console spam in production

---

### File: `mgodataImprovedthroughcursor/src/components/GEOWhyPanel.jsx`

#### 1. New State Management

```javascript
// Phase A: Real nearby competitors from Places API
const [nearbyCompetitors, setNearbyCompetitors] = useState([]);
const [loadingNearby, setLoadingNearby] = useState(false);
const [nearbyError, setNearbyError] = useState(null);
```

#### 2. Fetch Competitors on Mount

```javascript
useEffect(() => {
  const fetchNearbyCompetitors = async () => {
    if (!businessPlaceId) {
      setNearbyError('No placeId available');
      return;
    }

    setLoadingNearby(true);
    setNearbyError(null);

    try {
      const result = await getNearbyCompetitors({ 
        placeId: businessPlaceId, 
        radius: 5000, 
        limit: 10 
      });

      if (result.success && result.competitors) {
        // ✅ Filter out any competitors without placeId (safety check)
        const validCompetitors = result.competitors.filter(c => c.placeId);
        setNearbyCompetitors(validCompetitors);
        
        if (import.meta.env.DEV) {
          console.info('[GEO Panel] Nearby competitors loaded:', {
            count: validCompetitors.length,
            names: validCompetitors.slice(0, 3).map(c => c.name)
          });
        }
      } else {
        setNearbyError(result.error || 'Failed to load competitors');
        setNearbyCompetitors([]);
      }
    } catch (error) {
      console.error('[GEO Panel] Error fetching nearby competitors:', error);
      setNearbyError(error.message || 'Unknown error');
      setNearbyCompetitors([]);
    } finally {
      setLoadingNearby(false);
    }
  };

  fetchNearbyCompetitors();
}, [businessPlaceId]);
```

**Safety Features:**
- ✅ Filters out competitors without placeId (frontend safety net)
- ✅ Graceful error handling
- ✅ DEV-only console logs
- ✅ Clean empty state

#### 3. New UI Section: "Local Competitors Near You"

**Layout:**
```jsx
{/* Phase A: Local Competitors Near You - Real businesses from Places API */}
{nearbyCompetitors.length > 0 && (
  <div>
    <h3>
      <MapPin /> Local Competitors Near You
    </h3>
    
    {/* DEV-ONLY badge */}
    <Badge>Source: Google Places API (realtime)</Badge>
    
    <div className="text-xs">
      Real competitors within 5km from your location, verified with Google placeIds
    </div>

    {/* Table with: Business, Rating, Reviews, Distance, Actions */}
    <table>
      {/* ... */}
    </table>
  </div>
)}
```

**Table Columns:**

| Column | Content |
|--------|---------|
| **Business** | Name + Address + placeId (DEV only) |
| **Rating** | ⭐ X.X or — |
| **Reviews** | Count |
| **Distance** | X.Xkm |
| **Actions** | "View" link → Google Maps |

**Google Maps Link:**
```javascript
href={`https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${competitor.placeId}`}
```

#### 4. Loading & Error States

**Loading:**
```jsx
{loadingNearby && !nearbyError && nearbyCompetitors.length === 0 && (
  <div className="text-center">
    <Users className="animate-pulse" />
    Loading nearby competitors...
  </div>
)}
```

**Error:**
```jsx
{nearbyError && nearbyCompetitors.length === 0 && (
  <div className="bg-slate-50 border">
    <p>Unable to load nearby competitors</p>
    <p className="text-xs">{nearbyError}</p>
  </div>
)}
```

**Empty State:**
- If `nearbyCompetitors.length === 0` and no error → section hidden
- No placeholder, no fake data

#### 5. Updated Phase B Section Header

**Before:**
```jsx
<h3>Competitor Analysis</h3>
```

**After:**
```jsx
<h3>Top Competitors in AI Search</h3>
<div className="text-xs">
  Competitors that appear most often in AI search results for your tested queries
</div>
```

**Purpose:** Distinguish Phase B (query-based, coming from explain data) from Phase A (nearby, from Places API)

---

## Data Flow

### Phase A Flow (Implemented)

```
1. User loads ScanResults
   ↓
2. GEOWhyPanel mounts
   ↓
3. useEffect triggers → fetchNearbyCompetitors()
   ↓
4. Frontend: getNearbyCompetitors({ placeId, radius: 5000, limit: 10 })
   ↓
5. Backend: GET /api/geo/competitors/nearby?placeId=...
   ↓
6. Backend: Fetch target details from Places API
   ↓
7. Backend: Call Places Nearby Search
   ↓
8. Backend: Filter out target, validate placeIds
   ↓
9. Backend: Return array of verified competitors
   ↓
10. Frontend: Filter again (safety), update state
   ↓
11. UI: Render "Local Competitors Near You" table
```

### Phase B Flow (Future)

```
1. During GEO explain generation (backend)
   ↓
2. For each query → Places Text Search
   ↓
3. Capture top N results with placeIds
   ↓
4. Store in explain.competitors with "wins" count
   ↓
5. Frontend: Render "Top Competitors in AI Search" section
   ↓
6. Shows "X (wins Y queries)" language
```

---

## Safety & Validation

### Backend Validation

```typescript
// 1. placeId filter
.filter((p: any) => {
  // Must have placeId (absolutely required)
  if (!p.place_id) return false;
  
  // Exclude target itself
  if (p.place_id === placeId) return false;
  
  // Must have location
  if (!p.geometry?.location) return false;
  
  return true;
})
```

**Guarantees:**
- ✅ Every returned competitor has `placeId`
- ✅ Target business never appears in results
- ✅ All competitors have lat/lng for distance calculation

### Frontend Validation

```javascript
// Safety check: filter out any competitors without placeId
const validCompetitors = result.competitors.filter(c => c.placeId);
setNearbyCompetitors(validCompetitors);
```

**Guarantees:**
- ✅ Double-check placeId exists (defense in depth)
- ✅ Never render competitor without placeId
- ✅ No fake data can slip through

### Error Handling

**Backend:**
- Places API unavailable → 500 error with message
- Invalid placeId → 400 error
- Target missing geometry → 400 error
- Places API error status → 500 error with status

**Frontend:**
- API error → show error message in UI
- Network error → show error message in UI
- No placeId → show "No placeId available"
- No competitors → hide section (not an error)

**Production Behavior:**
- If Places API fails → competitor section hidden
- No fake placeholders
- No broken UI
- User can still see rest of GEO analysis

---

## Performance Considerations

### Request Timing
- Fetches on component mount (one-time)
- Runs in parallel with GEO explain polling
- Does NOT block main scan results rendering

### Caching (Future Enhancement)
- Could cache by `(placeId, radius)` for 24h
- Would reduce Places API calls
- Not implemented in Phase A (prioritize correctness first)

### Rate Limiting (Future Enhancement)
- Google Places API has rate limits
- Could implement request queue with concurrency control
- Not needed for Phase A (single request per scan)

### Cost Optimization
- Nearby Search: ~$0.032 per request
- 10 competitors × Details API: could add cost if we fetch full details
- Current implementation uses Nearby Search only (cost-effective)

---

## Testing

### Manual Testing Checklist

#### ✅ Happy Path
1. Load scan results with valid placeId
2. Verify "Local Competitors Near You" section appears
3. Verify table shows 10 competitors (or less if fewer nearby)
4. Click "View" link → opens Google Maps with correct business
5. Verify all competitors have placeIds in DEV mode

#### ✅ Edge Cases
1. **No nearby competitors:**
   - Section hidden (no empty state)
   
2. **Invalid placeId:**
   - Error message shown: "Unable to load nearby competitors"
   
3. **Places API down:**
   - Error message shown
   - Rest of GEO panel still works
   
4. **Missing placeId in response:**
   - Frontend filters out (should never happen due to backend filter)
   
5. **Target appears in results:**
   - Backend filters it out (should never appear)

#### ✅ DEV Mode Features
1. Source badge shows: "Source: Google Places API (realtime)"
2. Each competitor row shows truncated placeId
3. Console logs competitors on load

#### ✅ Production Mode
1. No source badge
2. No placeId shown in table
3. No console logs
4. Clean UI

---

## Security & Privacy

### API Key Protection
- ✅ `GOOGLE_PLACES_API_KEY` stored in backend env vars
- ✅ Never exposed to frontend
- ✅ All Places API calls from backend only

### Data Integrity
- ✅ placeId is immutable Google identifier (cannot be faked)
- ✅ All competitor data comes from Google's database
- ✅ No user input affects competitor data (read-only)

### XSS Prevention
- ✅ React automatically escapes all text content
- ✅ No `dangerouslySetInnerHTML` used
- ✅ URLs constructed with `encodeURIComponent`

---

## Future Enhancements (Phase B)

### 1. Query-Based Winner Tracking

**During GEO Explain Generation:**
```typescript
// For each query
const queryResults = await fetchPlacesTextSearch({
  query: q.query,
  location: { lat, lng },
  radius: 5000
});

// Store in explain data
query.topResults = queryResults.slice(0, 5).map(r => ({
  placeId: r.place_id,
  name: r.name,
  rank: r.rank
}));
```

**Aggregate Competitors:**
```typescript
const competitorWins = new Map<string, { 
  placeId: string, 
  name: string, 
  wins: number,
  avgRank: number,
  seenInQueries: string[]
}>();

queries.forEach(q => {
  q.topResults.forEach(result => {
    // Count "wins" where competitor rank < target rank OR target missing
    if (result.rank < q.targetRank || !q.mentioned) {
      const comp = competitorWins.get(result.placeId) || { 
        placeId: result.placeId, 
        name: result.name, 
        wins: 0, 
        ranks: [],
        seenInQueries: []
      };
      comp.wins++;
      comp.ranks.push(result.rank);
      comp.seenInQueries.push(q.query);
      competitorWins.set(result.placeId, comp);
    }
  });
});

// Add to explain payload
explain.competitors = Array.from(competitorWins.values())
  .map(c => ({
    placeId: c.placeId,
    name: c.name,
    wins: c.wins,
    avgRank: (c.ranks.reduce((a,b) => a+b, 0) / c.ranks.length).toFixed(1),
    seenInQueries: c.seenInQueries.length
  }))
  .sort((a, b) => b.wins - a.wins);
```

### 2. Rate Limiting

```typescript
// Concurrency control for Places API calls
const queue = new PQueue({ concurrency: 3 });

const results = await Promise.all(
  queries.map(q => 
    queue.add(() => fetchPlacesTextSearch(q))
  )
);
```

### 3. Caching

```typescript
// Cache by (placeId, query, radius)
const cacheKey = `places:text_search:${placeId}:${query}:${radius}`;
const cached = await redis.get(cacheKey);

if (cached) return JSON.parse(cached);

const results = await fetchPlacesTextSearch(...);
await redis.setex(cacheKey, 86400, JSON.stringify(results)); // 24h TTL
```

---

## Summary

### What Was Implemented (Phase A)

✅ **Backend:**
- New endpoint: `GET /api/geo/competitors/nearby`
- Google Places Nearby Search integration
- placeId validation at every step
- Distance calculation (Haversine)
- Error handling & graceful degradation

✅ **Frontend:**
- New API function: `getNearbyCompetitors()`
- State management in `GEOWhyPanel`
- "Local Competitors Near You" UI section
- Real-time competitor table with Google Maps links
- Loading & error states
- DEV-only debugging features

### What Changed

✅ **Removed:**
- AI-generated competitor names from query evaluation (previous commit)
- All text parsing/inference for competitors

✅ **Added:**
- Real competitor data from Google Places API
- Verifiable placeIds for every competitor
- "Open in Google" links for each competitor
- Clear Phase A vs Phase B distinction in UI

### Result

**Users now see:**
1. **Local Competitors Near You** (Phase A) - Real businesses from Places API within 5km
2. **Top Competitors in AI Search** (Phase B) - Only if explain data exists (future enhancement)

**Guarantees:**
- ✅ Every competitor has a placeId
- ✅ All competitors are real businesses from Google's database
- ✅ No fake names, no inference, no AI hallucination
- ✅ If Places API unavailable, section cleanly hidden
- ✅ No broken UI, no fake placeholders

---

## Files Modified

### Backend
1. **`mgo-scanner-backend/src/api/nearbyCompetitors.ts`** (NEW)
   - Nearby competitors endpoint implementation
   - Google Places Nearby Search integration
   - placeId validation & filtering

2. **`mgo-scanner-backend/src/index.ts`**
   - Import `handleGetNearbyCompetitors`
   - Register `GET /api/geo/competitors/nearby` route

### Frontend
1. **`mgodataImprovedthroughcursor/src/api/functions.js`**
   - Import `API_BASE_URL`
   - New `getNearbyCompetitors()` function

2. **`mgodataImprovedthroughcursor/src/components/GEOWhyPanel.jsx`**
   - Import `getNearbyCompetitors`, `MapPin`, `ExternalLink` icons
   - Add state: `nearbyCompetitors`, `loadingNearby`, `nearbyError`
   - Add `useEffect` to fetch competitors on mount
   - New UI section: "Local Competitors Near You"
   - Loading & error states
   - Updated Phase B section header

---

**Implementation Date:** 2026-01-11  
**Phase:** A (Nearby Competitors)  
**Status:** ✅ Complete  
**Next Phase:** B (Query-Based Winners)  
**Production Ready:** ✅ Yes

🎉 **No more fake competitors!** All competitor data is now verifiable with Google placeIds.


