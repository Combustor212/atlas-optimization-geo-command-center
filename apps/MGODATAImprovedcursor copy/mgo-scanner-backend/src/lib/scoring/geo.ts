/**
 * GEO (Generative Engine Optimization) Scoring - REBUILT
 * 
 * PURPOSE:
 * Measures "How likely is this business to be referenced, summarized, or recommended
 * by AI systems (ChatGPT, Perplexity, Gemini, Claude)?"
 * 
 * STRICT RULES (NON-NEGOTIABLE):
 * - ONLY use authority/content/brand signals
 * - NEVER use Maps ranking, distance, or local pack logic
 * - NEVER use NAP consistency (that's MEO)
 * - NEVER use directory citations (that's MEO)
 * - NEVER use service area clarity (that's local)
 * 
 * SIGNAL CATEGORIES:
 * 1. Website Authority (30 pts) - domain quality, content depth, trust badges
 * 2. Brand Mentions (25 pts) - mentions on authoritative sites, press coverage (STUB for now)
 * 3. Review Sentiment (25 pts) - sentiment score, keyword analysis
 * 4. Information Consistency (20 pts) - same info across platforms, parseable content
 */

import { GeoWebsiteAnalysis, DirectoryCitation, GeoScore, GeoScoreBreakdown } from '../../types';
import { logger } from '../logger';

/**
 * Calculate GEO score (0-100)
 * 
 * AUDIT-COMPLIANT VERSION
 */
export function calculateGeoScore(
  websiteAnalysis: GeoWebsiteAnalysis | null,
  directoryCitations: DirectoryCitation[] // Not used for scoring, kept for backwards compatibility
): GeoScore {
  
  logger.info('[GEO Scoring] Starting GEO calculation (audit-compliant)');
  
  // ============================================================================
  // 1. WEBSITE AUTHORITY (30 points)
  // ============================================================================
  const websiteAuthority = {
    domain_quality: calculateDomainQuality(websiteAnalysis), // 10 pts
    content_depth: calculateContentDepth(websiteAnalysis),   // 10 pts
    trust_badges: calculateTrustBadges(websiteAnalysis),     // 10 pts
    total: 0
  };
  
  websiteAuthority.total = 
    websiteAuthority.domain_quality +
    websiteAuthority.content_depth +
    websiteAuthority.trust_badges;
  
  logger.info('[GEO Scoring] Website Authority', websiteAuthority);
  
  // ============================================================================
  // 2. BRAND MENTIONS (25 points) - STUB
  // ============================================================================
  // NOTE: This requires external API calls (news API, web scraping, backlink analysis)
  // For now, return 0. Future implementation:
  // - Check for mentions on authoritative sites (news, industry directories)
  // - Analyze press coverage
  // - Assess social media following/engagement
  // - Count high-quality backlinks
  const brandMentions = {
    authoritative_mentions: 0, // 10 pts (STUB)
    press_coverage: 0,         // 8 pts (STUB)
    social_presence: 0,        // 7 pts (STUB)
    total: 0
  };
  
  logger.info('[GEO Scoring] Brand Mentions (stubbed)', brandMentions);
  
  // ============================================================================
  // 3. REVIEW SENTIMENT (25 points)
  // ============================================================================
  // NOTE: This requires review text analysis
  // For now, use basic schema signals as proxy
  const reviewSentiment = {
    sentiment_score: calculateReviewSentimentProxy(websiteAnalysis), // 15 pts (proxy)
    keyword_quality: calculateKeywordQuality(websiteAnalysis),       // 10 pts (proxy)
    total: 0
  };
  
  reviewSentiment.total = 
    reviewSentiment.sentiment_score +
    reviewSentiment.keyword_quality;
  
  logger.info('[GEO Scoring] Review Sentiment', reviewSentiment);
  
  // ============================================================================
  // 4. INFORMATION CONSISTENCY (20 points)
  // ============================================================================
  const informationConsistency = {
    schema_completeness: calculateSchemaCompleteness(websiteAnalysis), // 10 pts
    content_clarity: calculateContentClarity(websiteAnalysis),         // 10 pts
    total: 0
  };
  
  informationConsistency.total = 
    informationConsistency.schema_completeness +
    informationConsistency.content_clarity;
  
  logger.info('[GEO Scoring] Information Consistency', informationConsistency);
  
  // ============================================================================
  // TOTAL SCORE
  // ============================================================================
  const breakdown: GeoScoreBreakdown = {
    nap_consistency: {
      website_nap_match: 0,  // REMOVED per audit
      directory_citations: 0, // REMOVED per audit
      total: 0
    },
    structured_data: {
      localbusiness_schema: websiteAuthority.domain_quality + informationConsistency.schema_completeness,
      sameAs: websiteAuthority.trust_badges,
      service_area_clarity: 0, // REMOVED per audit
      total: websiteAuthority.total + informationConsistency.total
    },
    content_clarity: {
      what_where_clarity: informationConsistency.content_clarity,
      faq_signals: reviewSentiment.keyword_quality,
      total: reviewSentiment.total
    }
  };
  
  const totalScore = 
    websiteAuthority.total +
    brandMentions.total +
    reviewSentiment.total +
    informationConsistency.total;
  
  const finalScore = Math.round(Math.min(100, Math.max(0, totalScore)));
  
  logger.info('[GEO Scoring] Final Score', {
    websiteAuthority: websiteAuthority.total,
    brandMentions: brandMentions.total,
    reviewSentiment: reviewSentiment.total,
    informationConsistency: informationConsistency.total,
    totalScore,
    finalScore
  });
  
  return {
    score: finalScore,
    breakdown
  };
}

