/**
 * SEO Keyword Generator
 * Generates local search keywords from business info for visibility scoring.
 * Patterns: "[service] near me", "[service] in [city]", "best [service] [city]", "[service] [zip]"
 */

const SEO_KEYWORD_LIMIT = Number(process.env.SEO_KEYWORD_LIMIT) || 25;

export interface KeywordGeneratorInput {
  businessName: string;
  businessType: string; // e.g. "plumber", "coffee shop", "nail salon"
  city: string;
  state: string;
  zip?: string;
}

/**
 * Extract service/category terms from business type for keyword generation.
 * "Coffee Shop" -> ["coffee", "coffee shop"]
 * "Nail Salon" -> ["nail salon", "nails", "manicure"]
 */
function getServiceTerms(businessType: string): string[] {
  const normalized = businessType.toLowerCase().trim();
  if (!normalized) return [];

  const terms: string[] = [normalized];
  // Add shortened form for multi-word types
  if (normalized.includes(' ')) {
    const firstWord = normalized.split(' ')[0];
    if (firstWord && firstWord.length > 2) {
      terms.push(firstWord);
    }
  }
  return [...new Set(terms)];
}

/**
 * Generate local SEO keywords from business info.
 * Deduplicates and limits to SEO_KEYWORD_LIMIT.
 */
export function generateLocalKeywords(input: KeywordGeneratorInput): string[] {
  const { businessName, businessType, city, state, zip } = input;
  const serviceTerms = getServiceTerms(businessType);
  const cityClean = city?.trim() || '';
  const stateClean = state?.trim() || '';
  const zipClean = zip?.trim() || '';
  const locationLabel = [cityClean, stateClean].filter(Boolean).join(', ');

  const keywords: string[] = [];

  // Pattern 1: "[service] near me"
  for (const term of serviceTerms) {
    keywords.push(`${term} near me`);
  }

  // Pattern 2: "[service] in [city]"
  if (cityClean) {
    for (const term of serviceTerms) {
      keywords.push(`${term} in ${cityClean}`);
    }
  }

  // Pattern 3: "best [service] [city]"
  if (cityClean) {
    for (const term of serviceTerms) {
      keywords.push(`best ${term} ${cityClean}`);
    }
  }

  // Pattern 4: "[service] [zip]"
  if (zipClean) {
    for (const term of serviceTerms) {
      keywords.push(`${term} ${zipClean}`);
    }
  }

  // Pattern 5: "[service] [city] [state]" for broader coverage
  if (cityClean && stateClean) {
    for (const term of serviceTerms) {
      keywords.push(`${term} ${cityClean} ${stateClean}`);
    }
  }

  // Pattern 6: "top [service] near [city]"
  if (cityClean) {
    for (const term of serviceTerms) {
      keywords.push(`top ${term} near ${cityClean}`);
    }
  }

  // Deduplicate (preserve order)
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const kw of keywords) {
    const key = kw.toLowerCase().trim();
    if (!seen.has(key) && key.length > 3) {
      seen.add(key);
      deduped.push(kw);
    }
  }

  return deduped.slice(0, SEO_KEYWORD_LIMIT);
}
