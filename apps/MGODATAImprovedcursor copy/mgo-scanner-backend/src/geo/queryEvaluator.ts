/**
 * GEO Query Evaluator
 * Evaluates queries against AI sources with parallel execution and Redis caching
 */

import { logger } from '../lib/logger';
import { openaiClient, OPENAI_GEO_MODEL } from '../lib/openaiClient';
import { geoQueryCache } from '../lib/redisClient';
import type { QueryBucket } from './queryGenerator';

export interface GEOQueryResult {
  query: string;
  bucket: QueryBucket;
  mentioned: boolean;
  rank: number | null;
  totalResults: number | null;
  provider: string | null;
  model: string | null;
  reason: string | null;
  citations: Array<{ title?: string; domain?: string }> | null;
  // NOTE: competitors field removed - AI was generating fake business names
  // Real competitor data comes from Google Places API with placeIds in top-level response
  // competitors: Array<{ name?: string; domain?: string; rank?: number }> | null;
  confidence: number | null;
}

export interface GEOExplainStats {
  queriesTested: number;
  mentions: number;
  top3: number;
  avgRankMentioned: number | null;
  buckets: Record<QueryBucket, {
    tested: number;
    mentions: number;
    top3: number;
    avgRankMentioned: number | null;
  }>;
}

/**
 * Generate cache key for Redis
 */
function getCacheKey(businessId: string, query: string, provider: string, model: string): string {
  return `geo:query:${businessId}:${query}:${provider}:${model}`;
}

/**
 * OpenAI structured output schema for GEO query evaluation
 */
const GEO_EVALUATION_SCHEMA = {
  type: "object",
  properties: {
    rank: {
      type: ["number", "null"],
      description: "Ranked position (1-10) if business would appear in AI recommendations, null if not mentioned"
    },
    totalResults: {
      type: ["number", "null"],
      description: "Total number of businesses in hypothetical recommendation list"
    },
    mentioned: {
      type: "boolean",
      description: "Whether the business would be recommended for this query"
    },
    reason: {
      type: "string",
      description: "One sentence explaining why business is/isn't recommended"
    },
    citations: {
      type: ["array", "null"],
      items: {
        type: "object",
        properties: {
          title: { type: ["string", "null"] },
          domain: { type: ["string", "null"] }
        },
        required: ["title", "domain"],
        additionalProperties: false
      },
      description: "Up to 3 data sources that would influence this recommendation"
    },
    confidence: {
      type: ["number", "null"],
      description: "Confidence score 0-1 for this evaluation"
    }
  },
  required: ["rank", "totalResults", "mentioned", "reason", "citations", "confidence"],
  additionalProperties: false
};

/**
 * Evaluate a single query using OpenAI (with caching)
 */
async function evaluateQuery(
  query: string,
  bucket: QueryBucket,
  businessName: string,
  businessId: string,
  locationLabel: string
): Promise<GEOQueryResult> {
  const provider = 'openai';
  const model = OPENAI_GEO_MODEL;
  const cacheKey = getCacheKey(businessId, query, provider, model);
  
  // Check Redis cache
  const cached = await geoQueryCache.get<GEOQueryResult>(cacheKey);
  if (cached) {
    logger.info('[GEO Evaluator] Redis cache hit', { query: query.substring(0, 50), businessId });
    return cached;
  }
  
  try {
    // Build evaluation prompt
    const systemPrompt = `You are an AI search recommendation system evaluator. Your job is to determine if a business would appear in AI-powered search recommendations for a given query.

CRITICAL RULES:
- Base recommendations on business profile quality, relevance to query intent, and typical ranking factors (reviews, authority, proximity, service match)
- Provide deterministic, consistent rankings based on the business profile provided
- DO NOT claim to access real-world search engines or live data
- Frame answers as "based on business profile quality and query intent matching"
- If business profile is strong and matches query: rank 1-5
- If moderate match: rank 6-10
- If weak/no match: mentioned=false, rank=null`;

    const userPrompt = `BUSINESS PROFILE:
Name: ${businessName}
Location: ${locationLabel}
Category: ${bucket}

QUERY TO EVALUATE:
"${query}"

TASK:
Evaluate whether this business would be recommended by an AI assistant for this query. Consider:
- Query intent match (does business type match what user is looking for?)
- Location relevance (if query mentions location)
- Service specificity (if query asks for specific service)
- Trust signals (assume business has moderate online presence)

Provide structured evaluation including:
- rank (1-10 if would recommend, null if not)
- totalResults (how many businesses might be recommended total, typically 5-15)
- mentioned (true/false)
- reason (one sentence why/why not)
- citations (up to 3 data sources like "Google Maps", "Yelp", "Website" - or null if not applicable)
- competitors (up to 3 hypothetical competing businesses - or null)
- confidence (0-1 score)`;

    const completion = await openaiClient.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'geo_evaluation',
          strict: true,
          schema: GEO_EVALUATION_SCHEMA
        }
      },
      temperature: 0.1,
      max_tokens: 500
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('Empty response from OpenAI');
    }

    const evaluation = JSON.parse(responseText);

    const result: GEOQueryResult = {
      query,
      bucket,
      mentioned: evaluation.mentioned,
      rank: evaluation.rank,
      totalResults: evaluation.totalResults,
      provider,
      model,
      reason: evaluation.reason,
      citations: evaluation.citations,
      // competitors field removed - no longer generated by AI to prevent fake business names
      confidence: evaluation.confidence
    };

    // Cache in Redis for 24 hours
    await geoQueryCache.set(cacheKey, result);

    logger.info('[GEO Evaluator] OpenAI evaluation complete', {
      query: query.substring(0, 50),
      businessId,
      mentioned: result.mentioned,
      rank: result.rank,
      tokens: completion.usage?.total_tokens,
      cached: geoQueryCache.isAvailable()
    });

    return result;

  } catch (error: any) {
    logger.error('[GEO Evaluator] OpenAI evaluation failed', {
      query,
      businessId,
      error: error.message
    });

    // Return conservative fallback on error
    return {
      query,
      bucket,
      mentioned: false,
      rank: null,
      totalResults: null,
      provider,
      model,
      reason: 'Evaluation unavailable due to API error',
      citations: null,
      // competitors field removed
      confidence: 0.0
    };
  }
}

