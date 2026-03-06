/**
 * GEO Scoring Engine
 * Computes GEO score from ranking results + candidate data
 */

import { logger } from '../lib/logger';
import type {
  GEOCandidate,
  QueryRankResult,
  GEOScoreBreakdown,
  GEODriver,
  GEOFixAction
} from './geoSchema';

/**
 * Calculate GEO score from ranking results
 */
export function calculateGEOScore(
  targetPlaceId: string,
  target: GEOCandidate,
  competitors: GEOCandidate[],
  rankResults: QueryRankResult[]
): {
  geoScore: number;
  percentile: number;
  scoreBreakdown: GEOScoreBreakdown;
  drivers: GEODriver[];
  fixFirst: GEOFixAction[];
  topQueryWins: QueryRankResult[];
  topQueryLosses: QueryRankResult[];
  uncertainQueries: QueryRankResult[];
  confidence: 'low' | 'medium' | 'high';
  confidenceReasons: string[];
  reliabilityCap: number | null;
  wasCapped: boolean;
} {
  // 1) Calculate SOV (share of voice)
  const { sovTop3, sovTop5 } = calculateSOV(targetPlaceId, rankResults);

  // 2) Calculate evidence strength index (normalized vs competitors)
  const evidenceStrengthIndex = calculateEvidenceStrength(target, competitors);

  // 3) Calculate raw GEO score
  const rawScore = 100 * (0.65 * sovTop3 + 0.35 * evidenceStrengthIndex);
  let finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  // 4) Apply reliability caps (defensible scoring)
  const { cappedScore, cap, wasCapped, capReason } = applyReliabilityCaps(
    finalScore,
    target,
    competitors.length,
    rankResults.length
  );
  finalScore = cappedScore;

  // 5) Determine confidence level
  const { confidence, confidenceReasons } = determineConfidence(
    target,
    competitors.length,
    rankResults.length
  );

  // 6) Calculate percentile vs competitors
  const percentile = calculatePercentile(finalScore, competitors, rankResults);

  // 7) Generate drivers (impact analysis)
  const drivers = generateDrivers(target, competitors);

  // 8) Generate fix-first actions (top 3-5)
  const fixFirst = generateFixFirst(drivers);

  // 9) Extract top wins/losses + uncertain queries (proof objects, not strings)
  const { topWins, topLosses, uncertainQueries } = extractWinsAndLosses(targetPlaceId, rankResults);

  const scoreBreakdown: GEOScoreBreakdown = {
    sovTop3,
    sovTop5,
    evidenceStrengthIndex,
    rawScore,
    finalScore,
    reliabilityCap: cap,
    wasCapped,
    capReason: capReason || null
  };

  logger.info('[GEO Scoring] Computed', {
    geoScore: finalScore,
    sovTop3: Math.round(sovTop3 * 100),
    evidenceStrengthIndex: Math.round(evidenceStrengthIndex * 100),
    percentile,
    wasCapped,
    confidence
  });

  return {
    geoScore: finalScore,
    percentile,
    scoreBreakdown,
    drivers,
    fixFirst,
    topQueryWins: topWins,
    topQueryLosses: topLosses,
    uncertainQueries,
    confidence,
    confidenceReasons,
    reliabilityCap: cap,
    wasCapped
  };
}

/**
 * Calculate share of voice (SOV) - weighted
 */
function calculateSOV(
  targetPlaceId: string,
  rankResults: QueryRankResult[]
): { sovTop3: number; sovTop5: number } {
  let weightedTop3Count = 0;
  let weightedTop5Count = 0;
  let totalWeight = 0;

  for (const result of rankResults) {
    const targetRank = result.top5.find((r) => r.placeId === targetPlaceId);
    const weight = result.weight;
    totalWeight += weight;

    if (targetRank) {
      if (targetRank.rank <= 3) {
        weightedTop3Count += weight;
      }
      if (targetRank.rank <= 5) {
        weightedTop5Count += weight;
      }
    }
  }

  const sovTop3 = totalWeight > 0 ? weightedTop3Count / totalWeight : 0;
  const sovTop5 = totalWeight > 0 ? weightedTop5Count / totalWeight : 0;

  return { sovTop3, sovTop5 };
}

/**
 * Calculate evidence strength index (0-1)
 * Normalized vs competitor medians
 */
