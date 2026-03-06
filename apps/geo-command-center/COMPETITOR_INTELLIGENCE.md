# Competitor Intelligence Feature - Implementation Summary

## ✅ Complete Implementation

A full competitor tracking and comparison system has been added to the GEO Command Center.

---

## 📊 What Was Built

### 1. Database Schema (3 Tables)

**`competitors`**
- Stores competitor businesses per location
- Fields: name, google_place_id, website, is_primary
- Scoped by: agency_id, client_id, location_id

**`competitor_rank_snapshots`**
- Historical rank tracking with keyword and grid point
- Captures: rank_position, keyword, grid_point (lat/lng), source
- Timestamped snapshots for trend analysis

**`competitor_review_snapshots`**
- Historical review and rating data
- Captures: rating (0-5), review_count
- Used to calculate review velocity

### 2. Security & RLS

✅ Row Level Security enabled on all tables
✅ Admin/Staff: Full CRUD on their agency's data
✅ Clients: Read-only access to competitors for their locations
✅ Agency scoping enforced at database level
✅ Additional server-side validation in API routes

### 3. API Routes (Following Conventions)

**POST `/api/competitors`**
- Create new competitor
- Admin/staff only
- Validates: location ownership, agency scope
- Auto-sets agency_id and client_id

**GET `/api/locations/[locationId]/competitors`**
- Get all competitors with latest snapshots
- Returns: competitor data + latest rank + latest review + trends
- Accessible by: admin, staff, and location's client

**POST `/api/competitors/[competitorId]/snapshot`**
- Add rank and/or review snapshot
- Admin/staff only
- Flexible: can add rank, review, or both in one call
- Validates: competitor ownership, data integrity

### 4. Data Fetching Functions

**`getLocationCompetitors(locationId)`**
- Fetches all competitors with enriched data
- Includes: latest snapshots, history, velocity, trends
- Returns `CompetitorWithSnapshots[]`

**`getCompetitorComparison(locationId)`**
- Calculates summary statistics
- Identifies top performers (rating, reviews, rank)
- Returns aggregated comparison data

**Helper functions:**
- `getReviewVelocity()` - Reviews per day over last 30 days
- `calculateRankTrend()` - Up/down/stable based on history
- `getRankHistory()` - Historical rank data for charts
- `getReviewHistory()` - Historical review data

### 5. UI Components

**`CompetitorCard`**
- Display individual competitor with metrics
- Shows: rank, rating, review count, review velocity, trend indicators
- Color-coded rank display (green 1-3, yellow 4-7, red 8+)
- Responsive card layout

**`AddCompetitorForm`**
- Modal form to add new competitors
- Fields: name, place_id, website, is_primary, notes
- Admin/staff only

**`CompetitorsTab`**
- Complete competitor intelligence view
- Summary stats: total tracked, avg rank, avg rating
- Grid of competitor cards
- Lazy loaded for performance
- Empty state with helpful messaging

### 6. Integration

✅ Added to Client Detail page (`/dashboard/clients/[id]`)
✅ Added to Client Portal (`/portal`)
✅ Admin/staff see "Add Competitor" button
✅ Clients see read-only view
✅ Does not interfere with existing features

---

## 🗂️ Files Created

### Database
- `/supabase/migrations/20260216_competitor_intelligence.sql` (260 lines)

### Types & Validation
- Added to `/src/types/database.ts`:
  - `Competitor`, `CompetitorRankSnapshot`, `CompetitorReviewSnapshot`
  - `CompetitorWithSnapshots`
- Added to `/src/lib/validation.ts`:
  - `competitorSchema`, `rankSnapshotSchema`, `reviewSnapshotSchema`
  - `competitorSnapshotSchema`

### Data Layer
- `/src/lib/data/competitors.ts` (240 lines)
  - 10 data fetching functions
  - Trend calculations
  - Comparison analytics

### API Routes
- `/src/app/api/competitors/route.ts`
- `/src/app/api/locations/[locationId]/competitors/route.ts`
- `/src/app/api/competitors/[competitorId]/snapshot/route.ts`

### UI Components
- `/src/components/competitors/CompetitorCard.tsx`
- `/src/components/competitors/AddCompetitorForm.tsx`
- `/src/components/competitors/CompetitorsTab.tsx`

