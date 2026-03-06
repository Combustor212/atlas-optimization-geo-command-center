/**
 * Category Detection and Weights System
 * Detects business category/niche from Google types and business name
 */

import type { CategoryDetectionResult, CategoryWeights } from './meoSchema';

// ============================================================================
// CATEGORY DEFINITIONS WITH WEIGHTS
// ============================================================================

interface CategoryConfig {
  canonical: string;
  displayName: string;
  googleTypes: string[];
  keywords: string[];
  weights: CategoryWeights;
}

const CATEGORY_CONFIGS: CategoryConfig[] = [
  {
    canonical: 'fast_food',
    displayName: 'Fast Food',
    googleTypes: ['fast_food'],
    keywords: ['mcdonalds', "mcdonald's", 'burger king', 'wendys', 'taco bell', 'kfc', 'subway', 'pizza hut', 'fast food', 'quick service'],
    weights: {
      profileBase: 10,
      reviewsWeight: 30,
      visualsWeight: 15,
      engagementWeight: 12,
      visibilityWeight: 18,
      competitiveWeight: 15
    }
  },
  {
    canonical: 'restaurant',
    displayName: 'Restaurant',
    googleTypes: ['restaurant', 'food', 'meal_takeaway', 'meal_delivery'],
    keywords: ['restaurant', 'dining', 'eatery', 'bistro', 'cafe', 'diner', 'grill'],
    weights: {
      profileBase: 12,
      reviewsWeight: 35,
      visualsWeight: 20,
      engagementWeight: 15,
      visibilityWeight: 10,
      competitiveWeight: 8
    }
  },
  {
    canonical: 'healthcare',
    displayName: 'Healthcare',
    googleTypes: ['doctor', 'dentist', 'hospital', 'health', 'medical', 'pharmacy'],
    keywords: ['doctor', 'dentist', 'clinic', 'medical', 'health', 'dental', 'physician'],
    weights: {
      profileBase: 15,
      reviewsWeight: 30,
      visualsWeight: 12,
      engagementWeight: 20,
      visibilityWeight: 15,
      competitiveWeight: 8
    }
  },
  {
    canonical: 'legal',
    displayName: 'Legal Services',
    googleTypes: ['lawyer', 'legal'],
    keywords: ['attorney', 'lawyer', 'law firm', 'legal'],
    weights: {
      profileBase: 18,
      reviewsWeight: 28,
      visualsWeight: 10,
      engagementWeight: 22,
      visibilityWeight: 15,
      competitiveWeight: 7
    }
  },
  {
    canonical: 'automotive',
    displayName: 'Automotive',
    googleTypes: ['car_dealer', 'car_repair', 'car_wash', 'car_rental'],
    keywords: ['auto', 'car', 'vehicle', 'automotive', 'mechanic', 'dealer'],
    weights: {
      profileBase: 12,
      reviewsWeight: 32,
      visualsWeight: 18,
      engagementWeight: 15,
      visibilityWeight: 15,
      competitiveWeight: 8
    }
  },
  {
    canonical: 'home_services',
    displayName: 'Home Services',
    googleTypes: ['plumber', 'electrician', 'contractor', 'roofing_contractor', 'hvac'],
    keywords: ['plumbing', 'electrical', 'hvac', 'roofing', 'contractor', 'repair', 'handyman'],
    weights: {
      profileBase: 14,
      reviewsWeight: 33,
      visualsWeight: 16,
      engagementWeight: 18,
      visibilityWeight: 12,
      competitiveWeight: 7
    }
  },
  {
    canonical: 'retail',
    displayName: 'Retail',
    googleTypes: ['store', 'shopping_mall', 'clothing_store', 'shoe_store', 'book_store'],
    keywords: ['store', 'shop', 'retail', 'boutique', 'market'],
    weights: {
      profileBase: 11,
      reviewsWeight: 28,
      visualsWeight: 22,
      engagementWeight: 15,
      visibilityWeight: 16,
      competitiveWeight: 8
    }
  },
  {
    canonical: 'real_estate',
    displayName: 'Real Estate',
    googleTypes: ['real_estate_agency', 'real_estate'],
    keywords: ['real estate', 'realtor', 'realty', 'properties', 'homes'],
    weights: {
      profileBase: 16,
      reviewsWeight: 30,
      visualsWeight: 20,
      engagementWeight: 18,
      visibilityWeight: 10,
      competitiveWeight: 6
    }
  },
  {
    canonical: 'hospitality',
    displayName: 'Hospitality',
    googleTypes: ['lodging', 'hotel', 'motel', 'resort'],
    keywords: ['hotel', 'motel', 'inn', 'resort', 'lodging', 'accommodation'],
    weights: {
      profileBase: 13,
      reviewsWeight: 32,
      visualsWeight: 22,
      engagementWeight: 15,
      visibilityWeight: 12,
      competitiveWeight: 6
    }
  },
  {
    canonical: 'driving_school',
    displayName: 'Driving School',
    googleTypes: ['driving_school'],
    keywords: ['driving school', 'driving', 'drivers ed', "driver's education", "ray's driving"],
    weights: {
      profileBase: 14,
      reviewsWeight: 35,
      visualsWeight: 14,
      engagementWeight: 20,
      visibilityWeight: 12,
      competitiveWeight: 5
    }
  },
  {
    canonical: 'education',
    displayName: 'Education',
    googleTypes: ['school', 'university', 'library'],
    keywords: ['school', 'academy', 'education', 'training', 'learning', 'institute'],
    weights: {
      profileBase: 15,
      reviewsWeight: 32,
      visualsWeight: 15,
      engagementWeight: 20,
      visibilityWeight: 12,
      competitiveWeight: 6
    }
  },
  {
    canonical: 'photography',
    displayName: 'Photography',
    googleTypes: ['photographer', 'photography'],
    keywords: ['photographer', 'photography', 'photo studio', 'portraits'],
    weights: {
      profileBase: 14,
      reviewsWeight: 34,
      visualsWeight: 25,
      engagementWeight: 15,
      visibilityWeight: 8,
      competitiveWeight: 4
    }
  },
  {
    canonical: 'fitness',
    displayName: 'Fitness',
    googleTypes: ['gym', 'fitness', 'yoga', 'pilates'],
    keywords: ['gym', 'fitness', 'workout', 'training', 'yoga', 'pilates', 'crossfit'],
    weights: {
      profileBase: 13,
      reviewsWeight: 30,
      visualsWeight: 20,
      engagementWeight: 18,
      visibilityWeight: 12,
      competitiveWeight: 7
    }
  },
  {
    canonical: 'beauty',
    displayName: 'Beauty & Spa',
    googleTypes: ['beauty_salon', 'hair_care', 'spa', 'nail_salon'],
    keywords: ['salon', 'spa', 'beauty', 'hair', 'nails', 'barber'],
    weights: {
      profileBase: 12,
      reviewsWeight: 32,
      visualsWeight: 20,
      engagementWeight: 18,
      visibilityWeight: 12,
      competitiveWeight: 6
    }
  },
  {
    canonical: 'entertainment',
    displayName: 'Entertainment',
    googleTypes: ['movie_theater', 'amusement_park', 'bowling_alley', 'night_club'],
    keywords: ['entertainment', 'theater', 'cinema', 'arcade', 'bowling', 'club'],
    weights: {
      profileBase: 11,
      reviewsWeight: 28,
      visualsWeight: 22,
      engagementWeight: 18,
      visibilityWeight: 15,
      competitiveWeight: 6
    }
  }
];

