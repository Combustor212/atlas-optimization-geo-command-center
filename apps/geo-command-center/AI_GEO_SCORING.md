# AI-Powered GEO Scoring System

## Overview

The GEO Command Center now includes an advanced AI-powered scoring system that uses OpenAI's GPT-4 to provide comprehensive, accurate assessments of local search performance.

## Features

### 🎯 Comprehensive Scoring (0-100)

The AI analyzes multiple factors to calculate an overall GEO score:

- **Ranking Score** (40 points): Map pack and organic search positions
- **Profile Score** (30 points): Reviews, ratings, and profile completeness
- **Competitive Score** (20 points): Performance vs. competitors
- **Local Signals** (10 points): Photos, website, verification, response rate

### 📊 Letter Grades

- **A+**: 95-100 (Exceptional performance)
- **A**: 90-94 (Excellent performance)
- **B+**: 85-89 (Very good performance)
- **B**: 80-84 (Good performance)
- **C+**: 70-79 (Average performance)
- **C**: 60-69 (Below average)
- **D**: 50-59 (Poor performance)
- **F**: 0-49 (Critical issues)

### 📈 Trend Analysis

Tracks performance over time:
- **Improving**: Rankings are getting better
- **Stable**: Consistent performance
- **Declining**: Rankings are dropping
- **Unknown**: Insufficient historical data

### 🔍 SWOT Analysis

AI-generated analysis covering:
- **Strengths**: What you're doing well
- **Weaknesses**: Areas needing improvement
- **Opportunities**: Quick wins and growth potential
- **Threats**: Competitive risks

### 💡 Smart Recommendations

Prioritized, actionable recommendations:
- **Priority Level**: High, Medium, or Low
- **Effort Required**: Easy, Moderate, or Difficult
- **Expected Impact**: Clear outcome descriptions
- **Implementation Steps**: Specific actions to take

### 🎓 AI Confidence Score

The system provides a confidence rating (0-100%) based on:
- Data completeness
- Historical data availability
- Competitive context
- Signal quality

## How It Works

### Data Collection

The system gathers:
1. **Ranking Data**: Current and historical map pack/organic positions
2. **Google Business Profile**: Ratings, reviews, photos, website
3. **Competitive Intelligence**: Top competitor metrics
4. **Local Signals**: Verification status, response rates, completeness

### AI Analysis

GPT-4 analyzes the data considering:
- Local SEO best practices
- Industry benchmarks
- Competitive landscape
- Ranking algorithms
- User behavior patterns

### Score Calculation

1. **Base Scoring**: Algorithmic calculation of 4 score components
2. **AI Enhancement**: GPT-4 analyzes context and generates insights
3. **SWOT Generation**: Comprehensive strategic analysis
4. **Recommendations**: Prioritized action items with effort/impact ratings

## Using the System

### From the GEO Tracking Page

1. Navigate to **Dashboard → GEO Tracking**
2. Find the location you want to analyze
3. Click the **"AI Score"** button (purple, with sparkles icon)
4. Wait 5-10 seconds for AI analysis
5. Review the comprehensive report

### From the Client Detail Page

1. Navigate to **Dashboard → Clients** → Select a client
2. Find the location in the Locations table
3. Click the **"AI Score"** button
4. Review the analysis

### Interpreting Results

#### Score Breakdown
- Review each of the 4 score components
- Identify which areas need the most attention
- Focus on low-scoring components first

#### SWOT Analysis
- Use Strengths to build on what's working
- Address Weaknesses systematically
- Pursue Opportunities for quick wins
- Monitor and mitigate Threats

#### Recommendations
- Start with HIGH priority items
- Focus on EASY efforts for quick wins
- Schedule DIFFICULT tasks for later
- Track implementation progress

## Technical Details

### API Endpoints

#### Calculate GEO Score
```
POST /api/geo/calculate-score
Body: { locationId: string }
```

Returns comprehensive score data including:
- Overall score and grade
- Score breakdown
- SWOT analysis
- Recommendations
- Confidence rating

### Database Schema

#### `geo_scores` Table

