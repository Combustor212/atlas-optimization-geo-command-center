/**
 * Strict Primary Category Resolver
 * 
 * Returns a customer-facing category label for any Google Place.
 * NEVER returns generic labels like "Establishment".
 * 
 * Algorithm:
 * 1. Check blacklist (hard fail)
 * 2. Try Places primaryType/primaryTypeDisplayName (deterministic)
 * 3. Try keyword scoring (deterministic)
 * 4. Try OpenAI with closed set (last resort)
 * 5. If all fail → unresolved
 */

import { PlaceDetails } from '../types';
import { logger } from '../lib/logger';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface CategoryResolution {
  key: string | null; // e.g., "driving_school", "med_spa" (null if unresolved)
  label: string | null; // e.g., "Driving school", "Medical spa" (null if unresolved)
  confidence: number; // 0.0 - 1.0
  source: 'places' | 'places_display' | 'keywords' | 'openai' | 'unresolved';
  debug?: {
    name?: string;
    primaryType?: string;
    primaryTypeDisplayName?: string;
    types?: string[];
    typesSample?: string[]; // First 10 types for UI display
    blacklistHit?: boolean;
    keywordScores?: Record<string, number>;
    keywordMatch?: string;
    methodsTried?: string[];
    finalMethod?: string;
    openaiReason?: string;
  };
}

export interface CategoryDefinition {
  key: string;
  label: string;
  placesTypes: string[]; // Google Places types that map to this category
  keywords: string[]; // Keywords to score against name/description/website
}

// ═══════════════════════════════════════════════════════════════
// BLACKLIST (HARD FAIL)
// ═══════════════════════════════════════════════════════════════

const BLACKLISTED_TERMS = [
  'establishment',
  'point_of_interest',
  'store', // Too generic
  'business',
  'place',
  'food', // Too broad
  'service', // Too broad
  'organization',
];

