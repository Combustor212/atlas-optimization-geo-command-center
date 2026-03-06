# SCORING AUDIT - Critical Violations

## Executive Summary
**Status:** ❌ **BOTH MEO AND GEO ARE NON-COMPLIANT**

The current scoring logic violates multiple non-negotiable rules and must be rebuilt before production use.

---

## 🚨 CRITICAL MEO VIOLATIONS

### 1. MOCK COMPETITOR DATA (BLOCKING ISSUE)
**Location:** `mgo-scanner-backend/src/meo/competitiveAnalysis.ts:25-58`

**Violation:**
```typescript
function generateCompetitorData(
  category: string,
  location: string,
  count: number = 5
): CompetitorData[] {
  // This is a mock function - in production, would query Google Places API
  const competitors: CompetitorData[] = [];
  for (let i = 0; i < count; i++) {
    // Generating FAKE competitors with random variance
    competitors.push({
      name: `Competitor ${i + 1}`,
      rating: Math.max(1, Math.min(5, baseline.rating + variance)),
      // ... fake data
    });
  }
  return competitors;
}
```

**Rule Violated:**
> COMPETITOR SET CONSTRUCTION (MANDATORY)
> Before scoring:
> - Find ≥3 competitors
> - Same niche
> - Within ~10–15 km
> - Local businesses only (no HQs)
> - From competitors compute averages and percentiles

**Impact:** MEO scores are NOT comparative to real competition. They're comparing against synthetic averages.

**Fix Required:**
- Replace `generateCompetitorData()` with real Google Places Nearby Search
- Query for competitors with same `types[]`
- Within configurable radius (10-15km)
- Return actual competitor data with `place_id`, `name`, `rating`, `user_ratings_total`, `photos`
- If <3 competitors found → abort with error

---

### 2. NO INPUT VALIDATION (BLOCKING ISSUE)
**Location:** `mgo-scanner-backend/src/meo/meoEngine.ts:270-284`

**Violation:**
```typescript
export function calculateMEOScore(
  businessName: string,
  location: string,
  place: PlaceDetails
): MEOScanResponse {
  // Proceeds with defaults even if critical data missing
  const rating = place.rating || 0;  // ❌ Should abort if missing
  const totalReviews = place.user_ratings_total || 0;  // ❌ Should abort
  // ... no validation of required fields
```

**Rule Violated:**
> REQUIRED INPUTS (ALL REQUIRED)
> If any are missing → DO NOT SCORE.
> - Place ID
> - Full formatted address
> - Latitude / Longitude
> - Primary Google category
> - Rating
> - Total reviews
> - Photo count
> - Opening hours
> - Website + phone

**Fix Required:**
```typescript
export function calculateMEOScore(
  businessName: string,
  location: string,
  place: PlaceDetails
): MEOScanResponse | { error: string; reason: string } {
  // Validate ALL required inputs
  if (!place.place_id) {
    return { error: "MEO scoring blocked", reason: "Missing place_id" };
  }
  if (!place.formatted_address) {
    return { error: "MEO scoring blocked", reason: "Missing formatted_address" };
  }
  if (!place.geometry?.location) {
    return { error: "MEO scoring blocked", reason: "Missing lat/lng" };
  }
  if (!place.rating) {
    return { error: "MEO scoring blocked", reason: "Missing rating" };
  }
  if (place.user_ratings_total === undefined || place.user_ratings_total === null) {
    return { error: "MEO scoring blocked", reason: "Missing user_ratings_total" };
  }
  if (!place.types || place.types.length === 0) {
    return { error: "MEO scoring blocked", reason: "Missing category (types)" };
  }
  // ... validate all other required fields
  
  // Proceed with scoring only if all inputs present
}
```

---

### 3. WEAK CATEGORY RESOLUTION
**Location:** `mgo-scanner-backend/src/meo/categoryDetection.ts`

**Rule Violated:**
> CATEGORY & NICHE RESOLUTION (CRITICAL)
> - Use Google types[]
> - Cross-check with business name keywords
> - Force a single niche (e.g. "Coffee Shop", not "Restaurant")
> - Never fall back to "General" or "Default"
> - If niche cannot be confidently resolved → abort.

**Current Behavior:** Likely has fallback to generic category.

**Fix Required:**
- Reject generic fallbacks
- Return `{ error: "MEO scoring blocked", reason: "Cannot resolve specific category" }` if ambiguous
- Enforce ONE specific niche

