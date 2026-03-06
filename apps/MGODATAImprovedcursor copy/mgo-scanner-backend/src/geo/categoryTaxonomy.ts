/**
 * Category Taxonomy - Customer-facing niche labels for GEO scoring
 * 
 * NEVER return generic labels like "Establishment", "Store", "Business", etc.
 * Each taxon includes:
 * - key: stable identifier for backend logic
 * - label: customer-facing display name
 * - keywords: phrases to match against business name, description, website
 * - placesTypeHints: Google Places types that commonly map to this category
 */

export interface Taxon {
  key: string;
  label: string;
  keywords: string[];
  placesTypeHints: string[];
}

/**
 * Blacklisted generic terms - these are NEVER valid categories
 */
export const GENERIC_BLACKLIST = [
  'establishment',
  'point_of_interest',
  'store',
  'business',
  'place',
  'organization',
  'food',
  'service',
  'local_business'
];

/**
 * Full category taxonomy (30+ niches)
 */
export const CATEGORY_TAXONOMY: Taxon[] = [
  // Health & Wellness
  {
    key: 'med_spa',
    label: 'Medical spa',
    keywords: [
      'med spa', 'medical spa', 'medspa', 'botox', 'filler', 'lip filler',
      'microneedling', 'hydrafacial', 'laser hair removal', 'chemical peel',
      'aesthetic clinic', 'aesthetics', 'cosmetic clinic', 'laser treatment',
      'skin rejuvenation', 'anti aging', 'injectable', 'dermal filler'
    ],
    placesTypeHints: ['spa', 'beauty_salon', 'health']
  },
  {
    key: 'day_spa',
    label: 'Day spa',
    keywords: [
      'day spa', 'spa services', 'massage spa', 'facial spa', 'body treatment',
      'relaxation spa', 'wellness spa'
    ],
    placesTypeHints: ['spa', 'beauty_salon']
  },
  {
    key: 'massage_therapy',
    label: 'Massage therapist',
    keywords: [
      'massage', 'massage therapy', 'therapeutic massage', 'deep tissue',
      'swedish massage', 'sports massage', 'massage therapist'
    ],
    placesTypeHints: ['spa', 'physiotherapist', 'health']
  },
  {
    key: 'chiropractor',
    label: 'Chiropractor',
    keywords: ['chiropractor', 'chiropractic', 'spinal adjustment', 'back pain'],
    placesTypeHints: ['chiropractor', 'health', 'doctor']
  },
  {
    key: 'physical_therapy',
    label: 'Physical therapy clinic',
    keywords: ['physical therapy', 'physiotherapy', 'rehab', 'rehabilitation', 'pt clinic'],
    placesTypeHints: ['physiotherapist', 'health', 'hospital']
  },
  {
    key: 'dentist',
    label: 'Dental clinic',
    keywords: ['dentist', 'dental', 'teeth', 'orthodontics', 'oral health'],
    placesTypeHints: ['dentist', 'health', 'doctor']
  },
  {
    key: 'optometrist',
    label: 'Optometrist',
    keywords: ['optometrist', 'eye doctor', 'vision', 'eyeglasses', 'eye exam'],
    placesTypeHints: ['doctor', 'health', 'store']
  },
  {
    key: 'gym',
    label: 'Gym',
    keywords: ['gym', 'fitness', 'workout', 'weight training', 'fitness center', 'health club'],
    placesTypeHints: ['gym', 'health']
  },
  {
    key: 'yoga_studio',
    label: 'Yoga studio',
    keywords: ['yoga', 'yoga studio', 'yoga classes', 'hot yoga', 'vinyasa', 'meditation'],
    placesTypeHints: ['gym', 'health']
  },
  {
    key: 'pilates_studio',
    label: 'Pilates studio',
    keywords: ['pilates', 'pilates studio', 'reformer', 'pilates classes'],
    placesTypeHints: ['gym', 'health']
  },

  // Beauty & Personal Care
  {
    key: 'hair_salon',
    label: 'Hair salon',
    keywords: ['hair salon', 'hairstylist', 'haircut', 'hair color', 'salon'],
    placesTypeHints: ['hair_care', 'beauty_salon']
  },
  {
    key: 'barber_shop',
    label: 'Barbershop',
    keywords: ['barber', 'barbershop', 'mens haircut', 'shave', 'mens grooming'],
    placesTypeHints: ['hair_care', 'beauty_salon']
  },
  {
    key: 'nail_salon',
    label: 'Nail salon',
    keywords: ['nail salon', 'manicure', 'pedicure', 'nail art', 'gel nails', 'acrylic nails'],
    placesTypeHints: ['beauty_salon']
  },
  {
    key: 'beauty_salon',
    label: 'Beauty salon',
    keywords: ['beauty salon', 'beauty services', 'makeup', 'waxing', 'lashes', 'brows'],
    placesTypeHints: ['beauty_salon']
  },

  // Retail - Health & Nutrition
  {
    key: 'supplement_store',
    label: 'Supplement store',
    keywords: [
      'supplement', 'supplements', 'vitamins', 'protein', 'whey', 'creatine',
      'pre workout', 'preworkout', 'bcaa', 'nutrition', 'sports nutrition',
      'fitness supplements', 'bodybuilding', 'amino acids'
    ],
    placesTypeHints: ['store', 'health']
  },
  {
    key: 'health_food_store',
    label: 'Health food store',
    keywords: [
      'health food', 'organic', 'natural foods', 'whole foods', 'vitamins',
      'herbal', 'natural remedies'
    ],
    placesTypeHints: ['store', 'health', 'supermarket']
  },
  {
    key: 'pharmacy',
    label: 'Pharmacy',
    keywords: ['pharmacy', 'drugstore', 'prescriptions', 'medications'],
    placesTypeHints: ['pharmacy', 'drugstore', 'health']
  },

  // Retail - General
  {
    key: 'grocery_store',
    label: 'Grocery store',
    keywords: ['grocery', 'supermarket', 'market', 'groceries'],
    placesTypeHints: ['supermarket', 'grocery_or_supermarket', 'store']
  },
  {
    key: 'convenience_store',
    label: 'Convenience store',
    keywords: ['convenience store', 'corner store', '7-eleven', 'quick mart'],
    placesTypeHints: ['convenience_store', 'store']
  },
  {
    key: 'clothing_store',
    label: 'Clothing store',
    keywords: ['clothing', 'apparel', 'fashion', 'boutique', 'clothes'],
    placesTypeHints: ['clothing_store', 'store']
  },
  {
    key: 'shoe_store',
    label: 'Shoe store',
    keywords: ['shoes', 'footwear', 'sneakers', 'boots'],
    placesTypeHints: ['shoe_store', 'store']
  },
  {
    key: 'jewelry_store',
    label: 'Jewelry store',
    keywords: ['jewelry', 'jeweler', 'diamonds', 'rings', 'watches'],
    placesTypeHints: ['jewelry_store', 'store']
  },
  {
    key: 'electronics_store',
    label: 'Electronics store',
    keywords: ['electronics', 'computers', 'phones', 'gadgets', 'tech'],
    placesTypeHints: ['electronics_store', 'store']
  },
  {
    key: 'furniture_store',
    label: 'Furniture store',
    keywords: ['furniture', 'home furnishings', 'sofas', 'beds', 'decor'],
    placesTypeHints: ['furniture_store', 'home_goods_store', 'store']
  },
  {
    key: 'bookstore',
    label: 'Bookstore',
    keywords: ['bookstore', 'books', 'book shop', 'reading'],
    placesTypeHints: ['book_store', 'store']
  },
  {
    key: 'pet_store',
    label: 'Pet store',
    keywords: ['pet store', 'pet supplies', 'pet food', 'animals'],
    placesTypeHints: ['pet_store', 'store', 'veterinary_care']
  },
  {
    key: 'smoke_shop',
    label: 'Smoke shop',
    keywords: ['smoke shop', 'vape', 'tobacco', 'cigar', 'hookah'],
    placesTypeHints: ['store']
  },
  {
    key: 'liquor_store',
    label: 'Liquor store',
    keywords: ['liquor', 'wine', 'beer', 'spirits', 'alcohol'],
    placesTypeHints: ['liquor_store', 'store']
  },

  // Food & Beverage
  {
    key: 'cafe',
    label: 'Cafe',
    keywords: ['cafe', 'coffee shop', 'coffee house', 'espresso', 'latte'],
    placesTypeHints: ['cafe', 'coffee_shop', 'restaurant']
  },
  {
    key: 'coffee_shop',
    label: 'Coffee shop',
    keywords: ['coffee', 'starbucks', 'brew', 'barista'],
    placesTypeHints: ['cafe', 'coffee_shop']
  },
  {
    key: 'restaurant',
    label: 'Restaurant',
    keywords: ['restaurant', 'dining', 'eatery', 'bistro'],
    placesTypeHints: ['restaurant', 'meal_takeaway', 'meal_delivery']
  },
  {
    key: 'fast_food',
    label: 'Fast food restaurant',
    keywords: ['fast food', 'quick service', 'drive thru', 'burger', 'fries'],
    placesTypeHints: ['restaurant', 'meal_takeaway']
  },
  {
    key: 'pizza',
    label: 'Pizza restaurant',
    keywords: ['pizza', 'pizzeria', 'italian', 'pie'],
    placesTypeHints: ['restaurant', 'meal_takeaway', 'meal_delivery']
  },
  {
    key: 'mexican',
    label: 'Mexican restaurant',
    keywords: ['mexican', 'tacos', 'burrito', 'taqueria', 'latin'],
    placesTypeHints: ['restaurant', 'meal_takeaway']
  },
  {
    key: 'chinese',
    label: 'Chinese restaurant',
    keywords: ['chinese', 'asian', 'noodles', 'dim sum', 'wok'],
    placesTypeHints: ['restaurant', 'meal_takeaway']
  },
  {
    key: 'sushi',
    label: 'Sushi restaurant',
    keywords: ['sushi', 'japanese', 'sashimi', 'rolls', 'ramen'],
    placesTypeHints: ['restaurant', 'meal_takeaway']
  },
  {
    key: 'bakery',
    label: 'Bakery',
    keywords: ['bakery', 'bread', 'pastries', 'cakes', 'baked goods'],
    placesTypeHints: ['bakery', 'store', 'cafe']
  },
  {
    key: 'dessert_shop',
    label: 'Dessert shop',
    keywords: ['dessert', 'sweets', 'treats', 'cupcakes', 'cookies'],
    placesTypeHints: ['bakery', 'cafe', 'store']
  },
  {
    key: 'ice_cream',
    label: 'Ice cream shop',
    keywords: ['ice cream', 'gelato', 'frozen yogurt', 'froyo', 'sorbet'],
    placesTypeHints: ['store', 'restaurant']
  },

  // Services & Trades
  {
    key: 'driving_school',
    label: 'Driving school',
    keywords: [
      'driving school', 'driving lessons', 'drivers ed', "driver's ed",
      'behind the wheel', 'road test', 'learners permit', 'driving instructor',
      'driving academy', 'driving course', 'traffic school'
    ],
    placesTypeHints: ['school', 'point_of_interest']
  },
  {
    key: 'cleaning_service',
    label: 'Cleaning service',
    keywords: ['cleaning', 'maid service', 'housekeeping', 'janitorial'],
    placesTypeHints: ['store', 'laundry']
  },
  {
    key: 'moving_company',
    label: 'Moving company',
    keywords: ['moving', 'movers', 'relocation', 'moving company'],
    placesTypeHints: ['moving_company', 'storage']
  },
  {
    key: 'roofing_contractor',
    label: 'Roofing contractor',
    keywords: ['roofing', 'roofer', 'roof repair', 'roof replacement'],
    placesTypeHints: ['roofing_contractor', 'general_contractor']
  },
  {
    key: 'plumbing',
    label: 'Plumber',
    keywords: ['plumber', 'plumbing', 'pipes', 'drain'],
    placesTypeHints: ['plumber']
  },
  {
    key: 'electrician',
    label: 'Electrician',
    keywords: ['electrician', 'electrical', 'wiring', 'electric'],
    placesTypeHints: ['electrician']
  },
  {
    key: 'hvac',
    label: 'HVAC contractor',
    keywords: ['hvac', 'heating', 'cooling', 'air conditioning', 'furnace'],
    placesTypeHints: ['electrician', 'plumber', 'general_contractor']
  },
  {
    key: 'landscaping',
    label: 'Landscaping service',
    keywords: ['landscaping', 'lawn care', 'yard work', 'gardening', 'tree service'],
    placesTypeHints: ['park', 'store']
  },
  {
    key: 'auto_repair',
    label: 'Auto repair shop',
    keywords: ['auto repair', 'car repair', 'mechanic', 'automotive', 'oil change'],
    placesTypeHints: ['car_repair', 'car_dealer']
  },
  {
    key: 'car_wash',
    label: 'Car wash',
    keywords: ['car wash', 'auto detailing', 'detailing', 'wash'],
    placesTypeHints: ['car_wash', 'car_repair']
  },

  // Professional Services
  {
    key: 'real_estate',
    label: 'Real estate agency',
    keywords: ['real estate', 'realtor', 'homes', 'property', 'realty'],
    placesTypeHints: ['real_estate_agency']
  },
  {
    key: 'law_firm',
    label: 'Law firm',
    keywords: ['law', 'lawyer', 'attorney', 'legal', 'law firm'],
    placesTypeHints: ['lawyer', 'local_government_office']
  },
  {
    key: 'accounting',
    label: 'Accounting firm',
    keywords: ['accounting', 'accountant', 'bookkeeping', 'tax', 'cpa'],
    placesTypeHints: ['accounting', 'finance']
  },
  {
    key: 'marketing_agency',
    label: 'Marketing agency',
    keywords: ['marketing', 'advertising', 'digital marketing', 'seo', 'social media'],
    placesTypeHints: ['store', 'point_of_interest']
  },
  {
    key: 'insurance',
    label: 'Insurance agency',
    keywords: ['insurance', 'insurance agency', 'auto insurance', 'life insurance'],
    placesTypeHints: ['insurance_agency', 'finance']
  },

  // Veterinary
  {
    key: 'veterinarian',
    label: 'Veterinarian',
    keywords: ['vet', 'veterinarian', 'animal hospital', 'pet care', 'veterinary'],
    placesTypeHints: ['veterinary_care']
  },

  // Lodging
  {
    key: 'hotel',
    label: 'Hotel',
    keywords: ['hotel', 'inn', 'motel', 'lodging', 'accommodation'],
    placesTypeHints: ['lodging']
  },
];

