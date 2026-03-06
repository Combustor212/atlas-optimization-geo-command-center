/**
 * GEO Wins/Losses Classifier
 * Strict rules for determining query wins, losses, and uncertain results
 * NEVER claim a win without evidence (targetRank <= 3, confidence >= 0.6, competitors >= 8)
 */

import { QueryRankResult } from './geoSchema';
import { logger } from '../lib/logger';

/**
 * Minimum competitor set size required for valid wins/losses
 */
const MIN_COMPETITOR_SET_SIZE = 8;

/**
 * Minimum confidence threshold for valid wins/losses
 */
const MIN_CONFIDENCE_THRESHOLD = 0.6;

/**
 * Rank thresholds
 */
const WIN_RANK_THRESHOLD = 3; // Top 3 is a win
const LOSS_RANK_THRESHOLD = 8; // Rank 8+ is a loss

/**
 * Classification result
 */
export interface WinsLossesClassification {
  wins: QueryRankResult[];
  losses: QueryRankResult[];
  uncertain: QueryRankResult[];
  neutral: QueryRankResult[];
  stats: {
    totalQueries: number;
    winsCount: number;
    lossesCount: number;
    uncertainCount: number;
    neutralCount: number;
    avgConfidence: number;
    competitorSetSize: number;
  };
}

/**
 * Classify query results into wins, losses, uncertain, and neutral
 * 
 * STRICT RULES:
 * - WIN: targetRank <= 3 AND confidence >= 0.6 AND competitorSetSize >= 8
 * - LOSS: (targetRank >= 8 OR targetInTop5 === false) AND confidence >= 0.6 AND competitorSetSize >= 8
 * - UNCERTAIN: confidence < 0.6 (regardless of rank)
 * - NEUTRAL: Everything else (ranks 4-7 with good confidence)
 */
export function classifyWinsLosses(
  rankResults: QueryRankResult[],
  competitorSetSize: number
): WinsLossesClassification {
  const wins: QueryRankResult[] = [];
  const losses: QueryRankResult[] = [];
  const uncertain: QueryRankResult[] = [];
  const neutral: QueryRankResult[] = [];
  
  let totalConfidence = 0;
  
  for (const result of rankResults) {
    totalConfidence += result.confidence;
    
    // Rule 1: If confidence < 0.6, classify as UNCERTAIN (regardless of rank)
    if (result.confidence < MIN_CONFIDENCE_THRESHOLD) {
      uncertain.push(result);
      continue;
    }
    
    // Rule 2: If competitor set < 8, classify as UNCERTAIN (not enough data)
    if (competitorSetSize < MIN_COMPETITOR_SET_SIZE) {
      uncertain.push(result);
      continue;
    }
    
    // Rule 3: WIN - targetRank <= 3 AND targetInTop5 === true
    if (result.targetRank !== null && result.targetRank <= WIN_RANK_THRESHOLD && result.targetInTop5) {
      wins.push(result);
      continue;
    }
    
    // Rule 4: LOSS - targetRank >= 8 OR not in top5
    if (!result.targetInTop5 || (result.targetRank !== null && result.targetRank >= LOSS_RANK_THRESHOLD)) {
      losses.push(result);
      continue;
    }
    
    // Rule 5: NEUTRAL - ranks 4-7 with good confidence
    neutral.push(result);
  }
  
  const avgConfidence = rankResults.length > 0 ? totalConfidence / rankResults.length : 0;
  
  logger.info('[Wins/Losses Classifier] Classification complete', {
    totalQueries: rankResults.length,
    wins: wins.length,
    losses: losses.length,
    uncertain: uncertain.length,
    neutral: neutral.length,
    avgConfidence: avgConfidence.toFixed(2),
    competitorSetSize
  });
  
  return {
    wins,
    losses,
    uncertain,
    neutral,
    stats: {
      totalQueries: rankResults.length,
      winsCount: wins.length,
      lossesCount: losses.length,
      uncertainCount: uncertain.length,
      neutralCount: neutral.length,
      avgConfidence,
      competitorSetSize
    }
  };
}

/**
 * Validate niche label - check for "Establishment" or other generic terms
 */
export function validateNicheLabel(nicheLabel: string): { valid: boolean; reason?: string } {
  const lowerLabel = nicheLabel.toLowerCase().trim();
  
  // Check for "Establishment" (case-insensitive)
  if (lowerLabel.includes('establishment')) {
    return {
      valid: false,
      reason: 'Niche contains "Establishment" - category resolution failed'
    };
  }
  
  // Check for other generic terms
  const genericTerms = ['store', 'business', 'place', 'location', 'point of interest'];
  if (genericTerms.some(term => lowerLabel === term)) {
    return {
      valid: false,
      reason: `Niche is too generic: "${nicheLabel}"`
    };
  }
  
  // Check minimum length
  if (nicheLabel.length < 4) {
    return {
      valid: false,
      reason: `Niche label too short: "${nicheLabel}"`
    };
  }
  
  return { valid: true };
}

/**
 * Check if any query contains "Establishment" (indicates niche resolution failure)
 */
export function checkForEstablishmentInQueries(queries: { query: string }[]): boolean {
  return queries.some(q => q.query.toLowerCase().includes('establishment'));
}

/**
 * Determine GEO status based on validation rules
 */
export function determineGEOStatus(args: {
  nicheLabel: string;
  competitorSetSize: number;
  avgConfidence: number;
  hasEstablishmentInQueries: boolean;
}): 'valid' | 'invalid_niche' | 'insufficient_competitors' | 'low_confidence' {
  const { nicheLabel, competitorSetSize, avgConfidence, hasEstablishmentInQueries } = args;
  
  // Check for "Establishment" in queries (highest priority)
  if (hasEstablishmentInQueries) {
    logger.warn('[GEO Status] "Establishment" found in queries - niche resolution failed');
    return 'invalid_niche';
  }
  
  // Validate niche label
  const nicheValidation = validateNicheLabel(nicheLabel);
  if (!nicheValidation.valid) {
    logger.warn('[GEO Status] Invalid niche label', { nicheLabel, reason: nicheValidation.reason });
    return 'invalid_niche';
  }
  
  // Check competitor set size
  if (competitorSetSize < MIN_COMPETITOR_SET_SIZE) {
    logger.warn('[GEO Status] Insufficient competitors', { competitorSetSize, required: MIN_COMPETITOR_SET_SIZE });
    return 'insufficient_competitors';
  }
  
  // Check average confidence
  if (avgConfidence < MIN_CONFIDENCE_THRESHOLD) {
    logger.warn('[GEO Status] Low average confidence', { avgConfidence, required: MIN_CONFIDENCE_THRESHOLD });
    return 'low_confidence';
  }
  
  return 'valid';
}




