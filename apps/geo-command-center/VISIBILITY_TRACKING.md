# Visibility Tracking Features

## 🎯 Overview

The GEO Command Center now includes advanced visibility tracking capabilities that go beyond traditional ranking metrics. Track how your clients appear in both AI-powered search results and traditional search engine result pages (SERPs) with comprehensive feature detection.

## 🧠 Generative AI Visibility Tracking

### What It Tracks

Monitor how your business locations appear when users ask AI assistants for recommendations:

- **Supported Platforms**:
  - ChatGPT (OpenAI)
  - Google Gemini
  - Perplexity AI
  - Claude (Anthropic)
  - Other AI platforms

### Key Metrics

#### Visibility Score (0-100)
Overall assessment of how prominently your business appears in AI responses.

#### Mention Tracking
- **Is Mentioned**: Binary flag for whether the business appeared
- **Mention Position**: 1st, 2nd, 3rd recommendation, etc.
- **Mention Context**:
  - Primary recommendation (top choice)
  - In list (one of several)
  - In comparison (vs competitors)
  - Passing mention (brief reference)

#### Quality Metrics
- **Relevance Score (0-100)**: How relevant the mention was to the query
- **Prominence Score (0-100)**: How prominently featured in the response
- **Sentiment**: Positive, neutral, or negative tone
- **Unique Details Count**: Number of specific business details mentioned

#### Analysis
- **AI Response Snippet**: Actual text from the AI response
- **Competitors Mentioned**: Array of competitor names
- **Query Type Classification**:
  - Business search ("best plumber near me")
  - Recommendation ("recommend a local dentist")
  - Comparison ("compare plumbers in chicago")
  - Informational ("what to look for in a contractor")

### Usage

#### Manual Entry
1. Navigate to a client detail page
2. Click "Add AI Visibility" button
3. Fill in the form:
   - Select AI platform
   - Enter the query you tested
   - Record if/how the business was mentioned
   - Rate visibility, relevance, and prominence scores
   - Add the AI response snippet

#### Automated Tracking (Coming Soon)
Future integration with AI APIs will automate testing of common queries.

### Trend Analysis

The system automatically calculates:
- **Average Visibility Score**: Mean across all mentions in the period
- **Total Mentions**: Count of queries where business appeared
- **Platform Coverage**: Which AI platforms mention the business
- **Growth Trend**: Comparing recent vs previous period
  - 🟢 Growth: +10% or more
  - 🟡 Stable: Within ±10%
  - 🔴 Decline: -10% or more

## 🔍 Search Visibility Tracking

### What It Tracks

Comprehensive monitoring of how your business appears in traditional search results with detailed SERP feature detection.

### Position Metrics

- **Organic Position**: 1-100+ ranking
- **Local Pack Position**: 1-3 within local pack
- **Page Number**: Which SERP page (usually page 1)
- **Is Visible**: Whether visible on first page

### SERP Features Tracked

#### Enhanced Search Features
- ✅ **Featured Snippets**: Position 0 results
- ✅ **Knowledge Panel**: Business information panel
- ✅ **Local Pack**: 3-pack local results
- ✅ **Image Pack**: Image carousel results
- ✅ **Video Results**: Video content in results

#### Google My Business
- **GMB Profile Shown**: Whether GMB profile displayed
- **Photos Count**: Number of business photos shown
- **Reviews Shown**: Number of reviews displayed
- **Posts Shown**: Number of GMB posts visible

#### Rich Results
- **SERP Features Array**: All features present (reviews, hours, phone, directions, menu, etc.)
- **Rich Snippet Type**: reviews, FAQ, how-to, product, recipe, event, etc.
- **Schema Markup Detected**: Whether structured data is working

### Competition Analysis

- **Total Competitors Shown**: Number of competitors in results
- **Competitors Above**: How many competitors rank higher
- **Market Share %**: Estimated visibility share in the market

### Scoring System

#### Overall Visibility Score (0-100)
Composite score based on:
- Position (lower is better)
- SERP features captured
- Organic vs paid presence
- Rich snippet quality

#### SERP Dominance Score (0-100)
Measures how much SERP real estate you own:
- Multiple listings (organic + local pack + knowledge panel)
- Rich features (images, videos, reviews)
- Above-the-fold presence

### Advanced Tracking

#### Search Intent Matching
- **Navigational**: User looking for specific business
- **Informational**: User researching/learning
- **Transactional**: User ready to buy/hire
- **Commercial**: User comparing options

**Intent Match Score (0-100)**: How well your result matches the query intent

#### Device-Specific Tracking
- Desktop rankings
- Mobile rankings
- Tablet rankings

