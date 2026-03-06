/**
 * Franchise Detection and Boost Calculation
 * Detects if a business is a franchise and calculates appropriate boosts
 */

import type { FranchiseDetectionResult } from './meoSchema';

// ============================================================================
// FRANCHISE DATABASES
// ============================================================================

const MAJOR_NATIONAL_FRANCHISES = [
  // Fast Food
  'mcdonalds', "mcdonald's", 'burger king', 'wendys', "wendy's", 'taco bell', 'kfc',
  'subway', 'pizza hut', 'dominos', "domino's", 'papa johns', "papa john's",
  'chipotle', 'panera', 'chick-fil-a', 'chick fil a', 'sonic', 'arbys', "arby's",
  'dairy queen', 'popeyes', 'jimmy johns', "jimmy john's", 'five guys',
  
  // Retail
  'walmart', 'target', 'costco', 'home depot', 'lowes', "lowe's", 'best buy',
  'kroger', 'walgreens', 'cvs', 'rite aid', '7-eleven', 'circle k',
  
  // Services
  'jiffy lube', 'midas', 'meineke', 'valvoline', 'tire kingdom', 'firestone',
  'pep boys', 'autozone', 'advance auto parts', "o'reilly", 'napa auto',
  
  // Hospitality
  'marriott', 'hilton', 'holiday inn', 'comfort inn', 'la quinta', 'motel 6',
  'super 8', 'days inn', 'hampton inn', 'courtyard', 'residence inn',
  
  // Fitness
  'planet fitness', 'la fitness', 'anytime fitness', 'gold\'s gym', '24 hour fitness',
  
  // Healthcare
  'cvs pharmacy', 'walgreens pharmacy', 'minute clinic', 'urgent care'
];

const REGIONAL_FRANCHISES = [
  // Regional chains (5-50 locations typically)
  'skyline chili', 'goldstar', 'gold star', 'larosa\'s', "larosas",
  'graeters', "graeter's", 'united dairy farmers', 'udf',
  'penn station', 'city bbq', 'bibibop', 'condado', 'hot head burritos',
  'melt bar', 'swensons', "swenson's",
];

const LOCAL_FRANCHISES = [
  // Common local franchise indicators
  'franchise', 'authorized dealer', 'licensed', 'certified dealer'
];

const FAST_FOOD_INDICATORS = [
  'mcdonalds', "mcdonald's", 'burger king', 'wendys', "wendy's", 'taco bell', 'kfc',
  'subway', 'pizza hut', 'dominos', "domino's", 'papa johns', "papa john's",
  'chipotle', 'panera', 'chick-fil-a', 'chick fil a', 'sonic', 'arbys', "arby's",
  'dairy queen', 'popeyes', 'jimmy johns', "jimmy john's", 'five guys',
  'white castle', 'hardees', "hardee's", 'jack in the box', 'in-n-out',
  'whataburger', 'culvers', "culver's", 'shake shack', 'smashburger'
];

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Check if business name matches major national franchise
 */
function isMajorNationalFranchise(businessName: string): boolean {
  const nameLower = businessName.toLowerCase().trim();
  
  return MAJOR_NATIONAL_FRANCHISES.some(franchise => {
    // Check for exact match or if franchise name is a significant part
    return nameLower === franchise || 
           nameLower.includes(franchise) ||
           franchise.includes(nameLower);
  });
}

/**
 * Check if business name matches regional franchise
 */
function isRegionalFranchise(businessName: string): boolean {
  const nameLower = businessName.toLowerCase().trim();
  
  return REGIONAL_FRANCHISES.some(franchise => {
    return nameLower.includes(franchise) || franchise.includes(nameLower);
  });
}

/**
 * Check if business name contains local franchise indicators
 */
function hasLocalFranchiseIndicators(businessName: string): boolean {
  const nameLower = businessName.toLowerCase().trim();
  
  return LOCAL_FRANCHISES.some(indicator => nameLower.includes(indicator));
}

/**
 * Check if business is fast food
 */
function isFastFood(businessName: string, types?: string[]): boolean {
  const nameLower = businessName.toLowerCase().trim();
  
  // Check types first
  if (types && types.some(t => t.toLowerCase() === 'fast_food' || t.toLowerCase() === 'meal_takeaway')) {
    return true;
  }
  
  // Check name
  return FAST_FOOD_INDICATORS.some(indicator => {
    return nameLower.includes(indicator) || indicator.includes(nameLower);
  });
}

/**
 * Calculate franchise boost based on franchise type
 * - Local: +3-5 points
 * - Regional: +5-7 points
 * - National: +8-12 points
 */
function calculateFranchiseBoost(franchiseType: 'local' | 'regional' | 'national' | null): number {
  if (!franchiseType) return 0;
  
  switch (franchiseType) {
    case 'national':
      return 10; // +8-12, using 10 as middle
    case 'regional':
      return 6;  // +5-7, using 6 as middle
    case 'local':
      return 4;  // +3-5, using 4 as middle
    default:
      return 0;
  }
}

/**
 * Main franchise detection function
 * Returns comprehensive franchise analysis
 */
export function detectFranchise(
  businessName: string,
  types?: string[]
): FranchiseDetectionResult {
  const isMajorNational = isMajorNationalFranchise(businessName);
  const isRegional = isRegionalFranchise(businessName);
  const isLocal = hasLocalFranchiseIndicators(businessName);
  const isFastFoodBusiness = isFastFood(businessName, types);
  
  // Determine franchise type
  let franchiseType: 'local' | 'regional' | 'national' | null = null;
  let isFranchise = false;
  
  if (isMajorNational) {
    franchiseType = 'national';
    isFranchise = true;
  } else if (isRegional) {
    franchiseType = 'regional';
    isFranchise = true;
  } else if (isLocal) {
    franchiseType = 'local';
    isFranchise = true;
  }
  
  const franchiseBoost = calculateFranchiseBoost(franchiseType);
  
  return {
    isFranchise,
    isMajorNationalFranchise: isMajorNational,
    isRegionalFranchise: isRegional,
    isFastFood: isFastFoodBusiness,
    franchiseType,
    franchiseBoost
  };
}

/**
 * Check if business name suggests it's a franchise location
 */
export function suggestsFranchise(businessName: string): boolean {
  const nameLower = businessName.toLowerCase();
  
  // Common patterns that suggest franchise
  const patterns = [
    /\bfranchise\b/,
    /\blocation #\d+/,
    /\bstore #\d+/,
    /\b#\d{3,}\b/, // Location numbers like #1234
    /\(location\)/,
    /\bdba\b/,      // "doing business as"
  ];
  
  return patterns.some(pattern => pattern.test(nameLower));
}


