/**
 * GEO Ranking Engine (OpenAI-driven with audit)
 * Ranks businesses for local queries using closed-world candidate data
 */

import { openai } from '../lib/openai';
import { logger } from '../lib/logger';
import type { GEOCandidate, GEOQuery, QueryRankResult, RankEntry } from './geoSchema';

/**
 * Rank candidates for a single query
 * Uses OpenAI with strict constraints (closed-world, no hallucination)
 */
export async function rankCandidatesForQuery(
  query: GEOQuery,
  candidates: GEOCandidate[]
): Promise<QueryRankResult> {
  // Build candidate table (compact JSON)
  const candidateTable = candidates.map((c, idx) => ({
    id: idx + 1,
    placeId: c.placeId,
    name: c.name,
    distanceMeters: c.distanceMeters,
    rating: c.rating,
    reviewCount: c.reviewCount,
    photoCount: c.photoCount,
    hasWebsite: c.hasWebsite,
    hasPhone: c.hasPhone,
    hasHours: c.hasHours,
    types: c.types.slice(0, 3), // Top 3 types only
    topReviewKeywords: c.topReviewKeywords?.slice(0, 5) || [],
    attributes: c.attributes?.slice(0, 5) || []
  }));

  const prompt = `You are ranking businesses ONLY from the provided dataset. Do NOT use outside knowledge or assume any data not provided.

Query: "${query.query}"

Candidate businesses (closed world):
${JSON.stringify(candidateTable, null, 2)}

Rank the TOP 5 businesses for this query based ONLY on the data provided.

Return JSON:
{
  "top5": [
    {
      "placeId": "...",
      "rank": 1,
      "reasons": ["High rating (4.8★)", "Most reviews (234)", "Close proximity"],
      "weaknesses": ["Lower photo count than competitors"]
    },
    ...
  ],
  "confidence": 0.85,
  "missingDataFlags": ["photos_missing_for_some", "review_keywords_unavailable"]
}

Rules:
- Only include businesses from the candidate list
- Rank 1-5 (1 = best match for query)
- Confidence 0-1 (reduce if key data missing)
- If critical data missing, flag it in missingDataFlags`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a local business ranking AI. Rank businesses for queries based ONLY on provided data. No hallucinations. Return valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2, // Low temp for deterministic ranking
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content) as {
      top5: RankEntry[];
      confidence: number;
      missingDataFlags: string[];
    };

    // Run audit pass
    const auditResult = await auditRanking(query.query, candidateTable, parsed.top5);

    return {
      query: query.query,
      bucket: query.bucket,
      weight: query.weight,
      targetRank: null,
      targetInTop5: false,
      top5: parsed.top5,
      confidence: parsed.confidence,
      missingDataFlags: parsed.missingDataFlags || [],
      auditPassed: auditResult.passed,
      auditNotes: auditResult.notes,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    logger.error('[GEO Ranking] Failed', { query: query.query, error: error.message });
    // Return empty result on error
    return {
      query: query.query,
      bucket: query.bucket,
      weight: query.weight,
      targetRank: null,
      targetInTop5: false,
      top5: [],
      confidence: 0,
      missingDataFlags: ['ranking_failed'],
      auditPassed: false,
      auditNotes: `Ranking failed: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Audit ranking for consistency
 * Checks if ranking logic makes sense given the data
 */
async function auditRanking(
  query: string,
  candidates: any[],
  ranking: RankEntry[]
): Promise<{ passed: boolean; notes?: string }> {
  // Simple audit: check if top-ranked business has supporting data
  if (ranking.length === 0) {
    return { passed: false, notes: 'No rankings returned' };
  }

  const topRanked = ranking[0];
  const topCandidate = candidates.find((c) => c.placeId === topRanked.placeId);

  if (!topCandidate) {
    return { passed: false, notes: 'Top ranked business not in candidate list' };
  }

  // Check if top-ranked has reasonable signals (rating, reviews)
  if (topCandidate.rating < 3.0 && topCandidate.reviewCount < 5) {
    return { passed: false, notes: 'Top ranked business has weak signals (low rating + few reviews)' };
  }

  // More sophisticated audit could use OpenAI to verify consistency
  // For now, basic checks pass
  return { passed: true };
}

/**
 * Rank candidates for all queries (in parallel batches)
 */
export async function rankCandidatesForAllQueries(
  queries: GEOQuery[],
  candidates: GEOCandidate[],
  opts: { batchSize?: number } = {}
): Promise<QueryRankResult[]> {
  const batchSize = opts.batchSize ?? 10; // Process 10 queries at a time
  const results: QueryRankResult[] = [];

  logger.info('[GEO Ranking] Starting ranking', { queryCount: queries.length, batchSize });

  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    logger.info('[GEO Ranking] Processing batch', { batch: i / batchSize + 1, queries: batch.length });

    const batchResults = await Promise.all(
      batch.map((q) => rankCandidatesForQuery(q, candidates))
    );

    results.push(...batchResults);

    // Small delay between batches to avoid rate limits
    if (i + batchSize < queries.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  logger.info('[GEO Ranking] Completed', { totalResults: results.length });
  return results;
}

