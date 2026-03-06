# Real Competitors - Quick Testing Guide

## ✅ Implementation Complete

Real competitors from Google Places API with verified placeIds are now live.

---

## Quick Test (2 minutes)

### 1. Start the Application

**Backend:**
```bash
cd mgo-scanner-backend
npm run dev
```

**Frontend:**
```bash
cd mgodataImprovedthroughcursor
npm run dev
```

### 2. Run a Scan

1. Navigate to scan page
2. Enter a business (e.g., "Starbucks, New York")
3. Run GEO scan
4. Wait for results to load

### 3. Verify Competitors Section

**You should see:**
```
📍 LOCAL COMPETITORS NEAR YOU
Real competitors within 5km from your location, verified with Google placeIds

┌─────────────────────────────────────────────────────────────┐
│ Business        │ Rating  │ Reviews │ Distance │ Actions   │
├─────────────────────────────────────────────────────────────┤
│ Starbucks       │ ⭐ 4.3  │ 1,234   │ 0.5km    │ View 🔗   │
│ Peet's Coffee   │ ⭐ 4.6  │ 567     │ 1.2km    │ View 🔗   │
│ ...             │         │         │          │           │
└─────────────────────────────────────────────────────────────┘
```

### 4. Click "View" Button

- Should open Google Maps
- Should show the correct business
- URL should contain `place_id={placeId}`

### 5. Check DevTools (DEV Mode Only)

**Network Tab:**
- Look for: `GET /api/geo/competitors/nearby?placeId=...`
- Status should be: `200 OK`
- Response should have: `{ success: true, competitors: [...] }`

**Console:**
- Should see: `[GEO Panel] Nearby competitors loaded: { targetPlaceId, count, names }`
- Each competitor should have a placeId

**UI:**
- Should see badge: "Source: Google Places API (realtime)"
- Should see truncated placeIds below business names

---

## Expected Behaviors

### ✅ Success Case
- Section appears with real competitors
- All competitors have placeIds (verify in DEV mode)
- "View" links work
- No fake businesses like "Local Brew Coffee"

### ✅ No Competitors Nearby
- Section does NOT appear
- No placeholder or empty state
- Page still renders normally

### ✅ API Error
- Shows message: "Nearby competitors unavailable for this location."
- Rest of page works fine
- No broken UI

### ✅ No Target placeId
- Section does NOT appear
- DEV console warns: "Target business missing placeId"
- Page still renders normally

---

## Manual Verification Checklist

Copy this checklist for testing:

```
□ Backend starts without errors
□ Frontend starts without errors
□ Scan completes successfully
□ Competitors section appears
□ At least 1 competitor shows in table
□ Each competitor has: name, address, rating, reviews, distance
□ "View" button opens correct business in Google Maps
□ DEV mode: Source badge shows "Google Places API"
□ DEV mode: placeIds visible below business names
□ DEV mode: Console logs show competitor count
□ Production mode: No debug info visible
□ Network tab shows /api/geo/competitors/nearby request
□ Response has success: true and competitors array
□ No fake business names appear
□ If section hidden, it's intentional (no placeId or no competitors)
```

---

## Common Issues & Solutions

### Issue: Section doesn't appear

**Possible causes:**
1. **No target placeId** → Expected behavior, check DEV console for warning
2. **No competitors nearby** → Expected behavior, try a different business
3. **API error** → Check backend logs, verify Google Places API key

**How to debug:**
- Open DevTools → Console
- Look for: `[GEO Panel]` logs
- Check Network tab for API request

---

### Issue: "View" link doesn't work

**Possible causes:**
1. **Invalid placeId format** → Should not happen, backend validates
2. **Browser blocking pop-ups** → Allow pop-ups for the site

**How to verify:**
- Right-click "View" → Copy link address
- Should be: `https://www.google.com/maps/place/?q=place_id:ChIJ...`
- Paste in browser → should open correct business

---

### Issue: Shows fake competitors

**This should NEVER happen.**

If you see fake businesses:
1. Check Network tab response → verify all have `placeId` field
2. Check DEV console → should warn if any filtered out
3. Report as bug (this violates hard rules)

---

## API Endpoint Testing (Optional)

Test the endpoint directly:

```bash
# Get your target business placeId first
curl "http://localhost:3000/api/geo/benchmark?placeId=YOUR_PLACE_ID"

# Then test competitors endpoint
curl "http://localhost:3000/api/geo/competitors/nearby?placeId=YOUR_PLACE_ID&radius=5000&limit=10"
```

**Expected response:**
```json
{
  "success": true,
  "competitors": [
    {
      "placeId": "ChIJ...",
      "name": "Real Business Name",
      "address": "123 Main St",
      "rating": 4.5,
      "userRatingsTotal": 234,
      "types": ["cafe", "food"],
      "distanceMeters": 500,
      "lat": 40.7128,
      "lng": -74.0060
    }
  ],
  "target": {
    "placeId": "ChIJ...",
    "name": "Target Business",
    "lat": 40.7128,
    "lng": -74.0060,
    "primaryType": "cafe"
  },
  "radiusMeters": 5000,
  "count": 10
}
```

---

## Production Deployment Checklist

Before deploying to production:

```
□ GOOGLE_PLACES_API_KEY set in backend environment
□ VITE_API_URL set correctly in frontend environment
□ Backend endpoint accessible from frontend
□ CORS configured if needed
□ Test in production-like environment first
□ Verify no DEV-only code visible in production
□ Monitor Places API usage and costs
□ Test with real user data
```

---

## Success Criteria

✅ **All must be true:**
- No fake competitor names appear
- Every competitor has a valid Google placeId
- "View" links open correct business in Google Maps
- Section hidden when appropriate (no placeholders)
- Error messages are user-friendly
- DEV mode shows debugging info
- Production mode is clean
- Network requests show real Places API data

---

## Next Steps After Testing

1. ✅ Verify all checklist items
2. ✅ Test with multiple businesses (urban + rural)
3. ✅ Test error cases (API down, no placeId)
4. ✅ Verify Google Maps links work
5. ✅ Check DEV vs Production modes
6. ✅ Deploy to staging
7. ✅ Monitor for errors
8. ✅ Deploy to production

---

## Support

**If you encounter issues:**
1. Check `COMPETITOR_ACCEPTANCE_CHECKLIST.md` for detailed verification
2. Check backend logs for API errors
3. Check browser console for frontend errors
4. Verify Google Places API key is valid and has quota

**Documentation:**
- `REAL_COMPETITORS_PHASE_A_IMPLEMENTATION.md` - Full technical details
- `COMPETITOR_ACCEPTANCE_CHECKLIST.md` - Verification of all requirements
- `COMPETITOR_DATA_PERMANENT_FIX.md` - History of fixes

---

**Ready to test!** 🚀

Run the app and verify competitors are real and clickable.


