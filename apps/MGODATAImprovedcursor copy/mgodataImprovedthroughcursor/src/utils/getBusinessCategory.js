/**
 * Extract and normalize business category from scan data
 * Maps display categories to backend-compatible category identifiers
 */

/**
 * Category mapping from display name to backend category ID
 * Matches the backend CATEGORY_TYPE_MAP in nearbyCompetitors.ts
 */
const CATEGORY_MAP = {
  // Coffee & Cafe
  'coffee shop': 'coffee_shop',
  'cafe': 'cafe',
  'bakery': 'cafe',
  'coffee': 'coffee_shop',
  
  // Beauty & Personal Care
  'barber': 'barber_shop',
  'barbershop': 'barber_shop',
  'barber shop': 'barber_shop',
  'hair salon': 'hair_salon',
  'hair': 'hair_salon',
  'nail salon': 'nail_salon',
  'nails': 'nail_salon',
  'beauty salon': 'hair_salon',
  
  // Food & Dining
  'restaurant': 'restaurant',
  'food': 'restaurant',
  'dining': 'restaurant',
  
  // Health & Fitness
  'gym': 'gym',
  'fitness': 'gym',
  'dentist': 'dentist',
  'dental': 'dentist',
  
  // Professional Services
  'lawyer': 'lawyer',
  'attorney': 'lawyer',
  'legal': 'lawyer',
  'real estate': 'real_estate',
  'realtor': 'real_estate',
  
  // Home Services
  'plumber': 'plumber',
  'plumbing': 'plumber',
  'electrician': 'electrician',
  'electrical': 'electrician'
};

/**
 * Get business category from scan data
 * Checks multiple possible locations in the scan result
 * 
 * @param {Object} scanData - Full scan result object
 * @returns {string|null} - Backend-compatible category ID or null
 */
export function getBusinessCategory(scanData) {
  if (!scanData) return null;
  
  // Priority 1: GEO category (most accurate)
  const geoCategory = scanData?.geo?.category?.label || scanData?.geo?.category;
  if (geoCategory) {
    const mapped = mapCategoryToBackend(geoCategory);
    if (mapped) return mapped;
  }
  
  // Priority 2: Category prop (passed directly to component)
  const directCategory = scanData?.category?.label || scanData?.category;
  if (directCategory) {
    const mapped = mapCategoryToBackend(directCategory);
    if (mapped) return mapped;
  }
  
  // Priority 3: Business types array (Google Places types)
  const types = scanData?.business?.types || scanData?.place?.types || [];
  if (Array.isArray(types) && types.length > 0) {
    for (const type of types) {
      const mapped = mapCategoryToBackend(type);
      if (mapped) return mapped;
    }
  }
  
  // Priority 4: Industry classification from explain
  const industry = scanData?.geo?.explain?.industryClassification?.industry;
  if (industry) {
    const mapped = mapCategoryToBackend(industry);
    if (mapped) return mapped;
  }
  
  if (import.meta.env.DEV) {
    console.warn('[getBusinessCategory] Could not determine category from scanData', {
      geoCategory,
      directCategory,
      types,
      industry,
      scanDataKeys: Object.keys(scanData)
    });
  }
  
  return null;
}

/**
 * Map a display category name to backend category ID
 * 
 * @param {string} categoryName - Display category name
 * @returns {string|null} - Backend category ID or null
 */
function mapCategoryToBackend(categoryName) {
  if (!categoryName || typeof categoryName !== 'string') return null;
  
  const normalized = categoryName.toLowerCase().trim();
  
  // Direct match
  if (CATEGORY_MAP[normalized]) {
    return CATEGORY_MAP[normalized];
  }
  
  // Partial match (contains)
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return null;
}

/**
 * Get display-friendly category label
 * 
 * @param {string} backendCategory - Backend category ID
 * @returns {string} - Display-friendly label
 */
export function getCategoryDisplayName(backendCategory) {
  const displayMap = {
    'coffee_shop': 'Coffee Shop',
    'cafe': 'Cafe',
    'barber_shop': 'Barber Shop',
    'hair_salon': 'Hair Salon',
    'nail_salon': 'Nail Salon',
    'restaurant': 'Restaurant',
    'gym': 'Gym',
    'dentist': 'Dentist',
    'lawyer': 'Lawyer',
    'real_estate': 'Real Estate',
    'plumber': 'Plumber',
    'electrician': 'Electrician'
  };
  
  return displayMap[backendCategory] || backendCategory;
}