// ============================================================================
// WEBSITE AUTHORITY COMPONENTS (30 points total)
// ============================================================================

/**
 * Domain Quality (0-10 points)
 * Measures: SSL, valid schema, structured data presence
 */
function calculateDomainQuality(analysis: GeoWebsiteAnalysis | null): number {
  if (!analysis) return 0;
  
  let score = 0;
  
  // Has valid LocalBusiness schema (5 pts)
  if (analysis.localbusiness_schema?.present && analysis.localbusiness_schema?.valid) {
    score += 5;
  }
  
  // Schema has NAP data (indicates well-structured site) (3 pts)
  if (analysis.localbusiness_schema?.has_nap) {
    score += 3;
  }
  
  // Has sameAs links (2 pts)
  if (analysis.sameAs && analysis.sameAs.length > 0) {
    score += 2;
  }
  
  return Math.min(10, score);
}

/**
 * Content Depth (0-10 points)
 * Measures: How much content exists on the website
 */
function calculateContentDepth(analysis: GeoWebsiteAnalysis | null): number {
  if (!analysis) return 0;
  
  let score = 0;
  
  // Has clear what/where information (5 pts)
  if (analysis.what_where_clarity === 'clear') {
    score += 5;
  } else if (analysis.what_where_clarity === 'some') {
    score += 2;
  }
  
  // Has FAQ section (indicates content depth) (5 pts)
  if (analysis.faq_signals?.present) {
    score += 5;
  }
  
  return Math.min(10, score);
}

/**
 * Trust Badges (0-10 points)
 * Measures: Trust signals, sameAs links, authority indicators
 */
function calculateTrustBadges(analysis: GeoWebsiteAnalysis | null): number {
  if (!analysis) return 0;
  
  let score = 0;
  
  // Number of sameAs links (social media, directories)
  const sameAsCount = analysis.sameAs?.length || 0;
  
  if (sameAsCount >= 6) {
    score += 10;
  } else if (sameAsCount >= 3) {
    score += 7;
  } else if (sameAsCount >= 1) {
    score += 4;
  }
  
  return Math.min(10, score);
}

// ============================================================================
// REVIEW SENTIMENT COMPONENTS (25 points total)
// ============================================================================

/**
 * Review Sentiment Proxy (0-15 points)
 * 
 * NOTE: True sentiment analysis requires review text processing
 * For now, use schema completeness as a proxy for "parseable by AI"
 * 
 * Future: Analyze actual review text for positive keywords, tone, etc.
 */