/**
 * Normalize text for keyword matching (lowercase, strip punctuation)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if any keyword phrase matches in the text
 */
export function hasKeywordMatch(text: string, keywords: string[]): { matched: boolean; matchedTerm?: string } {
  const normalized = normalizeText(text);
  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (normalized.includes(normalizedKeyword)) {
      return { matched: true, matchedTerm: keyword };
    }
  }
  return { matched: false };
}

/**
 * Score a taxon against provided evidence
 */
export function scoreTaxon(
  taxon: Taxon,
  evidence: {
    primaryType?: string;
    types?: string[];
    displayName?: string;
    editorialSummary?: string;
    websiteUri?: string;
  }
): { score: number; matchedKeyword?: string; matchedType?: string } {
  let score = 0;
  let matchedKeyword: string | undefined;
  let matchedType: string | undefined;

  // +8 points for exact primaryType match
  if (evidence.primaryType && taxon.placesTypeHints.includes(evidence.primaryType)) {
    score += 8;
    matchedType = evidence.primaryType;
  }

  // +5 points for match in types array
  if (evidence.types) {
    for (const type of evidence.types) {
      if (taxon.placesTypeHints.includes(type)) {
        score += 5;
        matchedType = matchedType || type;
        break;
      }
    }
  }

  // +3 points for keyword hit in displayName
  if (evidence.displayName) {
    const nameMatch = hasKeywordMatch(evidence.displayName, taxon.keywords);
    if (nameMatch.matched) {
      score += 3;
      matchedKeyword = nameMatch.matchedTerm;
    }
  }

  // +3 points for keyword hit in editorialSummary
  if (evidence.editorialSummary) {
    const summaryMatch = hasKeywordMatch(evidence.editorialSummary, taxon.keywords);
    if (summaryMatch.matched) {
      score += 3;
      matchedKeyword = matchedKeyword || summaryMatch.matchedTerm;
    }
  }

  // +2 points for keyword in website domain/path
  if (evidence.websiteUri) {
    const websiteMatch = hasKeywordMatch(evidence.websiteUri, taxon.keywords);
    if (websiteMatch.matched) {
      score += 2;
      matchedKeyword = matchedKeyword || websiteMatch.matchedTerm;
    }
  }

  return { score, matchedKeyword, matchedType };
}