function isBlacklisted(term: string | undefined): boolean {
  if (!term) return false;
  const normalized = term.toLowerCase().trim();
  return BLACKLISTED_TERMS.some(blacklisted => normalized === blacklisted || normalized.includes(blacklisted));
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY TAXONOMY (THE "FAT LIST")
// ═══════════════════════════════════════════════════════════════

const CATEGORIES: CategoryDefinition[] = [
  // Education & Training
  {
    key: 'driving_school',
    label: 'Driving school',
    placesTypes: ['driving_school'],
    keywords: ['driving', 'drivers ed', 'road test', 'dmv', 'learners permit', 'driving lessons', 'driving instructor']
  },
  
  // Health / Beauty / Wellness
  {
    key: 'med_spa',
    label: 'Medical spa',
    placesTypes: ['medical_spa', 'med_spa'],
    keywords: ['med spa', 'medical spa', 'botox', 'filler', 'lip filler', 'microneedling', 'hydrafacial', 'laser', 'aesthetics', 'aesthetic clinic', 'dermal filler', 'cosmetic injections']
  },
  {
    key: 'spa',
    label: 'Spa',
    placesTypes: ['spa', 'day_spa'],
    keywords: ['spa', 'massage', 'facial', 'body wrap', 'sauna', 'hot tub', 'relaxation']
  },
  {
    key: 'beauty_salon',
    label: 'Beauty salon',
    placesTypes: ['beauty_salon'],
    keywords: ['beauty', 'makeup', 'waxing', 'eyebrows', 'lashes', 'nails']
  },
  {
    key: 'hair_salon',
    label: 'Hair salon',
    placesTypes: ['hair_salon', 'hair_care'],
    keywords: ['hair', 'salon', 'haircut', 'color', 'highlights', 'balayage', 'blowout']
  },
  {
    key: 'barber_shop',
    label: 'Barbershop',
    placesTypes: ['barber_shop'],
    keywords: ['barber', 'fade', 'taper', 'lineup', 'shave', 'beard trim', 'mens haircut']
  },
  {
    key: 'nail_salon',
    label: 'Nail salon',
    placesTypes: ['nail_salon'],
    keywords: ['nails', 'manicure', 'pedicure', 'gel', 'acrylic', 'nail art']
  },
  {
    key: 'massage_therapy',
    label: 'Massage therapist',
    placesTypes: ['massage_therapist', 'massage'],
    keywords: ['massage', 'deep tissue', 'swedish', 'sports massage', 'trigger point']
  },
  {
    key: 'chiropractor',
    label: 'Chiropractor',
    placesTypes: ['chiropractor'],
    keywords: ['chiropractor', 'chiropractic', 'adjustment', 'spine', 'back pain']
  },
  {
    key: 'physical_therapy',
    label: 'Physical therapy clinic',
    placesTypes: ['physical_therapy', 'physiotherapist'],
    keywords: ['physical therapy', 'physiotherapy', 'rehab', 'rehabilitation', 'injury recovery']
  },
  {
    key: 'dentist',
    label: 'Dental clinic',
    placesTypes: ['dentist', 'dental_clinic'],
    keywords: ['dentist', 'dental', 'teeth', 'cleaning', 'cavity', 'root canal', 'crown']
  },
  {
    key: 'orthodontist',
    label: 'Orthodontist',
    placesTypes: ['orthodontist'],
    keywords: ['orthodontist', 'braces', 'invisalign', 'retainer', 'orthodontics']
  },
  {
    key: 'optometrist',
    label: 'Optometrist',
    placesTypes: ['optometrist', 'eye_care'],
    keywords: ['optometrist', 'eye exam', 'glasses', 'contacts', 'vision']
  },
  {
    key: 'gym',
    label: 'Gym',
    placesTypes: ['gym', 'fitness_center'],
    keywords: ['gym', 'fitness', 'workout', 'weights', 'cardio', 'training', 'exercise']
  },
  {
    key: 'yoga_studio',
    label: 'Yoga studio',
    placesTypes: ['yoga_studio'],
    keywords: ['yoga', 'vinyasa', 'hot yoga', 'meditation', 'mindfulness']
  },
  {
    key: 'pilates_studio',
    label: 'Pilates studio',
    placesTypes: ['pilates_studio'],
    keywords: ['pilates', 'reformer', 'core', 'mat pilates']
  },
  
  // Retail
  {
    key: 'supplement_store',
    label: 'Supplement store',
    placesTypes: ['supplement_store', 'vitamin_supplements', 'health_food_store', 'nutrition_store'],
    keywords: ['supplements', 'vitamins', 'whey', 'protein', 'creatine', 'pre workout', 'nutrition', 'bodybuilding', 'fitness supplements']
  },
  {
    key: 'pharmacy',
    label: 'Pharmacy',
    placesTypes: ['pharmacy', 'drugstore'],
    keywords: ['pharmacy', 'drugstore', 'prescription', 'medication', 'rx']
  },
  {
    key: 'grocery_store',
    label: 'Grocery store',
    placesTypes: ['grocery_store', 'supermarket'],
    keywords: ['grocery', 'supermarket', 'produce', 'meat', 'dairy']
  },
  {
    key: 'convenience_store',
    label: 'Convenience store',
    placesTypes: ['convenience_store'],
    keywords: ['convenience', '24 hour', 'snacks', 'drinks']
  },
  {
    key: 'clothing_store',
    label: 'Clothing store',
    placesTypes: ['clothing_store'],
    keywords: ['clothing', 'apparel', 'fashion', 'mens wear', 'womens wear']
  },
  {
    key: 'shoe_store',
    label: 'Shoe store',
    placesTypes: ['shoe_store'],
    keywords: ['shoes', 'footwear', 'sneakers', 'boots', 'sandals']
  },
  {
    key: 'jewelry_store',
    label: 'Jewelry store',
    placesTypes: ['jewelry_store'],
    keywords: ['jewelry', 'rings', 'necklace', 'bracelet', 'earrings', 'engagement ring']
  },
  {
    key: 'electronics_store',
    label: 'Electronics store',
    placesTypes: ['electronics_store'],
    keywords: ['electronics', 'computers', 'phones', 'laptops', 'tablets']
  },
  {
    key: 'furniture_store',
    label: 'Furniture store',
    placesTypes: ['furniture_store'],
    keywords: ['furniture', 'couch', 'sofa', 'bed', 'table', 'chair']
  },
  {
    key: 'home_goods_store',
    label: 'Home goods store',
    placesTypes: ['home_goods_store'],
    keywords: ['home goods', 'decor', 'kitchenware', 'bedding', 'bath']
  },
  {
    key: 'bookstore',
    label: 'Bookstore',
    placesTypes: ['book_store'],
    keywords: ['bookstore', 'books', 'novels', 'textbooks', 'magazines']
  },
  {
    key: 'pet_store',
    label: 'Pet store',
    placesTypes: ['pet_store'],
    keywords: ['pet', 'dog', 'cat', 'bird', 'fish', 'pet food', 'pet supplies']
  },
  {
    key: 'smoke_shop',
    label: 'Smoke shop',
    placesTypes: ['smoke_shop'],
    keywords: ['smoke shop', 'vape', 'tobacco', 'cigars', 'hookah']
  },
  {
    key: 'liquor_store',
    label: 'Liquor store',
    placesTypes: ['liquor_store'],
    keywords: ['liquor', 'wine', 'beer', 'spirits', 'alcohol']
  },
  
  // Food
  {
    key: 'cafe',
    label: 'Cafe',
    placesTypes: ['cafe'],
    keywords: ['cafe', 'coffee shop', 'espresso', 'latte', 'cappuccino', 'pastries']
  },
  {
    key: 'coffee_shop',
    label: 'Coffee shop',
    placesTypes: ['coffee_shop'],
    keywords: ['coffee', 'espresso', 'latte', 'cappuccino', 'brew', 'roastery']
  },
  {
    key: 'restaurant',
    label: 'Restaurant',
    placesTypes: ['restaurant'],
    keywords: ['restaurant', 'dining', 'menu', 'entree', 'appetizer', 'dinner']
  },
  {
    key: 'fast_food',
    label: 'Fast food restaurant',
    placesTypes: ['fast_food_restaurant'],
    keywords: ['fast food', 'quick service', 'drive thru', 'burgers', 'fries']
  },
  {
    key: 'pizza',
    label: 'Pizza restaurant',
    placesTypes: ['pizza_restaurant'],
    keywords: ['pizza', 'pizzeria', 'slice', 'pepperoni', 'mozzarella']
  },
  {
    key: 'mexican',
    label: 'Mexican restaurant',
    placesTypes: ['mexican_restaurant'],
    keywords: ['mexican', 'tacos', 'burritos', 'quesadilla', 'enchilada', 'salsa']
  },
  {
    key: 'chinese',
    label: 'Chinese restaurant',
    placesTypes: ['chinese_restaurant'],
    keywords: ['chinese', 'wonton', 'dim sum', 'fried rice', 'lo mein']
  },
  {
    key: 'sushi',
    label: 'Sushi restaurant',
    placesTypes: ['sushi_restaurant', 'japanese_restaurant'],
    keywords: ['sushi', 'sashimi', 'roll', 'nigiri', 'tempura', 'ramen']
  },
  {
    key: 'bakery',
    label: 'Bakery',
    placesTypes: ['bakery'],
    keywords: ['bakery', 'bread', 'pastries', 'cakes', 'cookies', 'croissant']
  },
  {
    key: 'dessert_shop',
    label: 'Dessert shop',
    placesTypes: ['dessert_shop'],
    keywords: ['dessert', 'sweets', 'cupcakes', 'donuts', 'brownies']
  },
  {
    key: 'ice_cream',
    label: 'Ice cream shop',
    placesTypes: ['ice_cream_shop'],
    keywords: ['ice cream', 'gelato', 'frozen yogurt', 'sorbet', 'sundae']
  },
  
  // Services / Trades
  {
    key: 'cleaning_service',
    label: 'Cleaning service',
    placesTypes: ['cleaning_service'],
    keywords: ['cleaning', 'maid', 'housekeeping', 'janitorial']
  },
  {
    key: 'moving_company',
    label: 'Moving company',
    placesTypes: ['moving_company'],
    keywords: ['moving', 'movers', 'relocation', 'packing', 'storage']
  },
  {
    key: 'roofing_contractor',
    label: 'Roofing contractor',
    placesTypes: ['roofing_contractor'],
    keywords: ['roofing', 'roof', 'shingles', 'gutter', 'leak repair']
  },
  {
    key: 'plumbing',
    label: 'Plumber',
    placesTypes: ['plumber'],
    keywords: ['plumbing', 'plumber', 'pipes', 'drain', 'leak', 'water heater']
  },
  {
    key: 'electrician',
    label: 'Electrician',
    placesTypes: ['electrician'],
    keywords: ['electrician', 'electrical', 'wiring', 'circuit', 'panel', 'outlet']
  },
  {
    key: 'hvac',
    label: 'HVAC contractor',
    placesTypes: ['hvac_contractor'],
    keywords: ['hvac', 'heating', 'cooling', 'air conditioning', 'furnace', 'ac repair']
  },
  {
    key: 'landscaping',
    label: 'Landscaping service',
    placesTypes: ['landscaping'],
    keywords: ['landscaping', 'lawn care', 'mowing', 'trimming', 'mulch', 'garden']
  },
  {
    key: 'auto_repair',
    label: 'Auto repair shop',
    placesTypes: ['auto_repair', 'car_repair'],
    keywords: ['auto repair', 'car repair', 'mechanic', 'oil change', 'brake', 'transmission']
  },
  {
    key: 'car_wash',
    label: 'Car wash',
    placesTypes: ['car_wash'],
    keywords: ['car wash', 'auto wash', 'detailing', 'wax', 'vacuum']
  },
  
  // Professional
  {
    key: 'law_firm',
    label: 'Law firm',
    placesTypes: ['lawyer', 'attorney', 'legal_services'],
    keywords: ['lawyer', 'attorney', 'law firm', 'legal', 'litigation', 'consultation']
  },
  {
    key: 'real_estate',
    label: 'Real estate agency',
    placesTypes: ['real_estate_agency'],
    keywords: ['real estate', 'realtor', 'homes', 'properties', 'listings']
  },
  {
    key: 'accounting',
    label: 'Accounting firm',
    placesTypes: ['accounting', 'accountant'],
    keywords: ['accounting', 'accountant', 'tax', 'bookkeeping', 'cpa']
  },
  {
    key: 'marketing_agency',
    label: 'Marketing agency',
    placesTypes: ['marketing_agency'],
    keywords: ['marketing', 'advertising', 'seo', 'social media', 'branding']
  },
  {
    key: 'insurance',
    label: 'Insurance agency',
    placesTypes: ['insurance_agency'],
    keywords: ['insurance', 'policy', 'coverage', 'auto insurance', 'life insurance']
  },
];

// Build reverse lookup map: Places type → Category key
const PLACES_TYPE_TO_CATEGORY_MAP = new Map<string, CategoryDefinition>();
for (const cat of CATEGORIES) {
  for (const placesType of cat.placesTypes) {
    PLACES_TYPE_TO_CATEGORY_MAP.set(placesType, cat);
  }
}

// ═══════════════════════════════════════════════════════════════
// OBVIOUS NAME FALLBACK (DETERMINISTIC - HIGH CONFIDENCE)
// ═══════════════════════════════════════════════════════════════

interface NamePattern {
  patterns: RegExp[];
  category: CategoryDefinition;
  confidence: number;
}

const NAME_PATTERNS: NamePattern[] = [
  {
    patterns: [
      /driving\s+school/i,
      /driver'?s?\s+ed/i,
      /road\s+test/i,
      /driving\s+lessons/i,
      /behind\s+the\s+wheel/i,
      /learner'?s?\s+permit/i
    ],
    category: CATEGORIES.find(c => c.key === 'driving_school')!,
    confidence: 0.95
  },
  {
    patterns: [
      /med\s+spa/i,
      /medical\s+spa/i,
      /botox/i,
      /aesthetic\s+clinic/i,
      /cosmetic\s+injections/i
    ],
    category: CATEGORIES.find(c => c.key === 'med_spa')!,
    confidence: 0.95
  },
  {
    patterns: [
      /barber\s+shop/i,
      /barbershop/i,
      /barber$/i
    ],
    category: CATEGORIES.find(c => c.key === 'barber_shop')!,
    confidence: 0.95
  },
  {
    patterns: [
      /supplement\s+store/i,
      /supplements?$/i,
      /nutrition\s+store/i,
      /vitamin\s+shop/i
    ],
    category: CATEGORIES.find(c => c.key === 'supplement_store')!,
    confidence: 0.95
  },
  {
    patterns: [
      /law\s+firm/i,
      /attorney/i,
      /lawyer/i,
      /legal\s+services/i
    ],
    category: CATEGORIES.find(c => c.key === 'law_firm')!,
    confidence: 0.95
  },
  {
    patterns: [
      /dental\s+clinic/i,
      /dentist/i,
      /dentistry/i
    ],
    category: CATEGORIES.find(c => c.key === 'dentist')!,
    confidence: 0.95
  }
];

function classifyByBusinessName(name: string): { category: CategoryDefinition; confidence: number; match: string } | null {
  const normalizedName = name.toLowerCase().trim();
  
  for (const namePattern of NAME_PATTERNS) {
    for (const pattern of namePattern.patterns) {
      if (pattern.test(normalizedName)) {
        const match = normalizedName.match(pattern)?.[0] || pattern.source;
        logger.info('[Category Resolver] Name pattern match', {
          name,
          pattern: pattern.source,
          category: namePattern.category.key,
          match
        });
        return {
          category: namePattern.category,
          confidence: namePattern.confidence,
          match
        };
      }
    }
  }
  
  return null;
}

function keywordFallback(placeDetails: PlaceDetails): { key: string; label: string; confidence: number; source: 'keywords' } | null {
  const rawName =
    placeDetails.displayName?.text ||
    (placeDetails.displayName as any) ||
    placeDetails.name ||
    (placeDetails as any).result?.name ||
    '';

  const name = rawName
    .toLowerCase()
    .replace(/[’']/g, '') // remove apostrophes
    .replace(/[^a-z0-9\s]/g, ' ') // strip punctuation
    .replace(/\s+/g, ' ') // collapse spaces
    .trim();

  const tokens = new Set(name.split(' ').filter(Boolean));

  const hasPhrase = (phrase: string) => name.includes(phrase);
  const hasAll = (...words: string[]) => words.every((w) => tokens.has(w));

  // Driving school (hard deterministic)
  if (
    hasAll('driving', 'school') ||
    hasPhrase('driving school') ||
    hasPhrase('drivers ed') ||
    hasPhrase('driver ed') ||
    hasPhrase('driving lessons') ||
    hasPhrase('behind the wheel') ||
    hasPhrase('road test')
  ) {
    return {
      key: 'driving_school',
      label: 'Driving school',
      confidence: 0.95,
      source: 'keywords',
    };
  }

  console.error('[CATEGORY FALLBACK FAIL]', { rawName, name });
  return null;
}

// ═══════════════════════════════════════════════════════════════
// KEYWORD SCORING (DETERMINISTIC)
// ═══════════════════════════════════════════════════════════════

interface KeywordScoringInput {
  name: string;
  editorialSummary?: string;
  websiteTitle?: string;
  websiteMeta?: string;
}

function scoreCategories(input: KeywordScoringInput): Array<{ category: CategoryDefinition; score: number }> {
  const text = [
    input.name || '',
    input.editorialSummary || '',
    input.websiteTitle || '',
    input.websiteMeta || ''
  ].join(' ').toLowerCase();
  
  const scores = CATEGORIES.map(category => {
    let score = 0;
    for (const keyword of category.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        // Weight by keyword length (longer = more specific)
        score += keyword.split(' ').length;
      }
    }
    return { category, score };
  });
  
  return scores.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
}

// ═══════════════════════════════════════════════════════════════
// OPENAI FALLBACK (CLOSED SET)
// ═══════════════════════════════════════════════════════════════

async function callOpenAIForCategory(
  placeDetails: PlaceDetails
): Promise<{ key: string; label: string; confidence: number; reason: string } | null> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    logger.warn('[Category Resolver] OpenAI API key not found, skipping OpenAI fallback');
    return null;
  }
  
  const categoryList = CATEGORIES.map(c => `${c.key}: "${c.label}"`).join('\n');
  
  const prompt = `You are a business category classifier. Given the following business information, classify it into ONE of the approved categories below.

Business Information:
- Name: ${placeDetails.name}
- Primary Type: ${placeDetails.primaryType || 'N/A'}
- Types: ${(placeDetails.types || []).join(', ')}
- Description: ${placeDetails.editorial_summary?.overview || 'N/A'}
- Website: ${placeDetails.website || 'N/A'}

Approved Categories (you MUST choose one of these):
${categoryList}

Rules:
1. You MUST choose ONE of the approved categories above
2. NEVER return: establishment, store, business, place, point_of_interest
3. Use specific category when possible (e.g., "medical_spa" not just "spa")
4. Confidence should be 0.0-1.0 (use 0.7+ only if very confident)

Return ONLY valid JSON with this exact format:
{
  "key": "category_key",
  "label": "Category Label",
  "confidence": 0.85,
  "reason": "Brief explanation"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a precise business category classifier. Always return valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });
    
    if (!response.ok) {
      logger.error('[Category Resolver] OpenAI API error', { status: response.status });
      return null;
    }
    
    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      logger.error('[Category Resolver] No content in OpenAI response');
      return null;
    }
    
    const result = JSON.parse(content);
    
    // Validate result
    if (!result.key || !result.label || typeof result.confidence !== 'number') {
      logger.error('[Category Resolver] Invalid OpenAI response format', { result });
      return null;
    }
    
    // Ensure key exists in our taxonomy
    const category = CATEGORIES.find(c => c.key === result.key);
    if (!category) {
      logger.error('[Category Resolver] OpenAI returned unknown category key', { key: result.key });
      return null;
    }
    
    return {
      key: result.key,
      label: result.label,
      confidence: result.confidence,
      reason: result.reason || 'OpenAI classification'
    };
  } catch (error) {
    logger.error('[Category Resolver] OpenAI call failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN RESOLVER
// ═══════════════════════════════════════════════════════════════

export async function resolvePrimaryCategory(
  placeDetails: PlaceDetails
): Promise<CategoryResolution> {
  // ─────────────────────────────────────────────────────────────
  // HARD ASSERTIONS (prove data plumbing)
  // ─────────────────────────────────────────────────────────────
  if (!placeDetails) {
    throw new Error('placeDetails is null/undefined');
  }

  // Normalize name from v1 + legacy shapes
  const resolvedName =
    placeDetails.displayName?.text ||
    (placeDetails.displayName as any) ||
    placeDetails.name ||
    (placeDetails as any)?.result?.name ||
    '';

  if (!resolvedName) {
    console.error('[CATEGORY] placeDetails missing name/displayName', placeDetails);
    throw new Error('placeDetails missing displayName/name');
  }

  // Ensure `.name` is populated for downstream deterministic checks
  (placeDetails as any).name = resolvedName;

  const methodsTried: string[] = [];
  
  const debug: CategoryResolution['debug'] = {
    name: placeDetails.name,
    primaryType: placeDetails.primaryType,
    primaryTypeDisplayName: placeDetails.primaryTypeDisplayName?.text,
    types: placeDetails.types || [],
    typesSample: (placeDetails.types || []).slice(0, 10),
    methodsTried,
  };
  
  // ─────────────────────────────────────────────────────────────
  // PASS 0: Obvious name fallback (HIGHEST PRIORITY)
  // ─────────────────────────────────────────────────────────────
  
  methodsTried.push('keywords');
  const kw = keywordFallback(placeDetails);
  if (kw) {
    debug.finalMethod = 'keywords';
    logger.info('[Category Resolver] ✅ Keyword fallback match', {
      name: placeDetails.name,
      category: kw.key,
      confidence: kw.confidence,
    });
    return {
      key: kw.key,
      label: kw.label,
      confidence: kw.confidence,
      source: kw.source,
      debug
    };
  }
  
  // ─────────────────────────────────────────────────────────────
  // PASS 1: Check blacklist (hard fail)
  // ─────────────────────────────────────────────────────────────
  
  const primaryType = placeDetails.primaryType;
  const primaryTypeDisplayName = placeDetails.primaryTypeDisplayName?.text;
  
  if (isBlacklisted(primaryType) || isBlacklisted(primaryTypeDisplayName)) {
    debug.blacklistHit = true;
    logger.info('[Category Resolver] Blacklist hit', { primaryType, primaryTypeDisplayName });
    // Continue to next pass, don't return yet
  }
  
  // ─────────────────────────────────────────────────────────────
  // PASS 2: Use Places primaryTypeDisplayName (if specific)
  // ─────────────────────────────────────────────────────────────
  
  methodsTried.push('places_display');
  if (primaryTypeDisplayName && !isBlacklisted(primaryTypeDisplayName) && primaryTypeDisplayName.length >= 4) {
    // Check if it matches a known category label
    const matchedCategory = CATEGORIES.find(c => 
      c.label.toLowerCase() === primaryTypeDisplayName.toLowerCase()
    );
    
    if (matchedCategory) {
      debug.finalMethod = 'places_display';
      logger.info('[Category Resolver] ✅ Matched primaryTypeDisplayName', {
        displayName: primaryTypeDisplayName,
        category: matchedCategory.key
      });
      return {
        key: matchedCategory.key,
        label: matchedCategory.label,
        confidence: 0.95,
        source: 'places_display',
        debug
      };
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // PASS 3: Use Places primaryType (deterministic map)
  // ─────────────────────────────────────────────────────────────
  
  methodsTried.push('places_primary_type');
  if (primaryType && !isBlacklisted(primaryType)) {
    const category = PLACES_TYPE_TO_CATEGORY_MAP.get(primaryType);
    if (category) {
      debug.finalMethod = 'places_primary_type';
      logger.info('[Category Resolver] ✅ Matched primaryType', {
        primaryType,
        category: category.key
      });
      return {
        key: category.key,
        label: category.label,
        confidence: 0.9,
        source: 'places',
        debug
      };
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // PASS 4: Try types[] array (supporting signal)
  // ─────────────────────────────────────────────────────────────
  
  methodsTried.push('places_types_array');
  const types = placeDetails.types || [];
  for (const type of types) {
    if (!isBlacklisted(type)) {
      const category = PLACES_TYPE_TO_CATEGORY_MAP.get(type);
      if (category) {
        debug.finalMethod = 'places_types_array';
        logger.info('[Category Resolver] ✅ Matched type from types[]', {
          type,
          category: category.key
        });
        return {
          key: category.key,
          label: category.label,
          confidence: 0.85,
          source: 'places',
          debug
        };
      }
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // PASS 5: Keyword scoring (deterministic)
  // ─────────────────────────────────────────────────────────────
  
  methodsTried.push('keyword_scoring'); // internal label; output source stays 'keywords'/'places'/etc
  const scoringInput: KeywordScoringInput = {
    name: placeDetails.name,
    editorialSummary: placeDetails.editorial_summary?.overview,
    websiteTitle: '', // TODO: Fetch website if needed
    websiteMeta: ''
  };
  
  const keywordScores = scoreCategories(scoringInput);
  debug.keywordScores = Object.fromEntries(keywordScores.map(s => [s.category.key, s.score]));
  
  if (keywordScores.length > 0 && keywordScores[0].score >= 3) {
    const topCategory = keywordScores[0].category;
    debug.finalMethod = 'keyword_scoring';
    logger.info('[Category Resolver] ✅ Matched via keyword scoring', {
      category: topCategory.key,
      score: keywordScores[0].score
    });
    return {
      key: topCategory.key,
      label: topCategory.label,
      confidence: Math.min(0.8, 0.5 + (keywordScores[0].score * 0.05)),
      source: 'keywords',
      debug
    };
  }
  
  // ─────────────────────────────────────────────────────────────
  // PASS 6: OpenAI fallback (closed set)
  // ─────────────────────────────────────────────────────────────
  
  methodsTried.push('openai');
  logger.info('[Category Resolver] Attempting OpenAI fallback', { placeName: placeDetails.name });
  const openaiResult = await callOpenAIForCategory(placeDetails);
  
  if (openaiResult && openaiResult.confidence >= 0.65) {
    debug.openaiReason = openaiResult.reason;
    debug.finalMethod = 'openai';
    logger.info('[Category Resolver] ✅ OpenAI classification successful', {
      category: openaiResult.key,
      confidence: openaiResult.confidence
    });
    return {
      key: openaiResult.key,
      label: openaiResult.label,
      confidence: openaiResult.confidence,
      source: 'openai',
      debug
    };
  }
  
  // ─────────────────────────────────────────────────────────────
  // UNRESOLVED
  // ─────────────────────────────────────────────────────────────
  
  debug.finalMethod = 'unresolved';
  logger.warn('[Category Resolver] ❌ UNRESOLVED', {
    placeName: placeDetails.name,
    primaryType,
    primaryTypeDisplayName,
    types,
    methodsTried,
    openaiConfidence: openaiResult?.confidence
  });
  
  return {
    key: null,
    label: null,
    confidence: 0,
    source: 'unresolved',
    debug
  };
}

/**
 * Helper to check if a category is resolved
 */
export function isCategoryResolved(resolution: CategoryResolution): boolean {
  return !!resolution.key && !!resolution.label && resolution.confidence >= 0.65;
}

