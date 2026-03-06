/**
 * GEO Data Reliability Scorer
 * Prevents overrating businesses with insufficient data (low reviews, photos, etc.)
 * Applies hard caps based on actual GBP signals
 */

import { logger } from '../lib/logger';

/**
 * Reliability score breakdown
 */
export interface ReliabilityScore {
  total: number; // 0-1
  reviewVolumeScore: number;
  photoScore: number;
  websiteScore: number;
  hoursScore: number;
  recencyScore: number;
  breakdown: {
    reviewCount: number;
    photoCount: number;
    hasWebsite: boolean;
    hasHours: boolean;
    hasRecentReviews: boolean;
  };
}

/**
 * Hard cap result
 */
export interface HardCapResult {
  capApplied: boolean;
  capValue: number | null;
  capReason: string | null;
  rawScore: number;
  finalScore: number;
}

/**
 * Calibrated GEO score result
 */
export interface CalibratedGEOScore {
  rawScore: number;
  reliabilityScore: ReliabilityScore;
  hardCap: HardCapResult;
  trustPenalty: {
    applied: boolean;
    reason: string | null;
    penaltyAmount: number;
  };
  competitorQuality: {
    matchedCount: number;
    totalCount: number;
    qualityScore: number; // 0-1
  };
  finalScore: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  confidenceReasons: string[];
  geoAlgoVersion: string; // 🔊 Algorithm version stamp
  geoCalibrated: boolean; // 🔊 True if calibration was applied
}

/**
 * Calculate review volume score (0-1)
 */
function calculateReviewVolumeScore(reviewCount: number): number {
  if (reviewCount === 0) return 0;
  if (reviewCount >= 1 && reviewCount <= 4) return 0.15;
  if (reviewCount >= 5 && reviewCount <= 14) return 0.35;
  if (reviewCount >= 15 && reviewCount <= 49) return 0.65;
  if (reviewCount >= 50 && reviewCount <= 149) return 0.85;
  return 1.0; // 150+
}

/**
 * Calculate photo score (0-1)
 */
function calculatePhotoScore(photoCount: number): number {
  if (photoCount === 0) return 0;
  if (photoCount >= 1 && photoCount <= 4) return 0.2;
  if (photoCount >= 5 && photoCount <= 14) return 0.5;
  if (photoCount >= 15 && photoCount <= 39) return 0.75;
  return 1.0; // 40+
}

/**
 * Calculate website score (0-1)
 */
function calculateWebsiteScore(hasWebsite: boolean, hasMeaningfulContent: boolean = false): number {
  if (!hasWebsite) return 0.2;
  if (hasMeaningfulContent) return 1.0;
  return 0.7; // Has website but content unknown
}

/**
 * Calculate hours score (0-1)
 */
function calculateHoursScore(hasHours: boolean): number {
  return hasHours ? 1.0 : 0;
}

/**
 * Calculate recency score (0-1)
 * Checks if business has recent reviews (last 90 days)
 */
function calculateRecencyScore(hasRecentReviews: boolean | null): number {
  if (hasRecentReviews === null) return 0.5; // Unknown
  return hasRecentReviews ? 1.0 : 0.4;
}

/**
 * Clamp value between 0 and 1
 */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Calculate data reliability score (0-1)
 * 
 * Formula:
 * reliability = clamp01(
 *   0.35 * reviewVolumeScore +
 *   0.25 * photoScore +
 *   0.20 * websiteScore +
 *   0.10 * hoursScore +
 *   0.10 * recencyScore
 * )
 */
