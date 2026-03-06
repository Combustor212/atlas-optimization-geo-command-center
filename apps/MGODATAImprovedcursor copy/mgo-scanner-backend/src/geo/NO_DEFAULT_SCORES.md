# ⚠️ NO DEFAULT GEO SCORES

## Rule: GEO Score is NULL if Category Unresolved

**NEVER** use default scores like:
```typescript
// ❌ FORBIDDEN
const geoScore = result.geoScore ?? 50;
const geoScore = result.geoScore || 50;
const defaultGeoScore = 75;
const baselineGeo = 60;
```

**ALWAYS** respect NULL:
```typescript
// ✅ CORRECT
const geoScore = result.geoScore; // Can be null
if (geoScore === null) {
  // Show unresolved UI state
}
```

## Why This Matters

**Old (gaslighting) behavior:**
- Category: "Establishment" (generic)
- GEO Score: 75 (fake baseline)
- Percentile: 90th (false confidence)
- User sees: "You're ranking great!" (lie)

**New (honest) behavior:**
- Category: Unresolved
- GEO Score: null
- Percentile: null
- User sees: "Category unresolved — can't compute GEO yet"

## Implementation Checklist

### Backend
- [ ] `resolvePrimaryCategory()` returns strict resolution
- [ ] GEO engine gates on `isCategoryResolved()`
- [ ] Response sets `geoScore: null` if unresolved
- [ ] Response sets `geoStatus: 'category_unresolved'`
- [ ] NO default score constants anywhere

### Frontend
- [ ] UI checks `if (geoScore === null)`
- [ ] Shows empty state: "Category unresolved"
- [ ] Shows CTA: "Retry category detection"
- [ ] Ring shows "—" instead of fake number
- [ ] Never displays "Establishment" anywhere

### Acceptance Tests
- [ ] Ray's Driving School → Category "Driving school", GEO computed
- [ ] Contour Spa Mason → Category "Medical spa", GEO computed
- [ ] Generic Place → Category "Unresolved", GEO is null, UI shows empty state
- [ ] "Establishment" never appears in GEO UI
- [ ] No fake percentiles (75th, 90th) for unresolved categories

## Search Patterns to Audit

```bash
# Find default scores (should return ZERO results)
grep -r "geoScore ?? " src/
grep -r "geoScore || " src/
grep -r "defaultGeoScore" src/
grep -r "baselineGeo" src/
grep -r "scores.geo ?? " src/
grep -r "scores.geo || " src/

# Find "Establishment" (should return ZERO results in GEO context)
grep -r "Establishment" src/geo/
grep -r "Establishment" src/components/*GEO*
```

## Emergency Override (ONLY for debugging)

If you absolutely must have a default for testing, it MUST be obvious:
```typescript
// ⚠️ TEMPORARY DEBUG ONLY
const geoScore = result.geoScore ?? -1; // -1 = unresolved, makes it obvious
```

**This should NEVER ship to production.**




