# Visibility Tracking - Quick Start Guide

## 🎉 What Was Added

Two powerful new visibility tracking systems have been added to your GEO Command Center:

### 1. **Generative AI Visibility Growth**
Track how your locations appear in AI-powered search results (ChatGPT, Gemini, Perplexity, Claude)

### 2. **Search Visibility Growth**
Monitor comprehensive search visibility including SERP features, featured snippets, and knowledge panels

## 🚀 Getting Started

### Step 1: Run Database Migration

You need to apply the new database schema before using the features.

**Option A: Supabase Dashboard**
1. Go to your Supabase project
2. Click "SQL Editor" in the left sidebar
3. Create a new query
4. Copy and paste the contents of `supabase/migrations/20260215_visibility_tracking.sql`
5. Click "Run" to execute

**Option B: Command Line**
```bash
# If using local Supabase
supabase db reset

# Or apply migration directly to remote database
psql -h your-supabase-host -U postgres -d postgres -f supabase/migrations/20260215_visibility_tracking.sql
```

### Step 2: Test the Features

1. **Navigate to GEO Tracking Page**
   - Go to `/dashboard/geo`
   - You'll see two new sections:
     - "Generative AI Visibility Growth"
     - "Search Visibility Growth"

2. **Navigate to a Client Detail Page**
   - Go to `/dashboard/clients/[client-id]`
   - Scroll down to see the new visibility sections
   - Look for "Add AI Visibility" and "Add Search Visibility" buttons

### Step 3: Add Your First Metrics

#### Add AI Visibility Metric
1. Click "Add AI Visibility" button
2. Fill in the form:
   - **Platform**: Select ChatGPT, Gemini, Perplexity, Claude, or Other
   - **Query Type**: Choose business_search, recommendation, comparison, or informational
   - **Search Query**: Enter what you tested (e.g., "best plumber near me")
   - **Was Business Mentioned?**: Yes or No
   - **Mention Position**: 1, 2, 3, etc. (if mentioned)
   - **Mention Context**: How it was mentioned (primary recommendation, in list, etc.)
   - **Sentiment**: Positive, neutral, or negative
   - **AI Response Snippet**: Copy/paste the actual AI response
   - **Scores**: Rate visibility, relevance, and prominence (0-100)
   - **Notes**: Add any observations
3. Click "Add Metric"

#### Add Search Visibility Metric
1. Click "Add Search Visibility" button
2. Fill in the form:
   - **Keyword**: Enter the search term (e.g., "plumber chicago")
   - **Search Type**: local_pack, organic, featured_snippet, etc.
   - **Device Type**: desktop, mobile, or tablet
   - **Position**: Ranking position (1-100)
   - **Is Visible?**: Yes or No
   - **SERP Features**: Check all that apply (featured snippet, knowledge panel, local pack, etc.)
   - **Local Pack Position**: If in local pack, enter 1-3
   - **Scores**: Rate overall visibility and SERP dominance (0-100)
   - **Search Location**: Where the search was performed
   - **Notes**: Add any observations
3. Click "Add Metric"

## 📊 Understanding the Metrics

### AI Visibility Score (0-100)
- **90-100**: Primary recommendation with extensive details
- **70-89**: Consistently mentioned with good context
- **50-69**: Mentioned but limited details
- **30-49**: Occasional mentions
- **0-29**: Rarely mentioned

### Search Visibility Score (0-100)
- **90-100**: Top 3 with multiple SERP features
- **70-89**: Top 10 with some SERP features
- **50-69**: Top 20 or page 1
- **30-49**: Page 2-5
- **0-29**: Page 5+ or not visible

### Trend Indicators
- 🟢 **Growth**: Score increased by 10% or more
- 🟡 **Stable**: Score within ±10%
- 🔴 **Decline**: Score decreased by 10% or more

## 🎯 What You Can Track

### AI Visibility
- ✅ Which AI platforms mention your business
- ✅ How often you're mentioned
- ✅ Your position in recommendations
- ✅ Sentiment of mentions
- ✅ Which competitors appear alongside you
- ✅ Trends over time

### Search Visibility
- ✅ Organic rankings by keyword
- ✅ Local pack positions
- ✅ Featured snippet captures
- ✅ Knowledge panel appearances
- ✅ Image and video pack results
- ✅ GMB profile visibility
- ✅ Rich snippet implementation
- ✅ SERP feature coverage %
- ✅ Multi-device rankings
- ✅ Geographic variations

## 📈 Best Practices

1. **Test Regularly**: Add new metrics weekly or monthly
2. **Be Consistent**: Use the same queries each time to track trends
3. **Test Multiple Platforms**: Different AIs have different data
4. **Document Everything**: Use the notes field
5. **Track Competitors**: Note who appears with you
6. **Multi-Device Testing**: Test on desktop, mobile, and tablet
7. **Location Variations**: Test from different geographic locations

## 🔧 File Structure

New files created:
```
supabase/migrations/
  └── 20260215_visibility_tracking.sql          # Database schema

src/types/
  └── database.ts                                # Updated with new types

src/lib/data/
  └── visibility.ts                              # Data fetching functions

src/components/visibility/
  ├── AddAIVisibilityForm.tsx                   # Form to add AI metrics
  ├── AddSearchVisibilityForm.tsx               # Form to add search metrics
  ├── AIVisibilitySummary.tsx                   # AI visibility display
  └── SearchVisibilitySummary.tsx               # Search visibility display

src/app/api/visibility/
  ├── ai/route.ts                               # API endpoint for AI metrics
  └── search/route.ts                           # API endpoint for search metrics

docs/
  └── VISIBILITY_TRACKING.md                    # Complete documentation
```

## 📚 Documentation

For complete details, see:
- **VISIBILITY_TRACKING.md** - Comprehensive guide with all features explained
- **FEATURES.md** - Updated with visibility tracking features
- **README.md** - Updated project overview

## 🆘 Troubleshooting

### "Table doesn't exist" error
- Run the database migration (Step 1 above)

### "Type error" in TypeScript
- Restart your development server: `npm run dev`

### Forms not appearing
- Clear browser cache and reload
- Check browser console for errors

### No data showing in tables
- Add your first metrics using the forms
- Data will appear once metrics are added

## 🎓 Learn More

**Test the AI Visibility Yourself:**
1. Go to ChatGPT
2. Ask: "Recommend the best [service] in [city]"
3. See if your client appears
4. Record the results in the system

**Test Search Visibility:**
1. Open an incognito browser
2. Search Google for your target keyword
3. Note ranking position and SERP features
4. Record the results in the system

## ✅ Next Steps

1. ✅ Run database migration
2. ✅ Add your first AI visibility metric
3. ✅ Add your first search visibility metric
4. ✅ Check the GEO tracking page to see your data
5. ✅ Set up weekly testing routine
6. ✅ Track trends over time

---

**Questions?** Check the full documentation in `VISIBILITY_TRACKING.md`

**Ready to show clients their AI and search visibility growth!** 🚀
