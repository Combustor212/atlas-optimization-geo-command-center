/**
 * Niche-Specific Query Generator
 * Generates realistic, niche-aware queries for GEO ranking
 * NEVER uses generic terms like "Establishment"
 */

import { GEOQuery, QueryBucket } from './geoSchema';
import { logger } from '../lib/logger';

/**
 * Query templates by niche key
 * Each niche has specific query patterns that real users would search
 */
const NICHE_QUERY_TEMPLATES: Record<string, string[]> = {
  // Medical Spa (COMPREHENSIVE)
  med_spa: [
    'best medical spa near {city}',
    'botox near me {city}',
    'lip filler near {city}',
    'microneedling {city}',
    'hydrafacial near {city}',
    'laser hair removal {city}',
    'chemical peel {city}',
    'aesthetic clinic near {city}',
    'top rated botox injector near {city}',
    'med spa open now near {city}',
    'dermal filler near {city}',
    'coolsculpting near {city}',
    'best place for botox in {city}',
    'medical spa with great reviews {city}',
    'juvederm injections {city}',
    'dysport near {city}',
    'skin tightening treatment {city}',
    'laser facial near {city}',
    'medical aesthetics {city}',
    'cosmetic injectable near {city}',
    'best med spa for fillers {city}',
    'facial rejuvenation {city}',
    'anti-aging treatment {city}',
    'botox specials near {city}',
    'affordable medical spa {city}',
    'luxury med spa {city}',
    'med spa for men {city}',
    'natural looking botox {city}',
    'expert injector near {city}',
    'medical spa consultations {city}'
  ],
  
  // Supplement Store
  supplement_store: [
    'best supplement store near {city}',
    'protein powder near me {city}',
    'pre workout supplements {city}',
    'creatine near {city}',
    'vitamin store {city}',
    'sports nutrition store {city}',
    'bodybuilding supplements {city}',
    'whey protein {city}',
    'bcaa near {city}',
    'fitness supplements store {city}',
    'nutrition store near me {city}',
    'supplement shop {city}',
    'where to buy supplements {city}',
    'best place for protein powder {city}',
    'amino acids near {city}',
    'post workout supplements {city}',
    'supplement store with knowledgeable staff {city}',
    'natural supplements {city}',
    'gym supplements near {city}',
    'supplement store open now {city}'
  ],
  
  // Coffee Shop / Cafe
  coffee_shop: [
    'best coffee shop near {city}',
    'coffee near me {city}',
    'good coffee {city}',
    'coffee shop open now {city}',
    'latte near {city}',
    'espresso bar {city}',
    'coffee shop with wifi {city}',
    'best cappuccino {city}',
    'specialty coffee {city}',
    'coffee shop for working {city}'
  ],
  
  cafe: [
    'best cafe near {city}',
    'cafe with good vibes {city}',
    'breakfast cafe {city}',
    'cozy cafe {city}',
    'cafe near me open now {city}'
  ],
  
  // Gym / Fitness
  gym: [
    'best gym near {city}',
    'gym membership {city}',
    '24 hour gym {city}',
    'affordable gym {city}',
    'gym with personal trainers {city}',
    'weightlifting gym {city}',
    'gym near me {city}',
    'fitness center {city}',
    'gym with classes {city}',
    'best gym for beginners {city}'
  ],
  
  // Spa
  spa: [
    'best spa near {city}',
    'day spa {city}',
    'massage and facial {city}',
    'spa packages {city}',
    'relaxing spa {city}',
    'spa near me {city}',
    'couples spa {city}',
    'luxury spa {city}',
    'spa deals {city}',
    'spa open now {city}'
  ],
  
  // Restaurants
  pizza: [
    'best pizza near {city}',
    'pizza delivery {city}',
    'authentic pizza {city}',
    'pizza near me open now {city}',
    'best pizza place {city}'
  ],
  
  mexican: [
    'best mexican restaurant near {city}',
    'tacos near me {city}',
    'authentic mexican food {city}',
    'mexican restaurant {city}',
    'burrito near {city}'
  ],
  
  italian: [
    'best italian restaurant near {city}',
    'authentic italian food {city}',
    'italian restaurant {city}',
    'pasta near me {city}',
    'italian dinner {city}'
  ],
  
  sushi: [
    'best sushi near {city}',
    'sushi restaurant {city}',
    'all you can eat sushi {city}',
    'fresh sushi {city}',
    'sushi near me {city}'
  ],
  
  // Services
  barber_shop: [
    'best barber near {city}',
    'mens haircut {city}',
    'barber shop near me {city}',
    'beard trim {city}',
    'traditional barber {city}'
  ],
  
  hair_salon: [
    'best hair salon near {city}',
    'hair stylist {city}',
    'hair color {city}',
    'balayage near {city}',
    'haircut near me {city}'
  ],
  
  dentist: [
    'best dentist near {city}',
    'dentist near me {city}',
    'family dentist {city}',
    'emergency dentist {city}',
    'teeth cleaning {city}'
  ],
  
  chiropractor: [
    'best chiropractor near {city}',
    'chiropractor near me {city}',
    'back pain treatment {city}',
    'spinal adjustment {city}',
    'chiropractor open now {city}'
  ],
  
  // Auto Services
  auto_repair: [
    'best auto repair near {city}',
    'car mechanic {city}',
    'oil change {city}',
    'brake repair {city}',
    'auto repair shop near me {city}'
  ],
  
  // Professional Services
  real_estate: [
    'best realtor near {city}',
    'real estate agent {city}',
    'homes for sale {city}',
    'real estate agency {city}',
    'top realtor {city}'
  ],
  
  law_firm: [
    'best lawyer near {city}',
    'attorney {city}',
    'law firm {city}',
    'legal services {city}',
    'top rated lawyer {city}'
  ]
};