---

### 4. SCORES NOT CONSERVATIVE ENOUGH
**Location:** `mgo-scanner-backend/src/meo/meoEngine.ts:448-450`

**Current:**
```typescript
const minimumBaseline = 37;  // Too low?
const finalScore = Math.max(minimumBaseline, Math.min(100, Math.round(rawAfterCap)));
```

**Rule:**
> MEO BASELINE PHILOSOPHY (STRICT)
> - Weak / unknown: 35–45
> - Average local: 50–60
> - Strong performer: 60–68
> - Local leader: 68–74
> - Non-franchise hard ceiling: ~75
> - Franchise ceiling (without excellence): ~75

**Assessment:** 
- Minimum baseline 37 is acceptable
- Need to verify franchises aren't exceeding 75 without excellence
- Need to verify non-franchises have hard cap at ~75

**Fix Required:**
- Add explicit caps:
  - Non-franchise: `Math.min(finalScore, 75)`
  - Franchise without excellence: `Math.min(finalScore, 75)`
- Ensure weak/unknown stays 35-45 range

---

## 🚨 CRITICAL GEO VIOLATIONS

### 1. SIGNAL CONTAMINATION (BLOCKING ISSUE)
**Location:** `mgo-scanner-backend/src/lib/scoring/geo.ts:14-31`

**Violation:**
```typescript
const breakdown: GeoScoreBreakdown = {
  nap_consistency: {
    website_nap_match: calculateWebsiteNAPMatchScore(websiteAnalysis),  // ❌ LOCAL SIGNAL
    directory_citations: calculateDirectoryCitationsScore(directoryCitations),  // ❌ LOCAL SIGNAL
    total: 0
  },
  structured_data: {
    service_area_clarity: calculateServiceAreaClarityScore(websiteAnalysis),  // ❌ LOCAL SIGNAL
    // ...
  }
}
```

**Rule Violated:**
> GEO SIGNALS (ONLY THESE)
> - Website presence & structure
> - Brand mentions
> - Review sentiment
> - Info consistency
> - Content depth
> - Trust & authority indicators
>
> You MUST NOT use:
> - Maps ranking
> - Distance
> - Local pack logic

**Problem:**
- `nap_consistency` = LOCAL signal (address/phone matching is for local search, not AI authority)
- `directory_citations` = LOCAL signal (citations are for local SEO, not AI recommendations)
- `service_area_clarity` = LOCAL/GEO signal (geographic service area is local)

**Impact:** GEO is measuring local SEO, not "will AI systems talk about this business?"

---

### 2. MISSING CORE GEO SIGNALS (BLOCKING ISSUE)

**What's Missing:**
- ❌ Brand mentions across the web
- ❌ Review sentiment analysis (positive/negative tone)
- ❌ Content depth (blog posts, FAQs, about pages)
- ❌ Trust indicators (SSL, privacy policy, about us, testimonials)
- ❌ Authority signals (backlinks, domain age, expertise)
- ❌ Consistency across platforms (social media, directories)

**What's Currently Measured:**
- ✅ Schema markup (good, keep this)
- ✅ SameAs links (good, keep this)
- ⚠️ NAP consistency (wrong - this is local, not authority)
- ⚠️ FAQ signals (good signal, but weak implementation)

---

### 3. WRONG GEO PHILOSOPHY

**Current GEO asks:** "Is this website technically optimized for local search?"

**GEO SHOULD ask:** "Will ChatGPT, Perplexity, Gemini, or Claude recommend this business when asked?"

**Fix Required:** Rebuild GEO from scratch with these signals:

```
GEO Score Components (0-100):

1. Website Authority (30 pts)
   - Domain quality (SSL, age, structure)
   - Content depth (pages, FAQs, blog)
   - About us / expertise signals
   - Trust badges (privacy policy, terms, credentials)

2. Brand Mentions (25 pts)
   - Mentions on authoritative sites
   - Press coverage / news articles
   - Industry directory presence (NOT local citations)
   - Social media following/engagement

3. Review Sentiment (25 pts)
   - Average sentiment score across all platforms
   - Keyword analysis (words like "best", "recommended", "excellent")
   - Response quality (owner engagement)
   - Consistency of positive feedback

4. Information Consistency (20 pts)
   - Same business info across platforms
   - No contradictory data
   - Up-to-date information
   - Clear, parseable content
```

---

## ✅ WHAT'S CORRECT

