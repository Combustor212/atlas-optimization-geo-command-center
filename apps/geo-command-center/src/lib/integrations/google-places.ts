/**
 * Google Places API Integration
 * 
 * This module handles business location data and ranking verification using Google Places API.
 * Used for GEO tracking, business verification, and local search visibility.
 * 
 * Setup Instructions:
 * 1. Get your API key from Google Cloud Console
 * 2. Enable Places API (New) in your project
 * 3. Add to .env.local:
 *    - GOOGLE_PLACES_API_KEY=your_api_key
 * 
 * API Documentation: https://developers.google.com/maps/documentation/places/web-service
 * 
 * Features:
 * - Search for businesses by name and location
 * - Get business details (address, phone, ratings, reviews)
 * - Verify business locations
 * - Track local pack rankings
 * - Get place IDs for tracking
 */

export interface GooglePlacesConfig {
  apiKey: string
  baseUrl?: string
}

export interface PlaceSearchResult {
  placeId: string
  name: string
  address: string
  location: {
    lat: number
    lng: number
  }
  rating?: number
  userRatingsTotal?: number
  types?: string[]
  businessStatus?: string
}

export interface PlaceDetails {
  placeId: string
  name: string
  formattedAddress: string
  formattedPhoneNumber?: string
  internationalPhoneNumber?: string
  website?: string
  location: {
    lat: number
    lng: number
  }
  rating?: number
  userRatingsTotal?: number
  reviews?: Array<{
    author: string
    rating: number
    text: string
    time: string
  }>
  openingHours?: {
    openNow: boolean
    periods: unknown[]
    weekdayText: string[]
  }
  photos?: Array<{
    reference: string
    width: number
    height: number
  }>
  types?: string[]
  utcOffset?: number
}

export interface NearbySearchParams {
  keyword: string
  location: {
    lat: number
    lng: number
  }
  radius?: number // in meters, default 5000
  type?: string // e.g., 'plumber', 'restaurant'
}

export interface TextSearchParams {
  query: string
  location?: {
    lat: number
    lng: number
  }
  radius?: number
}

/**
 * Initialize Google Places client
 */
export function getGooglePlacesClient(config: GooglePlacesConfig) {
  const baseUrl = config.baseUrl || 'https://maps.googleapis.com/maps/api/place'
  
  return {
    baseUrl,
    apiKey: config.apiKey,
  }
}

/**
 * Search for places by text query (for keyword tracking)
 */