/**
 * Fallback generic patterns (used only if niche not in template map)
 */
const FALLBACK_PATTERNS = [
  'best {niche} near {city}',
  '{niche} near me {city}',
  'top rated {niche} {city}',
  '{niche} open now {city}',
  'affordable {niche} {city}',
  '{niche} with good reviews {city}',
  'best place for {niche} {city}',
  '{niche} near me open now {city}',
  'where to find {niche} {city}',
  '{niche} recommendations {city}'
];

/**
 * Query bucket weights (importance)
 */
const BUCKET_WEIGHTS: Record<QueryBucket, number> = {
  best: 1.0,
  cheap: 0.85,
  open_now: 0.9,
  near_me: 0.9,
  specific_need: 1.1,
  comparison: 1.0,
  trust: 1.0,
  high_intent: 1.3
};

/**
 * Assign query to bucket based on keywords
 */
function assignQueryBucket(query: string): QueryBucket {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('cheap') || lowerQuery.includes('affordable') || lowerQuery.includes('budget')) {
    return 'cheap';
  }
  if (lowerQuery.includes('open now') || lowerQuery.includes('open today')) {
    return 'open_now';
  }
  if (lowerQuery.includes('near me')) {
    return 'near_me';
  }
  if (lowerQuery.includes('vs') || lowerQuery.includes('compare') || lowerQuery.includes('better')) {
    return 'comparison';
  }
  if (lowerQuery.includes('top rated') || lowerQuery.includes('best reviewed') || lowerQuery.includes('trusted')) {
    return 'trust';
  }
  if (lowerQuery.includes('buy') || lowerQuery.includes('appointment') || lowerQuery.includes('book')) {
    return 'high_intent';
  }
  if (lowerQuery.includes('best') || lowerQuery.includes('top')) {
    return 'best';
  }
  
  // Default: specific_need
  return 'specific_need';
}

/**
 * Generate niche-specific queries
 * 
 * RULES:
 * - Queries MUST include resolved niche label
 * - Queries MUST include location (city)
 * - NEVER use "Establishment" or generic terms
 * - Target 30-50 queries per business
 */