function calculateEvidenceStrength(target: GEOCandidate, competitors: GEOCandidate[]): number {
  const allCandidates = [target, ...competitors];

  // Compute medians
  const ratingMedian = median(allCandidates.map((c) => c.rating));
  const reviewMedian = median(allCandidates.map((c) => c.reviewCount));
  const photoMedian = median(allCandidates.map((c) => c.photoCount));

  // Completeness score
  let completeness = 0;
  if (target.hasWebsite) completeness += 0.25;
  if (target.hasPhone) completeness += 0.25;
  if (target.hasHours) completeness += 0.25;
  if (target.hasMenuOrServicesContent) completeness += 0.25;

  // Normalize target vs medians
  const ratingNorm = ratingMedian > 0 ? Math.min(target.rating / ratingMedian, 1.2) / 1.2 : 0.5;
  const reviewNorm = reviewMedian > 0 ? Math.min(target.reviewCount / reviewMedian, 2.0) / 2.0 : 0.5;
  const photoNorm = photoMedian > 0 ? Math.min(target.photoCount / photoMedian, 2.0) / 2.0 : 0.5;

  // Weighted average
  const evidenceStrength =
    0.3 * ratingNorm + 0.25 * reviewNorm + 0.2 * photoNorm + 0.25 * completeness;

  return Math.max(0, Math.min(1, evidenceStrength));
}

/**
 * Calculate percentile vs competitors
 */
function calculatePercentile(
  geoScore: number,
  competitors: GEOCandidate[],
  rankResults: QueryRankResult[]
): number {
  // Estimate competitor scores (simplified: use avg rank position)
  const competitorScores = competitors.map((c) => {
    let totalRank = 0;
    let countRanked = 0;

    for (const result of rankResults) {
      const rank = result.top5.find((r) => r.placeId === c.placeId);
      if (rank) {
        totalRank += rank.rank;
        countRanked++;
      }
    }

    const avgRank = countRanked > 0 ? totalRank / countRanked : 6; // Default to 6 if not ranked
    // Convert avg rank to rough score (rank 1 = 100, rank 6+ = 0)
    const estimatedScore = Math.max(0, 100 - (avgRank - 1) * 20);
    return estimatedScore;
  });

  // Count how many competitors have lower scores
  const lowerCount = competitorScores.filter((s) => s < geoScore).length;
  const percentile = competitors.length > 0 ? (lowerCount / competitors.length) * 100 : 50;

  return Math.round(percentile);
}

/**
 * Generate impact drivers (ranked by potential gain)
 */
