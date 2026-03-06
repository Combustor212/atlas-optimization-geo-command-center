/**
 * Nearby Competitors API - Phase A
 * Returns REAL competitors from Google Places API with verifiable placeIds
 */

import { Request, Response } from 'express';
import { logger } from '../lib/logger';
import { getPlaceDetailsForExplain } from '../lib/places';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.PLACES_API_KEY;
if (!GOOGLE_PLACES_API_KEY) {
  throw new Error('GOOGLE_PLACES_API_KEY or PLACES_API_KEY environment variable is required');
}
const API_KEY: string = GOOGLE_PLACES_API_KEY;

const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

/**
 * HARD EXCLUSION LIST - never return these types as competitors
 * (prevents hotels, lodging, etc. from appearing in coffee shop results)
 */
const EXCLUDED_TYPES = [
  'lodging',
  'hotel',
  'motel',
  'resort_hotel',
  'apartment_hotel',
  'tourist_attraction',
  'apartment_complex',
  'hostel',
  'campground',
  'rv_park'
];

/**
 * Category to Google Places types mapping
 * Maps common business categories to relevant Google Places types
 */
const CATEGORY_TYPE_MAP: Record<string, string[]> = {
  'coffee_shop': ['cafe', 'coffee_shop', 'bakery'],
  'cafe': ['cafe', 'coffee_shop', 'bakery'],
  'barber_shop': ['hair_care', 'barber_shop'],
  'hair_salon': ['hair_care', 'beauty_salon'],
  'nail_salon': ['beauty_salon', 'nail_salon'],
  'restaurant': ['restaurant', 'meal_takeaway', 'meal_delivery'],
  'gym': ['gym', 'health'],
  'dentist': ['dentist', 'health'],
  'lawyer': ['lawyer'],
  'real_estate': ['real_estate_agency'],
  'plumber': ['plumber'],
  'electrician': ['electrician']
};

/**
 * Get Google Places types for a business category
 */
function getTypesForCategory(category: string | null): string[] {
  if (!category) return [];
  
  const normalized = category.toLowerCase().trim().replace(/\s+/g, '_');
  
  // Direct match
  if (CATEGORY_TYPE_MAP[normalized]) {
    return CATEGORY_TYPE_MAP[normalized];
  }
  
  // Partial match
  for (const [key, types] of Object.entries(CATEGORY_TYPE_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return types;
    }
  }
  
  return [];
}

export interface NearbyCompetitor {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  userRatingsTotal: number | null;
  types: string[];
  distanceMeters: number;
  lat: number;
  lng: number;
}

interface NearbyCompetitorsResponse {
  success: boolean;
  competitors: NearbyCompetitor[];
  target: {
    placeId: string;
    name: string;
    lat: number;
    lng: number;
    primaryType: string;
  };
  radiusMeters: number;
  count: number;
}

interface NearbyCompetitorsError {
  success: false;
  error: string;
  message: string;
}

/**
 * GET /api/geo/competitors/nearby
 * 
 * Query params:
 * - placeId: target business placeId (required)
 * - radius: search radius in meters (default 5000)
 * - limit: max competitors to return (default 10, max 20)
 * - category: business category for filtering (optional, e.g. 'coffee_shop', 'barber_shop')
 */
