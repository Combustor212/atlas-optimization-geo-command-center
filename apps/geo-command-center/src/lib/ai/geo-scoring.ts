/**
 * AI-Powered GEO Score Analysis
 * 
 * Uses OpenAI GPT-4 to analyze local search visibility and provide accurate GEO scores
 * based on multiple factors including:
 * - Map pack rankings
 * - Organic rankings
 * - Review count & quality
 * - Rating trends
 * - Competitive analysis
 * - Local search signals
 */

import OpenAI from 'openai'

export interface GeoScoreFactors {
  // Ranking Data
  mapPackPosition?: number | null
  organicPosition?: number | null
  previousMapPackPosition?: number | null
  previousOrganicPosition?: number | null
  
  // Business Profile Data
  rating?: number | null
  totalReviews?: number | null
  averageReviewAge?: number | null // in days
  
  // Competitive Data
  topCompetitorRating?: number | null
  topCompetitorReviews?: number | null
  totalCompetitors?: number | null
  
  // Location Data
  businessName: string
  keyword: string
  city?: string
  state?: string
  
  // Additional Signals
  hasPhotos?: boolean
  hasWebsite?: boolean
  isVerified?: boolean
  responseRate?: number | null // percentage
  responseTime?: string | null
}

export interface GeoScoreResult {
  score: number // 0-100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F'
  trend: 'improving' | 'stable' | 'declining' | 'unknown'
  analysis: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
  }
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low'
    action: string
    impact: string
    effort: 'easy' | 'moderate' | 'difficult'
  }>
  breakdown: {
    rankingScore: number // 0-40 points
    profileScore: number // 0-30 points
    competitiveScore: number // 0-20 points
    signalsScore: number // 0-10 points
  }
  confidence: number // 0-100, how confident the AI is in this assessment
}

/**
 * Get OpenAI client
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  
  return new OpenAI({
    apiKey,
  })
}

/**
 * Calculate base scores from raw data
 */
function calculateBaseScores(factors: GeoScoreFactors) {
  // Ranking Score (0-40 points)
  let rankingScore = 0
  if (factors.mapPackPosition) {
    // Map pack is most important for local search
    if (factors.mapPackPosition === 1) rankingScore += 30
    else if (factors.mapPackPosition === 2) rankingScore += 25
    else if (factors.mapPackPosition === 3) rankingScore += 20
    else if (factors.mapPackPosition <= 5) rankingScore += 15
    else if (factors.mapPackPosition <= 10) rankingScore += 10
    else rankingScore += 5
  }
  
  if (factors.organicPosition) {
    // Organic adds supplementary value
    if (factors.organicPosition <= 3) rankingScore += 10
    else if (factors.organicPosition <= 10) rankingScore += 5
    else if (factors.organicPosition <= 20) rankingScore += 2
  }
  
  // Profile Score (0-30 points)
  let profileScore = 0
  if (factors.rating) {
    const ratingScore = (factors.rating / 5) * 15
    profileScore += ratingScore
  }
  
  if (factors.totalReviews) {
    // Logarithmic scale for reviews
    const reviewScore = Math.min(15, Math.log10(factors.totalReviews + 1) * 5)
    profileScore += reviewScore
  }
  
  // Competitive Score (0-20 points)
  let competitiveScore = 10 // baseline
  if (factors.rating && factors.topCompetitorRating) {
    if (factors.rating > factors.topCompetitorRating) competitiveScore += 5
    else if (factors.rating < factors.topCompetitorRating) competitiveScore -= 5
  }
  
  if (factors.totalReviews && factors.topCompetitorReviews) {
    if (factors.totalReviews > factors.topCompetitorReviews) competitiveScore += 5
    else if (factors.totalReviews < factors.topCompetitorReviews) competitiveScore -= 5
  }
  
  competitiveScore = Math.max(0, Math.min(20, competitiveScore))
  
  // Signals Score (0-10 points)
  let signalsScore = 0
  if (factors.hasPhotos) signalsScore += 2
  if (factors.hasWebsite) signalsScore += 2
  if (factors.isVerified) signalsScore += 3
  if (factors.responseRate && factors.responseRate > 90) signalsScore += 2
  else if (factors.responseRate && factors.responseRate > 50) signalsScore += 1
  
  return {
    rankingScore,
    profileScore,
    competitiveScore,
    signalsScore,
  }
}

/**
 * Determine grade from score
 */
