/**
 * POST /api/meo/scan — Production scan endpoint (Geo Command Center)
 *
 * Fully replaces the MGO backend. Runs:
 *  - Real competitive MEO scoring (Places nearbysearch + full algorithm)
 *  - GEO AI visibility (OpenAI prompts vs real competitor set)
 *  - Lead capture to Supabase
 *
 * Overall score = Math.round((meoScore + geoScore) / 2)  — matches MGO backend
 */

// Force Node.js runtime — required for OpenAI SDK, Google Places, and Supabase
export const runtime = 'nodejs'
// Never cache scan results — every scan must use fresh data
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { runGeoAIVisibility } from '@/lib/geo/aiVisibility'
import { calculateMEOScore } from '@/lib/meo/mgo/meoEngine'
import type { PlaceDetails } from '@/lib/meo/mgo/meoEngine'
import { fireScanEmails } from '@/lib/email/scanEmails'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  // Scan results must never be cached — each scan is unique to the business scanned
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
}

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY
const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place'

// ─── Priority recommendation system ─────────────────────────────────────────

type ImpactLevel = 'high' | 'medium' | 'low'
type EffortLevel = 'low' | 'medium' | 'high'

export interface PrioritizedRecommendation {
  title: string
  description: string
  impact: ImpactLevel
  effort: EffortLevel
  priorityScore: number
  category: string
  source: 'meo' | 'geo'
}

const PRIORITY_MATRIX: Record<ImpactLevel, Record<EffortLevel, number>> = {
  high:   { low: 95, medium: 80, high: 65 },
  medium: { low: 75, medium: 55, high: 40 },
  low:    { low: 55, medium: 35, high: 15 },
}

function inferImpactAndEffort(
  text: string,
  source: 'meo' | 'geo'
): { impact: ImpactLevel; effort: EffortLevel; category: string } {
  const t = text.toLowerCase()

  // High-impact, low-effort signals
  if (t.includes('phone') || t.includes('hours') || t.includes('address'))
    return { impact: 'high', effort: 'low', category: 'profile' }
  if (t.includes('respond') || t.includes('reply') || t.includes('response'))
    return { impact: 'high', effort: 'low', category: 'reviews' }
  if (t.includes('description') || t.includes('category'))
    return { impact: 'medium', effort: 'low', category: 'profile' }

  // High-impact, medium-effort
  if (t.includes('review') || t.includes('rating'))
    return { impact: 'high', effort: 'medium', category: 'reviews' }
  if (t.includes('website') || t.includes('content') || t.includes('schema'))
    return { impact: 'high', effort: 'medium', category: 'content' }
  if (t.includes('entity') || t.includes('citation') || t.includes('directory'))
    return { impact: 'medium', effort: 'medium', category: 'authority' }

  // Medium-impact signals
  if (t.includes('photo') || t.includes('image') || t.includes('visual'))
    return { impact: 'medium', effort: 'medium', category: 'photos' }
  if (t.includes('post') || t.includes('engag') || t.includes('social'))
    return { impact: 'medium', effort: 'low', category: 'engagement' }
  if (t.includes('ai') || t.includes('openai') || t.includes('chatgpt') || t.includes('perplexity'))
    return { impact: 'high', effort: 'high', category: 'ai_visibility' }
  if (t.includes('faq') || t.includes('structured') || t.includes('markup'))
    return { impact: 'medium', effort: 'high', category: 'content' }
  if (t.includes('competitor') || t.includes('market'))
    return { impact: 'low', effort: 'high', category: 'competitive' }

  // Source-specific defaults
  if (source === 'geo') return { impact: 'medium', effort: 'medium', category: 'ai_visibility' }
  return { impact: 'low', effort: 'medium', category: 'profile' }
}