export function calculateReliabilityScore(args: {
  reviewCount: number;
  photoCount: number;
  hasWebsite: boolean;
  hasMeaningfulContent?: boolean;
  hasHours: boolean;
  hasRecentReviews?: boolean | null;
}): ReliabilityScore {
  const reviewVolumeScore = calculateReviewVolumeScore(args.reviewCount);
  const photoScore = calculatePhotoScore(args.photoCount);
  const websiteScore = calculateWebsiteScore(args.hasWebsite, args.hasMeaningfulContent);
  const hoursScore = calculateHoursScore(args.hasHours);
  const recencyScore = calculateRecencyScore(args.hasRecentReviews ?? null);
  
  const total = clamp01(
    0.35 * reviewVolumeScore +
    0.25 * photoScore +
    0.20 * websiteScore +
    0.10 * hoursScore +
    0.10 * recencyScore
  );
  
  return {
    total,
    reviewVolumeScore,
    photoScore,
    websiteScore,
    hoursScore,
    recencyScore,
    breakdown: {
      reviewCount: args.reviewCount,
      photoCount: args.photoCount,
      hasWebsite: args.hasWebsite,
      hasHours: args.hasHours,
      hasRecentReviews: args.hasRecentReviews ?? false
    }
  };
}

/**
 * Apply hard cap based on review and photo counts
 * 
 * MANDATORY RULES:
 * - If reviewCount < 10 OR photoCount < 5 → cap at 55
 * - If reviewCount < 5 → cap at 45
 * - If reviewCount < 2 → cap at 35
 */
export function applyHardCap(rawScore: number, reviewCount: number, photoCount: number): HardCapResult {
  let capValue: number | null = null;
  let capReason: string | null = null;
  
  // Determine cap based on data quality
  if (reviewCount < 2) {
    capValue = 35;
    capReason = `Only ${reviewCount} review${reviewCount === 1 ? '' : 's'}. Insufficient data for reliable GEO score.`;
  } else if (reviewCount < 5) {
    capValue = 45;
    capReason = `Only ${reviewCount} reviews. Limited data reliability.`;
  } else if (reviewCount < 10 || photoCount < 5) {
    capValue = 55;
    capReason = reviewCount < 10 
      ? `Only ${reviewCount} reviews. Score capped until you reach 10 reviews.`
      : `Only ${photoCount} photos. Score capped until you have 5+ photos.`;
  }
  
  const capApplied = capValue !== null && rawScore > capValue;
  const finalScore = capApplied ? capValue! : rawScore;
  
  if (capApplied) {
    logger.info('[Reliability Scorer] Hard cap applied', {
      rawScore,
      capValue,
      finalScore,
      reviewCount,
      photoCount,
      capReason
    });
  }
  
  return {
    capApplied,
    capValue,
    capReason,
    rawScore,
    finalScore
  };
}

/**
 * Apply trust penalty for suspicious patterns
 * (e.g., 5.0★ rating with <10 reviews = tiny sample size)
 */
export function applyTrustPenalty(score: number, reviewCount: number, rating: number): {
  score: number;
  penaltyApplied: boolean;
  penaltyAmount: number;
  reason: string | null;
} {
  let penaltyApplied = false;
  let penaltyAmount = 0;
  let reason: string | null = null;
  
  // Penalty for perfect rating with tiny sample size
  if (reviewCount < 10 && rating === 5.0) {
    penaltyAmount = 0.12; // 12% penalty
    penaltyApplied = true;
    reason = `Perfect 5.0★ rating with only ${reviewCount} reviews suggests limited sample size`;
  }
  
  const adjustedScore = penaltyApplied ? score * (1 - penaltyAmount) : score;
  
  if (penaltyApplied) {
    logger.info('[Reliability Scorer] Trust penalty applied', {
      originalScore: score,
      adjustedScore,
      penaltyAmount,
      reason
    });
  }
  
  return {
    score: adjustedScore,
    penaltyApplied,
    penaltyAmount,
    reason
  };
}

/**
 * Apply photo deficit penalty
 * (if photoCount < competitor median / 2)
 */