function calculateReviewSentimentProxy(analysis: GeoWebsiteAnalysis | null): number {
  if (!analysis) return 0;
  
  let score = 0;
  
  // Has structured data that AI can parse (10 pts)
  if (analysis.localbusiness_schema?.present) {
    score += 10;
  }
  
  // Has clear service area (indicates well-defined offering) (5 pts)
  // NOTE: This is NOT a local signal - it's about clarity for AI parsing
  if (analysis.service_area_clarity === 'clear') {
    score += 5;
  }
  
  return Math.min(15, score);
}

/**
 * Keyword Quality (0-10 points)
 * 
 * Measures: Does the website clearly explain what they do?
 */
function calculateKeywordQuality(analysis: GeoWebsiteAnalysis | null): number {
  if (!analysis) return 0;
  
  let score = 0;
  
  // Clear what/where information (7 pts)
  if (analysis.what_where_clarity === 'clear') {
    score += 7;
  } else if (analysis.what_where_clarity === 'some') {
    score += 3;
  }
  
  // FAQ signals (indicates keyword-rich content) (3 pts)
  if (analysis.faq_signals?.present) {
    score += 3;
  }
  
  return Math.min(10, score);
}

// ============================================================================
// INFORMATION CONSISTENCY COMPONENTS (20 points total)
// ============================================================================

/**
 * Schema Completeness (0-10 points)
 * Measures: How complete is the LocalBusiness schema?
 */
function calculateSchemaCompleteness(analysis: GeoWebsiteAnalysis | null): number {
  if (!analysis) return 0;
  
  let score = 0;
  
  // Schema present and valid (5 pts)
  if (analysis.localbusiness_schema?.present && analysis.localbusiness_schema?.valid) {
    score += 5;
  }
  
  // Schema has NAP (5 pts)
  if (analysis.localbusiness_schema?.has_nap) {
    score += 5;
  }
  
  return Math.min(10, score);
}

/**
 * Content Clarity (0-10 points)
 * Measures: How clear and parseable is the content?
 */
function calculateContentClarity(analysis: GeoWebsiteAnalysis | null): number {
  if (!analysis) return 0;
  
  let score = 0;
  
  // Clear what/where information (6 pts)
  if (analysis.what_where_clarity === 'clear') {
    score += 6;
  } else if (analysis.what_where_clarity === 'some') {
    score += 3;
  }
  
  // FAQ signals (4 pts)
  if (analysis.faq_signals?.present) {
    score += 4;
  }
  
  return Math.min(10, score);
}

// ============================================================================
// LEGACY FUNCTIONS (DEPRECATED - KEPT FOR BACKWARDS COMPATIBILITY)
// ============================================================================

/**
 * @deprecated - NAP consistency is a LOCAL signal, not a GEO signal (moved to MEO)
 */
function calculateWebsiteNAPMatchScore(analysis: GeoWebsiteAnalysis | null): number {
  return 0; // Always return 0 per audit rules
}

/**
 * @deprecated - Directory citations are a LOCAL signal, not a GEO signal (moved to MEO)
 */
function calculateDirectoryCitationsScore(citations: DirectoryCitation[]): number {
  return 0; // Always return 0 per audit rules
}

/**
 * @deprecated - Use calculateSchemaCompleteness instead
 */
function calculateSchemaScore(analysis: GeoWebsiteAnalysis | null): number {
  return calculateSchemaCompleteness(analysis);
}

/**
 * @deprecated - Use calculateTrustBadges instead
 */
function calculateSameAsScore(analysis: GeoWebsiteAnalysis | null): number {
  return calculateTrustBadges(analysis);
}

/**
 * @deprecated - Service area clarity is a LOCAL signal, not authority
 */
function calculateServiceAreaClarityScore(analysis: GeoWebsiteAnalysis | null): number {
  return 0; // Always return 0 per audit rules
}

/**
 * @deprecated - Use calculateContentClarity instead
 */
function calculateWhatWhereClarityScore(analysis: GeoWebsiteAnalysis | null): number {
  return calculateContentClarity(analysis);
}

/**
 * @deprecated - Use calculateKeywordQuality instead
 */
function calculateFAQSignalsScore(analysis: GeoWebsiteAnalysis | null): number {
  return calculateKeywordQuality(analysis);
}
