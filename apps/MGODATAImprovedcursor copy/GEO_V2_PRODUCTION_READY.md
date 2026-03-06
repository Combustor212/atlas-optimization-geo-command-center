# GEO Explain v2 - Production-Ready Implementation

## Overview
GEO Explain v2 is now production-ready with 20 queries per scan, Redis-backed caching for scalability, and maintained retry logic (2 retries with exponential backoff).

## Files Modified

### Backend - Query Generation
**File**: `/mgo-scanner-backend/src/geo/queryGenerator.ts`
- Increased query count from ~12 to **20 queries**
- Distribution: 5 queries per intent bucket
  - **Best/Top Intent** (5 queries): "best X near Y", "top X in Y", "top rated X Y", "find best X Y", "number one X near Y"
  - **Near Me/Location** (5 queries): "X near me in Y", "X close to Y", "X in Y", "X nearby Y", "local X Y"
  - **Service-Specific** (5 queries): Category-specific queries (e.g., "gel nails", "manicure", "acrylic nails" for nail salons)
  - **Trust/Quality** (5 queries): "highly rated X", "best reviewed X", "trusted X", "recommended X", "reliable X"

### Backend - Redis Cache
**File**: `/mgo-scanner-backend/src/lib/redisClient.ts` (NEW)
- Redis client singleton using ioredis
- 24h TTL on all cached queries
- Graceful fallback: if Redis unavailable, system continues without cache (no crash)
- Connection retry strategy: 3 attempts with exponential backoff
- Proper cleanup on SIGTERM

**File**: `/mgo-scanner-backend/src/geo/queryEvaluator.ts`
- Replaced in-memory Map cache with Redis
- Cache key format: `geo:query:{businessId}:{query}:{provider}:{model}`
- Async cache operations (get/set)
- Logs indicate cache availability status

### Dependencies
**File**: `/mgo-scanner-backend/package.json`
- Added: `ioredis` (Redis client)

## Configuration

### Required Environment Variables
```bash
# OpenAI (required for GEO explain)
OPENAI_API_KEY=sk-proj-...

# OpenAI Model (optional, defaults to gpt-4o-mini)
OPENAI_MODEL=gpt-4o-mini

# Redis (optional, defaults to localhost:6379)
REDIS_URL=redis://localhost:6379
# Or for production:
# REDIS_URL=redis://username:password@hostname:port
```

### Redis Setup

#### Local Development
```bash
# Install Redis
brew install redis  # macOS
# or
sudo apt-get install redis-server  # Linux

# Start Redis
redis-server
# Or as background service:
brew services start redis  # macOS
sudo systemctl start redis  # Linux
```

#### Production
- Use managed Redis service (AWS ElastiCache, Redis Labs, Upstash, etc.)
- Set `REDIS_URL` environment variable
- Ensure firewall allows backend → Redis connection

## System Behavior

### Query Execution
- **Total queries per scan**: 20
- **Concurrency limit**: 5 (configurable in evaluateQueries function)
- **Retry logic**: 2 retries with exponential backoff (OpenAI SDK default)
- **Timeout**: 30 seconds per OpenAI call

### Caching
- **Storage**: Redis (persistent across server restarts)
- **TTL**: 24 hours
- **Key format**: `geo:query:{businessId}:{query}:{provider}:{model}`
- **Fallback**: System works without cache if Redis unavailable

### Cost Per Scan
- **Model**: gpt-4o-mini ($0.150/1M input, $0.600/1M output tokens)
- **Queries**: 20
- **Tokens per query**: ~250 input, ~150 output
- **Cost**: ~$0.0025 per scan (0.25 cents)
- **With caching**: Repeat scans = $0 (until 24h TTL expires)

**Monthly estimate**:
- 1,000 unique businesses: ~$2.50/month
- 10,000 unique businesses: ~$25/month

## Verification