export function applyPhotoDeficitPenalty(
  score: number,
  photoCount: number,
  competitorMedianPhotos: number
): {
  score: number;
  penaltyApplied: boolean;
  reason: string | null;
} {
  const threshold = competitorMedianPhotos / 2;
  
  if (photoCount < threshold && competitorMedianPhotos > 0) {
    const penaltyAmount = 0.1; // 10% penalty
    const adjustedScore = score * (1 - penaltyAmount);
    
    logger.info('[Reliability Scorer] Photo deficit penalty applied', {
      originalScore: score,
      adjustedScore,
      photoCount,
      competitorMedian: competitorMedianPhotos,
      threshold
    });
    
    return {
      score: adjustedScore,
      penaltyApplied: true,
      reason: `Photo count (${photoCount}) is significantly below competitor median (${competitorMedianPhotos})`
    };
  }
  
  return {
    score,
    penaltyApplied: false,
    reason: null
  };
}

/**
 * Calculate competitor quality score
 */
export function calculateCompetitorQuality(matchedCount: number, totalCount: number): {
  qualityScore: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  confidenceReasons: string[];
} {
  const confidenceReasons: string[] = [];
  let qualityScore = 1.0;
  let confidenceLevel: 'low' | 'medium' | 'high' = 'high';
  
  // Penalty for low matched competitor count
  if (matchedCount < 8) {
    qualityScore *= 0.7;
    confidenceLevel = 'low';
    confidenceReasons.push(`Only ${matchedCount} niche-matched competitors (need 8+ for high confidence)`);
  } else if (matchedCount < 15) {
    qualityScore *= 0.9;
    confidenceLevel = 'medium';
    confidenceReasons.push(`${matchedCount} niche-matched competitors (good, but more would improve confidence)`);
  } else {
    confidenceReasons.push(`${matchedCount} niche-matched competitors (excellent data quality)`);
  }
  
  return {
    qualityScore,
    confidenceLevel,
    confidenceReasons
  };
}

/**
 * GEO Algorithm Version (bump this when calibration logic changes)
 */
export const GEO_ALGO_VERSION = 'cal-v3';

/**
 * Full GEO score calibration with all penalties and caps
 */
