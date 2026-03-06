# MEO SCORING COMPLIANCE VERIFICATION

**Date:** 2026-01-12  
**Status:** VERIFYING AGAINST FINAL REQUIREMENTS  

---

## COMPLIANCE CHECKLIST

### 1. ✅ HARD SCOPE BOUNDARY

**Requirement:** MEO measures ONLY local Maps strength vs nearby competitors. Must NOT use GEO/AI signals.

**Implementation:**
- ✅ `meoEngine.ts` uses ONLY: rating, reviews, photos, profile completeness, competitor data
- ✅ Does NOT use: website SEO quality (binary only), brand fame, AI mentions
- ✅ MEO and GEO completely independent (verified in audit)

**Status:** ✅ COMPLIANT

---

### 2. ✅ REQUIRED INPUTS (BLOCK IF MISSING)

**Requirement:** Verify ALL required inputs exist before scoring. Abort if any missing.

**Implementation:** `meoEngine.ts` lines 430-512
```typescript
// Validate place_id
if (!place.place_id) {
  return createErrorResponse(..., 'Missing place_id', 'Place ID is required for MEO scoring');
}

// Validate formatted_address
if (!place.formatted_address) {
  return createErrorResponse(..., 'Missing formatted_address', ...);
}

// Validate geometry (lat/lng)
if (!place.geometry?.location) {
  return createErrorResponse(..., 'Missing lat/lng', ...);
}

// Validate rating
if (place.rating === undefined || place.rating === null) {
  return createErrorResponse(..., 'Missing rating', ...);
}

// Validate reviews
if (place.user_ratings_total === undefined || place.user_ratings_total === null) {
  return createErrorResponse(..., 'Missing user_ratings_total', ...);
}

// Validate types (category)
if (!place.types || place.types.length === 0) {
  return createErrorResponse(..., 'Missing category (types)', ...);
}
```

**Additional Checks Needed:**
- ⚠️ Phone number validation
- ⚠️ Opening hours validation
- ⚠️ Photo count validation (currently allows 0)

**Status:** ⚠️ NEEDS ENHANCEMENT

---

### 3. ✅ CATEGORY & NICHE RESOLUTION

**Requirement:** Resolve ONE specific niche. NEVER fallback to generic. Abort if unresolved.

**Implementation:** `meoEngine.ts` lines 540-548
```typescript
// If category is generic/ambiguous, abort (per audit rules)
if (categoryResult.categoryCanonical === 'general_business' && categoryResult.categoryConfidence < 0.5) {
  return createErrorResponse(
    businessName,
    location,
    runId,
    'Ambiguous category',
    'Cannot resolve specific business category - too generic or ambiguous'
  );
}
```

**Status:** ✅ COMPLIANT

---

### 4. ✅ COMPETITIVE SET CONSTRUCTION

**Requirement:** Find ≥3 competitors in same niche within 10-15km. Abort if <3 found.

**Implementation:** `competitiveAnalysis.ts`
- ✅ Fetches competitors via Google Places Nearby Search
- ✅ 12km radius (within 10-15km rule)
- ✅ Filters by primary type
- ✅ Returns error if <3 competitors:
```typescript
if (!competitors || competitors.length < 3) {
  return {
    error: 'MEO competitive analysis blocked',
    reason: `Found only ${competitors?.length || 0} competitors (minimum 3 required)`,
    details: { found: competitors?.length || 0, required: 3, location, targetPlaceId }
  };
}
```

**Status:** ✅ COMPLIANT

---

### 5. ✅ BASELINE PHILOSOPHY (CONSERVATIVE)

**Requirement:** 
- Weak/unknown: 35-45
- Average local: 50-60
- Strong local: 60-68
- Local leader: 68-74
- Hard ceiling (non-franchise): ~75

**Implementation:** `meoEngine.ts`
- ✅ Minimum baseline: 37 (line 631)
- ✅ Non-franchise cap: 75 (line 619)
- ✅ Franchise cap without excellence: 75 (line 626)
- ✅ Review reliability caps: 50 (<10 reviews), 60 (<25 reviews), 70 (<60 reviews), 80 (<150 reviews)

**Status:** ✅ COMPLIANT

---

### 6. ✅ FRANCHISE HANDLING

**Requirement:**
- Franchise floor ≈ 67
- Franchise ceiling without excellence ≈ 75
- Poor ratings/photos still reduce score

**Implementation:** `meoEngine.ts`
- ✅ Franchise boost applied (but can be reduced for poor ratings)
- ✅ Franchise cap at 75 unless rating ≥4.8 (lines 616-627)
- ✅ Major rating penalty for franchises with poor ratings (lines 574-582)

**Franchise Floor Check:**
- ⚠️ Need to verify franchise floor ≈ 67

**Status:** ⚠️ NEEDS VERIFICATION

---

### 7. ⚠️ WEIGHTED SIGNALS (MAPS-ONLY)

**Requirement:**
**Heavy penalties:**
- Missing hours
- Low photo count vs peers
- Weak review velocity
- Incomplete GBP fields
- Falling behind local averages