Stores historical score data:
```sql
- id: UUID
- location_id: UUID (references locations)
- overall_score: INTEGER (0-100)
- grade: VARCHAR (A+, A, B+, etc.)
- trend: VARCHAR (improving, stable, declining, unknown)
- confidence: INTEGER (0-100)
- ranking_score: INTEGER
- profile_score: INTEGER
- competitive_score: INTEGER
- signals_score: INTEGER
- strengths: JSONB
- weaknesses: JSONB
- opportunities: JSONB
- threats: JSONB
- recommendations: JSONB
- factors: JSONB
- calculated_at: TIMESTAMPTZ
```

### Environment Variables

```bash
# Required for AI scoring
OPENAI_API_KEY=sk-proj-...

# Required for data gathering
GOOGLE_PLACES_API_KEY=AIza...
```

## Scoring Factors

### Ranking Score (0-40 points)

**Map Pack Position** (Most Important)
- Position #1: 30 points
- Position #2: 25 points
- Position #3: 20 points
- Position #4-5: 15 points
- Position #6-10: 10 points
- Position #11-20: 5 points

**Organic Position** (Supplementary)
- Top 3: +10 points
- Top 10: +5 points
- Top 20: +2 points

### Profile Score (0-30 points)

**Rating Quality** (0-15 points)
- Calculated as: (rating / 5) × 15
- Example: 4.5 rating = 13.5 points

**Review Volume** (0-15 points)
- Logarithmic scale: min(15, log10(reviews + 1) × 5)
- 10 reviews: ~5 points
- 50 reviews: ~8.5 points
- 100 reviews: ~10 points
- 500+ reviews: ~13.5+ points

### Competitive Score (0-20 points)

**Baseline**: 10 points

**Rating Comparison**
- Better than top competitor: +5 points
- Worse than top competitor: -5 points

**Review Volume Comparison**
- More reviews than competitor: +5 points
- Fewer reviews than competitor: -5 points

### Signals Score (0-10 points)

- Has business photos: +2 points
- Has website: +2 points
- Verified business: +3 points
- Response rate >90%: +2 points
- Response rate >50%: +1 point

## Best Practices

### Frequency
- Run initial score for all locations
- Re-run monthly to track progress
- Re-run after major optimizations
- Monitor trends over time

### Action Planning
1. **Immediate** (Week 1): High priority, easy tasks
2. **Short-term** (Month 1): High priority, moderate tasks
3. **Medium-term** (Quarter 1): Medium priority tasks
4. **Long-term** (Ongoing): Low priority and difficult tasks

### Optimization Strategy
1. Fix critical weaknesses first
2. Defend against threats
3. Build on existing strengths
4. Pursue high-impact opportunities
5. Maintain consistent improvement

## Troubleshooting

### "OpenAI API error"
- Check that `OPENAI_API_KEY` is set correctly
- Verify API key has credits/quota available
- Check OpenAI service status

### "Location not found"
- Ensure location exists and belongs to your agency
- Check location ID is correct

### Low Confidence Score
- Add more data points (rankings, reviews)
- Track rankings over time
- Ensure Google Business Profile is complete

### No Competitive Data
- Track rankings for same keywords
- Ensure competitors are in the system
- Use Google Places API to gather competitor info

## Cost Considerations

### OpenAI API Usage
- ~2,000 tokens per score calculation
- Approximately $0.02-0.03 per analysis
- Batch processing recommended for multiple locations

### Optimization Tips
- Cache scores for 24 hours
- Batch similar location analyses
- Use fallback rules if AI quota exceeded

## Future Enhancements

Planned features:
- [ ] Automated monthly score reports
- [ ] Score trend charts
- [ ] Competitor tracking integration
- [ ] Automated recommendations tracking
- [ ] Multi-location comparisons
- [ ] Industry benchmark comparisons
- [ ] Predictive score forecasting
- [ ] Integration with task management

## Support

For issues or questions:
1. Check terminal logs for error details
2. Verify environment variables are set
3. Check API quota/credits
4. Review database migrations
5. Consult OpenAI documentation

## API Documentation

### OpenAI Model Used
- **Model**: gpt-4o
- **Temperature**: 0.7 (balanced creativity/consistency)
- **Max Tokens**: 2000
- **Response Format**: JSON

### Rate Limits
- OpenAI API: 500 requests/min (tier dependent)
- Recommended: Implement caching and rate limiting

## Version History

### v1.0.0 (February 2026)
- Initial release
- GPT-4 powered analysis
- SWOT analysis
- Prioritized recommendations
- Historical score tracking
- Database persistence
