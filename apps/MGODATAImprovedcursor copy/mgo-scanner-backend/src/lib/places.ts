/**
 * Google Places API helpers
 */
import { PlaceDetails, NAP } from '../types';
import { placesCache } from './cache';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.PLACES_API_KEY;
if (!GOOGLE_PLACES_API_KEY) {
  throw new Error('GOOGLE_PLACES_API_KEY or PLACES_API_KEY environment variable is required');
}
// Type assertion after validation
const API_KEY: string = GOOGLE_PLACES_API_KEY;

const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';
const PLACES_V1_BASE = 'https://places.googleapis.com/v1/places';

type PlacesV1Place = any;

async function fetchPlaceDetailsV1(placeId: string, fieldMask: string): Promise<PlacesV1Place> {
  const url = `${PLACES_V1_BASE}/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': fieldMask,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[PLACES] ERROR', res.status, body);
    throw new Error(`Places details failed: ${res.status}`);
  }

  return (await res.json()) as PlacesV1Place;
}

function mapPlacesV1ToLegacyPlaceDetails(placeId: string, v1: PlacesV1Place): PlaceDetails {
  const lat = v1?.location?.latitude;
  const lng = v1?.location?.longitude;

  const weekdayText: string[] | undefined =
    v1?.regularOpeningHours?.weekdayDescriptions ||
    v1?.regularOpeningHours?.weekday_text ||
    undefined;

  const photos = Array.isArray(v1?.photos)
    ? v1.photos.map((p: any) => ({
        photo_reference: p?.name || p?.googleMapsUri || 'v1_photo',
        height: p?.heightPx,
        width: p?.widthPx,
      }))
    : undefined;

  const reviews = Array.isArray(v1?.reviews)
    ? v1.reviews.map((r: any) => ({
        author_name: r?.authorAttribution?.displayName,
        rating: r?.rating,
        text: r?.text?.text || r?.text || '',
        time: r?.publishTime ? Math.floor(new Date(r.publishTime).getTime() / 1000) : undefined,
        relative_time_description: r?.relativePublishTimeDescription,
      }))
    : undefined;

  const placeDetails: PlaceDetails = {
    place_id: placeId,
    name: v1?.displayName?.text || v1?.displayName || v1?.name || '',
    formatted_address: v1?.formattedAddress || v1?.shortFormattedAddress || '',
    geometry:
      typeof lat === 'number' && typeof lng === 'number'
        ? { location: { lat, lng } }
        : undefined,

    formatted_phone_number: v1?.nationalPhoneNumber,
    international_phone_number: v1?.internationalPhoneNumber,
    website: v1?.websiteUri,
    websiteUri: v1?.websiteUri,

    rating: typeof v1?.rating === 'number' ? v1.rating : undefined,
    user_ratings_total: typeof v1?.userRatingCount === 'number' ? v1.userRatingCount : undefined,

    opening_hours: weekdayText ? { weekday_text: weekdayText } : undefined,

    types: Array.isArray(v1?.types) ? v1.types : undefined,
    primaryType: v1?.primaryType,
    primaryTypeDisplayName: v1?.primaryTypeDisplayName,
    displayName: v1?.displayName,
    editorialSummary: v1?.editorialSummary,
    editorial_summary: v1?.editorialSummary
      ? { overview: v1.editorialSummary?.text, language: v1.editorialSummary?.languageCode }
      : undefined,

    photos,
    reviews,
  };

  return placeDetails;
}

/**
 * Normalize phone number to E.164 format when possible
 */
export function normalizePhone(phone: string | undefined): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If starts with country code, keep it; otherwise assume US (+1)
  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  } else if (digits.length > 11) {
    return `+${digits}`;
  }
  
  return phone; // Return original if can't normalize
}

/**
 * Normalize address
 */
export function normalizeAddress(address: string | undefined): string {
  if (!address) return '';
  return address.trim().replace(/\s+/g, ' ');
}

/**
 * Find place from text query
 */
export async function findPlaceFromText(query: string): Promise<string | null> {
  const url = new URL(`${PLACES_API_BASE}/findplacefromtext/json`);
  url.searchParams.set('input', query);
  url.searchParams.set('inputtype', 'textquery');
  url.searchParams.set('fields', 'place_id,name,formatted_address');
  url.searchParams.set('key', API_KEY);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Places API error: ${response.status}`);
  }

  const data = await response.json() as any;
  
  if (data.status === 'OK' && data.candidates && data.candidates.length > 0) {
    return data.candidates[0].place_id as string;
  }

  return null;
}