export function calibrateGEOScore(args: {
  rawScore: number;
  reviewCount: number;
  photoCount: number;
  rating: number;
  hasWebsite: boolean;
  hasMeaningfulContent?: boolean;
  hasHours: boolean;
  hasRecentReviews?: boolean | null;
  competitorMedianPhotos: number;
  matchedCompetitorCount: number;
  totalCompetitorCount: number;
}): CalibratedGEOScore {
  let currentScore = args.rawScore;
  
  // 1. Calculate reliability score
  const reliabilityScore = calculateReliabilityScore({
    reviewCount: args.reviewCount,
    photoCount: args.photoCount,
    hasWebsite: args.hasWebsite,
    hasMeaningfulContent: args.hasMeaningfulContent,
    hasHours: args.hasHours,
    hasRecentReviews: args.hasRecentReviews
  });
  
  // 2. Apply hard cap (MANDATORY)
  const hardCap = applyHardCap(currentScore, args.reviewCount, args.photoCount);
  currentScore = hardCap.finalScore;
  
  // 3. Apply trust penalty (if applicable)
  const trustPenaltyResult = applyTrustPenalty(currentScore, args.reviewCount, args.rating);
  currentScore = trustPenaltyResult.score;
  
  // 4. Apply photo deficit penalty (if applicable)
  const photoDeficitResult = applyPhotoDeficitPenalty(
    currentScore,
    args.photoCount,
    args.competitorMedianPhotos
  );
  currentScore = photoDeficitResult.score;
  
  // 5. Calculate competitor quality
  const competitorQuality = calculateCompetitorQuality(
    args.matchedCompetitorCount,
    args.totalCompetitorCount
  );
  
  // 6. Apply competitor quality penalty if weak
  if (args.matchedCompetitorCount < 8) {
    currentScore = Math.min(currentScore, 55); // Cap at 55 if weak competitor set
    competitorQuality.confidenceReasons.push('Score capped at 55 due to insufficient matched competitors');
  }
  
  // 8. Determine overall confidence
  let overallConfidence = competitorQuality.confidenceLevel;
  const allReasons = [...competitorQuality.confidenceReasons];
  
  if (reliabilityScore.total < 0.5) {
    overallConfidence = 'low';
    allReasons.push(`Low data reliability score (${(reliabilityScore.total * 100).toFixed(0)}%)`);
  }
  
  if (hardCap.capApplied) {
    allReasons.push(`Hard cap applied: ${hardCap.capReason}`);
  }
  
  if (trustPenaltyResult.penaltyApplied) {
    allReasons.push(`Trust penalty: ${trustPenaltyResult.reason}`);
  }
  
  if (photoDeficitResult.penaltyApplied) {
    allReasons.push(`Photo deficit: ${photoDeficitResult.reason}`);
  }
  
  // 9. Final score (rounded)
  const finalScore = Math.round(currentScore);
  
  // 🔊 LOUD LOG - Prove calibration is running
  console.error(`
╔════════════════════════════════════════════════════════════════╗
║ [GEO] CALIBRATION HIT ${GEO_ALGO_VERSION}                                 ║
╠════════════════════════════════════════════════════════════════╣
║ Review Count:     ${String(args.reviewCount).padEnd(6)} Photo Count:    ${String(args.photoCount).padEnd(6)} ║
║ Raw GEO:          ${String(args.rawScore).padEnd(6)} Final GEO:       ${String(finalScore).padEnd(6)} ║
║ Cap Applied:      ${String(hardCap.capApplied ? 'YES' : 'NO').padEnd(6)} Cap Value:       ${String(hardCap.capValue || 'N/A').padEnd(6)} ║
║ Reliability:      ${String((reliabilityScore.total * 100).toFixed(0) + '%').padEnd(6)} Confidence:      ${String(overallConfidence || 'N/A').padEnd(6)} ║
╚════════════════════════════════════════════════════════════════╝
  `);
  
  logger.info('[GEO Calibration] CALIBRATION EXECUTED', {
    version: GEO_ALGO_VERSION,
    reviewCount: args.reviewCount,
    photoCount: args.photoCount,
    rawGeo: args.rawScore,
    finalGeo: finalScore,
    cap: hardCap.capValue,
    capApplied: hardCap.capApplied
  });
  
  logger.info('[Reliability Scorer] GEO score calibrated', {
    rawScore: args.rawScore,
    finalScore,
    reliabilityScore: reliabilityScore.total,
    capApplied: hardCap.capApplied,
    confidence: overallConfidence
  });
  
  return {
    rawScore: args.rawScore,
    reliabilityScore,
    hardCap,
    trustPenalty: {
      applied: trustPenaltyResult.penaltyApplied,
      reason: trustPenaltyResult.reason,
      penaltyAmount: trustPenaltyResult.penaltyAmount
    },
    competitorQuality: {
      matchedCount: args.matchedCompetitorCount,
      totalCount: args.totalCompetitorCount,
      qualityScore: competitorQuality.qualityScore
    },
    finalScore,
    confidenceLevel: overallConfidence,
    confidenceReasons: allReasons,
    // 🔊 Version stamp to prove this code path executed
    geoAlgoVersion: GEO_ALGO_VERSION,
    geoCalibrated: true
  };
}

/**
 * Sanity test hard cap (use for debugging)
 * This is a fail-safe that ensures low-data businesses can't have inflated scores
 */
export function sanityTestHardCap(geoScore: number, reviewCount: number, photoCount: number): number {
  let cap = geoScore;
  
  if (reviewCount <= 1) {
    cap = Math.min(cap, 35);
    console.error(`[GEO SANITY TEST] 1 review detected → capping at 35 (was ${geoScore})`);
  } else if (reviewCount < 5) {
    cap = Math.min(cap, 45);
    console.error(`[GEO SANITY TEST] <5 reviews detected → capping at 45 (was ${geoScore})`);
  } else if (reviewCount < 10 || photoCount < 5) {
    cap = Math.min(cap, 55);
    console.error(`[GEO SANITY TEST] Low data detected → capping at 55 (was ${geoScore})`);
  }
  
  return cap;
}

