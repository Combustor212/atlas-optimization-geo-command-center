/**
 * GEO Benchmark Engine (Main Orchestrator)
 * Coordinates competitor fetch, query generation, ranking, and scoring
 */

import { logger } from '../lib/logger';
import { geoBenchmarkCache } from '../lib/cache';
import { fetchCompetitors } from './competitors';
import { generateGEOQueries } from './queryGenerator';
import { rankCandidatesForAllQueries } from './rankingEngine';
import { calculateGEOScore } from './geoScoring';
import type { GEOBenchmarkResponse, GEOBenchmarkError } from './geoSchema';

/**
 * Run full GEO benchmark for a business
 * Returns GEO score + drivers + fix-first checklist
 */
export async function runGEOBenchmark(
  placeId: string,
  opts: { 
    radiusMeters?: number; 
    forceRefresh?: boolean; 
    targetQueryCount?: number;
    categoryResolution?: any; // CategoryResolution from resolveCategory
    locationLabel?: string;
  } = {}
): Promise<GEOBenchmarkResponse | GEOBenchmarkError> {
  const radiusMeters = opts.radiusMeters ?? 5000;
  const forceRefresh = opts.forceRefresh ?? false;
  const targetQueryCount = opts.targetQueryCount ?? 50;
  const categoryResolution = opts.categoryResolution;
  const locationLabel = opts.locationLabel;

  // Check cache first
  const cacheKey = `geo:${placeId}:r${radiusMeters}`;
  if (!forceRefresh) {
    const cached = geoBenchmarkCache.get<GEOBenchmarkResponse>(cacheKey);
    if (cached) {
      logger.info('[GEO Engine] Returning cached result', { placeId, cacheKey });
      return cached;
    }
  }

  logger.info('[GEO Engine] Starting benchmark', { placeId, radiusMeters, forceRefresh });

  try {
    // 1) Fetch competitor set
    logger.info('[GEO Engine] Step 1: Fetching competitors');
    const competitorSet = await fetchCompetitors(placeId, radiusMeters);

    if (competitorSet.competitors.length < 8) {
      return {
        error: 'Insufficient competitors',
        code: 'INSUFFICIENT_COMPETITORS',
        message: `Found only ${competitorSet.competitors.length} competitors (need at least 8)`,
        details: { count: competitorSet.competitors.length, required: 8 }
      };
    }

    // 2) Generate queries
    logger.info('[GEO Engine] Step 2: Generating queries');
    const querySet = await generateGEOQueries(
      competitorSet.niche,
      competitorSet.locationLabel,
      { targetCount: targetQueryCount }
    );

    if (querySet.queries.length < 20) {
      return {
        error: 'Insufficient queries generated',
        code: 'MISSING_DATA',
        message: `Generated only ${querySet.queries.length} queries (need at least 20)`,
        details: { count: querySet.queries.length, required: 20 }
      };
    }

    // 3) Rank candidates for all queries
    logger.info('[GEO Engine] Step 3: Ranking candidates');
    const allCandidates = [competitorSet.target, ...competitorSet.competitors];
    const rankResults = await rankCandidatesForAllQueries(querySet.queries, allCandidates);

    // 4) Calculate GEO score + drivers (now includes reliability caps + confidence)
    logger.info('[GEO Engine] Step 4: Calculating GEO score');
    const scoring = calculateGEOScore(
      placeId,
      competitorSet.target,
      competitorSet.competitors,
      rankResults
    );

    // 5) Build response (use categoryResolution if provided, else fall back to niche)
    const finalCategory = categoryResolution || {
      key: competitorSet.nicheCanonical.replace(/\s+/g, '_') || 'unresolved',
      label: competitorSet.niche,
      confidence: 0.7,
      source: 'places'
    };

    const finalLocationLabel = locationLabel || competitorSet.locationLabel;

    const response: GEOBenchmarkResponse = {
      target: competitorSet.target,
      competitors: competitorSet.competitors,
      niche: competitorSet.niche,
      nicheLabel: finalCategory.label || competitorSet.niche,
      nicheCanonical: competitorSet.nicheCanonical,
      locationLabel: finalLocationLabel,
      radiusMeters: competitorSet.radiusMeters,
      category: finalCategory,
      queries: querySet.queries,
      rankResults,
      geoScore: scoring.geoScore,
      geoAlgoVersion: 'geo-v5', // Updated algorithm version with reliability caps
      geoCalibrated: scoring.wasCapped, // True if reliability cap was applied
      percentile: scoring.percentile,
      scoreBreakdown: scoring.scoreBreakdown,
      drivers: scoring.drivers,
      fixFirst: scoring.fixFirst,
      topQueryWins: scoring.topQueryWins,
      topQueryLosses: scoring.topQueryLosses,
      uncertainQueries: scoring.uncertainQueries,
      confidence: scoring.confidence, // From calculateGEOScore
      confidenceReasons: scoring.confidenceReasons, // From calculateGEOScore
      geoStatus: scoring.confidence === 'low' ? 'low_confidence' : 'valid',
      lastRefreshedAt: new Date().toISOString(),
      cacheKey,
      debug: {
        reliabilityCap: scoring.reliabilityCap,
        wasCapped: scoring.wasCapped,
        competitorCount: competitorSet.competitors.length,
        queryCount: querySet.queries.length
      }
    };

    // Cache result (default 6 hours)
    const cacheTTL = Number(process.env.GEO_BENCHMARK_CACHE_TTL_MS) || 1000 * 60 * 60 * 6;
    geoBenchmarkCache.set(cacheKey, response, cacheTTL);

    logger.info('[GEO Engine] Benchmark complete', {
      geoScore: scoring.geoScore,
      percentile: scoring.percentile,
      confidence: scoring.confidence,
      wasCapped: scoring.wasCapped
    });

    return response;
  } catch (error: any) {
    logger.error('[GEO Engine] Benchmark failed', { placeId, error: error.message });

    return {
      error: 'GEO benchmark failed',
      code: 'API_ERROR',
      message: error.message || 'Unknown error occurred',
      details: { placeId, radiusMeters }
    };
  }
}

