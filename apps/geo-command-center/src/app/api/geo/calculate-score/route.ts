import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserAgency } from '@/lib/data/profile'
import { calculateGeoScore, type GeoScoreFactors } from '@/lib/ai/geo-scoring'
import { getPlaceDetails } from '@/lib/integrations/google-places'

/**
 * POST /api/geo/calculate-score
 * 
 * Calculate AI-powered GEO score for a location
 * 
 * Body:
 * {
 *   locationId: string
 * }
 */
export async function POST(request: Request) {
  try {
    const { agencyId } = (await getCurrentUserAgency()) || {}
    if (!agencyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { locationId, forceRefresh } = body

    if (!locationId) {
      return NextResponse.json(
        { error: 'locationId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get location details
    const { data: location, error: locError } = await supabase
      .from('locations')
      .select('*, client:clients!inner(agency_id, name)')
      .eq('id', locationId)
      .single()

    if (locError || !location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Verify location belongs to user's agency
    if (location.client.agency_id !== agencyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Return cached score if calculated within last 6 hours (avoids repeated AI calls)
    type CachedScore = { overall_score: number; grade: string; trend: string; confidence: number; strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[]; recommendations: Array<{ priority: string; action: string; impact: string; effort: string }>; ranking_score: number; profile_score: number; competitive_score: number; signals_score: number; factors: Record<string, unknown>; calculated_at: string }
    let cachedScore: CachedScore | null = null
    if (!forceRefresh) {
      const cacheCutoff = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      const res = await supabase
        .from('geo_scores')
        .select('*')
        .eq('location_id', locationId)
        .gte('calculated_at', cacheCutoff)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single()
      cachedScore = res.data as CachedScore | null
    }

    if (cachedScore) {
      const scoreData = {
        score: cachedScore.overall_score,
        grade: cachedScore.grade,
        trend: cachedScore.trend,
        confidence: cachedScore.confidence,
        analysis: {
          strengths: (cachedScore.strengths as string[]) || [],
          weaknesses: (cachedScore.weaknesses as string[]) || [],
          opportunities: (cachedScore.opportunities as string[]) || [],
          threats: (cachedScore.threats as string[]) || [],
        },
        recommendations: (cachedScore.recommendations as Array<{ priority: string; action: string; impact: string; effort: string }>) || [],
        breakdown: {
          rankingScore: cachedScore.ranking_score ?? 0,
          profileScore: cachedScore.profile_score ?? 0,
          competitiveScore: cachedScore.competitive_score ?? 0,
          signalsScore: cachedScore.signals_score ?? 0,
        },
      }
      return NextResponse.json({
        success: true,
        data: {
          locationId,
          locationName: location.name,
          score: scoreData,
          factors: (cachedScore.factors as Record<string, unknown>) ?? {},
          timestamp: cachedScore.calculated_at,
          cached: true,
        },
      })
    }

    // Get ranking data (latest and previous)
    const { data: rankings } = await supabase
      .from('rankings')
      .select('*')
      .eq('location_id', locationId)
      .order('recorded_at', { ascending: false })
      .limit(10)

    const primaryRankings = rankings?.filter(r => r.keyword_type === 'primary') || []
    const latestRanking = primaryRankings[0]
    const previousRanking = primaryRankings[1]
    const keyword = latestRanking?.keyword || ''

    // Run place details and competitor rankings in parallel (both only need location + keyword)
    const [placeDetails, competitorRankingsResult] = await Promise.all([
      location.place_id && process.env.GOOGLE_PLACES_API_KEY
        ? getPlaceDetails({ apiKey: process.env.GOOGLE_PLACES_API_KEY }, location.place_id).catch((err) => {
            console.error('Failed to get place details:', err)
            return null
          })
        : Promise.resolve(null),
      supabase
        .from('rankings')
        .select('location_id')
        .eq('keyword', keyword || '')
        .neq('location_id', locationId)
        .order('recorded_at', { ascending: false })
        .limit(20)
        .then(({ data }) => data),
    ])
    const competitorRankings = competitorRankingsResult || []

    // Build factors for AI scoring
    const factors: GeoScoreFactors = {
      businessName: location.name,
      keyword: keyword || 'local search',
      city: location.city,
      state: location.state,
      mapPackPosition: latestRanking?.map_pack_position,
      organicPosition: latestRanking?.organic_position,
      previousMapPackPosition: previousRanking?.map_pack_position,
      previousOrganicPosition: previousRanking?.organic_position,
      rating: placeDetails?.rating,
      totalReviews: placeDetails?.userRatingsTotal,
      hasPhotos: (placeDetails?.photos?.length || 0) > 0,
      hasWebsite: !!placeDetails?.website,
      isVerified: !!location.place_id,
      totalCompetitors: competitorRankings.length,
    }

    // Calculate GEO score using AI
    const geoScore = await calculateGeoScore(factors)

    console.log('GEO Score calculated:', {
      score: geoScore.score,
      grade: geoScore.grade,
      hasWeaknesses: geoScore.analysis.weaknesses.length > 0,
      hasThreats: geoScore.analysis.threats.length > 0,
      hasRecommendations: geoScore.recommendations.length > 0,
      weaknessesCount: geoScore.analysis.weaknesses.length,
      threatsCount: geoScore.analysis.threats.length,
      recommendationsCount: geoScore.recommendations.length,
    })

    // Save the score to database
    const { error: insertError } = await supabase.from('geo_scores').insert({
      location_id: locationId,
      overall_score: geoScore.score,
      grade: geoScore.grade,
      trend: geoScore.trend,
      confidence: geoScore.confidence,
      ranking_score: geoScore.breakdown.rankingScore,
      profile_score: geoScore.breakdown.profileScore,
      competitive_score: geoScore.breakdown.competitiveScore,
      signals_score: geoScore.breakdown.signalsScore,
      strengths: geoScore.analysis.strengths,
      weaknesses: geoScore.analysis.weaknesses,
      opportunities: geoScore.analysis.opportunities,
      threats: geoScore.analysis.threats,
      recommendations: geoScore.recommendations,
      factors,
    })

    if (insertError) {
      console.error('Failed to save geo score:', insertError)
      // Don't fail the request if saving fails, just log it
    }

    return NextResponse.json({
      success: true,
      data: {
        locationId,
        locationName: location.name,
        score: geoScore,
        factors,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Calculate GEO score error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
