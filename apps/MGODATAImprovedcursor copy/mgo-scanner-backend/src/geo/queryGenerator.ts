/**
 * GEO Query Generator
 * Generates multi-query evaluation sets grouped by intent buckets
 */

import type { IndustryClassification } from './industryClassifier';

export type QueryBucket = 'best' | 'near_me' | 'service' | 'trust';

export interface GeneratedQuery {
  query: string;
  bucket: QueryBucket;
  weight: number; // importance multiplier (e.g. high_intent=1.3, best=1.0)
}

export interface QueryGenerationOptions {
  targetCount?: number;
  industryClassification?: IndustryClassification;
}

export interface QuerySet {
  queries: GeneratedQuery[];
  intentDistribution: Record<QueryBucket, number>;
}

// Function overloads
export function generateGEOQueries(
  categoryLabel: string,
  locationLabel: string,
  options: QueryGenerationOptions
): QuerySet;
export function generateGEOQueries(
  categoryLabel: string,
  locationLabel: string,
  businessName: string
): GeneratedQuery[];

/**
 * Generate queries for a business based on category and location
 * Overloaded to support both new and legacy usage
 */
export function generateGEOQueries(
  categoryLabel: string,
  locationLabel: string,
  businessNameOrOptions: string | QueryGenerationOptions
): GeneratedQuery[] | QuerySet {
  const isLegacyCall = typeof businessNameOrOptions === 'object';
  const options = typeof businessNameOrOptions === 'object' ? businessNameOrOptions : {};
  const businessName = typeof businessNameOrOptions === 'string' ? businessNameOrOptions : categoryLabel;
  
  // Use industry classification if available
  const industryClass = options.industryClassification;
  const effectiveCategory = industryClass?.industry || categoryLabel;
  const serviceKeywords = industryClass?.serviceKeywords || [];
  
  const queries: GeneratedQuery[] = [];
  
  // Extract city from location
  // Handle both short format ("West Chester, OH") and full address ("123 Main St, Cincinnati, OH 45202")
  const parts = locationLabel.split(',').map(p => p.trim());
  const city = parts.length > 2 ? parts[1] : parts[0]; // If 3+ parts, city is 2nd; otherwise 1st
  
  // BUCKET 1: Best/Top Intent (5 queries) - weight 1.3 (high intent)
  queries.push(
    { query: `best ${effectiveCategory} near ${city}`, bucket: 'best', weight: 1.3 },
    { query: `top ${effectiveCategory} in ${city}`, bucket: 'best', weight: 1.3 },
    { query: `top rated ${effectiveCategory} ${city}`, bucket: 'best', weight: 1.3 },
    { query: `find best ${effectiveCategory} ${city}`, bucket: 'best', weight: 1.3 },
    { query: `number one ${effectiveCategory} near ${city}`, bucket: 'best', weight: 1.3 }
  );
  
  // BUCKET 2: Near Me/Location Intent (5 queries) - weight 1.0 (normal)
  queries.push(
    { query: `${effectiveCategory} near me in ${city}`, bucket: 'near_me', weight: 1.0 },
    { query: `${effectiveCategory} close to ${city}`, bucket: 'near_me', weight: 1.0 },
    { query: `${effectiveCategory} in ${city}`, bucket: 'near_me', weight: 1.0 },
    { query: `${effectiveCategory} nearby ${city}`, bucket: 'near_me', weight: 1.0 },
    { query: `local ${effectiveCategory} ${city}`, bucket: 'near_me', weight: 1.0 }
  );
  
  // BUCKET 3: Service-Specific Intent (5 queries) - weight 1.2
  // Use classifier service keywords if available, otherwise fallback to category-based
  const serviceQueries = serviceKeywords.length >= 3
    ? generateServiceQueriesFromKeywords(serviceKeywords, city)
    : generateServiceQueries(effectiveCategory, city);
  queries.push(...serviceQueries.map(q => ({ query: q, bucket: 'service' as QueryBucket, weight: 1.2 })));
  
  // BUCKET 4: Trust/Quality Intent (5 queries) - weight 1.1
  queries.push(
    { query: `highly rated ${effectiveCategory} ${city}`, bucket: 'trust', weight: 1.1 },
    { query: `best reviewed ${effectiveCategory} near ${city}`, bucket: 'trust', weight: 1.1 },
    { query: `trusted ${effectiveCategory} in ${city}`, bucket: 'trust', weight: 1.1 },
    { query: `recommended ${effectiveCategory} ${city}`, bucket: 'trust', weight: 1.1 },
    { query: `reliable ${effectiveCategory} near ${city}`, bucket: 'trust', weight: 1.1 }
  );
  
  // Return format based on call type
  if (isLegacyCall) {
    // Legacy geoEngine call - return QuerySet with queries array
    const intentDistribution: Record<QueryBucket, number> = {
      best: queries.filter(q => q.bucket === 'best').length,
      near_me: queries.filter(q => q.bucket === 'near_me').length,
      service: queries.filter(q => q.bucket === 'service').length,
      trust: queries.filter(q => q.bucket === 'trust').length
    };
    
    return {
      queries,
      intentDistribution
    };
  }
  
  // New explain call - return queries array directly
  return queries;
}

