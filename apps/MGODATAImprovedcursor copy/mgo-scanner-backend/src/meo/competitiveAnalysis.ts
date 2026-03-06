/**
 * Competitive Analysis and Market Positioning
 * Analyzes business against REAL local competition from Google Places API
 * 
 * STRICT RULES (NON-NEGOTIABLE):
 * 1. Must find ≥3 real competitors
 * 2. Same niche/category
 * 3. Within 10-15km radius
 * 4. Local businesses only (no HQs, no fake data)
 * 5. If <3 competitors found → abort with error
 */

import type { MarketContext, CompetitivePercentile } from './meoSchema';
import type { PlaceDetails } from '../types';
import { logger } from '../lib/logger';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.PLACES_API_KEY;
if (!GOOGLE_PLACES_API_KEY) {
  logger.error('[MEO Competitive Analysis] Missing GOOGLE_PLACES_API_KEY environment variable');
}
const API_KEY: string = GOOGLE_PLACES_API_KEY || '';

const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

// ============================================================================
// COMPETITOR DATA STRUCTURE
// ============================================================================

interface CompetitorData {
  place_id: string;  // Google-issued, immutable identifier
  name: string;
  rating: number;
  reviews: number;
  photos: number;
  types: string[];
}

interface CompetitiveAnalysisError {
  error: string;
  reason: string;
  details?: any;
}

// ============================================================================
// REAL COMPETITOR FETCHING
// ============================================================================

/**
 * Fetch REAL competitors from Google Places Nearby Search API
 * 
 * @returns Array of competitors OR null if insufficient data
 */
async function fetchRealCompetitors(
  targetLat: number,
  targetLng: number,
  targetPlaceId: string,
  targetTypes: string[] | undefined,
  radius: number = 12000 // 12km default (within 10-15km rule)
): Promise<CompetitorData[] | null> {
  
  if (!API_KEY) {
    logger.error('[MEO Competitive Analysis] Cannot fetch competitors: missing API key');
    return null;
  }

  try {
    // Determine primary type for filtering
    const primaryType = targetTypes && targetTypes.length > 0 ? targetTypes[0] : null;
    
    // Build Places Nearby Search URL
    const nearbyUrl = new URL(`${PLACES_API_BASE}/nearbysearch/json`);
    nearbyUrl.searchParams.set('location', `${targetLat},${targetLng}`);
    nearbyUrl.searchParams.set('radius', radius.toString());
    
    if (primaryType) {
      nearbyUrl.searchParams.set('type', primaryType);
    }
    
    nearbyUrl.searchParams.set('key', API_KEY);

    logger.info('[MEO Competitive Analysis] Fetching competitors', {
      lat: targetLat,
      lng: targetLng,
      radius,
      primaryType: primaryType || 'none'
    });

    // Call Google Places API
    const response = await fetch(nearbyUrl.toString());
    
    if (!response.ok) {
      logger.error('[MEO Competitive Analysis] Places API HTTP error', {
        status: response.status,
        statusText: response.statusText
      });
      return null;
    }

    const data = await response.json() as any;

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      logger.error('[MEO Competitive Analysis] Places API error', {
        status: data.status,
        error: data.error_message
      });
      return null;
    }

    const nearbyPlaces = data.results || [];
    
    logger.info('[MEO Competitive Analysis] Raw results from Places API', {
      count: nearbyPlaces.length,
      status: data.status
    });

    // Retry without type filter if zero results
    if (nearbyPlaces.length === 0 && primaryType) {
      logger.info('[MEO Competitive Analysis] Zero results with type filter, retrying without type');
      
      const fallbackUrl = new URL(`${PLACES_API_BASE}/nearbysearch/json`);
      fallbackUrl.searchParams.set('location', `${targetLat},${targetLng}`);
      fallbackUrl.searchParams.set('radius', radius.toString());
      fallbackUrl.searchParams.set('key', API_KEY);

      const fallbackResponse = await fetch(fallbackUrl.toString());
      
      if (!fallbackResponse.ok) {
        logger.error('[MEO Competitive Analysis] Fallback API HTTP error', {
          status: fallbackResponse.status
        });
        return null;
      }

      const fallbackData = await fallbackResponse.json() as any;

      if (fallbackData.status !== 'OK' && fallbackData.status !== 'ZERO_RESULTS') {
        logger.error('[MEO Competitive Analysis] Fallback API error', {
          status: fallbackData.status,
          error: fallbackData.error_message
        });
        return null;
      }

      nearbyPlaces.push(...(fallbackData.results || []));
      
      logger.info('[MEO Competitive Analysis] Fallback results', {
        count: nearbyPlaces.length
      });
    }

    // Filter and map to CompetitorData
    const competitors: CompetitorData[] = nearbyPlaces
      .filter((p: any) => {
        // Must have place_id
        if (!p.place_id) return false;
        
        // Exclude target itself
        if (p.place_id === targetPlaceId) return false;
        
        // Must have rating and reviews
        if (typeof p.rating !== 'number') return false;
        if (typeof p.user_ratings_total !== 'number') return false;
        
        // Exclude global/non-local listings (corporate HQs, national offices)
        // Check for red flags in types or name
        const types = (p.types || []) as string[];
        const name = (p.name || '').toLowerCase();
        
        // Exclude HQs and corporate offices
        if (types.includes('corporate_office') || 
            types.includes('headquarters') ||
            name.includes('headquarters') ||
            name.includes('corporate') ||
            name.includes('national office')) {
          return false;
        }
        
        // Exclude if appears to be a holding company or parent company
        if (types.includes('holding_company') || 
            name.includes('holdings') ||
            name.includes('inc.') && !types.some(t => t.includes('store') || t.includes('restaurant') || t.includes('shop'))) {
          return false;
        }
        
        return true;
      })
      .map((p: any) => ({
        place_id: p.place_id,
        name: p.name || 'Unknown',
        rating: p.rating,
        reviews: p.user_ratings_total,
        photos: (p.photos || []).length,
        types: p.types || []
      }));

    logger.info('[MEO Competitive Analysis] Filtered competitors', {
      rawCount: nearbyPlaces.length,
      filteredCount: competitors.length
    });

    return competitors;

  } catch (error: any) {
    logger.error('[MEO Competitive Analysis] Error fetching competitors', {
      error: error.message,
      stack: error.stack
    });
    return null;
  }
}