function buildPrioritizedRecommendations(
  meoTips: string[],
  meoDeficiencies: string[],
  geoRecs: string[],
  geoDeficiencies: string[]
): PrioritizedRecommendation[] {
  const recs: PrioritizedRecommendation[] = []

  const addRec = (text: string, source: 'meo' | 'geo', isDeficiency = false) => {
    if (!text?.trim()) return
    const { impact, effort, category } = inferImpactAndEffort(text, source)
    // Deficiencies get a small impact boost — they're active problems
    const effectiveImpact: ImpactLevel = isDeficiency && impact === 'low' ? 'medium' : impact
    recs.push({
      title: text.length > 60 ? text.slice(0, 57) + '...' : text,
      description: text,
      impact: effectiveImpact,
      effort,
      priorityScore: PRIORITY_MATRIX[effectiveImpact][effort],
      category,
      source,
    })
  }

  meoDeficiencies.forEach((d) => addRec(d, 'meo', true))
  geoDeficiencies.forEach((d) => addRec(d, 'geo', true))
  meoTips.forEach((t) => addRec(t, 'meo', false))
  geoRecs.forEach((r) => addRec(r, 'geo', false))

  // Deduplicate by title, keep highest priorityScore
  const seen = new Map<string, PrioritizedRecommendation>()
  for (const rec of recs) {
    const key = rec.title.toLowerCase().slice(0, 40)
    const existing = seen.get(key)
    if (!existing || rec.priorityScore > existing.priorityScore) seen.set(key, rec)
  }

  return [...seen.values()].sort((a, b) => b.priorityScore - a.priorityScore)
}

// ─── Score guards ──────────────────────────────────────────────────────────

/**
 * Compute overall score with full guards:
 * - NaN / null → fallback to the other score
 * - Both missing → return null (caller should handle as error)
 * - Clamp 0–100
 */
function computeOverallScore(meo: number | null, geo: number | null): number | null {
  const meoValid = typeof meo === 'number' && isFinite(meo)
  const geoValid = typeof geo === 'number' && isFinite(geo)

  if (!meoValid && !geoValid) return null
  if (!meoValid) return Math.max(0, Math.min(100, Math.round(geo!)))
  if (!geoValid) return Math.max(0, Math.min(100, Math.round(meo!)))

  return Math.max(0, Math.min(100, Math.round((meo! + geo!) / 2)))
}

// ─── Places API helpers with timeouts ─────────────────────────────────────

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

async function findPlaceFromText(query: string): Promise<string | null> {
  if (!API_KEY) {
    console.warn('[MEO Scan] No Google API key — cannot resolve place')
    return null
  }
  const url = new URL(`${PLACES_BASE}/findplacefromtext/json`)
  url.searchParams.set('input', query)
  url.searchParams.set('inputtype', 'textquery')
  url.searchParams.set('fields', 'place_id,name,formatted_address')
  url.searchParams.set('key', API_KEY)

  try {
    const res = await fetchWithTimeout(url.toString(), 8000)
    if (!res.ok) {
      console.error('[MEO Scan] findplacefromtext HTTP error:', res.status)
      return null
    }
    const data = await res.json()
    if (data.status === 'OK' && data.candidates?.[0]) {
      console.log('[MEO Scan] Place resolved:', data.candidates[0].place_id)
      return data.candidates[0].place_id
    }
    console.warn('[MEO Scan] findplacefromtext status:', data.status)
    return null
  } catch (err) {
    console.error('[MEO Scan] findplacefromtext failed:', err)
    return null
  }
}

async function getPlaceDetails(placeId: string): Promise<Record<string, unknown> | null> {
  if (!API_KEY) {
    console.warn('[MEO Scan] No Google API key — cannot fetch place details')
    return null
  }
  const url = new URL(`${PLACES_BASE}/details/json`)
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('key', API_KEY)
  // geometry is REQUIRED for competitive MEO scoring (lat/lng for nearbysearch)
  url.searchParams.set(
    'fields',
    'place_id,name,formatted_address,formatted_phone_number,international_phone_number,' +
      'website,geometry,rating,user_ratings_total,opening_hours,photos,types,editorial_summary'
  )

  try {
    const res = await fetchWithTimeout(url.toString(), 8000)
    if (!res.ok) {
      console.error('[MEO Scan] getPlaceDetails HTTP error:', res.status)
      return null
    }
    const data = await res.json()
    if (data.status !== 'OK') {
      console.warn('[MEO Scan] getPlaceDetails status:', data.status, data.error_message)
      return null
    }
    console.log('[MEO Scan] Place details fetched for:', data.result?.name)
    return data.result
  } catch (err) {
    console.error('[MEO Scan] getPlaceDetails failed:', err)
    return null
  }
}