/**
 * Evaluate multiple queries in parallel with concurrency limit
 */
export async function evaluateQueries(
  queries: Array<{ query: string; bucket: QueryBucket }>,
  businessName: string,
  businessId: string,
  locationLabel: string,
  concurrency: number = 5
): Promise<GEOQueryResult[]> {
  const results: GEOQueryResult[] = [];
  
  // Process queries in batches
  for (let i = 0; i < queries.length; i += concurrency) {
    const batch = queries.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(q => evaluateQuery(q.query, q.bucket, businessName, businessId, locationLabel))
    );
    results.push(...batchResults);
    
    logger.info('[GEO Evaluator] Batch completed', {
      batch: Math.floor(i / concurrency) + 1,
      total: Math.ceil(queries.length / concurrency)
    });
  }
  
  return results;
}

/**
 * Calculate summary statistics from query results
 */
export function calculateStats(results: GEOQueryResult[]): GEOExplainStats {
  const mentions = results.filter(r => r.mentioned).length;
  const top3 = results.filter(r => r.rank && r.rank <= 3).length;
  
  const mentionedRanks = results
    .filter(r => r.mentioned && r.rank !== null)
    .map(r => r.rank as number);
  
  const avgRankMentioned = mentionedRanks.length > 0
    ? mentionedRanks.reduce((sum, rank) => sum + rank, 0) / mentionedRanks.length
    : null;
  
  // Calculate per-bucket stats
  const buckets: Record<QueryBucket, any> = {
    best: { tested: 0, mentions: 0, top3: 0, avgRankMentioned: null },
    near_me: { tested: 0, mentions: 0, top3: 0, avgRankMentioned: null },
    service: { tested: 0, mentions: 0, top3: 0, avgRankMentioned: null },
    trust: { tested: 0, mentions: 0, top3: 0, avgRankMentioned: null }
  };
  
  for (const result of results) {
    const bucket = buckets[result.bucket];
    bucket.tested++;
    if (result.mentioned) bucket.mentions++;
    if (result.rank && result.rank <= 3) bucket.top3++;
  }
  
  // Calculate avg rank per bucket
  for (const bucketKey of Object.keys(buckets) as QueryBucket[]) {
    const bucketResults = results.filter(r => r.bucket === bucketKey);
    const bucketRanks = bucketResults
      .filter(r => r.mentioned && r.rank !== null)
      .map(r => r.rank as number);
    
    if (bucketRanks.length > 0) {
      buckets[bucketKey].avgRankMentioned = 
        bucketRanks.reduce((sum, rank) => sum + rank, 0) / bucketRanks.length;
    }
  }
  
  return {
    queriesTested: results.length,
    mentions,
    top3,
    avgRankMentioned,
    buckets
  };
}

