/**
 * Category Resolution - Deterministic niche resolver
 * 
 * Multi-pass algorithm:
 * 1. Google Places deterministic (if specific enough)
 * 2. Keyword fallback (obvious names like "driving school")
 * 3. OpenAI fallback (if still ambiguous)
 * 
 * NEVER returns generic labels like "Establishment"
 */

import {
  CATEGORY_TAXONOMY,
  GENERIC_BLACKLIST,
  scoreTaxon,
  normalizeText,
  type Taxon
} from './categoryTaxonomy';
import { logger } from '../lib/logger';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export interface CategoryResolution {
  key: string | null;
  label: string | null;
  confidence: number;
  source: 'places_display_name' | 'taxonomy_map' | 'keywords' | 'openai' | 'unresolved' | 'regenerate';
  debug: CategoryDebug;
}

interface PlaceDetailsInput {
  place_id: string;
  name?: string;
  displayName?: any;
  primaryType?: string;
  primaryTypeDisplayName?: any;
  types?: string[];
  editorial_summary?: any;
  editorialSummary?: any;
  websiteUri?: string;
  website?: string;
}

interface CategoryDebug {
  placesPrimaryType?: string | null;
  placesPrimaryTypeDisplayName?: string | null;
  placesTypesSample?: string[];
  placesDisplayName?: string | null;
  placesEditorialSummary?: string | null;
  websiteUri?: string | null;
  normalizedName?: string;
  keywordMatch?: string | null;
  taxonomyScore?: number;
  methodsTried: string[];
  finalMethod: string;
  openaiRationale?: string;
}

/**
 * Normalize text for keyword matching (remove punctuation, lowercase)
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove apostrophes, hyphens, etc.
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a label is generic/blacklisted
 */
function isGeneric(label: string | null | undefined): boolean {
  if (!label) return true;
  const normalized = normalizeText(label);
  
  // Check blacklist
  if (GENERIC_BLACKLIST.some(term => normalized.includes(term))) {
    return true;
  }
  
  // Too short
  if (normalized.length < 4) {
    return true;
  }
  
  // Only contains generic words
  const genericWords = ['the', 'a', 'an', 'and', 'or', 'of', 'in', 'at', 'to', 'for'];
  const words = normalized.split(' ').filter(w => w.length > 0);
  if (words.length > 0 && words.every(w => genericWords.includes(w))) {
    return true;
  }
  
  return false;
}

/**
 * Pass A: Use Google Places if specific enough
 */
function tryPlacesDisplayName(placeDetails: PlaceDetailsInput): CategoryResolution | null {
  const displayName = placeDetails.primaryTypeDisplayName?.text || placeDetails.primaryTypeDisplayName;
  
  if (displayName && !isGeneric(displayName)) {
    logger.info('[Category] Pass A: Using Places primaryTypeDisplayName', { displayName });
    return {
      key: normalizeText(displayName).replace(/\s+/g, '_'),
      label: displayName,
      confidence: 0.95,
      source: 'places_display_name',
      debug: {
        placesPrimaryType: placeDetails.primaryType || null,
        placesPrimaryTypeDisplayName: displayName,
        placesTypesSample: placeDetails.types?.slice(0, 10) || [],
        placesDisplayName: placeDetails.displayName?.text || placeDetails.name || null,
        methodsTried: ['places_display_name'],
        finalMethod: 'places_display_name'
      }
    };
  }
  
  return null;
}

/**
 * Pass B: Map Places types + keywords to taxonomy
 */
