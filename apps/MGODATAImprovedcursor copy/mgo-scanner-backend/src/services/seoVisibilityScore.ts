/**
 * SEO Visibility Score
 * Replaces static SEO score with demand + visibility + coverage model.
 * No SERP scraping - uses Places API, Keyword Planner (optional), GSC (optional).
 *
 * Env vars (defaults in code):
 *   SEO_KEYWORD_LIMIT=25
 *   SEO_TOP_K_VISIBILITY_KEYWORDS=5
 *   SEO_USE_KEYWORD_PLANNER=false
 *   SEO_USE_GSC=false
 */

import type { PlaceDetails } from '../types';
import { generateLocalKeywords } from './keywordGenerator';
import { textSearchGetRank } from '../lib/places';
import { computeSeoCompletenessScore } from './seoCompletenessScore';

const SEO_TOP_K_VISIBILITY_KEYWORDS = Number(process.env.SEO_TOP_K_VISIBILITY_KEYWORDS) || 5;
const SEO_USE_KEYWORD_PLANNER = process.env.SEO_USE_KEYWORD_PLANNER === 'true';
const SEO_USE_GSC = process.env.SEO_USE_GSC === 'true';

// Rank-to-points curve: rank 1-3 = 10, 4-7 = 6, 8-20 = 3, not found = 0
function rankToPoints(rank: number | null): number {
  if (rank === null) return 0;
  if (rank <= 3) return 10;
  if (rank <= 7) return 6;
  if (rank <= 20) return 3;
  return 0;
}

export type SeoConfidence = 'high' | 'medium' | 'low';

export interface SeoVisibilityBreakdown {
  demand: number;
  visibility: number;
  coverage: number;
  keywordsEvaluated: number;
  keywordsFound: number;
  topKeywords: Array<{ keyword: string; rank: number | null; points: number; demandWeight: number }>;
}

export interface SeoVisibilityResult {
  seo: number;
  confidence: SeoConfidence;
  breakdown: SeoVisibilityBreakdown;
}

export interface SeoVisibilityInput {
  place: PlaceDetails;
  location: string;
  categoryLabel?: string;
  gbpFacts?: { completenessScore?: number; hasDescription?: boolean; hasHours?: boolean; hasPhone?: boolean } | null;
  integrations?: {
    keywordPlannerVolumes?: Record<string, number>;
    gscQueries?: Array<{ query: string; impressions: number; clicks: number; avgPosition: number }>;
  };
}

/**
 * Parse address string into city, state, zip (US format).
 */
function parseAddressComponents(address: string): { city: string; state: string; zip: string } {
  const parts = address.split(',').map((p) => p.trim());
  let city = '';
  let state = '';
  let zip = '';

  if (parts.length >= 3) {
    city = parts[parts.length - 3] || parts[1] || '';
    const stateZipPart = parts[parts.length - 2] || parts[2] || '';
    const zipMatch = stateZipPart.match(/(\d{5}(?:-\d{4})?)\s*$/);
    if (zipMatch) {
      zip = zipMatch[1];
      state = stateZipPart.replace(zipMatch[0], '').trim();
    } else {
      state = stateZipPart;
    }
  } else if (parts.length === 2) {
    city = parts[0];
    state = parts[1];
  }

  return { city, state, zip };
}

/**
 * Heuristic demand weight by keyword pattern (no volume data).
 * near-me > city > zip; category prior.
 */
function getHeuristicDemandWeight(keyword: string): number {
  const kw = keyword.toLowerCase();
  if (kw.includes('near me')) return 1.3;
  if (kw.includes('best ') || kw.includes('top ')) return 1.2;
  if (kw.includes(' in ') || kw.includes(' near ')) return 1.0;
  if (/\d{5}/.test(kw)) return 0.8; // zip
  return 0.9;
}

/**
 * Compute SEO Visibility Score (0-100).
 */
