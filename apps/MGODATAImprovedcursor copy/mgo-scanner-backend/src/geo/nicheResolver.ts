/**
 * GEO Niche Resolver
 * Resolves consumer-facing niche labels for businesses
 * Never returns generic terms like "Establishment" or "Store"
 */

import { openai } from '../lib/openai';
import { logger } from '../lib/logger';
import { PlaceDetails } from '../types';
import { LRUCache } from 'lru-cache';

// Cache niche resolutions by placeId
const nicheCache = new LRUCache<string, { niche: string; confidence: number }>({
  max: 500,
  ttl: 1000 * 60 * 60 * 24 * 7 // 7 days (niche doesn't change often)
});

/**
 * Hard-coded type mappings (deterministic)
 * These override Google's generic types
 */
const TYPE_MAPPINGS: Record<string, string> = {
  // Supplements & Health
  'supplement_store': 'Supplement store',
  'vitamin_supplements': 'Supplement store',
  'health_food_store': 'Health food store',
  'nutrition_store': 'Supplement store',
  
  // Food & Beverage
  'cafe': 'Cafe',
  'coffee_shop': 'Cafe',
  'restaurant': 'Restaurant',
  'bar': 'Bar',
  'bakery': 'Bakery',
  'meal_takeaway': 'Takeout restaurant',
  'meal_delivery': 'Delivery restaurant',
  'pizza_restaurant': 'Pizza restaurant',
  'sandwich_shop': 'Sandwich shop',
  'fast_food_restaurant': 'Fast food restaurant',
  'ice_cream_shop': 'Ice cream shop',
  
  // Fitness
  'gym': 'Gym',
  'fitness_center': 'Fitness center',
  'yoga_studio': 'Yoga studio',
  'pilates_studio': 'Pilates studio',
  'martial_arts_school': 'Martial arts school',
  
  // Services
  'hair_salon': 'Hair salon',
  'beauty_salon': 'Beauty salon',
  'nail_salon': 'Nail salon',
  'spa': 'Spa',
  'barber_shop': 'Barber shop',
  'dentist': 'Dentist',
  'doctor': 'Doctor',
  'veterinarian': 'Veterinarian',
  'veterinary_care': 'Veterinary clinic',
  'auto_repair': 'Auto repair shop',
  'car_wash': 'Car wash',
  'gas_station': 'Gas station',
  'car_dealer': 'Car dealership',
  
  // Retail
  'clothing_store': 'Clothing store',
  'shoe_store': 'Shoe store',
  'jewelry_store': 'Jewelry store',
  'book_store': 'Bookstore',
  'furniture_store': 'Furniture store',
  'home_goods_store': 'Home goods store',
  'electronics_store': 'Electronics store',
  'hardware_store': 'Hardware store',
  'pet_store': 'Pet store',
  'florist': 'Florist',
  'gift_shop': 'Gift shop',
  'toy_store': 'Toy store',
  'sporting_goods_store': 'Sporting goods store',
  
  // Professional Services
  'lawyer': 'Law office',
  'accounting': 'Accounting firm',
  'real_estate_agency': 'Real estate agency',
  'insurance_agency': 'Insurance agency',
  
  // Education
  'school': 'School',
  'driving_school': 'Driving school',
  'language_school': 'Language school',
  'music_school': 'Music school',
  'dance_school': 'Dance school',
  
  // Entertainment
  'movie_theater': 'Movie theater',
  'bowling_alley': 'Bowling alley',
  'amusement_park': 'Amusement park',
  'museum': 'Museum',
  'art_gallery': 'Art gallery',
  
  // Lodging
  'hotel': 'Hotel',
  'motel': 'Motel',
  'lodging': 'Hotel',
  'campground': 'Campground',
  
  // Generic overrides (prevent these) - use undefined to force fallback
};

/**
 * Step A: Try to resolve niche from Google Places data (deterministic)
 */