// ============================================================================
// PERCENTILE CALCULATION
// ============================================================================

/**
 * Calculate percentile rank for a value in a dataset
 * Returns 0-100 representing percentile rank
 */
function calculatePercentile(value: number, dataset: number[]): number {
  if (dataset.length === 0) return 50;
  
  const sorted = [...dataset].sort((a, b) => a - b);
  const below = sorted.filter(v => v < value).length;
  const equal = sorted.filter(v => v === value).length;
  
  // Use midpoint of equal values
  const percentile = ((below + equal / 2) / sorted.length) * 100;
  
  return Math.round(percentile);
}

/**
 * Get market position label from percentile
 */
function getMarketPositionLabel(avgPercentile: number): string {
  if (avgPercentile >= 90) return 'Top 10% - Market Leader';
  if (avgPercentile >= 80) return 'Top 20% - Strong Performer';
  if (avgPercentile >= 60) return 'Above Average';
  if (avgPercentile >= 40) return 'Average';
  if (avgPercentile >= 20) return 'Below Average';
  return 'Bottom 20% - Needs Improvement';
}

// ============================================================================
// MAIN ANALYSIS FUNCTION (NOW ASYNC)
// ============================================================================

/**
 * Analyze business against REAL local competition
 * 
 * STRICT RULES:
 * - Must fetch ≥3 real competitors from Google Places API
 * - Same niche/category (based on types)
 * - Within 10-15km radius
 * - If <3 competitors found → return error object
 * 
 * @returns MarketContext OR CompetitiveAnalysisError if insufficient data
 */
