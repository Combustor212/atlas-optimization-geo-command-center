/**
 * MEO (Map Engine Optimization) Scoring
 */
import { PlaceDetails, MEOScore, MEOScoreBreakdown } from '../../types';

/**
 * Calculate MEO score (0-100)
 */
export function calculateMEOScore(place: PlaceDetails): MEOScore {
  const breakdown: MEOScoreBreakdown = {
    profile_completeness: {
      phone: place.formatted_phone_number || place.international_phone_number ? 6 : 0,
      website: place.website ? 6 : 0,
      opening_hours: place.opening_hours?.weekday_text && place.opening_hours.weekday_text.length > 0 ? 8 : 0,
      types: place.types && place.types.length > 0 ? 6 : 0,
      photos: calculatePhotosScore(place.photos?.length || 0),
      total: 0
    },
    reputation: {
      rating_quality: calculateRatingQualityScore(place.rating),
      rating_volume: calculateRatingVolumeScore(place.user_ratings_total || 0),
      total: 0
    },
    trust_eligibility: {
      business_status: place.business_status === 'OPERATIONAL' ? 10 : 0,
      address_geometry: (place.formatted_address && place.geometry) ? 5 : 0,
      total: 0
    }
  };

  // Calculate totals
  breakdown.profile_completeness.total = 
    breakdown.profile_completeness.phone +
    breakdown.profile_completeness.website +
    breakdown.profile_completeness.opening_hours +
    breakdown.profile_completeness.types +
    breakdown.profile_completeness.photos;

  breakdown.reputation.total = 
    breakdown.reputation.rating_quality +
    breakdown.reputation.rating_volume;

  breakdown.trust_eligibility.total = 
    breakdown.trust_eligibility.business_status +
    breakdown.trust_eligibility.address_geometry;

  // Total score
  const totalScore = 
    breakdown.profile_completeness.total +
    breakdown.reputation.total +
    breakdown.trust_eligibility.total;

  return {
    score: Math.round(totalScore),
    breakdown
  };
}

/**
 * Calculate photos score (0-14)
 */
function calculatePhotosScore(photoCount: number): number {
  if (photoCount === 0) return 0;
  if (photoCount >= 1 && photoCount <= 3) return 4;
  if (photoCount >= 4 && photoCount <= 9) return 9;
  if (photoCount >= 10) return 14;
  return 0;
}

/**
 * Calculate rating quality score (0-25)
 * Maps rating from 3.5-5.0 to 0-25 linearly
 */
function calculateRatingQualityScore(rating: number | undefined): number {
  if (!rating || rating < 3.5) return 0;
  if (rating >= 5.0) return 25;
  
  // Linear mapping: 3.5 -> 0, 5.0 -> 25
  const normalized = (rating - 3.5) / (5.0 - 3.5);
  return Math.round(normalized * 25);
}

/**
 * Calculate rating volume score (0-20)
 */
function calculateRatingVolumeScore(reviewCount: number): number {
  if (reviewCount >= 100) return 20;
  if (reviewCount >= 20 && reviewCount <= 99) return 13;
  if (reviewCount >= 5 && reviewCount <= 19) return 6;
  return 0;
}

