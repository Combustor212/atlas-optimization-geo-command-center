/**
 * GEO Category Taxonomy
 * Comprehensive list of consumer-facing business categories
 */

export interface Taxon {
  key: string;           // Stable identifier (e.g., "med_spa")
  label: string;         // User-facing label (e.g., "Medical spa")
  placesTypeHints: string[]; // Google Places types that map to this
  keywords: string[];    // Lowercase keywords/phrases for matching
}

/**
 * Master taxonomy list
 * NEVER return generic terms like "establishment", "store", "business", etc.
 */
export const TAXONOMY: Taxon[] = [
  // ============================================================================
  // HEALTH / BEAUTY / WELLNESS
  // ============================================================================
  {
    key: 'med_spa',
    label: 'Medical spa',
    placesTypeHints: ['spa', 'beauty_salon', 'health'],
    keywords: ['med spa', 'medical spa', 'medspa', 'botox', 'filler', 'fillers', 'juvederm', 'restylane', 
               'microneedling', 'hydrafacial', 'laser', 'aesthetics', 'aesthetic clinic', 'cosmetic', 
               'dermal filler', 'dysport', 'coolsculpting', 'chemical peel', 'injectables']
  },
  {
    key: 'spa',
    label: 'Spa',
    placesTypeHints: ['spa', 'beauty_salon'],
    keywords: ['spa', 'day spa', 'wellness spa', 'relaxation', 'aromatherapy', 'sauna', 'steam room']
  },
  {
    key: 'day_spa',
    label: 'Day spa',
    placesTypeHints: ['spa'],
    keywords: ['day spa', 'spa day', 'spa services']
  },
  {
    key: 'skin_care_clinic',
    label: 'Skin care clinic',
    placesTypeHints: ['beauty_salon', 'health'],
    keywords: ['skin care', 'skincare', 'facial', 'acne treatment', 'dermatology', 'esthetician']
  },
  {
    key: 'beauty_salon',
    label: 'Beauty salon',
    placesTypeHints: ['beauty_salon'],
    keywords: ['beauty salon', 'beauty', 'makeup', 'lashes', 'brows', 'waxing']
  },
  {
    key: 'hair_salon',
    label: 'Hair salon',
    placesTypeHints: ['hair_salon', 'hair_care'],
    keywords: ['hair salon', 'hair stylist', 'hairdresser', 'haircut', 'hair color', 'balayage', 'highlights']
  },
  {
    key: 'barber_shop',
    label: 'Barbershop',
    placesTypeHints: ['barber_shop', 'hair_care'],
    keywords: ['barber', 'barbershop', 'mens haircut', 'beard trim', 'shave', 'mens grooming']
  },
  {
    key: 'nail_salon',
    label: 'Nail salon',
    placesTypeHints: ['nail_salon'],
    keywords: ['nail salon', 'nails', 'manicure', 'pedicure', 'nail art', 'gel nails', 'acrylic nails']
  },
  {
    key: 'massage_therapy',
    label: 'Massage therapist',
    placesTypeHints: ['physiotherapist', 'health'],
    keywords: ['massage', 'massage therapy', 'deep tissue', 'swedish massage', 'sports massage', 'massage therapist']
  },
  {
    key: 'chiropractor',
    label: 'Chiropractor',
    placesTypeHints: ['chiropractor', 'doctor', 'health'],
    keywords: ['chiropractor', 'chiropractic', 'spine', 'adjustment', 'back pain', 'neck pain']
  },
  {
    key: 'physical_therapy',
    label: 'Physical therapy clinic',
    placesTypeHints: ['physiotherapist', 'health'],
    keywords: ['physical therapy', 'physiotherapy', 'rehabilitation', 'sports injury', 'recovery']
  },
  {
    key: 'dentist',
    label: 'Dental clinic',
    placesTypeHints: ['dentist', 'doctor', 'health'],
    keywords: ['dentist', 'dental', 'teeth', 'dental clinic', 'family dentistry', 'cosmetic dentistry']
  },
  {
    key: 'orthodontist',
    label: 'Orthodontist',
    placesTypeHints: ['dentist', 'doctor', 'health'],
    keywords: ['orthodontist', 'braces', 'invisalign', 'orthodontics', 'teeth straightening']
  },
  {
    key: 'optometrist',
    label: 'Optometrist',
    placesTypeHints: ['doctor', 'health'],
    keywords: ['optometrist', 'eye doctor', 'eye exam', 'glasses', 'contacts', 'vision']
  },
  {
    key: 'gym',
    label: 'Gym',
    placesTypeHints: ['gym', 'health'],
    keywords: ['gym', 'fitness', 'workout', 'weight training', 'cardio', 'fitness center']
  },
  {
    key: 'yoga_studio',
    label: 'Yoga studio',
    placesTypeHints: ['gym', 'health'],
    keywords: ['yoga', 'yoga studio', 'hot yoga', 'vinyasa', 'hatha', 'meditation']
  },
  {
    key: 'pilates_studio',
    label: 'Pilates studio',
    placesTypeHints: ['gym', 'health'],
    keywords: ['pilates', 'pilates studio', 'reformer', 'mat pilates']
  },
  
  // ============================================================================
  // RETAIL
  // ============================================================================
  {
    key: 'supplement_store',
    label: 'Supplement store',
    placesTypeHints: ['health', 'vitamin_and_supplements_store'],
    keywords: ['supplements', 'supplement store', 'vitamins', 'protein', 'whey', 'creatine', 
               'pre workout', 'preworkout', 'bcaa', 'amino acids', 'nutrition store', 
               'sports nutrition', 'bodybuilding', 'fitness supplements', 'gnc']
  },
  {
    key: 'health_food_store',
    label: 'Health food store',
    placesTypeHints: ['health', 'grocery_or_supermarket'],
    keywords: ['health food', 'organic', 'natural foods', 'whole foods', 'health market']
  },
  {
    key: 'pharmacy',
    label: 'Pharmacy',
    placesTypeHints: ['pharmacy', 'drugstore'],
    keywords: ['pharmacy', 'drugstore', 'prescription', 'medication', 'cvs', 'walgreens']
  },
  {
    key: 'grocery_store',
    label: 'Grocery store',
    placesTypeHints: ['grocery_or_supermarket', 'supermarket'],
    keywords: ['grocery', 'supermarket', 'groceries', 'food market']
  },
  {
    key: 'convenience_store',
    label: 'Convenience store',
    placesTypeHints: ['convenience_store'],
    keywords: ['convenience store', '7-eleven', 'circle k', 'quick stop']
  },
  {
    key: 'clothing_store',
    label: 'Clothing store',
    placesTypeHints: ['clothing_store'],
    keywords: ['clothing', 'apparel', 'fashion', 'boutique', 'clothes']
  },
  {
    key: 'shoe_store',
    label: 'Shoe store',
    placesTypeHints: ['shoe_store'],
    keywords: ['shoes', 'footwear', 'sneakers', 'boots']
  },
  {
    key: 'jewelry_store',
    label: 'Jewelry store',
    placesTypeHints: ['jewelry_store'],
    keywords: ['jewelry', 'jeweler', 'diamonds', 'rings', 'watches']
  },
  {
    key: 'electronics_store',
    label: 'Electronics store',
    placesTypeHints: ['electronics_store'],
    keywords: ['electronics', 'computers', 'phones', 'best buy', 'tech']
  },
  {
    key: 'furniture_store',
    label: 'Furniture store',
    placesTypeHints: ['furniture_store', 'home_goods_store'],
    keywords: ['furniture', 'home furnishings', 'sofa', 'couch', 'bedroom', 'living room']
  },
  {
    key: 'home_goods_store',
    label: 'Home goods store',
    placesTypeHints: ['home_goods_store'],
    keywords: ['home goods', 'home decor', 'kitchen', 'bedding', 'bath']
  },
  {
    key: 'bookstore',
    label: 'Bookstore',
    placesTypeHints: ['book_store'],
    keywords: ['bookstore', 'books', 'bookshop', 'reading']
  },
  {
    key: 'pet_store',
    label: 'Pet store',
    placesTypeHints: ['pet_store'],
    keywords: ['pet store', 'pet supplies', 'petco', 'petsmart', 'pet food']
  },
  {
    key: 'smoke_shop',
    label: 'Smoke shop',
    placesTypeHints: [],
    keywords: ['smoke shop', 'vape', 'tobacco', 'vape shop', 'hookah', 'cbd']
  },
  {
    key: 'liquor_store',
    label: 'Liquor store',
    placesTypeHints: ['liquor_store'],
    keywords: ['liquor store', 'wine', 'beer', 'spirits', 'alcohol']
  },
  {
    key: 'hardware_store',
    label: 'Hardware store',
    placesTypeHints: ['hardware_store'],
    keywords: ['hardware', 'home improvement', 'tools', 'lowes', 'home depot']
  },
  {
    key: 'florist',
    label: 'Florist',
    placesTypeHints: ['florist'],
    keywords: ['florist', 'flowers', 'floral', 'bouquet', 'wedding flowers']
  },
  {
    key: 'gift_shop',
    label: 'Gift shop',
    placesTypeHints: [],
    keywords: ['gift shop', 'gifts', 'souvenirs', 'novelties']
  },
  
  // ============================================================================
  // FOOD & BEVERAGE
  // ============================================================================
  {
    key: 'cafe',
    label: 'Cafe',
    placesTypeHints: ['cafe', 'coffee_shop'],
    keywords: ['cafe', 'coffee', 'espresso', 'latte', 'cappuccino', 'coffee shop']
  },
  {
    key: 'coffee_shop',
    label: 'Coffee shop',
    placesTypeHints: ['cafe', 'coffee_shop'],
    keywords: ['coffee shop', 'starbucks', 'coffee house', 'java']
  },
  {
    key: 'fast_food',
    label: 'Fast food restaurant',
    placesTypeHints: ['fast_food_restaurant', 'meal_takeaway'],
    keywords: ['fast food', 'quick service', 'drive thru', 'mcdonalds', 'burger king', 'wendys']
  },
  {
    key: 'pizza',
    label: 'Pizza restaurant',
    placesTypeHints: ['pizza_restaurant', 'meal_takeaway'],
    keywords: ['pizza', 'pizzeria', 'pizza delivery', 'dominos', 'pizza hut']
  },
  {
    key: 'mexican',
    label: 'Mexican restaurant',
    placesTypeHints: ['restaurant', 'meal_takeaway'],
    keywords: ['mexican', 'tacos', 'burritos', 'chipotle', 'taco bell', 'mexican food']
  },
  {
    key: 'chinese',
    label: 'Chinese restaurant',
    placesTypeHints: ['restaurant', 'meal_takeaway'],
    keywords: ['chinese', 'chinese food', 'asian', 'dim sum', 'chinese restaurant']
  },
  {
    key: 'sushi',
    label: 'Sushi restaurant',
    placesTypeHints: ['restaurant', 'meal_takeaway'],
    keywords: ['sushi', 'japanese', 'sashimi', 'rolls', 'hibachi']
  },
  {
    key: 'italian',
    label: 'Italian restaurant',
    placesTypeHints: ['restaurant'],
    keywords: ['italian', 'pasta', 'italian restaurant', 'olive garden']
  },
  {
    key: 'restaurant',
    label: 'Restaurant',
    placesTypeHints: ['restaurant', 'meal_takeaway'],
    keywords: ['restaurant', 'dining', 'eatery', 'bistro', 'grill']
  },
  {
    key: 'bakery',
    label: 'Bakery',
    placesTypeHints: ['bakery'],
    keywords: ['bakery', 'bread', 'pastries', 'baked goods', 'cakes']
  },
  {
    key: 'dessert_shop',
    label: 'Dessert shop',
    placesTypeHints: [],
    keywords: ['dessert', 'sweets', 'cupcakes', 'cookies', 'treats']
  },
  {
    key: 'ice_cream',
    label: 'Ice cream shop',
    placesTypeHints: ['ice_cream_shop'],
    keywords: ['ice cream', 'gelato', 'frozen yogurt', 'froyo', 'dairy queen']
  },
  {
    key: 'bar',
    label: 'Bar',
    placesTypeHints: ['bar', 'night_club'],
    keywords: ['bar', 'pub', 'tavern', 'lounge', 'cocktails', 'drinks']
  },
  
  // ============================================================================
  // SERVICES / TRADES
  // ============================================================================
  {
    key: 'cleaning_service',
    label: 'Cleaning service',
    placesTypeHints: [],
    keywords: ['cleaning', 'cleaning service', 'maid service', 'housekeeping', 'janitorial']
  },
  {
    key: 'moving_company',
    label: 'Moving company',
    placesTypeHints: ['moving_company'],
    keywords: ['moving', 'movers', 'moving company', 'relocation']
  },
  {
    key: 'roofing_contractor',
    label: 'Roofing contractor',
    placesTypeHints: ['roofing_contractor'],
    keywords: ['roofing', 'roofer', 'roof repair', 'roof replacement']
  },
  {
    key: 'plumbing',
    label: 'Plumber',
    placesTypeHints: ['plumber'],
    keywords: ['plumber', 'plumbing', 'pipe', 'drain', 'water heater']
  },
  {
    key: 'electrician',
    label: 'Electrician',
    placesTypeHints: ['electrician'],
    keywords: ['electrician', 'electrical', 'wiring', 'electrical contractor']
  },
  {
    key: 'hvac',
    label: 'HVAC contractor',
    placesTypeHints: [],
    keywords: ['hvac', 'heating', 'cooling', 'air conditioning', 'furnace', 'ac repair']
  },
  {
    key: 'landscaping',
    label: 'Landscaping service',
    placesTypeHints: [],
    keywords: ['landscaping', 'lawn care', 'landscape', 'yard work', 'lawn service']
  },
  {
    key: 'auto_repair',
    label: 'Auto repair shop',
    placesTypeHints: ['car_repair'],
    keywords: ['auto repair', 'car repair', 'mechanic', 'automotive', 'oil change']
  },
  {
    key: 'car_wash',
    label: 'Car wash',
    placesTypeHints: ['car_wash'],
    keywords: ['car wash', 'auto detailing', 'detailing', 'wash']
  },
  {
    key: 'auto_dealer',
    label: 'Auto dealership',
    placesTypeHints: ['car_dealer'],
    keywords: ['car dealer', 'auto dealer', 'dealership', 'used cars', 'new cars']
  },
  {
    key: 'gas_station',
    label: 'Gas station',
    placesTypeHints: ['gas_station'],
    keywords: ['gas station', 'fuel', 'petrol', 'shell', 'bp', 'exxon']
  },
  {
    key: 'storage',
    label: 'Storage facility',
    placesTypeHints: ['storage'],
    keywords: ['storage', 'self storage', 'storage unit', 'storage facility']
  },
  {
    key: 'veterinarian',
    label: 'Veterinary clinic',
    placesTypeHints: ['veterinary_care'],
    keywords: ['veterinarian', 'vet', 'animal hospital', 'pet care', 'veterinary']
  },
  
  // ============================================================================
  // PROFESSIONAL SERVICES
  // ============================================================================
  {
    key: 'real_estate',
    label: 'Real estate agency',
    placesTypeHints: ['real_estate_agency'],
    keywords: ['real estate', 'realtor', 'real estate agent', 'homes for sale', 'property']
  },
  {
    key: 'law_firm',
    label: 'Law firm',
    placesTypeHints: ['lawyer', 'legal'],
    keywords: ['law firm', 'lawyer', 'attorney', 'legal', 'law office']
  },
  {
    key: 'accounting',
    label: 'Accounting firm',
    placesTypeHints: ['accounting'],
    keywords: ['accounting', 'accountant', 'cpa', 'tax', 'bookkeeping']
  },
  {
    key: 'marketing_agency',
    label: 'Marketing agency',
    placesTypeHints: [],
    keywords: ['marketing', 'marketing agency', 'advertising', 'digital marketing', 'seo']
  },
  {
    key: 'insurance',
    label: 'Insurance agency',
    placesTypeHints: ['insurance_agency'],
    keywords: ['insurance', 'insurance agent', 'insurance agency', 'state farm', 'allstate']
  },
  {
    key: 'bank',
    label: 'Bank',
    placesTypeHints: ['bank', 'atm'],
    keywords: ['bank', 'banking', 'credit union', 'financial', 'atm']
  },
  
  // ============================================================================
  // EDUCATION
  // ============================================================================
  {
    key: 'driving_school',
    label: 'Driving school',
    placesTypeHints: ['driving_school'],
    keywords: ['driving school', 'drivers ed', 'driving lessons', 'driving instruction']
  },
  {
    key: 'school',
    label: 'School',
    placesTypeHints: ['school', 'secondary_school', 'primary_school'],
    keywords: ['school', 'education', 'academy', 'learning center']
  },
  {
    key: 'dance_school',
    label: 'Dance school',
    placesTypeHints: [],
    keywords: ['dance', 'dance studio', 'dance school', 'ballet', 'hip hop']
  },
  {
    key: 'music_school',
    label: 'Music school',
    placesTypeHints: [],
    keywords: ['music', 'music school', 'music lessons', 'piano', 'guitar']
  },
  
  // ============================================================================
  // ENTERTAINMENT
  // ============================================================================
  {
    key: 'hotel',
    label: 'Hotel',
    placesTypeHints: ['lodging', 'hotel'],
    keywords: ['hotel', 'inn', 'motel', 'accommodation', 'lodging']
  },
  {
    key: 'movie_theater',
    label: 'Movie theater',
    placesTypeHints: ['movie_theater'],
    keywords: ['movie theater', 'cinema', 'movies', 'amc', 'regal']
  },
  {
    key: 'bowling',
    label: 'Bowling alley',
    placesTypeHints: ['bowling_alley'],
    keywords: ['bowling', 'bowling alley', 'lanes']
  },
  {
    key: 'amusement_park',
    label: 'Amusement park',
    placesTypeHints: ['amusement_park', 'tourist_attraction'],
    keywords: ['amusement park', 'theme park', 'rides', 'roller coaster']
  },
  
  // ============================================================================
  // FALLBACK (last resort)
  // ============================================================================
  {
    key: 'local_business',
    label: 'Local business',
    placesTypeHints: [],
    keywords: []
  }
];

/**
 * Get taxon by key
 */
export function getTaxonByKey(key: string): Taxon | undefined {
  return TAXONOMY.find(t => t.key === key);
}

/**
 * Get all taxon keys and labels for OpenAI closed-set selection
 */
export function getTaxonClosedSet(): Array<{ key: string; label: string }> {
  // Exclude the fallback
  return TAXONOMY.filter(t => t.key !== 'local_business').map(t => ({ key: t.key, label: t.label }));
}




