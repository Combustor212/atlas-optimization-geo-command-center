# Google Places API Integration - Setup Complete

## ✅ What's Been Configured

Your GEO Command Center now has **full Google Places API integration** for automated ranking tracking and business data collection.

## 🔑 API Key

Your Google Places API key has been added to `.env.local`:
```
GOOGLE_PLACES_API_KEY=AIzaSyB3cfJJwbEm0jLOI4NZdJULYKWn0O9r3ZA
```

## 🚀 Features Available

### 1. **Automated Ranking Tracking**
- Track your business ranking for any keyword using Google Places API
- See your position in the local pack (top 20 results)
- Automatic geocoding of location addresses
- 5km radius search around your business location

### 2. **Real-time Business Data**
- Get place IDs for businesses
- Fetch business details (ratings, reviews, photos)
- Verify business locations
- Track competitor positions

### 3. **Integration Points**

#### **New Components:**
- `AutoTrackRankingButton` - One-click automated ranking tracking
- Located on GEO page and Client detail pages
- Icon button with TrendingUp icon

#### **New API Route:**
- `POST /api/geo/track-ranking` - Automated ranking tracking endpoint
- Accepts: `{ locationId, keyword }`
- Returns: `{ rank, placeId, totalResults }`

#### **New Integration Library:**
- `/src/lib/integrations/google-places.ts` - Full Google Places API wrapper
- Functions available:
  - `searchPlacesByText()` - Text-based place search
  - `searchNearbyPlaces()` - Nearby search with keyword
  - `getPlaceDetails()` - Get detailed business information
  - `getBusinessRankingForKeyword()` - Get ranking position
  - `geocodeAddress()` - Convert address to coordinates

## 📖 How to Use

### Method 1: Auto-Track Button (Easiest)

1. Go to **GEO Tracking Engine** page or any **Client Detail** page
2. Find the location you want to track
3. Click the **📈 icon button** (Auto-Track)
4. Enter a keyword (e.g., "plumber", "restaurant")
5. Click **Track Ranking**
6. The system will:
   - Geocode the location address
   - Search Google Places API for the keyword
   - Find your business in the results
   - Save the ranking to the database
   - Show you the result instantly

### Method 2: Manual Entry

Use the existing "Add Ranking" button to manually enter rankings from other sources.

### Method 3: Programmatic (API)

```javascript
// Example API call
const response = await fetch('/api/geo/track-ranking', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    locationId: 'location-uuid',
    keyword: 'plumber',
  }),
})

const data = await response.json()
console.log(`Rank: ${data.data.rank}`) // e.g., Rank: 3
```

## 🎯 Use Cases

### Track Local Pack Rankings
```typescript
import { getBusinessRankingForKeyword } from '@/lib/integrations/google-places'

const ranking = await getBusinessRankingForKeyword(config, {
  businessName: 'ABC Plumbing',
  keyword: 'plumber',
  location: { lat: 40.7128, lng: -74.0060 },
  radius: 5000,
})

console.log(`Rank: ${ranking.rank || 'Not in top 20'}`)
```

### Get Business Details
```typescript
import { getPlaceDetails } from '@/lib/integrations/google-places'

const details = await getPlaceDetails(config, placeId)
console.log(`Rating: ${details?.rating}`)
console.log(`Reviews: ${details?.userRatingsTotal}`)
```

### Search for Competitors
```typescript
import { searchNearbyPlaces } from '@/lib/integrations/google-places'

const results = await searchNearbyPlaces(config, {
  keyword: 'plumber',
  location: { lat: 40.7128, lng: -74.0060 },
  radius: 5000,
})

// results is an array of top 20 businesses
results.forEach((place, index) => {
  console.log(`${index + 1}. ${place.name} - ${place.rating} stars`)
})
```

## 🔒 Security Notes

1. **API Key is Server-Side Only**
   - The key is in `.env.local` and never exposed to the browser
   - All API calls go through your Next.js backend

2. **Row-Level Security**
   - Users can only track rankings for locations they have access to
   - Agency separation is enforced

3. **Rate Limits**
   - Be aware of Google Places API rate limits
   - Default limits: https://developers.google.com/maps/documentation/places/web-service/usage-and-billing

## 📊 What Data Gets Saved

When you use auto-tracking, the following is saved to the `rankings` table:

```sql
{
  location_id: 'uuid',
  keyword: 'plumber',
  keyword_type: 'primary',
  map_pack_position: 3,        -- Your rank (1-20) or null
  organic_position: null,      -- Not tracked via Places API
  source: 'google_places_api', -- Identifies data source
  recorded_at: '2026-02-13'    -- Timestamp
}
```

Additionally, if a `place_id` is found, it's automatically saved to the location record for future reference.

## 🎨 UI Updates

### GEO Tracking Page
- Shows "Google Places API" as **Active** in the integrations section
- Auto-track button added to each location row
- Green "Active" badge shows it's configured

### Client Detail Page
- Auto-track button added to location actions
- Works alongside manual entry buttons

## 🐛 Troubleshooting

### "Google Places API key not configured"
- Make sure `.env.local` has the key
- Restart your dev server after adding the key

### "Could not geocode address"
- Ensure location has a valid address, city, state
- Check the address format is correct

### "Not in top 20"
- Your business wasn't found in the first 20 results
- Try a more specific keyword
- Verify the business name matches Google

### API Returns Error
- Check your Google Cloud Console for API key restrictions
- Verify Places API (New) is enabled
- Check you haven't exceeded quota

## 🔄 Next Steps (Optional Enhancements)

1. **Scheduled Tracking**
   - Set up cron jobs to auto-track rankings daily
   - Use Vercel Cron or similar

2. **Competitor Tracking**
   - Track competitor rankings alongside yours
   - Compare performance

3. **Historical Trends**
   - Use the existing ranking charts
   - Track improvement over time

4. **Grid-Based Tracking**
   - Integrate Local Falcon for more detailed geographic grid tracking
   - Track rankings from multiple points in a city

5. **Review Monitoring**
   - Fetch and track Google reviews using the API
   - Monitor rating changes

## 📝 API Documentation

Full Google Places API documentation:
- https://developers.google.com/maps/documentation/places/web-service

Enabled Services:
- Places API (New)
- Geocoding API
- Places Details
- Nearby Search
- Text Search

## ✨ Summary

Your GEO tracking is now **fully functional** with:
- ✅ Real Google Places API integration
- ✅ Automated ranking tracking
- ✅ One-click tracking buttons
- ✅ Geocoding support
- ✅ Business data collection
- ✅ Secure server-side implementation
- ✅ Row-level security
- ✅ Clean UI integration

**Just add clients and locations, then click the 📈 icon to start tracking rankings automatically!**