export async function analyzeCompetitivePosition(
  businessName: string,
  rating: number,
  reviews: number,
  photos: number,
  category: string,
  location: string,
  targetPlaceId: string | undefined,
  targetLat: number | undefined,
  targetLng: number | undefined,
  targetTypes: string[] | undefined
): Promise<MarketContext | CompetitiveAnalysisError> {
  
  // Validate required inputs for API call
  if (!targetPlaceId) {
    return {
      error: 'MEO competitive analysis blocked',
      reason: 'Missing target placeId - cannot fetch real competitors'
    };
  }

  if (typeof targetLat !== 'number' || typeof targetLng !== 'number') {
    return {
      error: 'MEO competitive analysis blocked',
      reason: 'Missing target lat/lng - cannot fetch real competitors'
    };
  }

  // Fetch real competitors from Google Places
  const competitors = await fetchRealCompetitors(
    targetLat,
    targetLng,
    targetPlaceId,
    targetTypes,
    12000 // 12km radius (within 10-15km rule)
  );

  // CRITICAL RULE: Must have at least 3 competitors
  if (!competitors || competitors.length < 3) {
    logger.warn('[MEO Competitive Analysis] Insufficient competitors found', {
      found: competitors?.length || 0,
      required: 3,
      targetPlaceId,
      location
    });
    
    return {
      error: 'MEO competitive analysis blocked',
      reason: `Found only ${competitors?.length || 0} competitors (minimum 3 required)`,
      details: {
        found: competitors?.length || 0,
        required: 3,
        location,
        targetPlaceId
      }
    };
  }

  logger.info('[MEO Competitive Analysis] Sufficient competitors found', {
    count: competitors.length,
    targetPlaceId
  });

  // Calculate local averages
  const localAvgRating = competitors.reduce((sum, c) => sum + c.rating, 0) / competitors.length;
  const localAvgReviews = competitors.reduce((sum, c) => sum + c.reviews, 0) / competitors.length;
  const localAvgPhotos = competitors.reduce((sum, c) => sum + c.photos, 0) / competitors.length;
  
  // Calculate percentiles
  const ratingPercentile = calculatePercentile(
    rating,
    competitors.map(c => c.rating)
  );
  
  const reviewsPercentile = calculatePercentile(
    reviews,
    competitors.map(c => c.reviews)
  );
  
  const photosPercentile = calculatePercentile(
    photos,
    competitors.map(c => c.photos)
  );
  
  // Calculate average percentile for market position
  const avgPercentile = (ratingPercentile + reviewsPercentile + photosPercentile) / 3;
  
  return {
    localAvgRating: Math.round(localAvgRating * 10) / 10,
    localAvgReviews: Math.round(localAvgReviews),
    localAvgPhotos: Math.round(localAvgPhotos),
    competitorsAnalyzed: competitors.length,
    competitivePercentile: {
      rating: ratingPercentile,
      reviews: reviewsPercentile,
      photos: photosPercentile
    },
    marketPosition: getMarketPositionLabel(avgPercentile)
  };
}

/**
 * Determine if business is a local leader
 * Based on high ratings, good review volume, and market position
 */
export function isLocalLeader(
  rating: number,
  reviews: number,
  marketPosition: string
): boolean {
  // Strong performer with high rating and good review volume
  if (rating >= 4.8 && reviews >= 150) {
    return true;
  }
  
  // Or top performer in market
  return (
    rating >= 4.7 &&
    reviews >= 50 &&
    (marketPosition.includes('Top 10%') || marketPosition.includes('Top 20%') || marketPosition.includes('Strong Performer'))
  );
}

/**
 * Determine if business has a perfect profile
 * All completeness elements present + high quality metrics
 */
export function isPerfectProfile(
  hasPhone: boolean,
  hasWebsite: boolean,
  hasHours: boolean,
  hasDescription: boolean,
  photoCount: number,
  rating: number,
  reviews: number
): boolean {
  return (
    hasPhone &&
    hasWebsite &&
    hasHours &&
    hasDescription &&
    photoCount >= 10 &&
    rating >= 4.5 &&
    reviews >= 20
  );
}

/**
 * Calculate dominance type based on market position and characteristics
 */
export function calculateDominanceType(
  finalScore: number,
  isFranchise: boolean,
  isLocalLeader: boolean,
  isPerfectProfile: boolean,
  percentiles: CompetitivePercentile
): string | null {
  const avgPercentile = (percentiles.rating + percentiles.reviews + percentiles.photos) / 3;
  
  if (isPerfectProfile && isLocalLeader && avgPercentile >= 90) {
    return 'Absolute Market Leader';
  }
  
  if (isLocalLeader && avgPercentile >= 80) {
    return 'Local Leader';
  }
  
  // Local leader regardless of percentile (high rating + volume)
  if (isLocalLeader) {
    return 'Local Leader';
  }
  
  if (isFranchise && finalScore >= 65 && avgPercentile >= 70) {
    return 'Strong Franchise Presence';
  }
  
  if (isPerfectProfile && avgPercentile >= 70) {
    return 'Well-Optimized Business';
  }
  
  if (avgPercentile >= 80) {
    return 'Strong Competitor';
  }
  
  return null;
}
