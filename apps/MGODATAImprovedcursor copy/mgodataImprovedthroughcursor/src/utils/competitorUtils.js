/**
 * Competitor utility functions for formatting and filtering
 */

/**
 * Format distance in miles with 1 decimal
 */
export function formatDistanceMiles(meters) {
  if (!meters || meters < 0) return '—';
  
  const miles = meters / 1609.344;
  
  if (miles < 0.1) return '<0.1 mi';
  return `${miles.toFixed(1)} mi`;
}

/**
 * Format review count compactly (1.2k, 12.4k)
 */
export function formatReviewCount(count) {
  if (!count || count === 0) return '0';
  
  if (count >= 10000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  
  return count.toString();
}

/**
 * Normalize Google Places types to readable labels
 */
export function normalizePlaceTypesToLabels(types) {
  if (!Array.isArray(types) || types.length === 0) return [];
  
  const labelMap = {
    'cafe': 'Cafe',
    'coffee_shop': 'Coffee Shop',
    'restaurant': 'Restaurant',
    'bakery': 'Bakery',
    'bar': 'Bar',
    'meal_takeaway': 'Takeaway',
    'meal_delivery': 'Delivery',
    'food': 'Food',
    'barber_shop': 'Barber',
    'hair_care': 'Hair Salon',
    'beauty_salon': 'Beauty Salon',
    'nail_salon': 'Nail Salon',
    'gym': 'Gym',
    'health': 'Health',
    'dentist': 'Dentist',
    'doctor': 'Doctor',
    'lawyer': 'Lawyer',
    'real_estate_agency': 'Real Estate',
    'store': 'Store',
    'establishment': 'Business'
  };
  
  return types
    .filter(t => labelMap[t]) // Only include mapped types
    .map(t => labelMap[t])
    .slice(0, 2); // Max 2 labels
}

/**
 * Relevant types for each business category
 */
const RELEVANT_TYPES = {
  'coffee_shop': ['cafe', 'coffee_shop', 'bakery', 'restaurant'],
  'cafe': ['cafe', 'coffee_shop', 'bakery', 'restaurant'],
  'restaurant': ['restaurant', 'cafe', 'bar', 'food', 'meal_takeaway'],
  'barber_shop': ['barber_shop', 'hair_care', 'beauty_salon'],
  'hair_salon': ['hair_care', 'beauty_salon', 'barber_shop'],
  'nail_salon': ['beauty_salon', 'nail_salon', 'hair_care'],
  'gym': ['gym', 'health'],
  'dentist': ['dentist', 'doctor', 'health'],
  'default': ['cafe', 'coffee_shop', 'restaurant', 'bakery', 'store', 'food']
};

/**
 * Excluded types (hotels, lodging, etc.)
 */
const EXCLUDED_TYPES = [
  'lodging',
  'hotel',
  'motel',
  'resort_hotel',
  'apartment_hotel',
  'hostel',
  'travel_agency',
  'tourist_attraction',
  'airport',
  'bus_station',
  'train_station',
  'transit_station'
];

/**
 * Filter competitors for relevance (frontend defense-in-depth)
 * 
 * @param {Array} competitors - Raw competitors from API
 * @param {string} businessCategory - Category of scanned business
 * @returns {Array} - Filtered competitors
 */
export function filterRelevantCompetitors(competitors, businessCategory = null) {
  if (!Array.isArray(competitors) || competitors.length === 0) {
    return [];
  }
  
  const relevantTypes = businessCategory && RELEVANT_TYPES[businessCategory] 
    ? RELEVANT_TYPES[businessCategory]
    : RELEVANT_TYPES.default;
  
  return competitors.filter(competitor => {
    const types = competitor.types || [];
    
    // Rule 1: Must NOT contain any excluded type
    const hasExcludedType = types.some(t => EXCLUDED_TYPES.includes(t));
    if (hasExcludedType) {
      if (import.meta.env.DEV) {
        console.log('[Competitor Filter] Excluded (hotel/lodging):', competitor.name, types);
      }
      return false;
    }
    
    // Rule 2: Must contain at least one relevant type
    const hasRelevantType = types.some(t => relevantTypes.includes(t));
    if (!hasRelevantType) {
      if (import.meta.env.DEV) {
        console.log('[Competitor Filter] Excluded (no relevant type):', competitor.name, types);
      }
      return false;
    }
    
    // Rule 3: Must have placeId (defensive)
    if (!competitor.placeId) {
      if (import.meta.env.DEV) {
        console.warn('[Competitor Filter] Missing placeId:', competitor.name);
      }
      return false;
    }
    
    return true;
  });
}

/**
 * Calculate competitor score for "main competitor" ranking
 * Score = (rating * log10(reviews+10)) / distanceFactor
 * 
 * Higher score = more relevant competitor
 * 
 * @param {Object} competitor - Competitor object
 * @returns {number} - Score
 */
export function calculateCompetitorScore(competitor) {
  const rating = competitor.rating || 3.5; // Default to average if missing
  const reviews = competitor.userRatingsTotal || 0;
  const distanceMeters = competitor.distanceMeters || 1000;
  
  // Review factor: log scale to balance popular vs niche
  const reviewFactor = Math.log10(reviews + 10);
  
  // Distance factor: closer = higher score, but not too dominant
  // 0-500m: 1.5x, 500-1000m: 1.2x, 1000-2000m: 1.0x, >2000m: 0.8x
  let distanceFactor = 1.0;
  if (distanceMeters < 500) {
    distanceFactor = 1.5;
  } else if (distanceMeters < 1000) {
    distanceFactor = 1.2;
  } else if (distanceMeters > 2000) {
    distanceFactor = 0.8;
  }
  
  const score = (rating * reviewFactor * distanceFactor) / 10; // Normalize to 0-10 range
  
  return score;
}

/**
 * Find main competitor from list (highest score)
 * 
 * @param {Array} competitors - Filtered competitors
 * @returns {Object|null} - Main competitor or null
 */
export function findMainCompetitor(competitors) {
  if (!Array.isArray(competitors) || competitors.length === 0) {
    return null;
  }
  
  const scored = competitors.map(c => ({
    ...c,
    score: calculateCompetitorScore(c)
  }));
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  if (import.meta.env.DEV) {
    console.log('[Main Competitor] Scores:', scored.slice(0, 3).map(c => ({
      name: c.name,
      score: c.score.toFixed(2),
      rating: c.rating,
      reviews: c.userRatingsTotal,
      distance: formatDistanceMiles(c.distanceMeters)
    })));
  }
  
  return scored[0] || null;
}

/**
 * Sort competitors by user preference
 * 
 * @param {Array} competitors - Competitors to sort
 * @param {string} sortBy - 'relevance' | 'distance' | 'rating' | 'reviews'
 * @returns {Array} - Sorted competitors
 */
export function sortCompetitors(competitors, sortBy = 'relevance') {
  if (!Array.isArray(competitors) || competitors.length === 0) {
    return [];
  }
  
  const sorted = [...competitors];
  
  switch (sortBy) {
    case 'relevance':
      // Sort by competitor score (rating + reviews + distance)
      sorted.sort((a, b) => calculateCompetitorScore(b) - calculateCompetitorScore(a));
      break;
    case 'distance':
      sorted.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
      break;
    case 'rating':
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'reviews':
      sorted.sort((a, b) => (b.userRatingsTotal || 0) - (a.userRatingsTotal || 0));
      break;
    default:
      // Default to relevance
      sorted.sort((a, b) => calculateCompetitorScore(b) - calculateCompetitorScore(a));
  }
  
  return sorted;
}


