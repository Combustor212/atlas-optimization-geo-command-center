/**
 * Google Places API Client Utilities
 * 
 * These functions expect backend routes at:
 * - POST /api/places/autocomplete
 * - POST /api/places/details  
 * - GET /api/places/health
 */

/**
 * Test Google Places API connectivity
 * @returns {Promise<{status: string, sample?: any, error_message?: string}>}
 */
export const checkPlacesApiHealth = async () => {
  try {
    const response = await fetch("/api/places/health", {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    return {
      status: "NETWORK_ERROR",
      error_message: error.message
    };
  }
};

/**
 * Get autocomplete predictions from Google Places
 * @param {Object} params
 * @param {string} params.input - Search query
 * @param {string} params.sessionToken - Session token for billing
 * @param {string} [params.components] - Component restrictions (e.g., "country:us")
 * @returns {Promise<{status: string, predictions: any[], error_message?: string}>}
 */
export const getPlacesAutocomplete = async ({ input, sessionToken, components }) => {
  try {
    const response = await fetch("/api/places/autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: input.trim(),
        sessionToken,
        components
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    return {
      status: "NETWORK_ERROR",
      error_message: error.message,
      predictions: []
    };
  }
};

/**
 * Get place details from Google Places
 * @param {Object} params
 * @param {string} params.placeId - Google Place ID
 * @param {string} params.sessionToken - Session token (should match autocomplete)
 * @param {string[]} [params.fields] - Fields to retrieve
 * @returns {Promise<{status: string, result?: any, error_message?: string}>}
 */
export const getPlaceDetails = async ({ placeId, sessionToken, fields }) => {
  const defaultFields = [
    "place_id", "name", "formatted_address", "formatted_phone_number",
    "website", "types", "address_components", "opening_hours",
    "rating", "user_ratings_total", "photos"
  ];
  
  try {
    const response = await fetch("/api/places/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placeId,
        sessionToken,
        fields: fields || defaultFields
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    return {
      status: "NETWORK_ERROR",
      error_message: error.message,
      result: null
    };
  }
};

/**
 * Parse address components to extract city
 * @param {Array} addressComponents - Google Places address_components array
 * @returns {string} City name
 */
export const extractCityFromComponents = (addressComponents = []) => {
  const city = addressComponents.find(c => c.types.includes("locality"))?.long_name
    || addressComponents.find(c => c.types.includes("postal_town"))?.long_name
    || addressComponents.find(c => c.types.includes("sublocality"))?.long_name
    || "";
  return city;
};

/**
 * Extract domain from URL
 * @param {string} url - Full URL
 * @returns {string} Domain without www
 */
export const extractDomainFromUrl = (url) => {
  if (!url) return "";
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.host.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/**
 * Generate a session token for Places API billing
 * @returns {string} Session token
 */
export const generateSessionToken = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
};

/**
 * Common Google Places API error messages and solutions
 */
export const PLACES_API_ERRORS = {
  REQUEST_DENIED: {
    message: "API key invalid or Places API not enabled",
    solution: "Check your API key and enable Places API in Google Cloud Console"
  },
  OVER_QUERY_LIMIT: {
    message: "Query limit exceeded",
    solution: "Enable billing or increase quota limits in Google Cloud Console"
  },
  INVALID_REQUEST: {
    message: "Invalid request parameters",
    solution: "Check that required parameters are provided correctly"
  },
  ZERO_RESULTS: {
    message: "No results found",
    solution: "Try a more specific search with business name and city"
  },
  UNKNOWN_ERROR: {
    message: "Server error",
    solution: "Try again in a moment, or check API status"
  }
};