### MEO - Correctly Independent
- ✅ MEO doesn't use website authority
- ✅ MEO doesn't use AI mentions
- ✅ MEO doesn't use brand fame alone
- ✅ MEO doesn't use GEO signals

### GEO - Correctly Independent
- ✅ GEO doesn't use Maps ranking
- ✅ GEO doesn't use distance/proximity
- ✅ GEO doesn't use local pack logic

### Separation Rule
- ✅ No signal sharing between MEO and GEO

---

## REQUIRED FIXES (PRIORITY ORDER)

### P0 - BLOCKING (DO NOT SHIP WITHOUT THESE)

1. **Replace mock competitors with real Google Places API calls**
   - File: `mgo-scanner-backend/src/meo/competitiveAnalysis.ts`
   - Function: `analyzeCompetitivePosition()`
   - Requirements:
     - Call Google Places Nearby Search
     - Same category/niche
     - Within 10-15km radius
     - Return ≥3 competitors or abort

2. **Add strict input validation to MEO**
   - File: `mgo-scanner-backend/src/meo/meoEngine.ts`
   - Function: `calculateMEOScore()`
   - Requirements:
     - Validate ALL required inputs
     - Return error object if any missing
     - No defaults/fallbacks

3. **Rebuild GEO scoring logic from scratch**
   - File: `mgo-scanner-backend/src/lib/scoring/geo.ts`
   - Requirements:
     - Remove NAP consistency (move to MEO if needed)
     - Remove directory citations (move to MEO if needed)
     - Remove service area clarity (local signal)
     - Add brand mention detection
     - Add review sentiment analysis
     - Add content depth scoring
     - Add trust/authority indicators

### P1 - IMPORTANT (SHIP ASAP AFTER P0)

4. **Enforce category resolution strictness**
   - File: `mgo-scanner-backend/src/meo/categoryDetection.ts`
   - Abort if category is generic/ambiguous

5. **Add explicit score caps**
   - File: `mgo-scanner-backend/src/meo/meoEngine.ts`
   - Non-franchise: cap at 75
   - Franchise: cap at 75 without excellence

6. **Add conservative baseline enforcement**
   - Ensure weak/unknown stays 35-45
   - Ensure average stays 50-60

---

## TESTING REQUIREMENTS

Before shipping fixed scoring:

### MEO Tests
1. ✅ Scores abort when Place ID missing
2. ✅ Scores abort when address missing
3. ✅ Scores abort when lat/lng missing
4. ✅ Scores abort when <3 real competitors found
5. ✅ Scores use REAL competitor data from Google Places
6. ✅ Scores cap non-franchises at ~75
7. ✅ Scores cap franchises at ~75 without excellence
8. ✅ Scores penalize heavily for missing hours, low photos
9. ✅ Scores stay conservative (35-45 for weak)

### GEO Tests
1. ✅ Scores use ONLY authority/content signals
2. ✅ Scores never use Maps ranking, distance, or local pack
3. ✅ Scores measure brand mentions
4. ✅ Scores analyze review sentiment
5. ✅ Scores assess content depth
6. ✅ Scores evaluate trust indicators
7. ✅ Scores baseline 30-45 for no web presence
8. ✅ Scores baseline 50-65 for decent local business
9. ✅ Scores baseline 70-85 for strong authority

### Separation Tests
1. ✅ MEO and GEO share zero signals
2. ✅ MEO doesn't use website authority
3. ✅ GEO doesn't use proximity/distance
4. ✅ Changing GEO inputs doesn't affect MEO score
5. ✅ Changing MEO inputs doesn't affect GEO score

---

## RECOMMENDATION

**DO NOT USE CURRENT SCORING IN PRODUCTION.**

The scoring logic has fundamental architectural issues that make scores unreliable:
- MEO is comparing against synthetic competitors
- GEO is measuring local SEO, not AI authority

**Required Action:**
1. Implement real competitor fetching (Google Places API integration)
2. Rebuild GEO scoring with correct signals
3. Add strict input validation
4. Run full test suite
5. Validate scores against manual spot-checks

**Timeline Estimate:**
- P0 fixes: 2-3 days development + testing
- P1 fixes: 1 day development + testing
- Full validation: 1 day manual spot-checking

**Total:** ~1 week to production-ready scoring.

---

**Status:** AUDIT COMPLETE
**Date:** 2026-01-12
**Severity:** CRITICAL - BLOCKING ISSUES FOUND