#### Geographic Tracking
- **Search Location**: Where the search was performed
- **Distance from Business**: Miles/km from actual location

### Usage

#### Manual Entry
1. Navigate to a client detail page
2. Click "Add Search Visibility" button
3. Fill in the form:
   - Enter the keyword tested
   - Select search type (local pack, organic, featured snippet, etc.)
   - Record position and device type
   - Check all SERP features present
   - Rate visibility and dominance scores
   - Optionally add screenshot URL

#### Automated Tracking (Integration Ready)
Connect SERP APIs like:
- SerpApi
- BrightLocal
- SEMrush
- Ahrefs

### Trend Analysis

The system automatically calculates:
- **Average Visibility Score**: Mean across all searches
- **Average Position**: Mean ranking position
- **SERP Feature Coverage %**: Percentage of available features captured
- **Local Pack Appearances**: Count of local pack showings
- **Featured Snippets**: Count of featured snippet captures
- **Knowledge Panels**: Count of knowledge panel appearances
- **Growth Trend**: Comparing recent vs previous period

## 📊 Dashboard Views

### GEO Tracking Page (`/dashboard/geo`)

Two new sections have been added:

#### 1. Generative AI Visibility Growth
Table showing all locations with:
- Location name (clickable)
- Client name
- AI visibility score (color-coded)
- Total mentions count
- Trend indicator (growth/stable/decline)
- View details link

**Color Coding**:
- 🟢 70-100: Excellent AI presence
- 🟡 40-69: Moderate AI presence
- 🔴 1-39: Needs improvement
- ⚪ 0: No data yet

#### 2. Search Visibility Growth
Table showing all locations with:
- Location name (clickable)
- Client name
- Search visibility score (color-coded)
- SERP feature coverage (progress bar)
- Combined visibility score (AI + Search)
- Trend indicator
- View details link

### Client Detail Page (`/dashboard/clients/[id]`)

Enhanced with two new sections:

#### Generative AI Visibility Growth Card
- Summary statistics:
  - AI Visibility Score
  - Total Mentions
  - Platforms Tracked
  - Score Change
- Performance badge showing trend
- Platform coverage tags
- Add AI Visibility button

#### Search Visibility Growth Card
- Summary statistics:
  - Overall Visibility Score
  - Average Position
  - SERP Feature Coverage %
  - Score Change
- Performance badge showing trend
- SERP features breakdown (local pack, featured snippets, knowledge panels)
- Visual progress bar for feature coverage
- Add Search Visibility button

## 🗄️ Database Schema

### Table: `generative_ai_visibility`