export async function computeSeoVisibilityScore(input: SeoVisibilityInput): Promise<SeoVisibilityResult> {
  const { place, location, categoryLabel, integrations } = input;
  const { city, state, zip } = parseAddressComponents(location || place.formatted_address || '');
  const businessType = categoryLabel || place.primaryTypeDisplayName?.text || place.primaryType || 'business';

  const keywords = generateLocalKeywords({
    businessName: place.name || '',
    businessType,
    city,
    state,
    zip,
  });

  if (keywords.length === 0) {
    const completenessScore = computeSeoCompletenessScore(place, input.gbpFacts ?? null);
    return {
      seo: Math.round(completenessScore),
      confidence: 'low',
      breakdown: {
        demand: 0,
        visibility: 0,
        coverage: 0,
        keywordsEvaluated: 0,
        keywordsFound: 0,
        topKeywords: [],
      },
    };
  }

  const volumes = integrations?.keywordPlannerVolumes;
  const hasVolumes = !!volumes && Object.keys(volumes).length > 0;
  const gscQueries = integrations?.gscQueries;
  const hasGsc = !!gscQueries && gscQueries.length > 0;

  // Demand component (0-35)
  let demandPoints = 0;
  if (hasVolumes) {
    const totalVol = Object.values(volumes).reduce((a, b) => a + b, 0);
    const avgVol = totalVol / Object.keys(volumes).length;
    const maxVol = Math.max(...Object.values(volumes));
    const normalized = maxVol > 0 ? (avgVol / maxVol) * 35 : 17.5;
    demandPoints = Math.min(35, Math.round(normalized));
  } else {
    const weights = keywords.map((kw) => getHeuristicDemandWeight(kw));
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    demandPoints = Math.min(35, Math.round(avgWeight * 25));
  }

  // Visibility: pick top K keywords, run Places Text Search for rank
  const topK = keywords.slice(0, SEO_TOP_K_VISIBILITY_KEYWORDS);
  const locationCoords = place.geometry?.location;

  const rankResults: Array<{ keyword: string; rank: number | null; points: number; demandWeight: number }> = [];
  for (const kw of topK) {
    try {
      const rank = await textSearchGetRank(kw, place.place_id, locationCoords);
      const points = rankToPoints(rank);
      const demandWeight = volumes?.[kw] ? Math.min(2, (volumes[kw] || 0) / 500) : getHeuristicDemandWeight(kw);
      rankResults.push({ keyword: kw, rank, points, demandWeight });
      if (rankResults.length < 3) {
        await new Promise((r) => setTimeout(r, 100));
      }
    } catch {
      rankResults.push({ keyword: kw, rank: null, points: 0, demandWeight: getHeuristicDemandWeight(kw) });
    }
  }

  const keywordsFound = rankResults.filter((r) => r.rank !== null).length;
  const keywordsEvaluated = rankResults.length;

  let visibilityPoints = 0;
  if (rankResults.length > 0) {
    const totalWeighted = rankResults.reduce((sum, r) => sum + r.points * r.demandWeight, 0);
    const maxWeighted = rankResults.length * 10 * 2;
    visibilityPoints = maxWeighted > 0 ? Math.min(50, Math.round((totalWeighted / maxWeighted) * 50)) : 0;
  }

  // Coverage (0-15)
  const coveragePoints =
    keywordsEvaluated > 0 ? Math.round((keywordsFound / keywordsEvaluated) * 15) : 0;

  let seoRaw = demandPoints + visibilityPoints + coveragePoints;
  seoRaw = Math.min(100, Math.max(0, seoRaw));

  let confidence: SeoConfidence = 'low';
  if ((hasVolumes || hasGsc) && keywordsFound > 0) {
    confidence = 'high';
  } else if (keywordsFound > 0) {
    confidence = 'medium';
  }

  if (confidence === 'low') {
    const completenessScore = computeSeoCompletenessScore(place, input.gbpFacts ?? null);
    seoRaw = Math.round(seoRaw * 0.7 + completenessScore * 0.3);
  }

  const seo = Math.min(100, Math.max(0, Math.round(seoRaw)));

  return {
    seo,
    confidence,
    breakdown: {
      demand: demandPoints,
      visibility: visibilityPoints,
      coverage: coveragePoints,
      keywordsEvaluated,
      keywordsFound,
      topKeywords: rankResults,
    },
  };
}