export async function searchPlacesByText(
  config: GooglePlacesConfig,
  params: TextSearchParams
): Promise<PlaceSearchResult[]> {
  const client = getGooglePlacesClient(config)
  
  try {
    const url = new URL(`${client.baseUrl}/textsearch/json`)
    url.searchParams.append('query', params.query)
    url.searchParams.append('key', client.apiKey)
    
    if (params.location) {
      url.searchParams.append(
        'location',
        `${params.location.lat},${params.location.lng}`
      )
    }
    
    if (params.radius) {
      url.searchParams.append('radius', params.radius.toString())
    }

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API returned status: ${data.status}`)
    }

    return (data.results || []).map((place: { place_id: string; name: string; formatted_address?: string; geometry: { location: { lat: number; lng: number } }; rating?: number; user_ratings_total?: number; types?: string[]; business_status?: string }) => ({
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      },
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      types: place.types,
      businessStatus: place.business_status,
    }))
  } catch (error) {
    console.error('Google Places API Error:', error)
    throw new Error('Failed to search places')
  }
}

/**
 * Search for nearby places (for local pack simulation)
 */
export async function searchNearbyPlaces(
  config: GooglePlacesConfig,
  params: NearbySearchParams
): Promise<PlaceSearchResult[]> {
  const client = getGooglePlacesClient(config)
  
  try {
    const url = new URL(`${client.baseUrl}/nearbysearch/json`)
    url.searchParams.append('keyword', params.keyword)
    url.searchParams.append(
      'location',
      `${params.location.lat},${params.location.lng}`
    )
    url.searchParams.append('radius', (params.radius || 5000).toString())
    url.searchParams.append('key', client.apiKey)
    
    if (params.type) {
      url.searchParams.append('type', params.type)
    }

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      console.error('Places API HTTP error:', response.status, response.statusText)
      throw new Error(`Google Places API error: ${response.status}`)
    }

    const data = await response.json()
    
    console.log('Places Nearby Search response:', {
      status: data.status,
      error: data.error_message,
      resultsCount: data.results?.length || 0,
    })
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Places API error details:', data.error_message)
      throw new Error(`Google Places API returned status: ${data.status} - ${data.error_message || 'No error message'}`)
    }

    return (data.results || []).map((place: { place_id: string; name: string; vicinity?: string; formatted_address?: string; geometry: { location: { lat: number; lng: number } }; rating?: number; user_ratings_total?: number; types?: string[]; business_status?: string }, index: number) => ({
      placeId: place.place_id,
      name: place.name,
      address: place.vicinity || place.formatted_address,
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      },
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      types: place.types,
      businessStatus: place.business_status,
      rank: index + 1, // Position in results
    }))
  } catch (error) {
    console.error('Google Places API Error:', error)
    throw new Error('Failed to search nearby places')
  }
}

/**
 * Get detailed information about a place
 */
export async function getPlaceDetails(
  config: GooglePlacesConfig,
  placeId: string
): Promise<PlaceDetails | null> {
  const client = getGooglePlacesClient(config)
  
  try {
    const url = new URL(`${client.baseUrl}/details/json`)
    url.searchParams.append('place_id', placeId)
    url.searchParams.append('key', client.apiKey)
    url.searchParams.append('fields', 
      'place_id,name,formatted_address,formatted_phone_number,international_phone_number,' +
      'website,geometry,rating,user_ratings_total,reviews,opening_hours,photos,types,utc_offset'
    )

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.status !== 'OK') {
      if (data.status === 'NOT_FOUND') return null
      throw new Error(`Google Places API returned status: ${data.status}`)
    }

    const place = data.result
    
    return {
      placeId: place.place_id,
      name: place.name,
      formattedAddress: place.formatted_address,
      formattedPhoneNumber: place.formatted_phone_number,
      internationalPhoneNumber: place.international_phone_number,
      website: place.website,
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      },
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      reviews: place.reviews?.map((review: { author_name: string; rating: number; text: string; time: string }) => ({
        author: review.author_name,
        rating: review.rating,
        text: review.text,
        time: review.time,
      })),
      openingHours: place.opening_hours ? {
        openNow: place.opening_hours.open_now,
        periods: place.opening_hours.periods,
        weekdayText: place.opening_hours.weekday_text,
      } : undefined,
      photos: place.photos?.map((photo: { photo_reference: string; width: number; height: number }) => ({
        reference: photo.photo_reference,
        width: photo.width,
        height: photo.height,
      })),
      types: place.types,
      utcOffset: place.utc_offset,
    }
  } catch (error) {
    console.error('Google Places API Error:', error)
    throw new Error('Failed to get place details')
  }
}

/**
 * Find a business and get its ranking position for a keyword
 * Returns the position (1-20) or null if not found in top 20
 */
export async function getBusinessRankingForKeyword(
  config: GooglePlacesConfig,
  params: {
    businessName: string
    keyword: string
    location: {
      lat: number
      lng: number
    }
    radius?: number
  }
): Promise<{ rank: number | null; placeId: string | null; totalResults: number }> {
  try {
    const results = await searchNearbyPlaces(config, {
      keyword: params.keyword,
      location: params.location,
      radius: params.radius || 5000,
    })

    // Find the business in results
    const businessIndex = results.findIndex(place => 
      place.name.toLowerCase().includes(params.businessName.toLowerCase())
    )

    if (businessIndex === -1) {
      return {
        rank: null,
        placeId: null,
        totalResults: results.length,
      }
    }

    return {
      rank: businessIndex + 1,
      placeId: results[businessIndex].placeId,
      totalResults: results.length,
    }
  } catch (error) {
    console.error('Failed to get business ranking:', error)
    throw error
  }
}

/**
 * Get coordinates from an address using Geocoding API
 */
export async function geocodeAddress(
  config: GooglePlacesConfig,
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
    url.searchParams.append('address', address)
    url.searchParams.append('key', config.apiKey)

    const response = await fetch(url.toString())
    const data = await response.json()

    console.log('Geocoding response:', {
      status: data.status,
      address,
      error: data.error_message,
    })

    if (data.status === 'OK' && data.results[0]) {
      return {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng,
      }
    }

    if (data.status === 'REQUEST_DENIED') {
      console.error('Geocoding API request denied:', data.error_message)
    }

    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Example usage for GEO tracking:
 * 
 * const config = {
 *   apiKey: process.env.GOOGLE_PLACES_API_KEY!,
 * }
 * 
 * // Get business ranking for a keyword
 * const ranking = await getBusinessRankingForKeyword(config, {
 *   businessName: 'ABC Plumbing',
 *   keyword: 'plumber',
 *   location: { lat: 40.7128, lng: -74.0060 },
 *   radius: 5000,
 * })
 * 
 * console.log(`Rank: ${ranking.rank || 'Not in top 20'}`)
 * 
 * // Get place details
 * if (ranking.placeId) {
 *   const details = await getPlaceDetails(config, ranking.placeId)
 *   console.log(`Rating: ${details?.rating}, Reviews: ${details?.userRatingsTotal}`)
 * }
 * 
 * // Search by keyword
 * const results = await searchPlacesByText(config, {
 *   query: 'plumber near times square',
 * })
 */
