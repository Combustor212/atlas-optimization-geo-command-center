# GEO Explain v2 - OpenAI Implementation Summary

## Files Modified/Created

### Backend
1. **Created**: `/mgo-scanner-backend/src/lib/openaiClient.ts`
   - OpenAI client singleton with timeout and retry configuration
   - Uses env vars: `OPENAI_API_KEY`, `OPENAI_MODEL` (defaults to gpt-4o-mini)

2. **Modified**: `/mgo-scanner-backend/src/geo/queryEvaluator.ts`
   - Replaced simulated evaluation with real OpenAI structured output calls
   - Uses JSON Schema validation for consistent response format
   - Maintains 24h cache keyed by businessId+query+model+provider
   - Parallel execution with concurrency limit (5)
   - Graceful error handling with fallback response

3. **Modified**: `/mgo-scanner-backend/src/geo/explainJobs.ts`
   - Fixed Map iteration for ES5 compatibility
   - Already configured to output v2 structure with stats + queries array

## Example GEO Explain v2 Payload

```json
{
  "version": "v2",
  "generatedAt": "2026-01-10T00:30:00.000Z",
  "geoScore": 98,
  "percentile": 85,
  "nicheLabel": "Nail Salon",
  "locationLabel": "West Chester, OH",
  "stats": {
    "queriesTested": 12,
    "mentions": 9,
    "top3": 6,
    "avgRankMentioned": 2.8,
    "buckets": {
      "best": {
        "tested": 3,
        "mentions": 3,
        "top3": 2,
        "avgRankMentioned": 2.3
      },
      "near_me": {
        "tested": 3,
        "mentions": 2,
        "top3": 2,
        "avgRankMentioned": 2.0
      },
      "service": {
        "tested": 3,
        "mentions": 2,
        "top3": 1,
        "avgRankMentioned": 3.5
      },
      "trust": {
        "tested": 3,
        "mentions": 2,
        "top3": 1,
        "avgRankMentioned": 3.0
      }
    }
  },
  "queries": [
    {
      "query": "best nail salon near West Chester",
      "bucket": "best",
      "mentioned": true,
      "rank": 2,
      "totalResults": 12,
      "provider": "openai",
      "model": "gpt-4o-mini",
      "reason": "Strong local presence and high review volume drive visibility",
      "citations": [
        { "title": "Google Maps", "domain": "google.com" },
        { "title": "Yelp Reviews", "domain": "yelp.com" }
      ],
      "competitors": [
        { "name": "Elegant Nails Spa", "domain": null, "rank": 1 },
        { "name": "Perfect Ten Nails", "domain": null, "rank": 3 }
      ],
      "confidence": 0.85
    },
    {
      "query": "gel nails West Chester",
      "bucket": "service",
      "mentioned": true,
      "rank": 3,
      "totalResults": 10,
      "provider": "openai",
      "model": "gpt-4o-mini",
      "reason": "Mentioned for service-specific searches due to comprehensive service offerings",
      "citations": [
        { "title": "Website", "domain": "ambiance-nails.com" }
      ],
      "competitors": [
        { "name": "Nail Bar", "domain": null, "rank": 1 }
      ],
      "confidence": 0.78
    },
    {
      "query": "luxury nail spa West Chester",
      "bucket": "trust",
      "mentioned": false,
      "rank": null,
      "totalResults": null,
      "provider": "openai",
      "model": "gpt-4o-mini",
      "reason": "Not positioned as luxury segment; competitors with spa amenities rank higher",
      "citations": null,
      "competitors": null,
      "confidence": 0.65
    }
  ]
}
```

## Cost Estimation Per Scan

**Assumptions**:
- Model: gpt-4o-mini ($0.150/1M input, $0.600/1M output tokens)
- Queries per scan: 12
- Average tokens per query:
  - Input: ~250 tokens (prompt + business context)
  - Output: ~150 tokens (structured JSON response)

**Calculation**:
- Input cost: 12 queries × 250 tokens × $0.150/1M = $0.00045
- Output cost: 12 queries × 150 tokens × $0.600/1M = $0.00108
- **Total per scan: ~$0.0015 (0.15 cents)**

**With caching (24h)**:
- Repeat scans for same business: $0 (cached)
- First scan of the day: $0.0015
- **Monthly cost for 1,000 unique businesses**: ~$1.50

## OpenAI Structured Output Schema

```typescript
{
  type: "object",
  properties: {
    rank: { type: ["number", "null"] },
    totalResults: { type: ["number", "null"] },
    mentioned: { type: "boolean" },
    reason: { type: "string" },
    citations: {
      type: ["array", "null"],
      items: {
        type: "object",
        properties: {
          title: { type: ["string", "null"] },
          domain: { type: ["string", "null"] }
        }
      }
    },
    competitors: {
      type: ["array", "null"],
      items: {
        type: "object",
        properties: {
          name: { type: ["string", "null"] },
          domain: { type: ["string", "null"] },
          rank: { type: ["number", "null"] }
        }
      }
    },
    confidence: { type: ["number", "null"] }
  },
  required: ["rank", "totalResults", "mentioned", "reason", "citations", "competitors", "confidence"],
  additionalProperties: false
}
```

## Environment Setup

Add to `.env`:
```bash
OPENAI_API_KEY=sk-proj-...your-key-here
OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
```

## Prompting Strategy

**System Prompt**:
- Positions model as "AI search recommendation evaluator"
- Emphasizes deterministic, profile-based evaluation
- Explicitly avoids claiming real-world search access
- Frames as "based on business profile quality and query intent matching"

**User Prompt**:
- Provides business name, location, category
- States query to evaluate
- Lists evaluation criteria (query intent match, location relevance, service specificity, trust signals)
- Requests structured output with specific fields

**Temperature**: 0.1 (low for consistency)
**Max tokens**: 500 (adequate for structured response)

## Verification Checklist

- [x] OpenAI client module created
- [x] Query evaluator updated with real API calls
- [x] Structured output schema defined
- [x] Error handling with fallback
- [x] Cache implementation (24h TTL)
- [x] Concurrency limiting (5 parallel)
- [x] Map iteration fixed for ES5
- [ ] **PENDING**: Environment variable OPENAI_API_KEY must be set
- [ ] **PENDING**: Run actual scan to verify end-to-end
- [ ] **PENDING**: Confirm frontend displays real data

## Known Issues / Pre-existing Errors

The following TypeScript errors existed before this implementation and are unrelated to GEO v2:
- `geoEngine.ts`: QueryBucket type mismatch between geoSchema and queryGenerator
- `scanJob.ts`, `queueService.ts`: MEO-related errors
- `authMiddleware.ts`, `billingMiddleware.ts`: Schema/enum mismatches

These do not block GEO v2 functionality but should be addressed separately.

## Next Steps

1. Set `OPENAI_API_KEY` in `.env`
2. Restart backend server
3. Run a free scan via UI
4. Verify backend logs show OpenAI API calls
5. Check scan results page shows populated GEO explain data
6. Monitor costs and adjust concurrency/caching as needed


