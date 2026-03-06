# Competitor Intelligence - Quick Start

## 🎯 What You Got

A complete competitor tracking system that lets you monitor competitor rankings, reviews, and trends per location.

---

## ⚡ 3-Step Setup

### Step 1: Run Database Migration

**In Supabase SQL Editor:**
1. Copy contents of: `supabase/migrations/20260216_competitor_intelligence.sql`
2. Paste into SQL Editor
3. Click "Run"

This creates:
- `competitors` table
- `competitor_rank_snapshots` table
- `competitor_review_snapshots` table
- All indexes, RLS policies, and helper functions

### Step 2: Refresh Browser

The dev server is already running with the new code. Just refresh your browser at:
- `/dashboard/clients/[any-client-id]` - See "Competitor Intelligence" section
- `/portal` - Clients see competitors (read-only)

### Step 3: Add First Competitor

1. Go to any client detail page
2. Scroll to "Competitor Intelligence"
3. Click "Add Competitor"
4. Fill in:
   - Competitor name (required)
   - Google Place ID (optional - for automation)
   - Website (optional)
   - Mark as primary (checkbox)
5. Submit

---

## 📊 Features at a Glance

### What Admins/Staff Can Do:
- ✅ Add competitors per location
- ✅ Track snapshots (rank + reviews)
- ✅ View trends and comparison data
- ✅ See review velocity (reviews/day)
- ✅ Identify top performers

### What Clients Can See:
- ✅ Competitor list for their locations
- ✅ Current rankings and ratings
- ✅ Review counts and velocity
- ✅ Performance trends
- ❌ Cannot add or edit (read-only)

---

## 🎨 UI Layout

### Admin Dashboard (`/dashboard/clients/[id]`)

```
┌─────────────────────────────────────┐
│  Client Header + Generate Report    │
├─────────────────────────────────────┤
│  Performance Badges                 │
├─────────────────────────────────────┤
│  Quick Stats Cards (4 metrics)      │
├─────────────────────────────────────┤
│  Performance Charts (3 charts)      │
├─────────────────────────────────────┤
│  AI Visibility Growth Section       │
├─────────────────────────────────────┤
│  Search Visibility Growth Section   │
├─────────────────────────────────────┤
│  🆕 COMPETITOR INTELLIGENCE         │
│  ┌─────────┬─────────┬─────────┐   │
│  │ Card 1  │ Card 2  │ Card 3  │   │
│  │ Rank #3 │ Rank #5 │ Rank #7 │   │
│  │ ⭐ 4.8  │ ⭐ 4.5  │ ⭐ 4.3  │   │
│  └─────────┴─────────┴─────────┘   │
├─────────────────────────────────────┤
│  Location Performance Table         │
└─────────────────────────────────────┘
```

### Each Competitor Card Shows:
- Competitor name
- "Primary" badge (if marked)
- Website link
- Current rank with color coding
- Trend indicator (↗️↘️→)
- Star rating
- Review count
- Review velocity (+X.X/day)
- Keyword tracked
- "Add Snapshot" button (admin/staff)

---

## 📡 API Usage

### Add Competitor
```typescript
POST /api/competitors
{
  "location_id": "uuid",
  "name": "ABC Plumbing",
  "google_place_id": "ChIJ...",
  "website": "https://example.com",
  "is_primary": true
}
```

### Get Competitors
```typescript
GET /api/locations/{locationId}/competitors

Response:
{
  "competitors": [
    {
      "competitor": {...},
      "latest_rank": {...},
      "latest_review": {...},
      "review_velocity": 0.5,
      "rank_trend": "up",
      "rank_history": [...],
      "review_history": [...]
    }
  ]
}
```

### Add Snapshot
```typescript
POST /api/competitors/{competitorId}/snapshot
{
  "rank": {
    "keyword": "plumber chicago",
    "rank_position": 5,
    "source": "manual"
  },
  "review": {
    "rating": 4.5,
    "review_count": 234
  }
}
```

---

## 🔄 Automated Collection (Future)

The system is ready for automation. Connect:

### Google Places API
```typescript
// Fetch competitor data automatically
const placeDetails = await googlePlaces.details({
  place_id: competitor.google_place_id
})

await fetch('/api/competitors/${id}/snapshot', {
  method: 'POST',
  body: JSON.stringify({
    review: {
      rating: placeDetails.rating,
      review_count: placeDetails.user_ratings_total
    }
  })
})
```

### Local Falcon / SerpApi
```typescript
// Track competitor rankings automatically
const rankData = await localFalcon.getRankings({
  location: locationData,
  keyword: 'plumber chicago'
})

for (const competitor of rankData.competitors) {
  await fetch('/api/competitors/${id}/snapshot', {
    method: 'POST',
    body: JSON.stringify({
      rank: {
        keyword: 'plumber chicago',
        rank_position: competitor.position,
        source: 'local_falcon'
      }
    })
  })
}
```

---

## 🎨 Display Features

### Summary Stats (Top of Section)
- 📊 Total Competitors Tracked
- 📈 Average Competitor Rank
- ⭐ Average Competitor Rating

### Competitor Cards
- Name + primary badge
- Rank with color + trend
- Rating + review count
- Review velocity indicator
- Keyword tracked
- Website link

### Color Coding
- 🟢 Rank 1-3: Green (top performers)
- 🟡 Rank 4-7: Yellow (good)
- 🔴 Rank 8+: Red (needs improvement)

---

## 🚀 Next Steps

1. **Run the migration** in Supabase
2. **Refresh browser** at `/dashboard/clients/[id]`
3. **Add your first competitor**
4. **Track snapshots** to see trends develop
5. **Automate collection** (optional - connect APIs)

---

## 📁 File Locations

**Migration:**
```
supabase/migrations/20260216_competitor_intelligence.sql
```

**API Routes:**
```
app/api/competitors/route.ts
app/api/locations/[locationId]/competitors/route.ts
app/api/competitors/[competitorId]/snapshot/route.ts
```

**Components:**
```
components/competitors/CompetitorCard.tsx
components/competitors/AddCompetitorForm.tsx
components/competitors/CompetitorsTab.tsx
```

**Data Functions:**
```
lib/data/competitors.ts
```

---

**Ready to track competitors and dominate your local market!** 🎯