function tryTaxonomyMap(placeDetails: PlaceDetailsInput): CategoryResolution | null {
  const evidence = {
    primaryType: placeDetails.primaryType,
    types: placeDetails.types,
    displayName: placeDetails.displayName?.text || placeDetails.name,
    editorialSummary: placeDetails.editorialSummary?.text || placeDetails.editorial_summary?.overview,
    websiteUri: placeDetails.websiteUri || placeDetails.website
  };

  let bestTaxon: Taxon | null = null;
  let bestScore = 0;
  let bestMatchedKeyword: string | undefined;

  for (const taxon of CATEGORY_TAXONOMY) {
    const { score, matchedKeyword } = scoreTaxon(taxon, evidence);
    if (score > bestScore) {
      bestScore = score;
      bestTaxon = taxon;
      bestMatchedKeyword = matchedKeyword;
    }
  }

  if (bestScore >= 8 && bestTaxon) {
    logger.info('[Category] Pass B: Taxonomy match', {
      key: bestTaxon.key,
      label: bestTaxon.label,
      score: bestScore,
      matchedKeyword: bestMatchedKeyword
    });
    
    return {
      key: bestTaxon.key,
      label: bestTaxon.label,
      confidence: Math.min(0.95, 0.6 + (bestScore / 20)),
      source: bestMatchedKeyword ? 'keywords' : 'taxonomy_map',
      debug: {
        placesPrimaryType: evidence.primaryType || null,
        placesPrimaryTypeDisplayName: placeDetails.primaryTypeDisplayName?.text || null,
        placesTypesSample: evidence.types?.slice(0, 10) || [],
        placesDisplayName: evidence.displayName || null,
        placesEditorialSummary: evidence.editorialSummary || null,
        websiteUri: evidence.websiteUri || null,
        keywordMatch: bestMatchedKeyword || null,
        taxonomyScore: bestScore,
        methodsTried: ['places_display_name', 'taxonomy_map'],
        finalMethod: bestMatchedKeyword ? 'keywords' : 'taxonomy_map'
      }
    };
  }

  return null;
}

/**
 * Pass C: OpenAI fallback (authoritative closed-set picker)
 */
