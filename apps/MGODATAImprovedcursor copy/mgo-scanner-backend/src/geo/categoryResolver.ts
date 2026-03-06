/**
 * Robust GEO Category Resolver
 * Multi-pass resolution: Google displayName → Taxonomy scoring → Website scrape → OpenAI closed-set
 * NEVER returns generic labels like "Establishment"
 */

import { openai } from '../lib/openai';
import { logger } from '../lib/logger';
import { PlaceDetails } from '../types';
import { TAXONOMY, Taxon, getTaxonByKey, getTaxonClosedSet } from './taxonomy';
import { LRUCache } from 'lru-cache';

// Cache resolved categories by placeId (30 days - categories don't change often)
const categoryCache = new LRUCache<string, CategoryResolution>({
  max: 1000,
  ttl: 1000 * 60 * 60 * 24 * 30 // 30 days
});

/**
 * Category resolution result
 */
export interface CategoryResolution {
  nicheLabel: string;      // User-facing label (e.g., "Medical spa")
  nicheKey: string;        // Stable key (e.g., "med_spa")
  confidence: number;      // 0.0-1.0
  source: 'places_display_name' | 'taxonomy_map' | 'website+taxonomy' | 'openai' | 'openai_low_confidence' | 'fallback';
  debug?: {
    passesAttempted: string[];
    topScores?: Array<{ key: string; score: number }>;
    websiteScraped?: boolean;
    openaiReason?: string;
  };
}

/**
 * Blacklisted terms (NEVER valid as final output)
 */
const BLACKLIST = new Set([
  'establishment',
  'point_of_interest',
  'point of interest',
  'store',
  'business',
  'place',
  'organization',
  'food',      // Too broad
  'service',   // Too broad
  'shop',      // Too generic
  'location'
]);

/**
 * Check if a label is valid (not blacklisted, not too short, not generic)
 */
function isValidLabel(label: string): boolean {
  if (!label || label.length < 4) return false;
  
  const lowerLabel = label.toLowerCase().trim();
  
  // Check blacklist
  if (BLACKLIST.has(lowerLabel)) return false;
  
  // Check if it's just blacklisted words
  const words = lowerLabel.split(/\s+/);
  const allBlacklisted = words.every(w => BLACKLIST.has(w));
  if (allBlacklisted) return false;
  
  return true;
}

/**
 * PASS A: Try to use Google's displayName if it's specific enough
 */
function passA_GoogleDisplayName(place: PlaceDetails): CategoryResolution | null {
  // Try primaryTypeDisplayName first
  if (place.primaryTypeDisplayName?.text) {
    const displayName = place.primaryTypeDisplayName.text;
    if (isValidLabel(displayName)) {
      // Check if it matches a known taxon
      const matchingTaxon = TAXONOMY.find(t => 
        t.label.toLowerCase() === displayName.toLowerCase() ||
        t.key === place.primaryType
      );
      
      if (matchingTaxon) {
        return {
          nicheLabel: matchingTaxon.label,
          nicheKey: matchingTaxon.key,
          confidence: 1.0,
          source: 'places_display_name',
          debug: { passesAttempted: ['A'] }
        };
      }
    }
  }
  
  return null;
}

/**
 * Score a taxon against place data
 */
function scoreTaxon(taxon: Taxon, place: PlaceDetails, extraKeywords: string[] = []): number {
  let score = 0;
  
  // +8 for exact match on primaryType
  if (place.primaryType && taxon.placesTypeHints.includes(place.primaryType)) {
    score += 8;
  }
  
  // +5 for match in types array
  if (place.types) {
    for (const type of place.types) {
      if (taxon.placesTypeHints.includes(type)) {
        score += 5;
        break; // Only once per taxon
      }
    }
  }
  
  // Build searchable text from place data
  const searchableText = [
    place.name || '',
    place.displayName?.text || '',
    place.editorial_summary?.overview || '',
    place.website || '',
    ...extraKeywords
  ].join(' ').toLowerCase();
  
  // +3 for keyword hit in name/summary/website
  for (const keyword of taxon.keywords) {
    if (searchableText.includes(keyword.toLowerCase())) {
      score += 3;
      break; // Only once per taxon
    }
  }
  
  return score;
}

