/**
 * Input Normalization Layer
 * Handles all 3 input formats and normalizes to a consistent schema
 */

import type { ScanInput, NormalizedScanInput, DropdownScanInput, ManualScanInput, LoggedInScanInput } from './meoSchema';

/**
 * Type guard to check if input has selectedPlace
 */
function isDropdownInput(input: any): input is DropdownScanInput {
  return input && typeof input === 'object' && 'selectedPlace' in input;
}

/**
 * Type guard to check if input has place_id (logged-in format)
 */
function isLoggedInInput(input: any): input is LoggedInScanInput {
  return input && typeof input === 'object' && 'place_id' in input && 'businessName' in input;
}

/**
 * Type guard to check if input is manual format
 */
function isManualInput(input: any): input is ManualScanInput {
  return input && typeof input === 'object' && 'businessName' in input && 'location' in input && !('place_id' in input);
}

/**
 * Clean and sanitize a string
 * - Trims whitespace
 * - Removes line breaks and tabs
 * - Normalizes multiple spaces to single space
 * - Escapes quotes safely
 */
function cleanString(str: string): string {
  if (!str) return '';
  
  return str
    .trim()
    .replace(/[\r\n\t]+/g, ' ')  // Remove line breaks and tabs
    .replace(/\s+/g, ' ')         // Normalize multiple spaces
    .replace(/["']/g, (match) => match === '"' ? "'" : match)  // Normalize quotes
    .trim();
}

/**
 * Extract city and state from a full address string
 * Examples:
 *   "7049 Mason Montgomery Rd, Mason, OH 45040, USA" -> "Mason, OH"
 *   "123 Main St, Cincinnati, Ohio" -> "Cincinnati, Ohio"
 */
function extractCityState(address: string): string {
  const cleaned = cleanString(address);
  
  // Split by commas
  const parts = cleaned.split(',').map(p => p.trim());
  
  // If we have at least 3 parts (street, city, state+zip)
  if (parts.length >= 3) {
    const city = parts[parts.length - 3] || parts[1];
    const stateZip = parts[parts.length - 2] || parts[2];
    
    // Extract just state (remove zip code if present)
    const stateMatch = stateZip.match(/^([A-Z]{2}|[A-Za-z\s]+)/);
    const state = stateMatch ? stateMatch[1].trim() : stateZip;
    
    return `${city}, ${state}`;
  }
  
  // If only 2 parts, assume it's already "City, State"
  if (parts.length === 2) {
    return `${parts[0]}, ${parts[1]}`;
  }
  
  // Return as-is if we can't parse
  return cleaned;
}

/**
 * Parse business name from Google Places description
 * Takes everything before the first comma
 * Example: "Ray's Driving School, 7049 Mason Montgomery Rd..." -> "Ray's Driving School"
 */
function parseBusinessNameFromDescription(description: string): string {
  const firstCommaIndex = description.indexOf(',');
  if (firstCommaIndex === -1) {
    return cleanString(description);
  }
  return cleanString(description.substring(0, firstCommaIndex));
}

/**
 * Parse location from Google Places description
 * Takes everything after the first comma
 * Example: "Ray's Driving School, 7049 Mason Montgomery Rd, Mason, OH 45040, USA" -> "Mason, OH"
 */
function parseLocationFromDescription(description: string): string {
  const firstCommaIndex = description.indexOf(',');
  if (firstCommaIndex === -1) {
    return cleanString(description);
  }
  
  const afterFirstComma = description.substring(firstCommaIndex + 1).trim();
  
  // Try to extract city/state from full address
  return extractCityState(afterFirstComma);
}

/**
 * Main normalization function
 * ALWAYS outputs consistent schema regardless of input format
 */
export function normalizeScanInput(input: ScanInput): NormalizedScanInput {
  // Handle Dropdown/Autocomplete format (format B)
  if (isDropdownInput(input)) {
    const { selectedPlace } = input;
    const businessName = parseBusinessNameFromDescription(selectedPlace.description);
    const location = parseLocationFromDescription(selectedPlace.description);
    
    return {
      businessName: cleanString(businessName),
      location: cleanString(location),
      place_id: selectedPlace.place_id
    };
  }
  
  // Handle Logged-in format with place_id (format C)
  if (isLoggedInInput(input)) {
    return {
      businessName: cleanString(input.businessName),
      location: cleanString(input.location || ''),
      place_id: input.place_id
    };
  }
  
  // Handle Manual input format (format A)
  if (isManualInput(input)) {
    return {
      businessName: cleanString(input.businessName),
      location: cleanString(input.location)
    };
  }
  
  // Fallback - try to extract what we can
  const fallback: any = input;
  return {
    businessName: cleanString(fallback.businessName || fallback.name || ''),
    location: cleanString(fallback.location || fallback.address || ''),
    place_id: fallback.place_id || fallback.placeId
  };
}

/**
 * Validate normalized input
 */
export function validateNormalizedInput(input: NormalizedScanInput): string[] {
  const errors: string[] = [];
  
  if (!input.businessName || input.businessName.length < 2) {
    errors.push('Business name is required and must be at least 2 characters');
  }
  
  // Location is only required if no place_id is provided
  // (if we have place_id, we can fetch location from Google Places)
  if (!input.place_id && (!input.location || input.location.length < 2)) {
    errors.push('Location is required and must be at least 2 characters (unless place_id is provided)');
  }
  
  return errors;
}





