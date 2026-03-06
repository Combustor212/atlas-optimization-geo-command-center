/**
 * MEO Scoring Schema Definitions
 * Version: v10.1
 */

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface ManualScanInput {
  businessName: string;
  location: string;
}

export interface DropdownScanInput {
  selectedPlace: {
    description: string;
    place_id: string;
    structured_formatting?: any;
    terms?: any[];
  };
}

export interface LoggedInScanInput {
  businessName: string;
  place_id: string;
  location?: string;
}

export type ScanInput = ManualScanInput | DropdownScanInput | LoggedInScanInput;

// ============================================================================
// NORMALIZED INPUT
// ============================================================================

export interface NormalizedScanInput {
  businessName: string;
  location: string;
  place_id?: string;
}

// ============================================================================
// CATEGORY DEFINITIONS
// ============================================================================

export interface CategoryWeights {
  profileBase: number;
  reviewsWeight: number;
  visualsWeight: number;
  engagementWeight: number;
  visibilityWeight: number;
  competitiveWeight: number;
}

export interface CategoryDetectionResult {
  category: string;
  categoryCanonical: string;
  categoryConfidence: number;
}

// ============================================================================
// COMPETITIVE ANALYSIS
// ============================================================================

export interface CompetitivePercentile {
  rating: number;
  reviews: number;
  photos: number;
}

export interface MarketContext {
  localAvgRating: number;
  localAvgReviews: number;
  localAvgPhotos: number;
  competitorsAnalyzed: number;
  competitivePercentile: CompetitivePercentile;
  marketPosition: string;
}

// ============================================================================
// MEO INPUTS USED (Raw GBP fields used for scoring)
// ============================================================================

export interface MEOInputsUsed {
  businessName?: string;
  place_id?: string;
  location?: string;
  address?: string;
  rating: number;
  totalReviews: number;
  photoCount: number;
  hasWebsite: boolean;
  hasPhone: boolean;
  hasHours: boolean;
  hasDescription: boolean;
  hasOwnerResponses: boolean;
  reviewResponseRate: number;
  completenessScore: number;
  categoryCanonical: string;
  dominanceType?: string | null;
  isFranchise: boolean;
  isMajorNationalFranchise: boolean;
  isRegionalFranchise: boolean;
}

// ============================================================================
// MEO BREAKDOWN (Points per component + cap info)
// ============================================================================

export interface MEOBreakdown {
  scoringVersion: string;
  baseScore: number;
  ratingPoints: number;
  reviewPoints: number;
  photoPoints: number;
  infoPoints: number;
  engagementPoints: number;
  competitivePoints: number;
  franchiseBoostPoints: number;
  rawScoreBeforeCap: number;
  reviewReliabilityCap: number | null;
  wasCapped: boolean;
  capReason: string | null;
  finalScore: number;
}

// ============================================================================
// SCORING BREAKDOWN (Legacy - kept for backwards compatibility)
// ============================================================================

export interface ComponentScore {
  value: any;
  points: number;
  maxPoints: number;
  normalizedScore?: number;
}

export interface ScoringBreakdown {
  baseScore: number;
  profile: number;
  reviews: number;
  visuals: number;
  engagement: number;
  visibility: number;
  competitive: number;
  rawScore: number;
  finalScore: number;
  reviewReliabilityCapApplied: boolean;
  reviewReliabilityCap: number | null;
  wasCapped: boolean;
  capReason: string | null;
  rawScoreBeforeCap?: number;
  categoryWeights: CategoryWeights;
  components?: {
    rating?: ComponentScore;
    reviews?: ComponentScore;
    photos?: ComponentScore;
    profile?: ComponentScore;
    engagement?: ComponentScore;
    visibility?: ComponentScore;
    competitive?: ComponentScore;
    franchiseBoost?: ComponentScore;
  };
}

// ============================================================================
// MEO SCAN RESPONSE (STABLE CONTRACT)
// ============================================================================

export interface MEOScanResponse {
  body: {
    status: 'completed' | 'error';
    scope: 'local';
    businessName: string;
    place_id: string;
    category: string;
    categoryCanonical: string;
    categoryConfidence: number;
    isFranchise: boolean;
    isMajorNationalFranchise: boolean;
    isFastFood: boolean;
    isLocalLeader: boolean;
    isPerfectProfile: boolean;
    dominanceType: string | null;
    rating: number;
    totalReviews: number;
    photoCount: number;
    hasWebsite: boolean;
    hasPhone: boolean;
    hasHours: boolean;
    hasDescription: boolean;
    completenessScore: number;
    reviewResponseRate: number;
    hasOwnerResponses: boolean;
    meoScore: number;
    grade: string;
    confidence: string;
    scoringBreakdown: ScoringBreakdown;
    marketContext: MarketContext;
    gradeRationale: string;
    deficiencies: string[];
    bonuses: string[];
    optimizationTips: string[];
    growthPath: string[];
    // REQUIRED EXPLICIT TRANSPARENCY FIELDS
    gbpFacts: MEOInputsUsed; // Alias for meoInputsUsed (clearer name)
    meoInputsUsed: MEOInputsUsed;
    meoBreakdown: MEOBreakdown;
    meoWhy: string[];
    // Legacy/compatibility
    profileSignals?: any;
    scoreReasons?: any;
    why: string[];
    calculatedAt: string;
    scoringVersion: string;
    runId: string;
    debugStamp: string;
  };
}

// ============================================================================
// FRANCHISE DETECTION
// ============================================================================

export interface FranchiseDetectionResult {
  isFranchise: boolean;
  isMajorNationalFranchise: boolean;
  isRegionalFranchise: boolean;
  isFastFood: boolean;
  franchiseType: 'local' | 'regional' | 'national' | null;
  franchiseBoost: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const SCORING_VERSION = 'v10.1';

export const GRADE_THRESHOLDS = {
  'A+': 95,
  'A': 90,
  'A-': 85,
  'B+': 80,
  'B': 75,
  'B-': 70,
  'C+': 65,
  'C': 60,
  'C-': 55,
  'D+': 50,
  'D': 45,
  'D-': 40,
  'F': 0
} as const;

export const CONFIDENCE_LEVELS = {
  HIGH: 'high',
  MEDIUM_HIGH: 'medium-high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const;