// Default category for businesses that don't match
const DEFAULT_CATEGORY: CategoryConfig = {
  canonical: 'general_business',
  displayName: 'General Business',
  googleTypes: [],
  keywords: [],
  weights: {
    profileBase: 13,
    reviewsWeight: 30,
    visualsWeight: 18,
    engagementWeight: 16,
    visibilityWeight: 15,
    competitiveWeight: 8
  }
};

// ============================================================================
// DETECTION LOGIC
// ============================================================================

/**
 * Detect category from Google Place types
 */
function detectFromGoogleTypes(types: string[] | undefined): { category: CategoryConfig; confidence: number } | null {
  if (!types || types.length === 0) return null;
  
  const typesLower = types.map(t => t.toLowerCase());
  
  // Check for exact matches first
  for (const config of CATEGORY_CONFIGS) {
    for (const googleType of config.googleTypes) {
      if (typesLower.includes(googleType.toLowerCase())) {
        return { category: config, confidence: 95 };
      }
    }
  }
  
  // Check for partial matches
  for (const config of CATEGORY_CONFIGS) {
    for (const googleType of config.googleTypes) {
      if (typesLower.some(t => t.includes(googleType.toLowerCase()) || googleType.toLowerCase().includes(t))) {
        return { category: config, confidence: 75 };
      }
    }
  }
  
  return null;
}

/**
 * Detect category from business name keywords
 */
function detectFromBusinessName(businessName: string): { category: CategoryConfig; confidence: number } | null {
  if (!businessName) return null;
  
  const nameLower = businessName.toLowerCase();
  
  // Check for exact keyword matches
  for (const config of CATEGORY_CONFIGS) {
    for (const keyword of config.keywords) {
      if (nameLower.includes(keyword.toLowerCase())) {
        return { category: config, confidence: 80 };
      }
    }
  }
  
  return null;
}

/**
 * Main category detection function
 * Returns category with confidence score
 */
export function detectCategory(
  businessName: string,
  googleTypes?: string[]
): CategoryDetectionResult {
  // Try Google types first (higher confidence)
  const fromTypes = detectFromGoogleTypes(googleTypes);
  if (fromTypes && fromTypes.confidence >= 75) {
    return {
      category: fromTypes.category.displayName,
      categoryCanonical: fromTypes.category.canonical,
      categoryConfidence: fromTypes.confidence
    };
  }
  
  // Try business name
  const fromName = detectFromBusinessName(businessName);
  if (fromName && fromName.confidence >= 70) {
    return {
      category: fromName.category.displayName,
      categoryCanonical: fromName.category.canonical,
      categoryConfidence: fromName.confidence
    };
  }
  
  // Use type detection if available, even with lower confidence
  if (fromTypes) {
    return {
      category: fromTypes.category.displayName,
      categoryCanonical: fromTypes.category.canonical,
      categoryConfidence: fromTypes.confidence
    };
  }
  
  // Use name detection if available
  if (fromName) {
    return {
      category: fromName.category.displayName,
      categoryCanonical: fromName.category.canonical,
      categoryConfidence: fromName.confidence
    };
  }
  
  // Default fallback
  return {
    category: DEFAULT_CATEGORY.displayName,
    categoryCanonical: DEFAULT_CATEGORY.canonical,
    categoryConfidence: 30
  };
}

/**
 * Get category weights by canonical name
 */
export function getCategoryWeights(categoryCanonical: string): CategoryWeights {
  const config = CATEGORY_CONFIGS.find(c => c.canonical === categoryCanonical);
  return config ? config.weights : DEFAULT_CATEGORY.weights;
}

/**
 * Get all available categories
 */
export function getAllCategories(): Array<{ canonical: string; displayName: string }> {
  return CATEGORY_CONFIGS.map(c => ({
    canonical: c.canonical,
    displayName: c.displayName
  }));
}