### Backend Logs to Watch For
```
[Redis] Connected successfully
[OpenAI Client] Initialized { model: 'gpt-4o-mini', hasApiKey: true }
[GEO Explain Jobs] Generated queries { jobId: '...', count: 20 }
[GEO Evaluator] Redis cache hit { query: 'best nail salon...', businessId: '...' }
[GEO Evaluator] OpenAI evaluation complete { query: '...', mentioned: true, rank: 2, tokens: 400, cached: true }
[GEO Explain Jobs] Query evaluation complete { jobId: '...', stats: { tested: 20, mentions: 15, top3: 10 } }
```

### Frontend Verification
1. Navigate to scan results page
2. GEO panel shows:
   - Summary strip: "Queries tested: 20", "Mentions: X", "Top 3: Y", "Avg rank: Z"
   - Intent breakdown table: 4 rows (best, near_me, service, trust) with 5 tested per bucket
   - Queries evaluated table: 20 rows with expand/collapse

### Test Caching
```bash
# In Redis CLI
redis-cli
> KEYS geo:query:*
> TTL geo:query:{some-key}  # Should show ~86400 seconds (24h)
> GET geo:query:{some-key}  # Should show JSON query result
```

## Production Checklist

- [ ] Set `OPENAI_API_KEY` in production environment
- [ ] Set `REDIS_URL` to production Redis instance
- [ ] Verify Redis connection from backend server
- [ ] Test one scan end-to-end
- [ ] Monitor OpenAI costs in dashboard
- [ ] Monitor Redis memory usage
- [ ] Set up alerts for Redis connection failures
- [ ] Configure Redis persistence (RDB/AOF) for durability

## Troubleshooting

### "Redis connection failed, running without cache"
- **Effect**: System continues, but no caching (every query hits OpenAI)
- **Fix**: Verify REDIS_URL, check Redis server is running, check network/firewall

### "OpenAI evaluation failed"
- **Effect**: Query returns fallback response (mentioned: false, reason: "Evaluation unavailable")
- **Fix**: Verify OPENAI_API_KEY, check OpenAI API status, monitor rate limits

### High OpenAI costs
- **Check**: Are queries being cached? Look for "Redis cache hit" logs
- **Check**: Is Redis key TTL set correctly? (should be 86400 seconds)
- **Fix**: Ensure Redis is connected and working

## Architecture Diagram

```
┌─────────────┐
│ Scan Request│
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ GEO Explain Job     │
│ (explainJobs.ts)    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Query Generator     │
│ Generates 20 queries│
│ (4 buckets × 5)     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Query Evaluator     │
│ Parallel execution  │
│ (concurrency: 5)    │
└──────┬──────────────┘
       │
       ├───────► Redis Cache ◄────┐
       │         (24h TTL)         │
       │                           │
       ▼                    Cache Hit
┌─────────────────────┐            │
│ OpenAI API Call     │────────────┘
│ (gpt-4o-mini)       │   Cache Miss
│ Structured Output   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Calculate Stats     │
│ - queriesTested: 20 │
│ - mentions          │
│ - top3              │
│ - avgRankMentioned  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Return v2 Payload   │
│ {version, stats,    │
│  queries[20]}       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Frontend Panel      │
│ - Summary strip     │
│ - Intent table      │
│ - Query rows (20)   │
└─────────────────────┘
```

## Performance Characteristics

- **First scan (cold cache)**: ~8-12 seconds (20 queries ÷ 5 concurrency × ~2s per call)
- **Repeat scan (warm cache)**: ~100-200ms (Redis lookups only)
- **Memory**: Minimal (cache in Redis, not in Node process)
- **Scalability**: Horizontal scaling supported (all state in Redis)

## Next Considerations (Future)

- [ ] Implement Redis Cluster for high availability
- [ ] Add query result analytics (track most common queries, mention rates)
- [ ] A/B test different query phrasings for better coverage
- [ ] Add webhook for async explain job completion
- [ ] Implement query result versioning for schema changes