async function tryOpenAI(placeDetails: PlaceDetailsInput): Promise<CategoryResolution | null> {
  if (!OPENAI_API_KEY) {
    logger.warn('[Category] Pass C: OpenAI API key not configured, skipping');
    return null;
  }

  const evidence = {
    name: placeDetails.displayName?.text || placeDetails.name,
    types: placeDetails.types?.slice(0, 10),
    description: placeDetails.editorialSummary?.text || placeDetails.editorial_summary?.overview,
    website: placeDetails.websiteUri || placeDetails.website
  };

  const taxonomyOptions = CATEGORY_TAXONOMY.map(t => `${t.key}: ${t.label}`).join('\n');

  const prompt = `You are a business category classifier. Given the following business data, pick the MOST SPECIFIC category from the provided taxonomy.

Business data:
- Name: ${evidence.name || 'Unknown'}
- Google Types: ${evidence.types?.join(', ') || 'None'}
- Description: ${evidence.description || 'None'}
- Website: ${evidence.website || 'None'}

Available categories:
${taxonomyOptions}

Rules:
1. Pick the SINGLE most specific category key from the list above
2. NEVER return generic terms like "establishment", "store", "business", "place"
3. If truly ambiguous and no good match exists, return key "unresolved"
4. Return ONLY valid JSON in this exact format:

{
  "key": "category_key_from_list",
  "label": "Category Label",
  "confidence": 0.0-1.0,
  "rationale": "brief reason for this choice"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
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
      const errorText = await response.text();
      logger.error('[Category] OpenAI API error', { status: response.status, error: errorText });
      return null;
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      logger.error('[Category] OpenAI returned empty content');
      return null;
    }

    const result = JSON.parse(content);
    
    // Validate result
    if (!result.key || !result.label || typeof result.confidence !== 'number') {
      logger.error('[Category] OpenAI returned invalid format', { result });
      return null;
    }

    // Check if unresolved (lower threshold to 0.5 for better coverage)
    if (result.key === 'unresolved' || result.confidence < 0.5) {
      logger.info('[Category] Pass C: OpenAI confidence too low or unresolved', {
        key: result.key,
        confidence: result.confidence
      });
      return null;
    }

    // Verify key exists in taxonomy
    const taxon = CATEGORY_TAXONOMY.find(t => t.key === result.key);
    if (!taxon) {
      logger.warn('[Category] OpenAI returned unknown key', { key: result.key });
      return null;
    }

    logger.info('[Category] Pass C: OpenAI match', {
      key: result.key,
      label: result.label,
      confidence: result.confidence,
      rationale: result.rationale
    });

    return {
      key: result.key,
      label: result.label,
      confidence: result.confidence,
      source: 'openai',
      debug: {
        placesPrimaryType: placeDetails.primaryType || null,
        placesPrimaryTypeDisplayName: placeDetails.primaryTypeDisplayName?.text || null,
        placesTypesSample: placeDetails.types?.slice(0, 10) || [],
        placesDisplayName: placeDetails.displayName?.text || placeDetails.name || null,
        placesEditorialSummary: evidence.description || null,
        websiteUri: evidence.website || null,
        methodsTried: ['places_display_name', 'taxonomy_map', 'openai'],
        finalMethod: 'openai',
        openaiRationale: result.rationale
      }
    };

  } catch (error) {
    logger.error('[Category] OpenAI call failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Pass B: Deterministic keyword matching (MUST resolve Ray's Driving School)
 */
function tryKeywordRules(placeDetails: PlaceDetailsInput): CategoryResolution | null {
  const rawName = placeDetails.displayName?.text || placeDetails.name || '';
  const normalizedName = normalizeName(rawName);

  // BRAND DETECTION (well-known chains)
  const brandDetection: Record<string, { key: string; label: string; confidence: number }> = {
    'starbucks': { key: 'coffee_shop', label: 'Coffee shop', confidence: 1.0 },
    'dunkin': { key: 'coffee_shop', label: 'Coffee shop', confidence: 1.0 },
    'mcdonalds': { key: 'fast_food', label: 'Fast food restaurant', confidence: 1.0 },
    'subway': { key: 'fast_food', label: 'Fast food restaurant', confidence: 1.0 },
    'panera': { key: 'bakery', label: 'Bakery', confidence: 1.0 },
    'chipotle': { key: 'mexican', label: 'Mexican restaurant', confidence: 1.0 },
  };

  for (const [brand, category] of Object.entries(brandDetection)) {
    if (normalizedName.includes(brand)) {
      console.error('[CATEGORY MATCH]', {
        rule: 'brand_detection',
        brand,
        name: rawName,
        category: category.label
      });
      return {
        key: category.key,
        label: category.label,
        confidence: category.confidence,
        source: 'keywords',
        debug: {
          placesPrimaryType: placeDetails.primaryType || null,
          placesPrimaryTypeDisplayName: placeDetails.primaryTypeDisplayName?.text || null,
          placesTypesSample: placeDetails.types?.slice(0, 10) || [],
          placesDisplayName: rawName,
          placesEditorialSummary: placeDetails.editorialSummary?.text || placeDetails.editorial_summary?.overview || null,
          websiteUri: placeDetails.websiteUri || placeDetails.website || null,
          normalizedName,
          keywordMatch: `brand:${brand}`,
          methodsTried: ['keywords'],
          finalMethod: 'keywords'
        }
      };
    }
  }

  // DRIVING SCHOOL KEYWORD RULES (highest priority - must resolve Ray's)
  const drivingSchoolPhrases = [
    'driving school',
    'drivers ed',
    'driver ed',
    'driving lessons',
    'road test',
    'behind the wheel',
    'driving instructor',
    'driving academy',
    'driving course',
    'traffic school'
  ];

  for (const phrase of drivingSchoolPhrases) {
    if (normalizedName.includes(normalizeName(phrase))) {
      console.error('[CATEGORY MATCH]', {
        rule: 'driving_school',
        name: rawName,
        normalized: normalizedName,
        matchedPhrase: phrase
      });
      return {
        key: 'driving_school',
        label: 'Driving school',
        confidence: 0.95,
        source: 'keywords',
        debug: {
          placesPrimaryType: placeDetails.primaryType || null,
          placesPrimaryTypeDisplayName: placeDetails.primaryTypeDisplayName?.text || null,
          placesTypesSample: placeDetails.types?.slice(0, 10) || [],
          placesDisplayName: rawName,
          placesEditorialSummary: placeDetails.editorialSummary?.text || placeDetails.editorial_summary?.overview || null,
          websiteUri: placeDetails.websiteUri || placeDetails.website || null,
          normalizedName,
          keywordMatch: phrase,
          methodsTried: ['keywords'],
          finalMethod: 'keywords'
        }
      };
    }
  }

  // MED SPA KEYWORD RULES
  const medSpaPhrases = [
    'med spa', 'medical spa', 'medspa', 'aesthetics', 'botox', 'filler',
    'microneedling', 'hydrafacial', 'laser hair removal', 'chemical peel'
  ];

  for (const phrase of medSpaPhrases) {
    if (normalizedName.includes(normalizeName(phrase))) {
      console.error('[CATEGORY MATCH]', {
        rule: 'med_spa',
        name: rawName,
        normalized: normalizedName,
        matchedPhrase: phrase
      });
      return {
        key: 'med_spa',
        label: 'Medical spa',
        confidence: 0.90,
        source: 'keywords',
        debug: {
          placesPrimaryType: placeDetails.primaryType || null,
          placesPrimaryTypeDisplayName: placeDetails.primaryTypeDisplayName?.text || null,
          placesTypesSample: placeDetails.types?.slice(0, 10) || [],
          placesDisplayName: rawName,
          placesEditorialSummary: placeDetails.editorialSummary?.text || placeDetails.editorial_summary?.overview || null,
          websiteUri: placeDetails.websiteUri || placeDetails.website || null,
          normalizedName,
          keywordMatch: phrase,
          methodsTried: ['keywords'],
          finalMethod: 'keywords'
        }
      };
    }
  }

  return null;
}

/**
 * Pass D: Type-based smart fallback (use Google Places types array)
 */
function tryTypeBasedFallback(placeDetails: PlaceDetailsInput): CategoryResolution | null {
  const types = placeDetails.types || [];
  const rawName = placeDetails.displayName?.text || placeDetails.name || '';
  
  // Map common Google Places types to our categories
  const typeMapping: Record<string, { key: string; label: string; confidence: number }> = {
    'cafe': { key: 'coffee_shop', label: 'Coffee shop', confidence: 0.85 },
    'coffee_shop': { key: 'coffee_shop', label: 'Coffee shop', confidence: 0.85 },
    'restaurant': { key: 'restaurant', label: 'Restaurant', confidence: 0.75 },
    'bar': { key: 'bar', label: 'Bar', confidence: 0.85 },
    'bakery': { key: 'bakery', label: 'Bakery', confidence: 0.85 },
    'gym': { key: 'gym', label: 'Gym', confidence: 0.85 },
    'beauty_salon': { key: 'beauty_salon', label: 'Beauty salon', confidence: 0.85 },
    'hair_care': { key: 'hair_salon', label: 'Hair salon', confidence: 0.85 },
    'spa': { key: 'spa', label: 'Spa', confidence: 0.85 },
    'dentist': { key: 'dentist', label: 'Dental clinic', confidence: 0.85 },
    'doctor': { key: 'medical_clinic', label: 'Medical clinic', confidence: 0.75 },
    'pharmacy': { key: 'pharmacy', label: 'Pharmacy', confidence: 0.85 },
    'shopping_mall': { key: 'shopping_mall', label: 'Shopping mall', confidence: 0.85 },
    'clothing_store': { key: 'clothing_store', label: 'Clothing store', confidence: 0.85 },
    'shoe_store': { key: 'shoe_store', label: 'Shoe store', confidence: 0.85 },
    'jewelry_store': { key: 'jewelry_store', label: 'Jewelry store', confidence: 0.85 },
    'electronics_store': { key: 'electronics_store', label: 'Electronics store', confidence: 0.85 },
    'furniture_store': { key: 'furniture_store', label: 'Furniture store', confidence: 0.85 },
    'home_goods_store': { key: 'home_goods_store', label: 'Home goods store', confidence: 0.85 },
    'pet_store': { key: 'pet_store', label: 'Pet store', confidence: 0.85 },
    'car_repair': { key: 'auto_repair', label: 'Auto repair shop', confidence: 0.85 },
    'car_wash': { key: 'car_wash', label: 'Car wash', confidence: 0.85 },
    'gas_station': { key: 'gas_station', label: 'Gas station', confidence: 0.85 },
    'parking': { key: 'parking', label: 'Parking', confidence: 0.85 },
    'lodging': { key: 'hotel', label: 'Hotel', confidence: 0.75 },
    'real_estate_agency': { key: 'real_estate', label: 'Real estate agency', confidence: 0.85 },
    'lawyer': { key: 'law_firm', label: 'Law firm', confidence: 0.85 },
    'accounting': { key: 'accounting', label: 'Accounting firm', confidence: 0.85 },
    'insurance_agency': { key: 'insurance', label: 'Insurance agency', confidence: 0.85 }
  };

  // Check types in order of specificity
  for (const type of types) {
    if (typeMapping[type]) {
      const category = typeMapping[type];
      console.error('[CATEGORY MATCH]', {
        rule: 'type_based_fallback',
        type,
        name: rawName,
        category: category.label
      });
      return {
        key: category.key,
        label: category.label,
        confidence: category.confidence,
        source: 'taxonomy_map',
        debug: {
          placesPrimaryType: placeDetails.primaryType || null,
          placesPrimaryTypeDisplayName: placeDetails.primaryTypeDisplayName?.text || null,
          placesTypesSample: types.slice(0, 10),
          placesDisplayName: rawName,
          placesEditorialSummary: placeDetails.editorialSummary?.text || placeDetails.editorial_summary?.overview || null,
          websiteUri: placeDetails.websiteUri || placeDetails.website || null,
          keywordMatch: `type:${type}`,
          methodsTried: ['type_based_fallback'],
          finalMethod: 'type_based_fallback'
        }
      };
    }
  }

  return null;
}

/**
 * Get fallback category when resolveCategory returns null or throws.
 * 1. Try place.types -> map to internal category (via tryTypeBasedFallback)
 * 2. Else use 'local_business'
 * Used by meoScan and regenerate-explain when category cannot be resolved.
 */
export function getFallbackCategory(placeDetails: PlaceDetailsInput): CategoryResolution {
  const typeBased = tryTypeBasedFallback(placeDetails);
  if (typeBased) {
    logger.info('[Category] Fallback: using type-based mapping', {
      key: typeBased.key,
      label: typeBased.label,
      types: placeDetails.types?.slice(0, 5)
    });
    return typeBased;
  }
  return {
    key: 'local_business',
    label: 'Local business',
    confidence: 0.3,
    source: 'unresolved',
    debug: {
      placesPrimaryType: placeDetails.primaryType || null,
      placesPrimaryTypeDisplayName: placeDetails.primaryTypeDisplayName?.text || null,
      placesTypesSample: placeDetails.types?.slice(0, 10) || [],
      placesDisplayName: placeDetails.displayName?.text || placeDetails.name || null,
      methodsTried: ['type_based_fallback'],
      finalMethod: 'fallback_local_business'
    }
  };
}

/**
 * Main category resolution function (5-pass)
 */
export async function resolveCategory(placeDetails: PlaceDetailsInput): Promise<CategoryResolution> {
  const rawName = placeDetails.displayName?.text || placeDetails.name || '';
  logger.info('[Category] Starting resolution', {
    placeId: placeDetails.place_id,
    name: rawName
  });

  // Log input to category resolver
  console.error('[CATEGORY INPUT]', {
    name: rawName,
    primaryType: placeDetails.primaryType,
    primaryTypeDisplayName: placeDetails.primaryTypeDisplayName?.text || placeDetails.primaryTypeDisplayName,
    types: placeDetails.types?.slice(0, 10)
  });

  // Pass A: Places primaryTypeDisplayName (if specific and not generic)
  const passA = tryPlacesDisplayName(placeDetails);
  if (passA) {
    logger.info('[Category] Pass A: Places display name match', { label: passA.label });
    return passA;
  }

  // Pass B: Deterministic keyword rules (MUST resolve Ray's Driving School)
  const passB = tryKeywordRules(placeDetails);
  if (passB) {
    logger.info('[Category] Pass B: Keyword rule match', { key: passB.key, label: passB.label });
    return passB;
  }

  // Pass C: Taxonomy map scoring (deterministic)
  const passC = tryTaxonomyMap(placeDetails);
  if (passC) {
    logger.info('[Category] Pass C: Taxonomy map match', { key: passC.key, label: passC.label });
    return passC;
  }

  // Pass D: Type-based smart fallback (use Google Places types for common categories)
  const passD = tryTypeBasedFallback(placeDetails);
  if (passD) {
    logger.info('[Category] Pass D: Type-based fallback', { key: passD.key, label: passD.label });
    return passD;
  }

  // Pass E: OpenAI fallback (only if confidence >= 0.5)
  const passE = await tryOpenAI(placeDetails);
  if (passE) {
    logger.info('[Category] Pass E: OpenAI match', { key: passE.key, label: passE.label });
    return passE;
  }

  // Unresolved - only if ALL passes fail
  logger.warn('[Category] Could not resolve category - all passes failed', {
    placeId: placeDetails.place_id,
    name: rawName,
    methodsTried: ['places_display_name', 'keywords', 'taxonomy_map', 'type_based_fallback', 'openai']
  });

  return {
    key: null,
    label: null,
    confidence: 0,
    source: 'unresolved',
    debug: {
      placesPrimaryType: placeDetails.primaryType || null,
      placesPrimaryTypeDisplayName: placeDetails.primaryTypeDisplayName?.text || null,
      placesTypesSample: placeDetails.types?.slice(0, 10) || [],
      placesDisplayName: rawName,
      placesEditorialSummary: placeDetails.editorialSummary?.text || placeDetails.editorial_summary?.overview || null,
      websiteUri: placeDetails.websiteUri || placeDetails.website || null,
      normalizedName: normalizeName(rawName),
      keywordMatch: null,
      methodsTried: ['places_display_name', 'keywords', 'taxonomy_map', 'type_based_fallback', 'openai'],
      finalMethod: 'unresolved'
    }
  };
}