/**
 * Determine confidence level based on data quality
 */
function determineConfidence(
  competitorSet: { competitors: any[]; target: any },
  rankResults: any[]
): { level: 'low' | 'medium' | 'high'; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Check competitor count
  if (competitorSet.competitors.length >= 20) {
    score += 30;
  } else if (competitorSet.competitors.length >= 15) {
    score += 20;
    reasons.push('Moderate competitor set');
  } else {
    score += 10;
    reasons.push('Limited competitor set');
  }

  // Check query ranking coverage
  const rankedCount = rankResults.filter((r) => r.top5.length > 0).length;
  const coverageRatio = rankedCount / rankResults.length;
  if (coverageRatio >= 0.9) {
    score += 40;
  } else if (coverageRatio >= 0.7) {
    score += 25;
    reasons.push('Some queries failed to rank');
  } else {
    score += 10;
    reasons.push('Many queries failed to rank');
  }

  // Check data completeness
  const target = competitorSet.target;
  let completeness = 0;
  if (target.hasWebsite) completeness++;
  if (target.hasPhone) completeness++;
  if (target.hasHours) completeness++;
  if (target.photoCount > 0) completeness++;

  if (completeness >= 4) {
    score += 30;
  } else if (completeness >= 3) {
    score += 20;
    reasons.push('Some business data missing');
  } else {
    score += 10;
    reasons.push('Significant business data missing');
  }

  // Determine level
  let level: 'low' | 'medium' | 'high';
  if (score >= 80) {
    level = 'high';
  } else if (score >= 50) {
    level = 'medium';
  } else {
    level = 'low';
  }

  if (reasons.length === 0) {
    reasons.push('Strong data quality and competitor coverage');
  }

  return { level, reasons };
}

