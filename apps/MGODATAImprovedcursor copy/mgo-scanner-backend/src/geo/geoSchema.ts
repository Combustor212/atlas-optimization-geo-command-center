/**
 * GEO Benchmark Schema (TypeScript types)
 * Defines the contract for GEO competitive ranking + scoring
 */

// ============================================================================
// COMPETITOR & CANDIDATE DATA
// ============================================================================

export interface GEOCandidate {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  rating: number;
  reviewCount: number;
  photoCount: number;
  hasWebsite: boolean;
  hasPhone: boolean;
  hasHours: boolean;
  types: string[];
  // Website signals (if scraped)
  hasMenuOrServicesContent?: boolean;
  topReviewKeywords?: string[];
  attributes?: string[];
}

export interface GEOCompetitorSet {
  target: GEOCandidate;
  competitors: GEOCandidate[];
  niche: string;
  nicheCanonical: string;
  locationLabel: string;
  radiusMeters: number;
  competitorsFetchedAt: string;
}

// ============================================================================
// QUERY GENERATION
// ============================================================================

export type QueryBucket =
  | 'best'
  | 'cheap'
  | 'open_now'
  | 'near_me'
  | 'specific_need'
  | 'comparison'
  | 'trust'
  | 'high_intent';

export interface GEOQuery {
  bucket: QueryBucket;
  query: string;
  weight: number; // importance multiplier (e.g. high_intent=1.3, best=1.0)
}

export interface GEOQuerySet {
  queries: GEOQuery[];
  generatedAt: string;
}

// ============================================================================
// RANKING RESULTS
// ============================================================================

export interface RankEntry {
  placeId: string;
  name: string; // Business name for display
  rank: number; // 1-based
  reasons: string[];
  weaknesses: string[];
}

export interface QueryRankResult {
  query: string;
  bucket: QueryBucket;
  weight: number;
  targetRank: number | null; // Rank of target business (1-based), null if not in top5
  targetInTop5: boolean; // True if target business is in top5
  top5: RankEntry[];
  confidence: number; // 0-1
  missingDataFlags: string[];
  auditPassed: boolean;
  auditNotes?: string;
  timestamp: string; // ISO timestamp of when this ranking was computed
}

// ============================================================================
// GEO SCORING & DRIVERS
// ============================================================================

export interface GEOScoreBreakdown {
  sovTop3: number; // 0-1 (weighted share of voice in top 3)
  sovTop5: number; // 0-1 (weighted share of voice in top 5)
  evidenceStrengthIndex: number; // 0-1 (normalized vs competitor median)
  rawScore: number; // 0-100 (before any caps)
  finalScore: number; // 0-100 (GEO score)
  reliabilityCap: number | null; // Hard cap applied (e.g., 55), null if no cap
  wasCapped: boolean; // True if rawScore was reduced by cap
  capReason: string | null; // Human-readable reason for cap
}

export interface GEODriver {
  id: string;
  title: string;
  status: 'good' | 'warn' | 'bad' | 'disabled';
  observedValue: string | number | null;
  competitorMedian: string | number | null;
  explanation: string;
  impactLabel: string; // e.g. "–8 pts", "+12 pts potential"
  pointGain: number; // estimated gain if fixed
  cta: string; // "Upload photos", "Add menu/services", etc
}

export interface GEOFixAction {
  id: string;
  title: string;
  description: string;
  pointGain: number;
  timeEstimate: string; // "~20 min", "~1 hour"
  cta: string;
}

// ============================================================================
// GEO BENCHMARK RESPONSE
// ============================================================================

export interface CategoryResolution {
  key: string | null; // e.g., "driving_school", "med_spa" (null if unresolved)
  label: string | null; // e.g., "Driving school", "Medical spa" (null if unresolved)
  confidence: number; // 0.0 - 1.0
  source: 'places' | 'places_display' | 'keywords' | 'openai' | 'unresolved';
}

export interface GEOBenchmarkResponse {
  target: GEOCandidate;
  competitors: GEOCandidate[];
  niche: string;
  nicheLabel: string; // User-facing label (e.g., "Italian restaurant")
  nicheCanonical: string;
  locationLabel: string;
  radiusMeters: number;
  category: CategoryResolution; // 🔊 NEW: Strict category resolution
  queries: GEOQuery[];
  rankResults: QueryRankResult[];
  geoScore: number | null; // 🔊 NEW: null if category unresolved
  geoAlgoVersion: string; // 🔊 Algorithm version (e.g., "geo-v5")
  geoCalibrated: boolean; // 🔊 True if reliability cap was applied
  percentile: number | null; // 🔊 NEW: null if no competitors or unresolved
  scoreBreakdown: GEOScoreBreakdown;
  calibration?: {
    reliabilityScore: number; // 0-1
    hardCap: {
      capApplied: boolean;
      capValue: number | null;
      capReason: string | null;
      rawScore: number;
      finalScore: number;
    };
    trustPenalty: {
      applied: boolean;
      reason: string | null;
      penaltyAmount: number;
    };
    competitorQuality: {
      matchedCount: number;
      totalCount: number;
      qualityScore: number;
    };
  };
  drivers: GEODriver[];
  fixFirst: GEOFixAction[];
  topQueryWins: QueryRankResult[]; // Queries where target ranked #1-3 WITH PROOF
  topQueryLosses: QueryRankResult[]; // Queries where target ranked low/not in top5 WITH PROOF
  uncertainQueries: QueryRankResult[]; // Queries with confidence < 0.6
  confidence: 'low' | 'medium' | 'high';
  confidenceReasons: string[];
  geoStatus: 'valid' | 'category_unresolved' | 'insufficient_competitors' | 'low_confidence';
  lastRefreshedAt: string;
  cacheKey: string;
  debug?: {
    debugStamp?: string;
    runId?: string;
    dataSource?: 'backend' | 'fallback';
    cacheHit?: boolean;
    forceRefresh?: boolean;
    openAICalls?: number;
    openAITokens?: number;
    processingTimeMs?: number;
    competitorCount?: number;
    queryCount?: number;
    reliabilityCap?: number | null;
    wasCapped?: boolean;
  };
}

// ============================================================================
// WEBSITE SCRAPE SIGNALS (COMPACT)
// ============================================================================

export interface SiteSignals {
  hasMenuOrServices: boolean;
  hasPricingSignals: boolean;
  hasHoursOnSite: boolean;
  hasLocalBusinessSchema: boolean;
  hasFAQContent: boolean;
  menuItemCount: number;
  serviceCount: number;
}

// ============================================================================
// GUARDRAILS & ERROR STATES
// ============================================================================

export interface GEOBenchmarkError {
  error: string;
  code: 'INSUFFICIENT_COMPETITORS' | 'MISSING_DATA' | 'API_ERROR' | 'UNKNOWN';
  message: string;
  details?: any;
}