/**
 * PASS B: Score all taxonomy entries and pick the best
 */
function passB_TaxonomyMap(place: PlaceDetails, extraKeywords: string[] = []): { resolution: CategoryResolution | null; topScores: Array<{ key: string; score: number }> } {
  const scores: Array<{ taxon: Taxon; score: number }> = [];
  
  for (const taxon of TAXONOMY) {
    // Skip the fallback
    if (taxon.key === 'local_business') continue;
    
    const score = scoreTaxon(taxon, place, extraKeywords);
    if (score > 0) {
      scores.push({ taxon, score });
    }
  }
  
  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  
  const topScores = scores.slice(0, 5).map(s => ({ key: s.taxon.key, score: s.score }));
  
  // Accept if top score >= 8
  if (scores.length > 0 && scores[0].score >= 8) {
    const topTaxon = scores[0].taxon;
    return {
      resolution: {
        nicheLabel: topTaxon.label,
        nicheKey: topTaxon.key,
        confidence: Math.min(scores[0].score / 15, 1.0), // Normalize to 0-1
        source: extraKeywords.length > 0 ? 'website+taxonomy' : 'taxonomy_map',
        debug: {
          passesAttempted: extraKeywords.length > 0 ? ['A', 'B', 'C'] : ['A', 'B'],
          topScores,
          websiteScraped: extraKeywords.length > 0
        }
      },
      topScores
    };
  }
  
  return { resolution: null, topScores };
}

/**
 * PASS C: Lightweight website scrape for additional keywords
 */
async function passC_WebsiteScrape(place: PlaceDetails): Promise<string[]> {
  if (!place.website) return [];
  
  try {
    logger.info('[Category Resolver] Scraping website', { url: place.website });
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout
    
    const response = await fetch(place.website, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MGO-Scanner/1.0)'
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      logger.warn('[Category Resolver] Website fetch failed', { status: response.status });
      return [];
    }
    
    const html = await response.text();
    
    // Extract useful text
    const keywords: string[] = [];
    
    // Title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch) keywords.push(titleMatch[1]);
    
    // Meta description
    const metaMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    if (metaMatch) keywords.push(metaMatch[1]);
    
    // H1
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match) keywords.push(h1Match[1].replace(/<[^>]*>/g, ''));
    
    // LocalBusiness schema type
    const schemaMatch = html.match(/"@type"\s*:\s*"([^"]+)"/);
    if (schemaMatch) keywords.push(schemaMatch[1]);
    
    logger.info('[Category Resolver] Website keywords extracted', { count: keywords.length });
    
    return keywords;
  } catch (error: any) {
    logger.warn('[Category Resolver] Website scrape failed', { error: error.message });
    return [];
  }
}

/**
 * PASS D: OpenAI closed-set chooser (final fallback)
 */