### Pages (Modified)
- `/src/app/(dashboard)/dashboard/clients/[id]/page.tsx`
- `/src/app/(portal)/portal/page.tsx`

---

## 🎯 Features

### For Admin/Staff

✅ **Add Competitors**
- Per location tracking
- Google Place ID support
- Mark primary competitors

✅ **Track Snapshots**
- Manual rank entries with keyword
- Grid point support for heatmaps
- Review count tracking
- Multiple data sources (manual, Google API, Local Falcon)

✅ **View Analytics**
- Latest rank position with trend indicators
- Review velocity (reviews/day)
- Historical performance
- Comparison across competitors

### For Clients

✅ **View Competitors**
- See who they're competing against
- Current rankings and ratings
- Review velocity indicators
- Performance trends

✅ **Understand Market Position**
- Average competitor metrics
- Top performers identified
- Visual trend indicators

---

## 📈 Key Metrics Tracked

1. **Rank Position** - Current map pack/organic rank
2. **Rating** - Star rating (0-5)
3. **Review Count** - Total number of reviews
4. **Review Velocity** - Reviews per day (30-day trend)
5. **Rank Trend** - Up/down/stable indicator
6. **Keyword** - What keyword was tracked

---

## 🔐 Security Implementation

✅ All API routes use `requireRole()` or `getSessionUser()`
✅ Agency scope verified on every request
✅ Zod validation on all inputs
✅ RLS enabled with proper policies
✅ No cross-agency data leakage possible
✅ Client read-only enforcement

---

## 🚀 How to Use

### 1. Run the Migration

```bash
# In Supabase SQL Editor or CLI
supabase/migrations/20260216_competitor_intelligence.sql
```

### 2. Refresh Your Browser

The Competitors tab will appear on:
- Client detail pages (`/dashboard/clients/[id]`)
- Client portal (`/portal`)

### 3. Add Your First Competitor

1. Navigate to a client detail page
2. Scroll to "Competitor Intelligence" section
3. Click "Add Competitor"
4. Fill in competitor details
5. Submit

### 4. Track Snapshots (Coming Soon - UI)

Currently via API:
```typescript
POST /api/competitors/[id]/snapshot
{
  rank: {
    keyword: "plumber chicago",
    rank_position: 5,
    source: "manual"
  },
  review: {
    rating: 4.5,
    review_count: 234
  }
}
```

---

## 🎨 UI Features

✅ **Color-Coded Rankings**
- Green: Rank 1-3 (excellent)
- Yellow: Rank 4-7 (good)
- Red: Rank 8+ (needs improvement)

✅ **Trend Indicators**
- ↗️ Up: Rank improving
- ↘️ Down: Rank declining
- → Stable: No significant change

✅ **Review Velocity**
- Shows reviews per day over last 30 days
- Helps identify aggressive competitors

✅ **Responsive Design**
- Mobile, tablet, desktop optimized
- Grid layout with cards
- Fast loading with lazy data

---

## 📊 Future Enhancements

Ready to add:
- [ ] Rank history sparkline charts
- [ ] Review growth charts
- [ ] Heatmap visualization (using grid_point data)
- [ ] Automated snapshot collection via Google Places API
- [ ] Competitor alerts (rank changes, review spikes)
- [ ] Export competitor reports to PDF
- [ ] Bulk competitor import
- [ ] Competitive gap analysis

---

## 🧪 Testing

To test the feature:

1. **Add a competitor**
   - Go to any client detail page
   - Use "Add Competitor" form
   - Verify it appears in the grid

2. **Add a snapshot** (via API for now)
   - POST to `/api/competitors/[id]/snapshot`
   - Refresh page to see updated metrics

3. **View as client**
   - Log in as a client
   - Navigate to portal
   - See competitors (read-only)

---

## 📝 Architecture Compliance

✅ Follows all established conventions:
- ✅ Supabase server client in `/lib/supabase/server.ts`
- ✅ Auth/scope helpers in `/lib/auth/scope.ts`
- ✅ Zod validation in `/lib/validation.ts`
- ✅ Error responses in `/lib/api/errors.ts`
- ✅ RLS enabled with JWT-based policies
- ✅ Agency scoping enforced everywhere
- ✅ Typed responses
- ✅ Consistent error handling

---

**Competitor Intelligence is now live and ready to use!** 🎉