// ─── Place shape adapter ───────────────────────────────────────────────────

/**
 * Map Places API result → PlaceDetails for meoEngine.
 * Handles both legacy Places API (geometry.location.lat/lng) and
 * Places API New (location.latitude/longitude).
 */
function mapToPlaceDetails(raw: Record<string, unknown>): PlaceDetails {
  const geoLegacy = raw.geometry as { location?: { lat: number; lng: number } } | undefined
  const geoNew = raw.location as { latitude?: number; longitude?: number } | undefined
  const lat = geoLegacy?.location?.lat ?? (typeof geoNew?.latitude === 'number' ? geoNew.latitude : undefined)
  const lng = geoLegacy?.location?.lng ?? (typeof geoNew?.longitude === 'number' ? geoNew.longitude : undefined)

  const openingHours = raw.opening_hours as { weekday_text?: string[] } | undefined
  const photos = (raw.photos as unknown[]) || []

  return {
    place_id: String(raw.place_id ?? ''),
    name: raw.name as string | undefined,
    formatted_address: raw.formatted_address as string | undefined,
    geometry:
      typeof lat === 'number' && typeof lng === 'number'
        ? { location: { lat, lng } }
        : undefined,
    website: raw.website as string | undefined,
    rating: typeof raw.rating === 'number' ? raw.rating : undefined,
    user_ratings_total:
      typeof raw.user_ratings_total === 'number' ? raw.user_ratings_total : undefined,
    opening_hours: openingHours?.weekday_text ? { weekday_text: openingHours.weekday_text } : undefined,
    // Each photo object has photo_reference — array length = photo count used by meoEngine
    photos: photos.map((p) =>
      typeof p === 'object' && p && 'photo_reference' in p
        ? { photo_reference: (p as { photo_reference?: string }).photo_reference }
        : { photo_reference: 'unknown' }
    ),
    types: Array.isArray(raw.types) ? (raw.types as string[]) : undefined,
    formatted_phone_number: raw.formatted_phone_number as string | undefined,
    international_phone_number: raw.international_phone_number as string | undefined,
  }
}

// computeMEOScoreFallback removed — the MEO engine now handles competitive analysis failure
// gracefully by scoring with competitive component = 0 and adding a scoringWarning.
// Returning a fake completeness-only score capped at 75 was masking real engine errors
// and causing many businesses to appear identical.

// ─── Environment validation ────────────────────────────────────────────────

interface EnvCheck {
  googleKey: string | null
  openaiKey: string | null
  supabaseUrl: string | null
  supabaseKey: string | null
  warnings: string[]
}

function checkEnvironment(): EnvCheck {
  const warnings: string[] = []
  const googleKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || null
  const openaiKey = process.env.OPENAI_API_KEY || null
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null

  if (!googleKey) warnings.push('GOOGLE_PLACES_API_KEY / GOOGLE_MAPS_API_KEY missing — MEO scoring and competitor fetch will be degraded')
  if (!openaiKey) warnings.push('OPENAI_API_KEY missing — GEO AI visibility will not run')
  if (!supabaseUrl) warnings.push('NEXT_PUBLIC_SUPABASE_URL missing — lead capture will fail')
  if (!supabaseKey) warnings.push('SUPABASE_SERVICE_ROLE_KEY missing — lead capture will fail')

  if (warnings.length > 0) {
    console.warn('[MEO Scan] Environment warnings:\n' + warnings.map((w) => `  - ${w}`).join('\n'))
  }

  return { googleKey, openaiKey, supabaseUrl, supabaseKey, warnings }
}