```sql
CREATE TABLE generative_ai_visibility (
  id UUID PRIMARY KEY,
  location_id UUID REFERENCES locations(id),
  platform TEXT, -- 'chatgpt', 'gemini', 'perplexity', 'claude', 'other'
  query_type TEXT, -- 'business_search', 'recommendation', 'comparison', 'informational'
  search_query TEXT,
  is_mentioned BOOLEAN,
  mention_position INTEGER,
  mention_context TEXT, -- 'primary_recommendation', 'list', 'comparison', 'passing_mention'
  sentiment TEXT, -- 'positive', 'neutral', 'negative'
  snippet TEXT,
  competitors_mentioned TEXT[],
  unique_details_count INTEGER,
  visibility_score DECIMAL(5,2), -- 0-100
  relevance_score DECIMAL(5,2), -- 0-100
  prominence_score DECIMAL(5,2), -- 0-100
  recorded_at TIMESTAMPTZ,
  source TEXT, -- 'manual', 'api', 'automated'
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Table: `search_visibility`

```sql
CREATE TABLE search_visibility (
  id UUID PRIMARY KEY,
  location_id UUID REFERENCES locations(id),
  keyword TEXT,
  search_type TEXT, -- 'local_pack', 'organic', 'featured_snippet', 'people_also_ask', 'knowledge_panel'
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  position INTEGER,
  is_visible BOOLEAN,
  page_number INTEGER,
  has_featured_snippet BOOLEAN,
  has_knowledge_panel BOOLEAN,
  has_local_pack BOOLEAN,
  local_pack_position INTEGER,
  has_image_pack BOOLEAN,
  has_video_result BOOLEAN,
  gmb_shown BOOLEAN,
  gmb_photos_count INTEGER,
  gmb_reviews_shown INTEGER,
  gmb_posts_shown INTEGER,
  serp_features TEXT[],
  rich_snippet_type TEXT,
  schema_markup_detected BOOLEAN,
  total_competitors_shown INTEGER,
  competitors_above INTEGER,
  market_share_pct DECIMAL(5,2),
  overall_visibility_score DECIMAL(5,2), -- 0-100
  serp_dominance_score DECIMAL(5,2), -- 0-100
  search_intent TEXT, -- 'navigational', 'informational', 'transactional', 'commercial'
  intent_match_score DECIMAL(5,2),
  search_location TEXT,
  distance_from_business DECIMAL(8,2),
  recorded_at TIMESTAMPTZ,
  source TEXT, -- 'manual', 'api', 'serpapi', 'brightlocal', 'semrush'
  screenshot_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## 🔧 API Endpoints

### POST `/api/visibility/ai`
Add a new AI visibility metric.

**Request Body**:
```json
{
  "location_id": "uuid",
  "platform": "chatgpt",
  "query_type": "business_search",
  "search_query": "best plumber in chicago",
  "is_mentioned": true,
  "mention_position": 1,
  "mention_context": "primary_recommendation",
  "sentiment": "positive",
  "snippet": "Based on customer reviews...",
  "visibility_score": 85.0,
  "relevance_score": 90.0,
  "prominence_score": 80.0,
  "source": "manual",
  "notes": "Test query on 2024-02-15"
}
```

### POST `/api/visibility/search`
Add a new search visibility metric.

**Request Body**:
```json
{
  "location_id": "uuid",
  "keyword": "plumber chicago",
  "search_type": "local_pack",
  "device_type": "mobile",
  "position": 2,
  "is_visible": true,
  "page_number": 1,
  "has_featured_snippet": false,
  "has_knowledge_panel": true,
  "has_local_pack": true,
  "local_pack_position": 2,
  "has_image_pack": false,
  "has_video_result": false,
  "gmb_shown": true,
  "overall_visibility_score": 78.5,
  "serp_dominance_score": 65.0,
  "search_intent": "commercial",
  "search_location": "Chicago, IL",
  "source": "manual"
}
```

## 📈 Best Practices

### AI Visibility Testing

1. **Test Multiple Platforms**: Different AI platforms have different data sources
2. **Vary Query Types**: Test business search, recommendations, and comparisons
3. **Document Context**: Always save the AI response snippet
4. **Regular Testing**: Test the same queries monthly to track trends
5. **Competitor Awareness**: Note which competitors appear alongside you

### Search Visibility Testing

1. **Multi-Device Testing**: Test on desktop, mobile, and tablet
2. **Location Variations**: Test from different geographic locations
3. **Keyword Diversity**: Track primary, secondary, and long-tail keywords
4. **SERP Feature Audit**: Systematically check for all possible features
5. **Intent Matching**: Ensure your result matches the query intent

### Scoring Guidelines

#### AI Visibility Score
- **90-100**: Primary recommendation with extensive details
- **70-89**: Consistently mentioned with good context
- **50-69**: Mentioned but limited details
- **30-49**: Occasional mentions or poor context
- **0-29**: Rarely mentioned or negative sentiment

#### Search Visibility Score
- **90-100**: Position 1-3 with multiple SERP features
- **70-89**: Position 4-10 with some SERP features
- **50-69**: Position 11-20 or page 1 with basic listing
- **30-49**: Position 21-50 or page 2-5
- **0-29**: Position 50+ or not visible

## 🚀 Future Enhancements

### Planned Features
- Automated AI query testing via APIs
- SERP API integration (SerpApi, BrightLocal)
- Competitor comparison dashboards
- Historical trend charts
- Automated alerts for visibility drops
- PDF report integration
- Client portal visibility views

### Integration Roadmap
- OpenAI API for ChatGPT testing
- Google Gemini API integration
- Perplexity API (when available)
- SerpApi for automated SERP tracking
- BrightLocal for local pack monitoring

## 📝 Migration

To add visibility tracking to your existing database:

```bash
# Run the migration
psql -d your_database < supabase/migrations/20260215_visibility_tracking.sql
```

Or in Supabase dashboard:
1. Go to SQL Editor
2. Create new query
3. Paste contents of `20260215_visibility_tracking.sql`
4. Run query

## 🔐 Security

- Row Level Security (RLS) enabled on both tables
- Agency members can only see their own data
- Clients can only see their own locations
- All writes require authentication
- No public read access

## 💡 Tips

- **Start Simple**: Begin with manual entries to understand the metrics
- **Be Consistent**: Use the same queries each month for trend tracking
- **Document Everything**: Use the notes field liberally
- **Set Baselines**: Record initial scores before optimization efforts
- **Track Changes**: Note when you make website or content changes
- **Monitor Competitors**: Track who appears alongside you
- **Celebrate Wins**: Use the trend indicators to show client progress

---

**Built for the future of search visibility tracking.**