**Light penalties:**
- Minor rating dips if peers similar
- Review count beyond sufficiency
- Website quality (binary only)

**Implementation Review Needed:**
- ✅ Missing hours: Completeness score (20 pts if present)
- ✅ Low photos: Visual score + review reliability cap
- ⚠️ Review velocity: Not explicitly calculated (uses total reviews with logarithmic scaling)
- ✅ Incomplete GBP: Completeness score
- ✅ Falling behind peers: Competitive percentile bonus
- ✅ Website: Binary only (20 pts if present in completeness)

**Status:** ⚠️ NEEDS ENHANCEMENT (review velocity)

---

### 8. ⚠️ MEO OUTPUT (REQUIRED)

**Requirement:** Always return:
- meoScore (capped, conservative)
- Grade (A-F)
- Comparative explanation vs nearby competitors
- Clear reasons score is NOT higher
- Local peer context (percentile language)
- Actionable Maps-specific fixes only

**Implementation:** `meoEngine.ts` returns `MEOScanResponse`
- ✅ `meoScore`: Final score (capped)
- ✅ `grade`: Letter grade (A+ to F)
- ✅ `marketContext`: Competitive position, percentiles, local averages
- ✅ `deficiencies`: What's missing
- ✅ `optimizationTips`: Actionable fixes
- ✅ `gradeRationale`: Why this score

**Comparative Language Check:**
- ⚠️ Need to verify language is client-safe and comparative

**Status:** ⚠️ NEEDS LANGUAGE AUDIT

---

### 9. ❌ UI/ANALYTICS CONTRACT (NOT IMPLEMENTED)

**Requirement:**
- Show relative position ("Position #4 of 7 nearby competitors")
- Avoid "100% visibility" language
- Use comparative phrasing:
  - "Appears in 5/5 near-me searches"
  - "Ranks behind 3 competitors in Trust searches"
- Clearly separate: What's helping / What's holding back / Fastest growth lever

**Implementation:**
- ❌ This is frontend (React components)
- ❌ Not touched in backend scoring fix
- ❌ Needs separate implementation

**Status:** ❌ OUT OF SCOPE (FRONTEND)

---

### 10. ✅ FAILURE RULES

**Requirement:** Abort immediately if:
- Wrong category
- Missing Place ID
- No valid competitors
- Global/non-local listings returned

**Implementation:**
- ✅ Wrong category: Aborts if generic/ambiguous (line 540-548)
- ✅ Missing Place ID: Aborts with error (line 437-443)
- ✅ No valid competitors: Aborts if <3 (competitiveAnalysis.ts)
- ⚠️ Global/non-local check: Not explicitly implemented

**Status:** ⚠️ NEEDS ENHANCEMENT (global/non-local check)

---

## REQUIRED ENHANCEMENTS

### Priority 1: Additional Input Validation
**File:** `meoEngine.ts`

Need to add validation for:
1. Phone number (formatted_phone_number OR international_phone_number)
2. Opening hours (opening_hours.weekday_text)
3. Photo count (photos array - warn if 0, but don't block)

### Priority 2: Review Velocity Calculation
**File:** `meoEngine.ts`

Currently uses total reviews with logarithmic scaling. Should add:
- Recent review rate (if available from API)
- Or stronger penalty for low review counts

### Priority 3: Franchise Floor Verification
**File:** `meoEngine.ts`

Ensure franchise baseline ≈ 67:
- Check if `profileBase` + franchise boost results in ~67 floor

### Priority 4: Comparative Language Audit
**File:** `meoEngine.ts` - output generation

Ensure all output text uses comparative language:
- "Position X of Y"
- "Behind/ahead of N competitors"
- "Top/Bottom X%"

### Priority 5: Global/Non-Local Check
**File:** `competitiveAnalysis.ts`

Add filter to exclude:
- Corporate HQs
- Non-service locations
- Listings outside search radius

---

## COMPLIANCE SUMMARY

| Requirement | Status | Notes |
|------------|--------|-------|
| 1. Hard Scope Boundary | ✅ PASS | MEO/GEO separated |
| 2. Required Inputs | ⚠️ PARTIAL | Need phone/hours validation |
| 3. Category Resolution | ✅ PASS | Generic fallback blocked |
| 4. Competitive Set | ✅ PASS | Min 3, real API data |
| 5. Baseline Philosophy | ✅ PASS | Conservative, capped at 75 |
| 6. Franchise Handling | ⚠️ PARTIAL | Need floor verification |
| 7. Weighted Signals | ⚠️ PARTIAL | Need review velocity |
| 8. MEO Output | ⚠️ PARTIAL | Need language audit |
| 9. UI/Analytics | ❌ N/A | Frontend scope |
| 10. Failure Rules | ⚠️ PARTIAL | Need global/non-local check |

**Overall Compliance:** 60% PASS / 40% NEEDS WORK

---

## NEXT ACTIONS

1. **Enhance input validation** (phone, hours)
2. **Verify franchise floor** (~67 baseline)
3. **Audit comparative language** in output
4. **Add review velocity** penalty
5. **Filter global/non-local** competitors

**Estimated Time:** 2-3 hours