// ─── Route handlers ────────────────────────────────────────────────────────

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  const scanStart = Date.now()
  const timings: Record<string, number> = {}
  const env = checkEnvironment()

  console.log('[MEO Scan] ===== SCAN START =====', new Date().toISOString())

  try {
    const body = await req.json()
    const businessName: string = body.businessName || body.business_name || ''
    const location: string = body.location || ''
    let placeId: string = body.place_id || ''

    if (!businessName && !placeId) {
      return NextResponse.json(
        { error: 'businessName or place_id required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // ── 1. Resolve place_id ────────────────────────────────────────────────
    const placeResolveStart = Date.now()
    if (!placeId) {
      const query = `${businessName}, ${location}`.trim()
      console.log('[MEO Scan] Resolving place for:', query)
      const found = await findPlaceFromText(query)
      if (!found) {
        return NextResponse.json(
          { error: 'Place not found', message: `Could not find: ${query}` },
          { status: 404, headers: CORS_HEADERS }
        )
      }
      placeId = found
    }
    timings.placeResolve = Date.now() - placeResolveStart

    // ── 2. Fetch full place details (geometry required for competitive MEO) ─
    const placeDetailStart = Date.now()
    const place = await getPlaceDetails(placeId)
    timings.placeDetail = Date.now() - placeDetailStart

    if (!place) {
      return NextResponse.json(
        { error: 'Place details not found', details: { place_id: placeId } },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    const locationStr = location.trim() || (place.formatted_address as string) || ''
    const clientPhotoCount = typeof body.photoCount === 'number' ? body.photoCount : null
    const placePhotoCount = clientPhotoCount ?? (place.photos as unknown[] | undefined)?.length ?? 0

    // ── 3. MEO Scoring ────────────────────────────────────────────────────
    const meoStart = Date.now()
    console.log('[MEO Scan] Starting MEO scoring...')

    let meoScore: number | null = null
    let meoExplain: Awaited<ReturnType<typeof calculateMEOScore>>['body'] | null = null
    let meoError: string | undefined

    if (env.googleKey) {
      try {
        const placeDetails = mapToPlaceDetails(place)
        console.log('[MEO Scan] MEO inputs:', {
          place_id: placeDetails.place_id,
          name: placeDetails.name,
          hasGeometry: !!placeDetails.geometry?.location,
          lat: placeDetails.geometry?.location?.lat,
          lng: placeDetails.geometry?.location?.lng,
          hasAddress: !!placeDetails.formatted_address,
          rating: placeDetails.rating,
          totalReviews: placeDetails.user_ratings_total,
          hasTypes: !!placeDetails.types?.length,
          types: placeDetails.types?.slice(0, 3),
          photoCount: placeDetails.photos?.length ?? 0,
          hasWebsite: !!placeDetails.website,
          hasPhone: !!(placeDetails.formatted_phone_number || placeDetails.international_phone_number),
          hasHours: !!(placeDetails.opening_hours?.weekday_text?.length),
        })
        const meoResult = await calculateMEOScore(businessName, locationStr, placeDetails)
        if (meoResult.body.status === 'error') {
          // Hard engine errors (missing address, geometry, rating, types) — cannot score
          console.error('[MEO Scan] MEO engine hard error:', meoResult.body.gradeRationale)
          meoError = meoResult.body.gradeRationale
          // meoScore stays null — do not substitute a fake score
        } else {
          meoScore = meoResult.body.meoScore
          meoExplain = meoResult.body
          console.log('[MEO Scan] MEO score:', meoScore, {
            competitiveDataAvailable: meoResult.body.competitiveDataAvailable,
            wasCapped: meoResult.body.scoringBreakdown?.wasCapped,
            grade: meoResult.body.grade,
            warnings: meoResult.body.scoringWarnings,
            breakdown: {
              base: meoResult.body.scoringBreakdown?.baseScore,
              profile: meoResult.body.scoringBreakdown?.profile,
              reviews: meoResult.body.scoringBreakdown?.reviews,
              visuals: meoResult.body.scoringBreakdown?.visuals,
              engagement: meoResult.body.scoringBreakdown?.engagement,
              competitive: meoResult.body.scoringBreakdown?.competitive,
              rawBeforeCap: meoResult.body.scoringBreakdown?.rawScore,
            },
          })
        }
      } catch (err) {
        console.error('[MEO Scan] MEO scoring threw:', err)
        meoError = err instanceof Error ? err.message : 'MEO engine threw unexpectedly'
        // meoScore stays null — exception means no reliable score
      }
    } else {
      console.warn('[MEO Scan] No Google API key — MEO scoring unavailable')
      meoError = 'Google Places API key not configured — MEO scoring requires Google Places'
      // meoScore stays null — cannot score without Places API
    }

    timings.meo = Date.now() - meoStart
    console.log(`[MEO Scan] MEO done in ${timings.meo}ms — score: ${meoScore ?? 'null (failed)'}`)

    // ── 4. GEO AI Visibility ──────────────────────────────────────────────
    const geoStart = Date.now()
    console.log('[MEO Scan] Starting GEO AI visibility...')

    // GEO score starts as null — it MUST be computed from real AI analysis.
    // Never default to MEO score; that would make both scores identical when GEO fails.
    let geoScore: number | null = null
    let geoExplain: Awaited<ReturnType<typeof runGeoAIVisibility>> = null
    let geoError: string | undefined

    if (env.openaiKey) {
      try {
        geoExplain = await runGeoAIVisibility(place, locationStr, env.openaiKey, {
          googlePlacesApiKey: env.googleKey ?? undefined,
        })
        if (geoExplain) {
          geoScore = geoExplain.geoScore
          console.log('[MEO Scan] GEO score:', geoScore, {
            grade: geoExplain.grade,
            authorityScore: geoExplain.authorityScore,
            contentDepth: geoExplain.contentDepth,
            reviewAuthority: geoExplain.reviewAuthority,
            entityConsistency: geoExplain.entityConsistency,
            answerability: geoExplain.answerability,
            aiVisibilityProbability: geoExplain.aiVisibilityProbability,
            queriesTested: geoExplain.queriesTested,
            mentionsDetected: geoExplain.mentionsDetected,
            competitorCount: geoExplain.competitorGeoScores?.length ?? 0,
          })
        } else {
          geoError = 'GEO AI visibility returned null — LLM output was invalid or unparseable'
          console.error('[MEO Scan] GEO AI visibility returned null — geoScore will be null')
        }
      } catch (err) {
        console.error('[MEO Scan] GEO AI visibility failed:', err)
        geoError = err instanceof Error ? err.message : 'GEO AI visibility threw unexpectedly'
      }
    } else {
      geoError = 'OPENAI_API_KEY not configured — GEO AI visibility requires OpenAI'
      console.warn('[MEO Scan] No OpenAI key — GEO score will be null (not copied from MEO)')
    }

    timings.geo = Date.now() - geoStart
    console.log(`[MEO Scan] GEO done in ${timings.geo}ms — score: ${geoScore ?? 'null (failed)'}`)

    // ── 5. Overall score — guarded, clamped, matches MGO backend formula ──
    // overall = Math.round((meoScore + geoScore) / 2) when both available
    // If only one is available, overall = that score (single-sided)
    // If both null, return structured error (not a fake score)
    const overallResult = computeOverallScore(meoScore, geoScore)
    if (overallResult === null) {
      console.error('[MEO Scan] Both meoScore and geoScore are null — both scoring engines failed')
      return NextResponse.json(
        {
          error: 'Scoring failed',
          message: 'Both MEO and GEO scoring engines failed to produce a score.',
          partialErrors: { meo: meoError, geo: geoError },
          place: {
            place_id: place.place_id,
            name: place.name,
            formatted_address: place.formatted_address,
          },
          meta: { timings, scanStatus: 'failed' },
        },
        { status: 500, headers: CORS_HEADERS }
      )
    }
    const overall = overallResult
    const overallBasis = meoScore !== null && geoScore !== null ? 'meo+geo' : meoScore !== null ? 'meo-only' : 'geo-only'
    console.log('[MEO Scan] Overall score:', overall, `(basis: ${overallBasis})`)

    // ── 6. Build prioritized recommendations ────────────────────────────
    const meoTips = meoExplain?.optimizationTips ?? []
    const meoDeficiencies = meoExplain?.deficiencies ?? []
    const geoRecs = geoExplain?.optimizationRecommendations ?? []
    const geoDeficiencies = geoExplain?.deficiencies ?? []
    const prioritizedRecommendations = buildPrioritizedRecommendations(
      meoTips, meoDeficiencies, geoRecs, geoDeficiencies
    )
    console.log('[MEO Scan] Priority recs built:', prioritizedRecommendations.length)

    // ── 7. Scan confidence — based on data quality and scoring completeness ──
    const competitorCount = meoExplain?.marketContext?.competitorsAnalyzed ?? 0
    const hasWebsiteForConf = !!(place.website)
    const reviewCountForConf = typeof place.user_ratings_total === 'number' ? place.user_ratings_total : 0
    const photoCountForConf = placePhotoCount

    let scanConfidence: 'high' | 'medium' | 'low' = 'low'
    {
      let confScore = 0
      if (meoExplain?.status === 'completed') confScore += 30    // full MEO engine ran
      if (geoScore !== null && geoExplain !== null) confScore += 25  // GEO AI parse succeeded
      if (competitorCount >= 3) confScore += 20    // real competitor context
      if (hasWebsiteForConf) confScore += 10       // website present (improves GEO accuracy)
      if (reviewCountForConf >= 50) confScore += 10  // sufficient reviews for reliable scoring
      if (photoCountForConf >= 5) confScore += 5   // some photos present
      if (confScore >= 75) scanConfidence = 'high'
      else if (confScore >= 40) scanConfidence = 'medium'
    }
    console.log('[MEO Scan] Scan confidence:', scanConfidence, { competitorCount, meoNull: meoScore === null, geoNull: geoScore === null })

    // ── 8. Build consistent meoBody ───────────────────────────────────────
    // When the full engine ran: meoExplain has rating/totalReviews/photoCount/marketContext.
    // When engine hard-errored: hydrate from raw place so frontend data boxes show real values.
    // Always override photoCount with the client-provided value if available (beats Places API 10-cap).
    const meoBody = meoExplain
      ? { ...meoExplain, photoCount: clientPhotoCount ?? meoExplain.photoCount }
      : {
          rating: typeof place.rating === 'number' ? place.rating : null,
          totalReviews: typeof place.user_ratings_total === 'number' ? place.user_ratings_total : null,
          photoCount: placePhotoCount,
          hasWebsite: !!place.website,
          hasPhone: !!(place.formatted_phone_number || place.international_phone_number),
          hasHours: !!(place.opening_hours),
          marketContext: null,
          optimizationTips: [],
          gbpFacts: { completenessScore: 0 },
          meoInputsUsed: {},
          debugStamp: new Date().toISOString(),
          scoringWarnings: meoError ? [`MEO scoring failed: ${meoError}`] : undefined,
        }

    const geoObject = {
      score: geoScore,
      status: geoScore !== null ? ('ok' as const) : ('error' as const),
      category: {
        key: geoExplain?.nicheLabel?.replace(/\s+/g, '_') || 'local',
        label: geoExplain?.nicheLabel || 'Local Business',
      },
      // Reflect real scan confidence rather than hardcoded 0.8
      confidence: scanConfidence === 'high' ? 0.85 : scanConfidence === 'medium' ? 0.65 : 0.4,
      explainJobId: null,
      algoVersion: 'geo-v5',
      simulationType: geoExplain?.simulationType ?? 'simulated_ai_visibility',
      simulationDisclaimer: geoExplain?.simulationDisclaimer ?? 'This result estimates likelihood of AI recommendation and is not a live ranking.',
      averageConfidenceScore: geoExplain?.averageConfidenceScore,
      competitorCount: geoExplain?.competitorGeoScores?.length ?? 0,
      explain: geoExplain ?? undefined,
      ...(geoScore === null && geoError && { error: geoError }),
    }

    const placeOut = {
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.formatted_address,
      formatted_phone_number: place.formatted_phone_number,
      international_phone_number: place.international_phone_number,
      website: place.website,
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      opening_hours: place.opening_hours,
      types: place.types,
      photoCount: placePhotoCount,
    }

    // ── 9. Lead capture — non-blocking, never breaks scan ─────────────────
    const leadStart = Date.now()
    let leadForwardStatus: string | undefined
    const email = (body.email as string)?.trim() || ''
    const phone = (body.phone as string)?.trim() || ''

    if (email || phone) {
      console.log('[MEO Scan] Starting lead capture...')
      try {
        const agencySlug = (process.env.AGS_LEADS_AGENCY_SLUG || 'my-agency').trim()
        const admin = getSupabaseAdmin()

        const scanReport = {
          scores: { meo: meoScore, geo: geoScore, overall, final: overall },
          geo: geoObject,
          body: meoBody,
          place: placeOut,
          scanConfidence,
        }

        const leadPayload = {
          source: 'scan' as const,
          name: businessName || (place.name as string),
          email: email || 'scan@lead.local',
          phone: phone || null,
          business_name: businessName || (place.name as string),
          metadata: {
            meo_score: meoScore,
            geo_score: geoScore,
            overall_score: overall,
            meoScore,
            geoScore,
            overallScore: overall,
            scanConfidence,
            address: place.formatted_address,
            place_id: placeId,
            city: (body.city as string) || undefined,
            state: (body.state as string) || undefined,
            zipCode: (body.zipCode as string) || undefined,
            country: (body.country as string) || undefined,
            website: (place.website as string) || undefined,
            scanReport,
          },
        }

        const { data: agency, error: agencyError } = await admin
          .from('agencies')
          .select('id')
          .eq('slug', agencySlug)
          .single()

        if (agencyError || !agency) {
          console.error('[MEO Scan] Agency not found for slug:', agencySlug, agencyError?.message)
          const { data: firstAgency } = await admin.from('agencies').select('id').limit(1).single()
          if (!firstAgency) {
            console.error('[MEO Scan] No agencies in DB — lead not saved')
            leadForwardStatus = 'error_no_agency'
          } else {
            console.warn('[MEO Scan] Using fallback agency:', firstAgency.id)
            await admin.from('leads').insert({
              agency_id: firstAgency.id,
              ...leadPayload,
              metadata: { ...leadPayload.metadata, agency_slug_used: agencySlug },
            })
            leadForwardStatus = 'forwarded_fallback_agency'
          }
        } else {
          await admin.from('leads').insert({ agency_id: agency.id, ...leadPayload })
          leadForwardStatus = 'forwarded'
          console.log('[MEO Scan] Lead saved under agency:', agencySlug)
        }
      } catch (err) {
        // Lead failure must NOT break the scan response
        console.error('[MEO Scan] Lead insert failed (non-fatal):', err)
        leadForwardStatus = 'error'
      }
      timings.lead = Date.now() - leadStart
    }

    // ── 10. Emails (fire-and-forget) ──────────────────────────────────────
    const userEmail: string | undefined =
      typeof (body as Record<string, unknown>).email === 'string'
        ? ((body as Record<string, unknown>).email as string).trim()
        : undefined

    if (userEmail) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://admin.atlasgrowths.com'
      const bookingUrl = process.env.NEXT_PUBLIC_BOOKING_URL || 'https://atlasgrowths.com/get-support?book=1'
      const geoSummary: string | null =
        (geoExplain as unknown as Record<string, unknown> | null)?.['summary'] as string | null
        ?? (geoExplain?.optimizationRecommendations?.[0] as string | null)
        ?? null
      const resultPayload = encodeURIComponent(
        JSON.stringify({
          meo: meoScore,
          geo: geoScore,
          overall,
          insight: geoSummary,
          businessName: placeOut?.name || '',
          address: placeOut?.formatted_address || '',
        })
      )
      const scanResultsUrl = `${appUrl}/scan-results?data=${resultPayload}`
      fireScanEmails({
        businessName: placeOut?.name || (body as Record<string, unknown>).businessName as string || '',
        email: userEmail,
        phone: placeOut?.formatted_phone_number ?? undefined,
        address: placeOut?.formatted_address ?? undefined,
        city: (body as Record<string, unknown>).city as string | undefined,
        state: (body as Record<string, unknown>).state as string | undefined,
        country: (body as Record<string, unknown>).country as string | undefined,
        meoScore: meoScore ?? 0,
        geoScore: geoScore,
        overallScore: overall ?? 0,
        insight: geoSummary,
        scanResultsUrl,
        bookingUrl,
      })
    }

    // ── 11. Response ──────────────────────────────────────────────────────
    const processingTimeMs = Date.now() - scanStart
    console.log(`[MEO Scan] ===== SCAN COMPLETE in ${processingTimeMs}ms =====`, {
      meoScore, geoScore, overall, scanConfidence, overallBasis,
    })

    const partialErrors: Record<string, string> = {}
    if (meoError) partialErrors.meo = meoError
    if (geoError) partialErrors.geo = geoError

    // Collect all scoring warnings from MEO engine
    const allScoringWarnings: string[] = [
      ...(Array.isArray(meoExplain?.scoringWarnings) ? meoExplain!.scoringWarnings! : []),
      ...(meoScore === null && meoError ? [`MEO scoring unavailable: ${meoError}`] : []),
      ...(geoScore === null && geoError ? [`GEO scoring unavailable: ${geoError}`] : []),
      ...(overallBasis !== 'meo+geo' ? [`Overall score computed from ${overallBasis} only`] : []),
    ]

    // GEO component breakdown for response
    const geoComponentBreakdown = geoExplain ? {
      authorityScore: geoExplain.authorityScore,
      contentDepth: geoExplain.contentDepth,
      reviewAuthority: geoExplain.reviewAuthority,
      entityConsistency: geoExplain.entityConsistency,
      answerability: geoExplain.answerability,
      entityStrengthScore: geoExplain.entityStrengthScore,
      entityCoverageScore: geoExplain.entityCoverageScore,
      aiVisibilityProbability: geoExplain.aiVisibilityProbability,
    } : null

    // MEO component breakdown for response
    const meoComponentBreakdown = meoExplain?.scoringBreakdown ? {
      baseScore: meoExplain.scoringBreakdown.baseScore,
      profile: meoExplain.scoringBreakdown.profile,
      reviews: meoExplain.scoringBreakdown.reviews,
      visuals: meoExplain.scoringBreakdown.visuals,
      engagement: meoExplain.scoringBreakdown.engagement,
      competitive: meoExplain.scoringBreakdown.competitive,
      rawScore: meoExplain.scoringBreakdown.rawScore,
      wasCapped: meoExplain.scoringBreakdown.wasCapped,
      reviewReliabilityCap: meoExplain.scoringBreakdown.reviewReliabilityCap,
      competitorCount,
      competitiveDataAvailable: meoExplain.competitiveDataAvailable,
    } : null

    return NextResponse.json(
      {
        success: true,
        scanVersion: 'scan-v1.2',
        geoAlgoVersion: 'geo-v5',
        scores: { meo: meoScore, geo: geoScore, overall, final: overall },
        scanConfidence,
        overallBasis,
        geo: geoObject,
        body: meoBody,
        place: placeOut,
        prioritizedRecommendations,
        // Score debug fields — helps diagnose why two businesses scored similarly
        meoComponentBreakdown,
        geoComponentBreakdown,
        scoringWarnings: allScoringWarnings.length > 0 ? allScoringWarnings : undefined,
        meta: {
          processingTimeMs,
          timings,
          scanStatus: meoScore === null && geoScore === null ? 'failed' : allScoringWarnings.length > 0 ? 'partial' : 'complete',
          leadForwardStatus,
          ...(Object.keys(partialErrors).length > 0 && { partialErrors }),
          envWarnings: env.warnings.length > 0 ? env.warnings : undefined,
        },
      },
      { headers: CORS_HEADERS }
    )
  } catch (err) {
    const processingTimeMs = Date.now() - scanStart
    console.error('[MEO Scan] Fatal scan error:', err)
    return NextResponse.json(
      {
        error: 'Scan failed',
        message: err instanceof Error ? err.message : 'Unknown error',
        meta: { processingTimeMs, timings },
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