/**
 * Get place details from Google Places API
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  // Check cache first
  const cacheKey = `place:${placeId}`;
  const cached = placesCache.get<PlaceDetails>(cacheKey);
  if (cached) {
    return cached;
  }

  // Places API v1 with REQUIRED fields for category resolution
  const fieldMask = [
    'displayName',
    'primaryType',
    'primaryTypeDisplayName',
    'types',
    'editorialSummary',
    'websiteUri',
    'googleMapsUri',
    'location',
    'formattedAddress',
    // Also include basics for completeness
    'nationalPhoneNumber',
    'internationalPhoneNumber',
    'rating',
    'userRatingCount',
    'regularOpeningHours',
    'photos'
  ].join(',');

  console.error('[PLACES FETCH]', { placeId, fieldMask });
  const v1 = await fetchPlaceDetailsV1(placeId, fieldMask);
  console.error('[PLACES RAW RESPONSE]', JSON.stringify(v1, null, 2));

  const placeDetails = mapPlacesV1ToLegacyPlaceDetails(placeId, v1);

  // 🔊 Prove where data breaks: these should be populated for real businesses
  console.error('[PLACES MAPPED]', {
    placeId,
    name: placeDetails.name,
    displayName: placeDetails.displayName,
    primaryType: placeDetails.primaryType,
    primaryTypeDisplayName: placeDetails.primaryTypeDisplayName,
    types: placeDetails.types?.slice(0, 10),
    editorialSummary: placeDetails.editorial_summary,
    websiteUri: placeDetails.website
  });
  
  // Cache for 24 hours
  placesCache.set(cacheKey, placeDetails, 1000 * 60 * 60 * 24);
  
  return placeDetails;
}

/**
 * Get richer place details for explain panels.
 * Notes:
 * - `photos` and `reviews` are limited by the Places API response.
 * - We cache separately from the generic `getPlaceDetails` because this fetch is heavier.
 */
export async function getPlaceDetailsForExplain(
  placeId: string,
  opts: { ttlMs?: number; forceRefresh?: boolean } = {}
): Promise<PlaceDetails> {
  const ttlMs = opts.ttlMs ?? (Number(process.env.MEO_EXPLAIN_CACHE_TTL_MS) || 1000 * 60 * 30);
  const cacheKey = `place_explain:${placeId}`;

  if (!opts.forceRefresh) {
    const cached = placesCache.get<PlaceDetails>(cacheKey);
    if (cached) return cached;
  }

  const fieldMask = [
    'displayName',
    'formattedAddress',
    'location',
    'nationalPhoneNumber',
    'internationalPhoneNumber',
    'websiteUri',
    'rating',
    'userRatingCount',
    'regularOpeningHours',
    'types',
    'primaryType',
    'primaryTypeDisplayName',
    'editorialSummary',
    'photos',
    'reviews',
  ].join(',');

  const v1 = await fetchPlaceDetailsV1(placeId, fieldMask);
  const placeDetails = mapPlacesV1ToLegacyPlaceDetails(placeId, v1);

  // Cache for explain TTL
  placesCache.set(cacheKey, placeDetails, ttlMs);
  return placeDetails;
}

/**
 * Nearby search competitors by type within radius (meters).
 * Hard rule for GEO: if this fails, caller should surface an error and not fabricate competitors.
 */
export async function nearbySearchByType(args: {
  lat: number;
  lng: number;
  radius: number;
  type: string;
}): Promise<Array<{ place_id: string; name?: string; vicinity?: string }>> {
  const { lat, lng, radius, type } = args;
  const url = new URL(`${PLACES_API_BASE}/nearbysearch/json`);
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('radius', String(radius));
  url.searchParams.set('type', type);
  url.searchParams.set('key', API_KEY);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Places NearbySearch error: ${response.status}`);
  }

  const data = await response.json() as any;
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places NearbySearch error: ${data.status} - ${data.error_message || 'Unknown error'}`);
  }

  const results = Array.isArray(data.results) ? data.results : [];
  return results
    .map((r: any) => ({ place_id: r.place_id, name: r.name, vicinity: r.vicinity }))
    .filter((r: any) => typeof r.place_id === 'string' && r.place_id.length > 0);
}

/**
 * Text Search: find 1-based rank of placeId in results for a query.
 * Used for SEO visibility scoring (no SERP scraping).
 * Returns null if place not found in first page of results.
 */
export async function textSearchGetRank(
  query: string,
  placeId: string,
  location?: { lat: number; lng: number }
): Promise<number | null> {
  const url = new URL(`${PLACES_API_BASE}/textsearch/json`);
  url.searchParams.set('query', query);
  url.searchParams.set('key', API_KEY);
  if (location) {
    url.searchParams.set('location', `${location.lat},${location.lng}`);
    url.searchParams.set('radius', '50000'); // 50km bias
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Places TextSearch error: ${response.status}`);
  }

  const data = (await response.json()) as any;
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places TextSearch error: ${data.status} - ${data.error_message || 'Unknown error'}`);
  }

  const results = Array.isArray(data.results) ? data.results : [];
  const idx = results.findIndex((r: any) => r.place_id === placeId);
  return idx >= 0 ? idx + 1 : null;
}

/**
 * Convert PlaceDetails to normalized NAP object
 */
export function placeDetailsToNAP(place: PlaceDetails): NAP {
  return {
    name: place.name || '',
    address: normalizeAddress(place.formatted_address),
    phone: normalizePhone(place.international_phone_number || place.formatted_phone_number),
    website: place.website
  };
}