function resolveNicheFromPlaces(place: PlaceDetails): string | null {
  // Try primaryType first
  if (place.primaryType) {
    const mapped = TYPE_MAPPINGS[place.primaryType];
    if (mapped) return mapped;
  }
  
  // Try each type in types array
  if (place.types && place.types.length > 0) {
    for (const type of place.types) {
      const mapped = TYPE_MAPPINGS[type];
      if (mapped) return mapped;
      
      // Skip generic types
      const genericTypes = ['store', 'establishment', 'point_of_interest', 'business'];
      if (genericTypes.includes(type)) continue;
    }
  }
  
  return null; // Need OpenAI fallback
}

/**
 * Step B: OpenAI fallback for generic/unclear types
 */
async function resolveNicheWithOpenAI(place: PlaceDetails): Promise<{ niche: string; confidence: number }> {
  const businessData = {
    name: place.name,
    types: place.types || [],
    description: place.editorial_summary?.overview || '',
    website: place.website || '',
    address: place.formatted_address || ''
  };
  
  const prompt = `You are a business category classifier. Given this business data, return ONLY a consumer-facing niche label.

Business:
${JSON.stringify(businessData, null, 2)}

Requirements:
- NEVER return: "establishment", "store", "business", "place", "shop" (too generic)
- Return a specific, consumer-friendly category (e.g., "Supplement store", "Cafe", "Driving school")
- Be concise (2-3 words max)
- Use title case

Return strict JSON:
{
  "niche_label": "Specific category name",
  "confidence": 0.0-1.0
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a business category expert. Return only valid JSON with niche_label and confidence.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temp for consistency
      max_tokens: 100
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }
    
    const parsed = JSON.parse(content) as { niche_label: string; confidence: number };
    
    // Validate response
    if (!parsed.niche_label || typeof parsed.niche_label !== 'string') {
      throw new Error('Invalid niche_label in response');
    }
    
    // Check if still generic
    const lowerNiche = parsed.niche_label.toLowerCase();
    const genericTerms = ['establishment', 'store', 'business', 'place', 'shop', 'location'];
    if (genericTerms.some(term => lowerNiche === term)) {
      logger.warn('[Niche Resolver] OpenAI returned generic term, using fallback', { niche: parsed.niche_label });
      return { niche: 'Local business', confidence: 0.5 }; // Last resort
    }
    
    return {
      niche: parsed.niche_label,
      confidence: parsed.confidence || 0.7
    };
    
  } catch (error: any) {
    logger.error('[Niche Resolver] OpenAI fallback failed', { error: error.message });
    // Ultimate fallback
    return { niche: 'Local business', confidence: 0.3 };
  }
}

/**
 * Main niche resolver (Step A → Step B → Step C)
 * Returns immutable niche label for GEO system
 */
export async function resolveNiche(place: PlaceDetails): Promise<{ niche: string; confidence: number }> {
  const cacheKey = place.place_id;
  
  // Check cache first
  const cached = nicheCache.get(cacheKey);
  if (cached) {
    logger.info('[Niche Resolver] Cache hit', { placeId: place.place_id, niche: cached.niche });
    return cached;
  }
  
  logger.info('[Niche Resolver] Starting resolution', { 
    placeId: place.place_id, 
    name: place.name,
    types: place.types 
  });
  
  // Step A: Try deterministic mapping
  const deterministicNiche = resolveNicheFromPlaces(place);
  if (deterministicNiche) {
    const result = { niche: deterministicNiche, confidence: 1.0 };
    nicheCache.set(cacheKey, result);
    logger.info('[Niche Resolver] Resolved (deterministic)', result);
    return result;
  }
  
  // Step B: OpenAI fallback
  logger.info('[Niche Resolver] Using OpenAI fallback', { placeId: place.place_id });
  const aiResult = await resolveNicheWithOpenAI(place);
  
  // Step C: Cache and return
  nicheCache.set(cacheKey, aiResult);
  logger.info('[Niche Resolver] Resolved (OpenAI)', aiResult);
  
  return aiResult;
}

/**
 * Get location label from address (for GEO display)
 */
export function getLocationLabel(address: string): string {
  // Example: "123 Main St, Liberty Township, OH 45044, USA"
  // Extract "Liberty Township, OH"
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 3) {
    const city = parts[parts.length - 3];
    const state = parts[parts.length - 2].split(' ')[0];
    return `${city}, ${state}`;
  }
  return address;
}