function generateDrivers(target: GEOCandidate, competitors: GEOCandidate[]): GEODriver[] {
  const allCandidates = [target, ...competitors];
  const drivers: GEODriver[] = [];

  // Compute medians
  const ratingMedian = median(allCandidates.map((c) => c.rating));
  const reviewMedian = median(allCandidates.map((c) => c.reviewCount));
  const photoMedian = median(allCandidates.map((c) => c.photoCount));

  // 1) Photo count driver
  const photoGap = photoMedian - target.photoCount;
  if (photoGap > 5) {
    drivers.push({
      id: 'photos',
      title: 'Low photo coverage',
      status: 'bad',
      observedValue: target.photoCount,
      competitorMedian: Math.round(photoMedian),
      explanation: `Your business has ${target.photoCount} photos vs competitor median of ${Math.round(photoMedian)}`,
      impactLabel: `~${Math.round(photoGap * 0.5)} pts`,
      pointGain: Math.round(photoGap * 0.5),
      cta: 'Upload photos'
    });
  } else if (target.photoCount < photoMedian) {
    drivers.push({
      id: 'photos',
      title: 'Photo count below median',
      status: 'warn',
      observedValue: target.photoCount,
      competitorMedian: Math.round(photoMedian),
      explanation: `You have ${target.photoCount} photos vs median ${Math.round(photoMedian)}`,
      impactLabel: `~${Math.round(photoGap * 0.5)} pts`,
      pointGain: Math.round(photoGap * 0.5),
      cta: 'Upload photos'
    });
  }

  // 2) Review count driver
  const reviewGap = reviewMedian - target.reviewCount;
  if (reviewGap > 20) {
    drivers.push({
      id: 'reviews',
      title: 'Low review volume',
      status: 'bad',
      observedValue: target.reviewCount,
      competitorMedian: Math.round(reviewMedian),
      explanation: `Your business has ${target.reviewCount} reviews vs competitor median of ${Math.round(reviewMedian)}`,
      impactLabel: `~${Math.round(reviewGap * 0.3)} pts`,
      pointGain: Math.round(reviewGap * 0.3),
      cta: 'Collect reviews'
    });
  } else if (target.reviewCount < reviewMedian) {
    drivers.push({
      id: 'reviews',
      title: 'Review count below median',
      status: 'warn',
      observedValue: target.reviewCount,
      competitorMedian: Math.round(reviewMedian),
      explanation: `You have ${target.reviewCount} reviews vs median ${Math.round(reviewMedian)}`,
      impactLabel: `~${Math.round(reviewGap * 0.3)} pts`,
      pointGain: Math.round(reviewGap * 0.3),
      cta: 'Collect reviews'
    });
  }

  // 3) Rating driver
  if (target.rating < ratingMedian - 0.3) {
    drivers.push({
      id: 'rating',
      title: 'Rating below competitors',
      status: 'bad',
      observedValue: target.rating.toFixed(1),
      competitorMedian: ratingMedian.toFixed(1),
      explanation: `Your ${target.rating.toFixed(1)}★ rating is below the ${ratingMedian.toFixed(1)}★ median`,
      impactLabel: `~${Math.round((ratingMedian - target.rating) * 10)} pts`,
      pointGain: Math.round((ratingMedian - target.rating) * 10),
      cta: 'Improve service quality'
    });
  }

  // 4) Website/menu content driver
  if (!target.hasMenuOrServicesContent && !target.hasWebsite) {
    drivers.push({
      id: 'website_content',
      title: 'No website or menu content',
      status: 'bad',
      observedValue: 'Missing',
      competitorMedian: 'Present',
      explanation: 'Competitors have detailed menu/services content on their websites',
      impactLabel: '~12 pts',
      pointGain: 12,
      cta: 'Add menu/services'
    });
  } else if (!target.hasMenuOrServicesContent) {
    drivers.push({
      id: 'website_content',
      title: 'Website lacks menu/services',
      status: 'warn',
      observedValue: 'Basic site',
      competitorMedian: 'Detailed content',
      explanation: 'Add menu items, services, or offerings to your website',
      impactLabel: '~8 pts',
      pointGain: 8,
      cta: 'Add menu/services'
    });
  }

  // 5) Hours driver
  if (!target.hasHours) {
    drivers.push({
      id: 'hours',
      title: 'Missing business hours',
      status: 'bad',
      observedValue: 'Not listed',
      competitorMedian: 'Listed',
      explanation: 'Hours are critical for "open now" queries',
      impactLabel: '~6 pts',
      pointGain: 6,
      cta: 'Add hours'
    });
  }

  // Sort by point gain (descending)
  drivers.sort((a, b) => b.pointGain - a.pointGain);

  return drivers;
}

/**
 * Generate fix-first actions (top 3-5 from drivers)
 */
function generateFixFirst(drivers: GEODriver[]): GEOFixAction[] {
  return drivers.slice(0, 3).map((d) => ({
    id: d.id,
    title: d.title,
    description: d.explanation,
    pointGain: d.pointGain,
    timeEstimate: estimateTime(d.id),
    cta: d.cta
  }));
}

/**
 * Estimate time to fix (rough heuristic)
 */
function estimateTime(driverId: string): string {
  const timeMap: Record<string, string> = {
    photos: '~30 min',
    reviews: '~2 weeks',
    rating: '~ongoing',
    website_content: '~2 hours',
    hours: '~10 min'
  };
  return timeMap[driverId] || '~1 hour';
}

/**
 * Extract top query wins and losses
 */
function extractWinsAndLosses(
  targetPlaceId: string,
  rankResults: QueryRankResult[]
): { topWins: QueryRankResult[]; topLosses: QueryRankResult[]; uncertainQueries: QueryRankResult[] } {
  const wins: QueryRankResult[] = [];
  const losses: QueryRankResult[] = [];
  const uncertainQueries: QueryRankResult[] = [];

  for (const result of rankResults) {
    const targetRank = result.top5.find((r) => r.placeId === targetPlaceId);

    // Mark uncertain queries (low confidence)
    if (typeof result.confidence === 'number' && result.confidence < 0.6) {
      uncertainQueries.push(result);
    }

    // Wins = target in top3 (proof = include full result object)
    if (targetRank && targetRank.rank <= 3) {
      wins.push(result);
      continue;
    }

    // Losses = not in top3 (includes not in top5)
    losses.push(result);
  }

  // Return top 5 of each
  return {
    topWins: wins.slice(0, 5),
    topLosses: losses.slice(0, 5),
    uncertainQueries: uncertainQueries.slice(0, 10)
  };
}

/**
 * Compute median of number array
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Apply reliability caps to prevent inflated scores for low-data businesses
 * CRITICAL: Defensible scoring requires evidence
 */