export function generateNicheQueries(args: {
  nicheLabel: string;
  nicheKey: string;
  city: string;
  targetQueryCount?: number;
}): GEOQuery[] {
  const { nicheLabel, nicheKey, city, targetQueryCount = 40 } = args;
  
  logger.info('[Niche Query Generator] Generating queries', {
    nicheLabel,
    nicheKey,
    city,
    targetQueryCount
  });
  
  // Get templates for this niche
  const templates = NICHE_QUERY_TEMPLATES[nicheKey] || FALLBACK_PATTERNS;
  
  const queries: GEOQuery[] = [];
  const seenQueries = new Set<string>();
  
  // Generate queries from templates
  for (const template of templates) {
    if (queries.length >= targetQueryCount) break;
    
    // Replace placeholders
    let query = template
      .replace(/{city}/g, city)
      .replace(/{niche}/g, nicheLabel);
    
    // Deduplicate
    if (seenQueries.has(query.toLowerCase())) continue;
    seenQueries.add(query.toLowerCase());
    
    // Assign bucket and weight
    const bucket = assignQueryBucket(query);
    const weight = BUCKET_WEIGHTS[bucket];
    
    queries.push({
      bucket,
      query,
      weight
    });
  }
  
  // If we still need more queries, generate variations
  if (queries.length < targetQueryCount && templates === FALLBACK_PATTERNS) {
    const additionalVariations = [
      `{niche} {city}`,
      `best {niche} in {city}`,
      `{niche} services {city}`,
      `professional {niche} {city}`,
      `experienced {niche} {city}`,
      `{niche} specialists {city}`
    ];
    
    for (const template of additionalVariations) {
      if (queries.length >= targetQueryCount) break;
      
      let query = template
        .replace(/{city}/g, city)
        .replace(/{niche}/g, nicheLabel);
      
      if (seenQueries.has(query.toLowerCase())) continue;
      seenQueries.add(query.toLowerCase());
      
      const bucket = assignQueryBucket(query);
      const weight = BUCKET_WEIGHTS[bucket];
      
      queries.push({
        bucket,
        query,
        weight
      });
    }
  }
  
  logger.info('[Niche Query Generator] Generated queries', {
    count: queries.length,
    bucketDistribution: {
      best: queries.filter(q => q.bucket === 'best').length,
      high_intent: queries.filter(q => q.bucket === 'high_intent').length,
      specific_need: queries.filter(q => q.bucket === 'specific_need').length,
      near_me: queries.filter(q => q.bucket === 'near_me').length,
      open_now: queries.filter(q => q.bucket === 'open_now').length,
      cheap: queries.filter(q => q.bucket === 'cheap').length,
      trust: queries.filter(q => q.bucket === 'trust').length,
      comparison: queries.filter(q => q.bucket === 'comparison').length
    }
  });
  
  return queries;
}

/**
 * Validate queries - ensure no "Establishment" or generic terms
 */
export function validateQueries(queries: GEOQuery[]): { valid: boolean; invalidQueries: string[] } {
  const invalidQueries: string[] = [];
  
  for (const query of queries) {
    const lowerQuery = query.query.toLowerCase();
    
    // Check for "Establishment"
    if (lowerQuery.includes('establishment')) {
      invalidQueries.push(query.query);
      continue;
    }
    
    // Check for other generic terms (alone)
    const genericTerms = ['store', 'business', 'place', 'location'];
    const words = lowerQuery.split(/\s+/);
    if (words.length === 1 && genericTerms.includes(words[0])) {
      invalidQueries.push(query.query);
    }
  }
  
  if (invalidQueries.length > 0) {
    logger.error('[Niche Query Generator] Invalid queries detected', { invalidQueries });
  }
  
  return {
    valid: invalidQueries.length === 0,
    invalidQueries
  };
}




