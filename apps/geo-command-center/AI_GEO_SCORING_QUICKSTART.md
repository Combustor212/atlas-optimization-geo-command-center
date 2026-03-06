# AI GEO Scoring - Quick Start Guide

## Setup (5 minutes)

### 1. Environment Variables
Your OpenAI API key has already been added to `.env.local`:
```bash
OPENAI_API_KEY=your-openai-api-key-here
```

### 2. Database Migration
Run the migration to create the `geo_scores` table:
```bash
# If you have Supabase CLI
supabase db push

# Or run the SQL directly in Supabase dashboard:
# Go to SQL Editor and run: supabase/migrations/20260214_geo_scores.sql
```

### 3. Start Development Server
The server is already running at http://localhost:3000

## Using AI GEO Scoring

### Option 1: From GEO Tracking Page
1. Go to **Dashboard → GEO Tracking**
2. Find any location in the table
3. Click the purple **"AI Score"** button (with sparkles ✨ icon)
4. Wait 5-10 seconds for AI analysis
5. View your comprehensive score report!

### Option 2: From Client Detail Page
1. Go to **Dashboard → Clients**
2. Click on any client
3. Find a location in the Locations table
4. Click the purple **"AI Score"** button
5. View the analysis

## What You'll See

### 1. Overall Score
- **Number**: 0-100 score
- **Grade**: A+ through F
- **Trend**: Improving/Stable/Declining
- **Confidence**: How confident the AI is (0-100%)

### 2. Score Breakdown
Four key components:
- **Rankings** (40 pts): Map pack & organic positions
- **Profile** (30 pts): Reviews, ratings, completeness  
- **Competitive** (20 pts): Performance vs competitors
- **Signals** (10 pts): Photos, website, verification

### 3. SWOT Analysis
- 💪 **Strengths**: What you're doing great
- ⚠️ **Weaknesses**: What needs work
- 🎯 **Opportunities**: Quick wins available
- 🚨 **Threats**: Competitive risks

### 4. AI Recommendations
Prioritized action items with:
- Priority level (High/Medium/Low)
- Effort required (Easy/Moderate/Difficult)
- Expected impact
- Specific actions to take

## First Steps

### For New Locations (No Rankings Yet)
1. First, track a ranking using the **Auto-Track** button
2. Then generate the AI score
3. The AI will provide recommendations to get started

### For Existing Locations
1. Generate the AI score immediately
2. Review the SWOT analysis
3. Start with HIGH priority, EASY recommendations
4. Track progress monthly

## Example Workflow

### Week 1: Initial Assessment
```
1. Generate AI score for all locations
2. Review strengths and weaknesses
3. Create action plan from recommendations
4. Focus on HIGH priority items
```

### Week 2-4: Quick Wins
```
1. Implement EASY recommendations
2. Address critical weaknesses
3. Add photos, optimize profile, etc.
```

### Month 2: Track Progress
```
1. Regenerate AI scores
2. Compare to previous scores
3. Monitor trend indicators
4. Adjust strategy based on results
```

### Ongoing: Monthly Reviews
```
1. Generate monthly score reports
2. Track improvements over time
3. Refine optimization strategy
4. Pursue medium/long-term opportunities
```

## Tips for Best Results

### 1. Ensure Complete Data
- Track rankings regularly
- Keep Google Business Profile updated
- Monitor competitor activity
- Add all location details

### 2. Take Action on Recommendations
- Start with HIGH priority items
- Focus on EASY efforts first
- Track what you implement
- Re-score after changes

### 3. Monitor Trends
- Score locations monthly
- Watch for declining trends
- Address issues quickly
- Celebrate improvements

### 4. Use Competitive Intelligence
- Compare scores across locations
- Identify best performers
- Replicate successful strategies
- Learn from low scorers

## Common Patterns

### High Score (90+)
✅ Strong map pack ranking (top 3)
✅ Excellent reviews (4.5+, 50+ reviews)
✅ Complete profile with photos
✅ Better than competitors

**Action**: Maintain and defend position

### Good Score (80-89)
✅ Decent ranking (top 5-7)
✅ Good reviews (4.0+, 20+ reviews)
⚠️ Missing some signals

**Action**: Close gaps, optimize signals

### Average Score (60-79)
⚠️ Weak ranking (8-15)
⚠️ Fewer reviews than competitors
⚠️ Incomplete profile

**Action**: Focus on review generation and profile completion

### Poor Score (Below 60)
🚨 Not ranking in map pack
🚨 Low ratings or few reviews
🚨 Missing critical signals

**Action**: Implement immediate improvements from recommendations

## Troubleshooting

### "Analyzing with AI..." takes too long
- Normal analysis takes 5-10 seconds
- If >30 seconds, check internet connection
- Check OpenAI API status

### Error messages
- **"Unauthorized"**: Login again
- **"Location not found"**: Check location exists
- **"OpenAI API error"**: Check API key and credits

### Low confidence score
- Add more ranking data
- Track rankings over time
- Complete Google Business Profile
- Add competitive data

## Next Steps

1. **Generate your first score** right now!
2. Review the comprehensive documentation: `AI_GEO_SCORING.md`
3. Set up monthly score tracking
4. Implement AI recommendations
5. Monitor improvements

## Need Help?

- Full documentation: See `AI_GEO_SCORING.md`
- Check terminal logs for errors
- Verify environment variables
- Review OpenAI API quota

---

**Ready to get started? Go to Dashboard → GEO Tracking and click that purple AI Score button!** ✨
