// Google Places API Client - Direct API calls without Base44

import { PLACES_API_KEY } from '@/config/apiKeys';

const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

/**
 * Get place autocomplete predictions
 * @param {Object} params
 * @param {string} params.input - Search query
 * @param {string} params.sessionToken - Session token for billing
 * @param {string} params.components - Component restrictions (e.g., "country:us")
 * @returns {Promise<Object>} Autocomplete predictions
 */
export async function getPlacesAutocomplete({ input, sessionToken, components }) {
  try {
    const params = new URLSearchParams({
      input: input.trim(),
      key: PLACES_API_KEY,
      types: 'establishment'
    });

    if (sessionToken) {
      params.append('sessiontoken', sessionToken);
    }

    if (components) {
      params.append('components', components);
    }

    const response = await fetch(`${PLACES_API_BASE}/autocomplete/json?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Places API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(data.error_message || `Places API error: ${data.status}`);
    }

    return {
      status: data.status,
      predictions: data.predictions || []
    };
  } catch (error) {
    console.error('Places autocomplete error:', error);
    return {
      status: 'ERROR',
      predictions: [],
      error_message: error.message
    };
  }
}

/**
 * Get place details
 * @param {Object} params
 * @param {string} params.place_id - Google Place ID
 * @param {string} params.sessionToken - Session token for billing
 * @param {string[]} params.fields - Fields to return (optional)
 * @returns {Promise<Object>} Place details
 */
export async function getPlaceDetails({ place_id, sessionToken, fields = null }) {
  try {
    const defaultFields = [
      'place_id',
      'name',
      'formatted_address',
      'address_components',
      'geometry',
      'website',
      'international_phone_number',
      'opening_hours',
      'rating',
      'user_ratings_total',
      'types',
      'business_status'
    ];

    const params = new URLSearchParams({
      place_id: place_id,
      key: PLACES_API_KEY,
      fields: (fields || defaultFields).join(',')
    });

    if (sessionToken) {
      params.append('sessiontoken', sessionToken);
    }

    const response = await fetch(`${PLACES_API_BASE}/details/json?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Places API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(data.error_message || `Places API error: ${data.status}`);
    }

    return {
      status: 'OK',
      result: data.result
    };
  } catch (error) {
    console.error('Place details error:', error);
    return {
      status: 'ERROR',
      error_message: error.message
    };
  }
}

/**
 * Geocode an address
 * @param {Object} params
 * @param {string} params.address - Address to geocode
 * @returns {Promise<Object>} Geocoding results
 */
export async function geocodeAddress({ address }) {
  try {
    const params = new URLSearchParams({
      address: address,
      key: PLACES_API_KEY
    });

    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(data.error_message || `Geocoding API error: ${data.status}`);
    }

    return {
      status: data.status,
      results: data.results || []
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      status: 'ERROR',
      results: [],
      error_message: error.message
    };
  }
}

/**
 * Verify Places API is working
 * @returns {Promise<Object>} Health check result
 */
export async function verifyPlacesApi() {
  try {
    // Test with a simple autocomplete query
    const result = await getPlacesAutocomplete({
      input: 'Starbucks',
      components: 'country:us'
    });

    return {
      status: result.status === 'OK' || result.status === 'ZERO_RESULTS' ? 'healthy' : 'error',
      message: result.status === 'OK' ? 'Places API is working correctly' : result.error_message || 'Places API test failed',
      apiKey: PLACES_API_KEY ? 'configured' : 'missing'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message,
      apiKey: PLACES_API_KEY ? 'configured' : 'missing'
    };
  }
}