function getGradeFromScore(score: number): GeoScoreResult['grade'] {
  if (score >= 95) return 'A+'
  if (score >= 90) return 'A'
  if (score >= 85) return 'B+'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C+'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

/**
 * Determine trend from historical data
 */
function getTrend(factors: GeoScoreFactors): GeoScoreResult['trend'] {
  if (!factors.previousMapPackPosition && !factors.previousOrganicPosition) {
    return 'unknown'
  }
  
  let trendScore = 0
  
  if (factors.mapPackPosition && factors.previousMapPackPosition) {
    trendScore += factors.previousMapPackPosition - factors.mapPackPosition
  }
  
  if (factors.organicPosition && factors.previousOrganicPosition) {
    trendScore += factors.previousOrganicPosition - factors.organicPosition
  }
  
  if (trendScore > 0) return 'improving'
  if (trendScore < 0) return 'declining'
  return 'stable'
}

/**
 * Use AI to generate comprehensive analysis and recommendations
 */
async function generateAIAnalysis(
  factors: GeoScoreFactors,
  baseScore: number,
  breakdown: GeoScoreResult['breakdown']
): Promise<Pick<GeoScoreResult, 'analysis' | 'recommendations' | 'confidence'>> {
  const client = getOpenAIClient()
  
  const prompt = `You are a local SEO expert analyzing a business's local search performance. Provide a comprehensive SWOT analysis and actionable recommendations.

Business Details:
- Name: ${factors.businessName}
- Target Keyword: ${factors.keyword}
- Location: ${factors.city ? `${factors.city}, ${factors.state}` : 'Not specified'}

Performance Metrics:
- Map Pack Position: ${factors.mapPackPosition ?? 'Not ranked'}
- Previous Map Pack: ${factors.previousMapPackPosition ?? 'N/A'}
- Organic Position: ${factors.organicPosition ?? 'Not ranked'}
- Rating: ${factors.rating ? `${factors.rating}/5` : 'N/A'}
- Total Reviews: ${factors.totalReviews ?? 'N/A'}
- Has Photos: ${factors.hasPhotos ? 'Yes' : 'No'}
- Has Website: ${factors.hasWebsite ? 'Yes' : 'No'}
- Is Verified: ${factors.isVerified ? 'Yes' : 'No'}

Competitive Context:
- Total Competitors: ${factors.totalCompetitors ?? 'Unknown'}
- Top Competitor Rating: ${factors.topCompetitorRating ?? 'Unknown'}
- Top Competitor Reviews: ${factors.topCompetitorReviews ?? 'Unknown'}

Score Breakdown:
- Ranking Score: ${breakdown.rankingScore}/40
- Profile Score: ${breakdown.profileScore}/30
- Competitive Score: ${breakdown.competitiveScore}/20
- Signals Score: ${breakdown.signalsScore}/10
- Total Score: ${baseScore}/100

Provide your response in the following JSON format:
{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "threats": ["threat 1", "threat 2"],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "Clear, actionable step",
      "impact": "Expected outcome/benefit",
      "effort": "easy|moderate|difficult"
    }
  ],
  "confidence": 85
}

Guidelines:
- Be specific and actionable in recommendations
- Prioritize quick wins (high impact, low effort) as high priority
- Consider local SEO best practices
- Focus on factors that actually impact local search rankings
- Confidence should reflect data quality (more data = higher confidence)
- Provide 3-5 recommendations max, ranked by priority`

  try {
    // Use gpt-4o-mini for ~2-3x faster response (vs gpt-4o) with comparable quality for structured analysis
    const model = process.env.GEO_SCORE_OPENAI_MODEL || 'gpt-4o-mini'
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert local SEO consultant specializing in Google Business Profile optimization and local pack rankings. Provide data-driven, actionable insights.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    })
    
    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }
    
    const result = JSON.parse(content)
    
    return {
      analysis: {
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        opportunities: result.opportunities || [],
        threats: result.threats || [],
      },
      recommendations: result.recommendations || [],
      confidence: result.confidence || 75,
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    
    // Fallback to rule-based analysis if AI fails
    return {
      analysis: {
        strengths: generateFallbackStrengths(factors),
        weaknesses: generateFallbackWeaknesses(factors),
        opportunities: generateFallbackOpportunities(factors),
        threats: generateFallbackThreats(factors),
      },
      recommendations: generateFallbackRecommendations(factors),
      confidence: 60,
    }
  }
}

/**
 * Fallback analysis generators (used if AI API fails)
 */
function generateFallbackStrengths(factors: GeoScoreFactors): string[] {
  const strengths: string[] = []
  
  if (factors.mapPackPosition && factors.mapPackPosition <= 3) {
    strengths.push(`Strong map pack presence at position #${factors.mapPackPosition}`)
  }
  
  if (factors.rating && factors.rating >= 4.5) {
    strengths.push(`Excellent customer rating of ${factors.rating}/5`)
  }
  
  if (factors.totalReviews && factors.totalReviews >= 50) {
    strengths.push(`Good review volume with ${factors.totalReviews} reviews`)
  }
  
  if (factors.isVerified) {
    strengths.push('Verified business profile')
  }
  
  return strengths.length > 0 ? strengths : ['Business is indexed in local search']
}