/**
 * Generate service queries from classifier-provided keywords
 */
function generateServiceQueriesFromKeywords(serviceKeywords: string[], city: string): string[] {
  const queries: string[] = [];
  
  // Use first 3 keywords directly
  for (let i = 0; i < Math.min(3, serviceKeywords.length); i++) {
    queries.push(`${serviceKeywords[i]} ${city}`);
  }
  
  // Add 2 more queries combining keywords with common modifiers
  if (serviceKeywords.length >= 1) {
    queries.push(`best ${serviceKeywords[0]} near ${city}`);
  }
  if (serviceKeywords.length >= 2) {
    queries.push(`${serviceKeywords[1]} services ${city}`);
  }
  
  // Pad to 5 if needed
  while (queries.length < 5 && serviceKeywords.length > 0) {
    const keyword = serviceKeywords[queries.length % serviceKeywords.length];
    queries.push(`${keyword} specialists ${city}`);
  }
  
  return queries.slice(0, 5);
}

/**
 * Generate service-specific queries based on category (5 queries)
 */
function generateServiceQueries(categoryLabel: string, city: string): string[] {
  const lower = categoryLabel.toLowerCase();
  
  // Nail salon / spa
  if (lower.includes('nail') || lower.includes('spa')) {
    return [
      `gel nails ${city}`,
      `manicure and pedicure ${city}`,
      `nail salon with good reviews ${city}`,
      `acrylic nails ${city}`,
      `nail art ${city}`
    ];
  }
  
  // Dentist
  if (lower.includes('dentist') || lower.includes('dental')) {
    return [
      `family dentist ${city}`,
      `teeth cleaning ${city}`,
      `emergency dental care ${city}`,
      `cosmetic dentistry ${city}`,
      `dental implants ${city}`
    ];
  }
  
  // Restaurant
  if (lower.includes('restaurant') || lower.includes('dining')) {
    return [
      `best food ${city}`,
      `dinner reservations ${city}`,
      `popular restaurants ${city}`,
      `fine dining ${city}`,
      `restaurant recommendations ${city}`
    ];
  }
  
  // Medical spa
  if (lower.includes('medical spa') || lower.includes('med spa')) {
    return [
      `botox ${city}`,
      `laser treatments ${city}`,
      `medical aesthetics ${city}`,
      `dermal fillers ${city}`,
      `skin rejuvenation ${city}`
    ];
  }
  
  // Gym / fitness
  if (lower.includes('gym') || lower.includes('fitness')) {
    return [
      `personal training ${city}`,
      `group fitness classes ${city}`,
      `best gym membership ${city}`,
      `weight training ${city}`,
      `24 hour gym ${city}`
    ];
  }
  
  // Default generic service queries
  return [
    `${categoryLabel} services ${city}`,
    `professional ${categoryLabel} ${city}`,
    `${categoryLabel} with appointments ${city}`,
    `${categoryLabel} specialists ${city}`,
    `affordable ${categoryLabel} ${city}`
  ];
}
