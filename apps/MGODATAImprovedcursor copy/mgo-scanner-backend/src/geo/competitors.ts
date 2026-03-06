/**
 * GEO Competitor Fetching (Google Places Nearby Search)
 * Builds a real competitor set for GEO benchmarking
 */

import { PlaceDetails } from '../types';
import { getPlaceDetailsForExplain } from '../lib/places';
import { logger } from '../lib/logger';
import type { GEOCandidate, GEOCompetitorSet } from './geoSchema';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.PLACES_API_KEY;
if (!GOOGLE_PLACES_API_KEY) {
  throw new Error('GOOGLE_PLACES_API_KEY or PLACES_API_KEY environment variable is required');
}
// Type assertion after validation
const API_KEY: string = GOOGLE_PLACES_API_KEY;

const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

/**
 * Fetch competitors via Places Nearby Search
 * Returns up to 30 competitors in the same category within radius
 */
export async function fetchCompetitors(
  targetPlaceId: string,
  radiusMeters: number = 5000,
  opts: { maxCompetitors?: number } = {}
): Promise<GEOCompetitorSet> {
  const maxCompetitors = opts.maxCompetitors ?? 30;

  // 1) Fetch target business details
  logger.info('[GEO Competitors] Fetching target', { placeId: targetPlaceId });
  const targetPlace = await getPlaceDetailsForExplain(targetPlaceId);

  if (!targetPlace.geometry?.location) {
    throw new Error('Target place missing geometry/location');
  }

  const targetLat = targetPlace.geometry.location.lat;
  const targetLng = targetPlace.geometry.location.lng;

  // 2) Determine primary niche/category
  const primaryType = (targetPlace.types && targetPlace.types[0]) || 'establishment';
  const nicheCanonical = primaryType.replace(/_/g, ' ');
  const niche = nicheCanonical.charAt(0).toUpperCase() + nicheCanonical.slice(1);

  logger.info('[GEO Competitors] Primary niche', { niche, primaryType });

  // 3) Fetch competitors via Nearby Search
  const nearbyUrl = new URL(`${PLACES_API_BASE}/nearbysearch/json`);
  nearbyUrl.searchParams.set('location', `${targetLat},${targetLng}`);
  nearbyUrl.searchParams.set('radius', radiusMeters.toString());
  nearbyUrl.searchParams.set('type', primaryType);
  nearbyUrl.searchParams.set('key', API_KEY);

  const nearbyResponse = await fetch(nearbyUrl.toString());
  if (!nearbyResponse.ok) {
    throw new Error(`Places Nearby API error: ${nearbyResponse.status}`);
  }

  const nearbyData = await nearbyResponse.json() as any;
  if (nearbyData.status !== 'OK' && nearbyData.status !== 'ZERO_RESULTS') {
    throw new Error(`Places Nearby API error: ${nearbyData.status} - ${nearbyData.error_message || 'Unknown error'}`);
  }

  const nearbyPlaces = nearbyData.results || [];
  logger.info('[GEO Competitors] Nearby results', { count: nearbyPlaces.length });

  // 4) Filter out target itself + pick top N by rating/reviews
  const competitorCandidates = nearbyPlaces
    .filter((p: any) => p.place_id !== targetPlaceId)
    .slice(0, maxCompetitors);

  if (competitorCandidates.length < 8) {
    throw new Error(`Insufficient competitors (found ${competitorCandidates.length}, need at least 8)`);
  }

  // 5) Fetch details for each competitor (in parallel, but limit concurrency)
  logger.info('[GEO Competitors] Fetching competitor details', { count: competitorCandidates.length });
  const competitorDetails = await Promise.all(
    competitorCandidates.map(async (c: any) => {
      try {
        return await getPlaceDetailsForExplain(c.place_id);
      } catch (err) {
        logger.error('[GEO Competitors] Failed to fetch competitor', { placeId: c.place_id, error: err });
        return null;
      }
    })
  );

  const validCompetitors = competitorDetails.filter((c): c is PlaceDetails => c !== null);

  if (validCompetitors.length < 8) {
    throw new Error(`Insufficient valid competitors (fetched ${validCompetitors.length}, need at least 8)`);
  }

  // 6) Convert to GEOCandidate format
  const targetCandidate = placeToCandidate(targetPlace, targetLat, targetLng, 0);
  const competitorCandidates2 = validCompetitors.map((c) =>
    placeToCandidate(c, targetLat, targetLng, haversineDistance(targetLat, targetLng, c.geometry!.location.lat, c.geometry!.location.lng))
  );

  // 7) Determine location label (city, state from target address)
  const locationLabel = extractLocationLabel(targetPlace.formatted_address || '');

  return {
    target: targetCandidate,
    competitors: competitorCandidates2,
    niche,
    nicheCanonical,
    locationLabel,
    radiusMeters,
    competitorsFetchedAt: new Date().toISOString()
  };
}

/**
 * Convert PlaceDetails to GEOCandidate
 */
function placeToCandidate(place: PlaceDetails, targetLat: number, targetLng: number, distanceMeters: number): GEOCandidate {
  return {
    placeId: place.place_id,
    name: place.name || 'Unknown',
    address: place.formatted_address || '',
    lat: place.geometry?.location.lat || 0,
    lng: place.geometry?.location.lng || 0,
    distanceMeters,
    rating: place.rating || 0,
    reviewCount: place.user_ratings_total || 0,
    photoCount: place.photos?.length || 0,
    hasWebsite: !!place.website,
    hasPhone: !!(place.formatted_phone_number || place.international_phone_number),
    hasHours: !!(place.opening_hours?.weekday_text && place.opening_hours.weekday_text.length > 0),
    types: place.types || []
  };
}

/**
 * Haversine distance (meters)
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

/**
 * Extract city, state from formatted address
 */
function extractLocationLabel(address: string): string {
  // Example: "123 Main St, Liberty Township, OH 45044, USA"
  // Extract "Liberty Township, OH"
  const parts = address.split(',').map((p) => p.trim());
  if (parts.length >= 3) {
    return `${parts[parts.length - 3]}, ${parts[parts.length - 2].split(' ')[0]}`;
  }
  return address;
}

