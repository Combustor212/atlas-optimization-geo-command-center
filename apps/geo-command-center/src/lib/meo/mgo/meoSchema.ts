/**
 * MEO Scoring Schema - MGO backend compatible (v10.1)
 */

export interface CategoryWeights {
  profileBase: number
  reviewsWeight: number
  visualsWeight: number
  engagementWeight: number
  visibilityWeight: number
  competitiveWeight: number
}

export interface CategoryDetectionResult {
  category: string
  categoryCanonical: string
  categoryConfidence: number
}

export interface CompetitivePercentile {
  rating: number
  reviews: number
  photos: number
}

export interface MarketContext {
  localAvgRating: number
  localAvgReviews: number
  localAvgPhotos: number
  competitorsAnalyzed: number
  competitivePercentile: CompetitivePercentile
  marketPosition: string
}

export interface MEOInputsUsed {
  businessName?: string
  place_id?: string
  location?: string
  address?: string
  rating: number
  totalReviews: number
  photoCount: number
  hasWebsite: boolean
  hasPhone: boolean
  hasHours: boolean
  hasDescription: boolean
  hasOwnerResponses: boolean
  reviewResponseRate: number
  completenessScore: number
  categoryCanonical: string
  dominanceType?: string | null
  isFranchise: boolean
  isMajorNationalFranchise: boolean
  isRegionalFranchise: boolean
}

export interface MEOBreakdown {
  scoringVersion: string
  baseScore: number
  ratingPoints: number
  reviewPoints: number
  photoPoints: number
  infoPoints: number
  engagementPoints: number
  competitivePoints: number
  franchiseBoostPoints: number
  rawScoreBeforeCap: number
  reviewReliabilityCap: number | null
  wasCapped: boolean
  capReason: string | null
  finalScore: number
}

export interface ComponentScore {
  value: unknown
  points: number
  maxPoints: number
  normalizedScore?: number
}

export interface ScoringBreakdown {
  baseScore: number
  profile: number
  reviews: number
  visuals: number
  engagement: number
  visibility: number
  competitive: number
  rawScore: number
  finalScore: number
  reviewReliabilityCapApplied: boolean
  reviewReliabilityCap: number | null
  wasCapped: boolean
  capReason: string | null
  rawScoreBeforeCap?: number
  categoryWeights: CategoryWeights
  components?: Record<string, ComponentScore>
}

export interface MEOScanResponse {
  body: {
    status: 'completed' | 'error'
    scope: 'local'
    businessName: string
    place_id: string
    category: string
    categoryCanonical: string
    categoryConfidence: number
    isFranchise: boolean
    isMajorNationalFranchise: boolean
    isFastFood: boolean
    isLocalLeader: boolean
    isPerfectProfile: boolean
    dominanceType: string | null
    rating: number
    totalReviews: number
    photoCount: number
    hasWebsite: boolean
    hasPhone: boolean
    hasHours: boolean
    hasDescription: boolean
    completenessScore: number
    reviewResponseRate: number
    hasOwnerResponses: boolean
    meoScore: number
    grade: string
    confidence: string
    scoringBreakdown: ScoringBreakdown
    marketContext: MarketContext
    gradeRationale: string
    deficiencies: string[]
    bonuses: string[]
    optimizationTips: string[]
    growthPath: string[]
    gbpFacts: MEOInputsUsed
    meoInputsUsed: MEOInputsUsed
    meoBreakdown: MEOBreakdown
    meoWhy: string[]
    profileSignals?: unknown
    scoreReasons?: unknown
    why: string[]
    calculatedAt: string
    scoringVersion: string
    runId: string
    debugStamp: string
    /** Warnings generated during scoring (e.g. competitive data unavailable) */
    scoringWarnings?: string[]
    /** Whether this score includes real competitive context or was computed without it */
    competitiveDataAvailable?: boolean
  }
}

export interface FranchiseDetectionResult {
  isFranchise: boolean
  isMajorNationalFranchise: boolean
  isRegionalFranchise: boolean
  isFastFood: boolean
  franchiseType: 'local' | 'regional' | 'national' | null
  franchiseBoost: number
}

export const SCORING_VERSION = 'v10.1'

export const GRADE_THRESHOLDS = {
  'A+': 95, A: 90, 'A-': 85, 'B+': 80, B: 75, 'B-': 70,
  'C+': 65, C: 60, 'C-': 55, 'D+': 50, D: 45, 'D-': 40, F: 0,
} as const

export const CONFIDENCE_LEVELS = {
  HIGH: 'high',
  MEDIUM_HIGH: 'medium-high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const