export async function handleGetNearbyCompetitors(
  req: Request,
  res: Response
): Promise<void> {
  const { placeId, radius, limit, category } = req.query;

  // Validation
  if (!placeId || typeof placeId !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Missing placeId',
      message: 'Query parameter placeId is required'
    } as NearbyCompetitorsError);
    return;
  }

  const radiusMeters = radius ? Math.min(parseInt(radius as string, 10), 10000) : 8000;
  const limitCount = limit ? Math.min(parseInt(limit as string, 10), 20) : 10;
  const businessCategory = category ? (category as string).toLowerCase() : null;

  try {
    logger.info('[Nearby Competitors] Fetching competitors', { 
      placeId, 
      radiusMeters, 
      limitCount 
    });

    // 1) Fetch target business details to get location + type
    const targetPlace = await getPlaceDetailsForExplain(placeId);

    if (!targetPlace.geometry?.location) {
      res.status(400).json({
        success: false,
        error: 'Invalid place',
        message: 'Target place missing geometry/location'
      } as NearbyCompetitorsError);
      return;
    }

    const targetLat = targetPlace.geometry.location.lat;
    const targetLng = targetPlace.geometry.location.lng;
    const targetName = targetPlace.name || 'Unknown';

    // 2) Determine search types based on category param or target business type
    let searchTypes: string[] = [];
    let searchTypeFilter: string | null = null;
    
    if (businessCategory) {
      // Use explicit category mapping (preferred)
      searchTypes = getTypesForCategory(businessCategory);
      searchTypeFilter = searchTypes[0] || null;
    } else {
      // Fallback to target's primary type
      const primaryType = (targetPlace.types && targetPlace.types[0]) || null;
      if (primaryType) {
        searchTypes = [primaryType];
        searchTypeFilter = primaryType;
      }
    }
    
    // ✅ STEP 3: DEV logging - target details
    if (process.env.NODE_ENV !== 'production') {
      logger.info('[Nearby Competitors] 📍 Target resolved', { 
        name: targetName,
        lat: targetLat,
        lng: targetLng,
        targetTypes: targetPlace.types?.join(', ') || 'none',
        categoryParam: businessCategory || 'none',
        searchTypes: searchTypes.join(', ') || 'none',
        searchTypeFilter: searchTypeFilter || 'none'
      });
    }

    // 3) Call Google Places Nearby Search
    const nearbyUrl = new URL(`${PLACES_API_BASE}/nearbysearch/json`);
    nearbyUrl.searchParams.set('location', `${targetLat},${targetLng}`);
    nearbyUrl.searchParams.set('radius', radiusMeters.toString());
    
    // Add type filter if available
    if (searchTypeFilter) {
      nearbyUrl.searchParams.set('type', searchTypeFilter);
    }
    
    // For coffee shops, add keyword for better results
    if (businessCategory === 'coffee_shop' || businessCategory === 'cafe') {
      nearbyUrl.searchParams.set('keyword', 'coffee');
    }
    
    nearbyUrl.searchParams.set('key', API_KEY);

    // ✅ STEP 3: DEV logging - request details
    if (process.env.NODE_ENV !== 'production') {
      logger.info('[Nearby Competitors] 📡 Calling Places API', {
        url: nearbyUrl.toString().replace(API_KEY, 'API_KEY_HIDDEN'),
        radiusMeters,
        searchTypeFilter: searchTypeFilter || 'none',
        categoryParam: businessCategory || 'none',
        searchTypes: searchTypes.join(', ') || 'none'
      });
    }

    let nearbyResponse = await fetch(nearbyUrl.toString());
    
    if (!nearbyResponse.ok) {
      throw new Error(`Places Nearby API HTTP error: ${nearbyResponse.status}`);
    }

    let nearbyData = await nearbyResponse.json() as any;

    if (nearbyData.status !== 'OK' && nearbyData.status !== 'ZERO_RESULTS') {
      throw new Error(`Places Nearby API error: ${nearbyData.status} - ${nearbyData.error_message || 'Unknown error'}`);
    }

    let nearbyPlaces = nearbyData.results || [];
    
    // ✅ STEP 3: DEV logging - raw results
    if (process.env.NODE_ENV !== 'production') {
      logger.info('[Nearby Competitors] 📥 Raw results from Places API', { 
        count: nearbyPlaces.length,
        status: nearbyData.status,
        withType: searchTypeFilter || 'none'
      });
    }

    // ✅ ROOT CAUSE #3: If type filter is too strict, retry without type
    // BUT: Only retry if we're NOT using a specific category filter
    // (category filters should be strict - don't show irrelevant competitors)
    if (nearbyPlaces.length === 0 && searchTypeFilter && !businessCategory) {
      if (process.env.NODE_ENV !== 'production') {
        logger.info('[Nearby Competitors] 🔄 Zero results with type, retrying without type filter');
      }

      const fallbackUrl = new URL(`${PLACES_API_BASE}/nearbysearch/json`);
      fallbackUrl.searchParams.set('location', `${targetLat},${targetLng}`);
      fallbackUrl.searchParams.set('radius', radiusMeters.toString());
      // No type filter
      fallbackUrl.searchParams.set('key', API_KEY);

      nearbyResponse = await fetch(fallbackUrl.toString());
      
      if (!nearbyResponse.ok) {
        throw new Error(`Places Nearby API HTTP error (fallback): ${nearbyResponse.status}`);
      }

      nearbyData = await nearbyResponse.json() as any;

      if (nearbyData.status !== 'OK' && nearbyData.status !== 'ZERO_RESULTS') {
        throw new Error(`Places Nearby API error (fallback): ${nearbyData.status} - ${nearbyData.error_message || 'Unknown error'}`);
      }

      nearbyPlaces = nearbyData.results || [];
      
      if (process.env.NODE_ENV !== 'production') {
        logger.info('[Nearby Competitors] 📥 Fallback results (no type filter)', { 
          count: nearbyPlaces.length,
          status: nearbyData.status
        });
      }
    }

    // 4) Filter out target itself + map to competitor format
    // ✅ STEP 3: Track filtering reasons for debugging
    let dropCounts = {
      missingPlaceId: 0,
      isTarget: 0,
      missingGeometry: 0,
      excludedType: 0
    };

    const competitors: NearbyCompetitor[] = nearbyPlaces
      .filter((p: any) => {
        // ✅ HARD RULE: Must have placeId (absolutely required)
        if (!p.place_id) {
          dropCounts.missingPlaceId++;
          if (process.env.NODE_ENV !== 'production') {
            logger.warn('[Nearby Competitors] ❌ Discarded result without placeId', { name: p.name });
          }
          return false;
        }
        
        // ✅ HARD RULE: Exclude target itself
        if (p.place_id === placeId) {
          dropCounts.isTarget++;
          return false;
        }
        
        // ✅ HARD RULE: Must have location for distance calculation
        if (!p.geometry?.location) {
          dropCounts.missingGeometry++;
          if (process.env.NODE_ENV !== 'production') {
            logger.warn('[Nearby Competitors] ❌ Discarded result without location', { placeId: p.place_id });
          }
          return false;
        }
        
        const placeTypes = (p.types || []) as string[];
        
        // ✅ DEFENSE-IN-DEPTH: Exclude results with unwanted types (hotels, lodging, etc.)
        const hasExcludedType = placeTypes.some(t => EXCLUDED_TYPES.includes(t));
        
        if (hasExcludedType) {
          dropCounts.excludedType++;
          if (process.env.NODE_ENV !== 'production') {
            logger.warn('[Nearby Competitors] ❌ Discarded result with excluded type', { 
              name: p.name,
              placeId: p.place_id.substring(0, 16),
              types: placeTypes.join(', '),
              excludedTypes: placeTypes.filter(t => EXCLUDED_TYPES.includes(t)).join(', ')
            });
          }
          return false;
        }
        
        // ✅ RELEVANCE CHECK: Must have at least one relevant type for the category
        if (searchTypes.length > 0) {
          const hasRelevantType = placeTypes.some(t => searchTypes.includes(t));
          if (!hasRelevantType) {
            dropCounts.excludedType++; // Count as excluded for stats
            if (process.env.NODE_ENV !== 'production') {
              logger.warn('[Nearby Competitors] ❌ Discarded result without relevant type', { 
                name: p.name,
                types: placeTypes.join(', '),
                expectedTypes: searchTypes.join(', ')
              });
            }
            return false;
          }
        }
        
        return true;
      })
      .slice(0, limitCount)
      .map((p: any) => {
        const competitorLat = p.geometry.location.lat;
        const competitorLng = p.geometry.location.lng;
        const distanceMeters = haversineDistance(targetLat, targetLng, competitorLat, competitorLng);

        // ✅ GUARANTEE: At this point, every competitor has been validated to have:
        // - placeId (Google-issued, immutable)
        // - geometry.location (lat/lng)
        // - NOT the target business itself
        // - NOT an excluded type (hotel, lodging, etc.)
        
        // ✅ Normalize response fields (handle various Google response shapes)
        const rating = p.rating || null;
        const reviews = p.user_ratings_total || p.userRatingsTotal || null;
        
        return {
          placeId: p.place_id, // ✅ VERIFIED: Google placeId present
          name: p.name || 'Unknown Business',
          address: p.vicinity || p.formatted_address || '',
          rating: rating !== null ? Number(rating) : null,
          userRatingsTotal: reviews !== null ? Number(reviews) : null,
          types: p.types || [],
          distanceMeters: Math.round(distanceMeters),
          lat: competitorLat,
          lng: competitorLng
        } as NearbyCompetitor;
      });

    // ✅ STEP 3: DEV logging - filtered results
    if (process.env.NODE_ENV !== 'production') {
      logger.info('[Nearby Competitors] ✅ Filtered and mapped', { 
        rawCount: nearbyPlaces.length,
        droppedMissingPlaceId: dropCounts.missingPlaceId,
        droppedIsTarget: dropCounts.isTarget,
        droppedMissingGeometry: dropCounts.missingGeometry,
        droppedExcludedType: dropCounts.excludedType,
        finalCount: competitors.length,
        categoryUsed: businessCategory || 'auto-detected',
        samplePlaceIds: competitors.slice(0, 3).map(c => c.placeId.substring(0, 16)),
        sampleNames: competitors.slice(0, 3).map(c => c.name),
        sampleTypes: competitors.slice(0, 3).map(c => c.types.slice(0, 2).join(', '))
      });
    } else {
      logger.info('[Nearby Competitors] Filtered and mapped', { 
        total: competitors.length
      });
    }

    // 5) Return response
    const response: NearbyCompetitorsResponse = {
      success: true,
      competitors,
      target: {
        placeId,
        name: targetName,
        lat: targetLat,
        lng: targetLng,
        primaryType: searchTypeFilter || businessCategory || 'establishment'
      },
      radiusMeters,
      count: competitors.length
    };

    res.json(response);

  } catch (error: any) {
    logger.error('[Nearby Competitors] Error fetching competitors', { 
      placeId, 
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch competitors',
      message: error.message || 'Unknown error occurred'
    } as NearbyCompetitorsError);
  }
}

/**
 * Haversine distance formula (meters)
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