function applyReliabilityCaps(
  rawScore: number,
  target: GEOCandidate,
  competitorCount: number,
  queryCount: number
): { cappedScore: number; cap: number | null; wasCapped: boolean; capReason?: string } {
  let cap: number | null = null;
  let capReason: string | undefined;

  // Hard caps based on review count
  if (target.reviewCount < 2) {
    cap = 35;
    capReason = `Only ${target.reviewCount} review${target.reviewCount === 1 ? '' : 's'} — not enough data`;
  } else if (target.reviewCount < 5) {
    cap = 45;
    capReason = `Only ${target.reviewCount} reviews — limited data`;
  } else if (target.reviewCount < 10 || target.photoCount < 5) {
    cap = 55;
    capReason = `Low review count (${target.reviewCount}) or photo count (${target.photoCount})`;
  }

  // Trust penalty for perfect 5.0 rating with low reviews (suspicious)
  if (target.rating === 5.0 && target.reviewCount < 15) {
    const trustPenalty = 0.12;
    const penalizedScore = Math.round(rawScore * (1 - trustPenalty));
    logger.info('[GEO Scoring] Trust penalty applied', {
      rating: target.rating,
      reviews: target.reviewCount,
      originalScore: rawScore,
      penalizedScore
    });
    rawScore = penalizedScore;
  }

  // Penalty if photo count far below typical
  if (target.photoCount < 3) {
    const photoPenalty = 0.1;
    rawScore = Math.round(rawScore * (1 - photoPenalty));
    logger.info('[GEO Scoring] Photo penalty applied', { photoCount: target.photoCount, penalizedScore: rawScore });
  }

  // Cap for weak competitor set
  if (competitorCount < 8) {
    const weakCompCap = 55;
    if (!cap || weakCompCap < cap) {
      cap = weakCompCap;
      capReason = `Only ${competitorCount} matched competitors (need 8+)`;
    }
  }

  // Cap for insufficient queries
  if (queryCount < 20) {
    const weakQueryCap = 55;
    if (!cap || weakQueryCap < cap) {
      cap = weakQueryCap;
      capReason = `Only ${queryCount} queries tested (need 20+)`;
    }
  }

  const cappedScore = cap ? Math.min(rawScore, cap) : rawScore;
  const wasCapped = cap !== null && rawScore > cap;

  if (wasCapped) {
    logger.info('[GEO Scoring] Score capped', {
      rawScore,
      cap,
      cappedScore,
      reason: capReason
    });
  }

  return { cappedScore, cap, wasCapped, capReason };
}

/**
 * Determine confidence level based on data quality
 */
function determineConfidence(
  target: GEOCandidate,
  competitorCount: number,
  queryCount: number
): { confidence: 'low' | 'medium' | 'high'; confidenceReasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Review count
  if (target.reviewCount >= 50) {
    score += 3;
  } else if (target.reviewCount >= 15) {
    score += 2;
    reasons.push('Moderate review volume');
  } else if (target.reviewCount >= 5) {
    score += 1;
    reasons.push('Low review volume');
  } else {
    reasons.push('Very low review volume (< 5)');
  }

  // Photo count
  if (target.photoCount >= 15) {
    score += 2;
  } else if (target.photoCount >= 5) {
    score += 1;
    reasons.push('Limited photos');
  } else {
    reasons.push('Very few photos (< 5)');
  }

  // Competitor count
  if (competitorCount >= 15) {
    score += 2;
  } else if (competitorCount >= 8) {
    score += 1;
    reasons.push('Adequate competitor set');
  } else {
    reasons.push(`Weak competitor set (${competitorCount} < 8)`);
  }

  // Query count
  if (queryCount >= 40) {
    score += 2;
  } else if (queryCount >= 20) {
    score += 1;
    reasons.push('Moderate query coverage');
  } else {
    reasons.push(`Insufficient queries (${queryCount} < 20)`);
  }

  // Data completeness
  if (target.hasWebsite && target.hasPhone && target.hasHours) {
    score += 1;
  } else {
    reasons.push('Incomplete profile data');
  }

  // Determine confidence
  let confidence: 'low' | 'medium' | 'high';
  if (score >= 8) {
    confidence = 'high';
  } else if (score >= 5) {
    confidence = 'medium';
  } else {
    confidence = 'low';
    if (reasons.length === 0) {
      reasons.push('Insufficient data for high confidence');
    }
  }

  logger.info('[GEO Scoring] Confidence determined', { confidence, score, reasons });

  return { confidence, confidenceReasons: reasons };
}