function generateFallbackWeaknesses(factors: GeoScoreFactors): string[] {
  const weaknesses: string[] = []
  
  if (!factors.mapPackPosition || factors.mapPackPosition > 10) {
    weaknesses.push('Not ranking in top map pack positions')
  }
  
  if (!factors.rating || factors.rating < 4.0) {
    weaknesses.push('Rating below competitive threshold')
  }
  
  if (!factors.totalReviews || factors.totalReviews < 10) {
    weaknesses.push('Insufficient review count')
  }
  
  if (!factors.hasPhotos) {
    weaknesses.push('Missing business photos')
  }
  
  // Always return at least one weakness if array is empty
  if (weaknesses.length === 0) {
    weaknesses.push('Room for improvement in local search optimization')
  }
  
  return weaknesses
}

function generateFallbackOpportunities(factors: GeoScoreFactors): string[] {
  const opportunities: string[] = []
  
  if (!factors.totalReviews || factors.totalReviews < 50) {
    opportunities.push('Implement review generation campaign')
  }
  
  if (!factors.hasPhotos) {
    opportunities.push('Add high-quality business photos')
  }
  
  if (!factors.hasWebsite) {
    opportunities.push('Add website to business profile')
  }
  
  if (factors.mapPackPosition && factors.mapPackPosition > 3) {
    opportunities.push('Optimize for higher map pack ranking')
  }
  
  // Always return at least one opportunity
  if (opportunities.length === 0) {
    opportunities.push('Continue monitoring and optimizing local search presence')
  }
  
  return opportunities
}

function generateFallbackThreats(factors: GeoScoreFactors): string[] {
  const threats: string[] = []
  
  if (factors.topCompetitorRating && factors.rating && factors.topCompetitorRating > factors.rating) {
    threats.push('Competitors have higher ratings')
  }
  
  if (factors.topCompetitorReviews && factors.totalReviews && factors.topCompetitorReviews > factors.totalReviews * 2) {
    threats.push('Competitors have significantly more reviews')
  }
  
  if (factors.totalCompetitors && factors.totalCompetitors > 10) {
    threats.push('High competition in local market')
  }
  
  // Always return at least one threat
  if (threats.length === 0) {
    threats.push('Monitor competitor activity regularly')
  }
  
  return threats
}

function generateFallbackRecommendations(factors: GeoScoreFactors): GeoScoreResult['recommendations'] {
  const recommendations: GeoScoreResult['recommendations'] = []
  
  if (!factors.totalReviews || factors.totalReviews < 20) {
    recommendations.push({
      priority: 'high',
      action: 'Launch a review request campaign to existing customers',
      impact: 'Increase review count, boost credibility and rankings',
      effort: 'easy',
    })
  }
  
  if (!factors.hasPhotos) {
    recommendations.push({
      priority: 'high',
      action: 'Upload 10-15 high-quality photos of your business',
      impact: 'Improve profile completeness and customer engagement',
      effort: 'easy',
    })
  }
  
  if (!factors.mapPackPosition || factors.mapPackPosition > 5) {
    recommendations.push({
      priority: 'high',
      action: 'Optimize Google Business Profile with relevant keywords',
      impact: 'Improve map pack rankings and local visibility',
      effort: 'moderate',
    })
  }
  
  if (factors.rating && factors.rating < 4.5) {
    recommendations.push({
      priority: 'medium',
      action: 'Implement customer service improvements to boost ratings',
      impact: 'Higher ratings lead to better rankings and more conversions',
      effort: 'moderate',
    })
  }
  
  if (!factors.hasWebsite) {
    recommendations.push({
      priority: 'medium',
      action: 'Add or update website URL in business profile',
      impact: 'Provide more information and build trust with customers',
      effort: 'easy',
    })
  }
  
  // Always return at least one recommendation
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'medium',
      action: 'Continue tracking rankings and monitoring performance',
      impact: 'Stay informed about local search visibility changes',
      effort: 'easy',
    })
  }
  
  return recommendations
}

/**
 * Calculate comprehensive AI-powered GEO score
 */
export async function calculateGeoScore(factors: GeoScoreFactors): Promise<GeoScoreResult> {
  // Calculate base scores
  const breakdown = calculateBaseScores(factors)
  const baseScore = Math.round(
    breakdown.rankingScore +
    breakdown.profileScore +
    breakdown.competitiveScore +
    breakdown.signalsScore
  )
  
  // Get AI-powered analysis
  const aiAnalysis = await generateAIAnalysis(factors, baseScore, breakdown)
  
  // Determine grade and trend
  const grade = getGradeFromScore(baseScore)
  const trend = getTrend(factors)
  
  return {
    score: baseScore,
    grade,
    trend,
    analysis: aiAnalysis.analysis,
    recommendations: aiAnalysis.recommendations,
    breakdown,
    confidence: aiAnalysis.confidence,
  }
}

/**
 * Batch calculate scores for multiple locations
 */
export async function calculateBatchGeoScores(
  factorsArray: GeoScoreFactors[]
): Promise<GeoScoreResult[]> {
  // Calculate in parallel for better performance
  return Promise.all(factorsArray.map(factors => calculateGeoScore(factors)))
}