async function passD_OpenAIChooser(place: PlaceDetails, topScores: Array<{ key: string; score: number }>): Promise<CategoryResolution> {
  const evidence = {
    name: place.name,
    displayName: place.displayName?.text || place.name,
    primaryType: place.primaryType,
    types: place.types || [],
    editorialSummary: place.editorial_summary?.overview || '',
    website: place.website || '',
    address: place.formatted_address || ''
  };
  
  const closedSet = getTaxonClosedSet();
  
  const prompt = `You are a business category classifier. Given the evidence below, pick the MOST SPECIFIC category from the provided list.

Evidence:
${JSON.stringify(evidence, null, 2)}

Available categories (closed set):
${closedSet.map((c, i) => `${i + 1}. ${c.key} — "${c.label}"`).join('\n')}

${topScores.length > 0 ? `\nTop scoring categories from our algorithm:\n${topScores.slice(0, 3).map(s => `- ${s.key} (score: ${s.score})`).join('\n')}` : ''}

Rules:
- You MUST pick exactly ONE category from the list above
- Use the category KEY, not the label
- NEVER return: "establishment", "store", "business", or other generic terms
- Be as SPECIFIC as possible (e.g., "med_spa" not just "spa" if evidence suggests medical services)
- If truly uncertain, pick the most general applicable category

Return strict JSON:
{
  "key": "category_key",
  "label": "Category Label",
  "confidence": 0.0-1.0,
  "reason": "Brief explanation"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a business category expert. Return only valid JSON with key, label, confidence, and reason.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Very low for consistency
      max_tokens: 200
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }
    
    const parsed = JSON.parse(content) as { key: string; label: string; confidence: number; reason: string };
    
    // Validate response
    const taxon = getTaxonByKey(parsed.key);
    if (!taxon) {
      throw new Error(`Invalid key returned: ${parsed.key}`);
    }
    
    // If confidence < 0.6, use fallback
    if (parsed.confidence < 0.6) {
      return {
        nicheLabel: 'Local business',
        nicheKey: 'local_business',
        confidence: parsed.confidence,
        source: 'openai_low_confidence',
        debug: {
          passesAttempted: ['A', 'B', 'C', 'D'],
          openaiReason: parsed.reason
        }
      };
    }
    
    return {
      nicheLabel: taxon.label,
      nicheKey: taxon.key,
      confidence: parsed.confidence,
      source: 'openai',
      debug: {
        passesAttempted: ['A', 'B', 'C', 'D'],
        openaiReason: parsed.reason
      }
    };
    
  } catch (error: any) {
    logger.error('[Category Resolver] OpenAI fallback failed', { error: error.message });
    
    // Ultimate fallback
    return {
      nicheLabel: 'Local business',
      nicheKey: 'local_business',
      confidence: 0.3,
      source: 'fallback',
      debug: {
        passesAttempted: ['A', 'B', 'C', 'D'],
        openaiReason: `OpenAI failed: ${error.message}`
      }
    };
  }
}

/**
 * Main category resolver - orchestrates all passes
 */
export async function resolveCategory(place: PlaceDetails): Promise<CategoryResolution> {
  const cacheKey = place.place_id;
  
  // Check cache
  const cached = categoryCache.get(cacheKey);
  if (cached) {
    logger.info('[Category Resolver] Cache hit', { placeId: place.place_id, key: cached.nicheKey });
    return cached;
  }
  
  logger.info('[Category Resolver] Starting resolution', { 
    placeId: place.place_id,
    name: place.name,
    primaryType: place.primaryType,
    types: place.types 
  });
  
  // PASS A: Try Google displayName
  const passAResult = passA_GoogleDisplayName(place);
  if (passAResult) {
    categoryCache.set(cacheKey, passAResult);
    logger.info('[Category Resolver] Resolved via Pass A', { key: passAResult.nicheKey, label: passAResult.nicheLabel });
    return passAResult;
  }
  
  // PASS B: Score taxonomy entries
  const passBResult = passB_TaxonomyMap(place);
  if (passBResult.resolution) {
    categoryCache.set(cacheKey, passBResult.resolution);
    logger.info('[Category Resolver] Resolved via Pass B', { 
      key: passBResult.resolution.nicheKey, 
      label: passBResult.resolution.nicheLabel,
      topScores: passBResult.topScores 
    });
    return passBResult.resolution;
  }
  
  // PASS C: Website scrape for additional keywords
  const websiteKeywords = await passC_WebsiteScrape(place);
  if (websiteKeywords.length > 0) {
    const passCResult = passB_TaxonomyMap(place, websiteKeywords);
    if (passCResult.resolution) {
      categoryCache.set(cacheKey, passCResult.resolution);
      logger.info('[Category Resolver] Resolved via Pass C (website+taxonomy)', {
        key: passCResult.resolution.nicheKey,
        label: passCResult.resolution.nicheLabel,
        topScores: passCResult.topScores
      });
      return passCResult.resolution;
    }
  }
  
  // PASS D: OpenAI closed-set chooser
  logger.info('[Category Resolver] Using Pass D (OpenAI)', { placeId: place.place_id });
  const passDResult = await passD_OpenAIChooser(place, passBResult.topScores);
  
  categoryCache.set(cacheKey, passDResult);
  logger.info('[Category Resolver] Resolved via Pass D (OpenAI)', {
    key: passDResult.nicheKey,
    label: passDResult.nicheLabel,
    confidence: passDResult.confidence
  });
  
  return passDResult;
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




