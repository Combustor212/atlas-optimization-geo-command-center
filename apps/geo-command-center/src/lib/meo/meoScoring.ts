/**
 * MEO (Maps Engine Optimization) Scoring
 *
 * Measures how strong a business is on Google Maps relative to
 * nearby competitors in the same niche.
 *
 * Never guess. Always verify signals before scoring.
 */
const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place'

// Category resolution: Google types → MEO category
const TYPE_TO_CATEGORY: Record<string, string> = {
  driving_school: 'Driving',
  cafe: 'Cafe',
  coffee_shop: 'Cafe',
  restaurant: 'Restaurant',
  meal_takeaway: 'FastFood',
  meal_delivery: 'FastFood',
  fast_food_restaurant: 'FastFood',
  dentist: 'Dental',
  gym: 'Fitness',
  lawyer: 'Law',
  real_estate_agency: 'RealEstate',
  doctor: 'Medical',
  hospital: 'Medical',
  pharmacy: 'Medical',
  barber_shop: 'Barber',
  hair_care: 'HairSalon',
  beauty_salon: 'BeautySalon',
  plumber: 'Plumbing',
  electrician: 'Electrical',
  car_repair: 'AutoRepair',
  veterinary_care: 'Veterinary',
  accounting: 'Accounting',
  insurance_agency: 'Insurance',
  moving_company: 'Moving',
  roofing_contractor: 'Roofing',
  general_contractor: 'Contractor',
  lodging: 'Hotel',
  spa: 'Spa',
}

// Known franchise brands
const FRANCHISE_BRANDS = new Set(
  [
    'starbucks', 'mcdonald', 'chipotle', 'subway', 'dunkin', 'panera',
    'wendy', 'burger king', 'taco bell', 'pizza hut', 'domino',
    'best buy', 'walmart', 'target', 'costco', 'home depot', 'lowes',
    'cvs', 'walgreens', 'kroger', 'publix', 'whole foods', 'aldi',
    'autozone', 'oreilly', 'advance auto', 'jiffy lube', 'valvoline',
  ].map((s) => s.toLowerCase())
)

export interface CompetitorSignal {
  placeId: string
  name: string
  rating: number | null
  userRatingsTotal: number | null
  photoCount?: number
}

export interface MEOScoreOutput {
  status: 'ok'
  businessName: string
  formattedAddress: string
  category: string
  rating: number | null
  totalReviews: number | null
  photoCount: number
  hasWebsite: boolean
  hasPhone: boolean
  hasHours: boolean
  isFranchise: boolean
  meoScore: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  dominanceType: string
  marketContext: {
    localAvgRating: number
    localAvgReviews: number
    localAvgPhotos: number
    competitorCount: number
    ratingPercentile: number
    reviewsPercentile: number
    photosPercentile: number
  }
  deficiencies: string[]
  optimizationTips: string[]
  scoringBreakdown: {
    profileCompleteness: number
    reviewAuthority: number
    visualPresence: number
    engagementSignals: number
    visibilitySignals: number
    competitiveAdvantage: number
    baseline: number
  }
}

function resolveCategory(placeTypes: string[] | undefined, optionalCategory?: string): string {
  if (optionalCategory?.trim()) {
    const c = optionalCategory.trim().toLowerCase()
    if (c !== 'default') return optionalCategory.trim()
  }
  if (!placeTypes?.length) return 'LocalBusiness'
  for (const t of placeTypes) {
    const cat = TYPE_TO_CATEGORY[t]
    if (cat) return cat
  }
  return 'LocalBusiness'
}

function getPrimaryTypeForSearch(placeTypes: string[] | undefined): string {
  const searchTypes = ['cafe', 'coffee_shop', 'restaurant', 'gym', 'dentist', 'lawyer', 'real_estate_agency', 'doctor', 'pharmacy', 'barber_shop', 'hair_care', 'plumber', 'electrician', 'car_repair']
  if (!placeTypes?.length) return 'establishment'
  for (const t of placeTypes) {
    if (searchTypes.includes(t)) return t
  }
  return placeTypes[0] || 'establishment'
}

function isFranchise(name: string): boolean {
  return [...FRANCHISE_BRANDS].some((b) => String(name || '').toLowerCase().includes(b))
}

async function fetchNearbyCompetitors(
  apiKey: string,
  lat: number,
  lng: number,
  placeId: string,
  primaryType: string,
  radiusMeters: number = 10000
): Promise<CompetitorSignal[]> {
  const url = new URL(`${PLACES_BASE}/nearbysearch/json`)
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('radius', radiusMeters.toString())
  url.searchParams.set('type', primaryType)
  url.searchParams.set('key', apiKey)

  const res = await fetch(url.toString())
  if (!res.ok) return []

  const data = await res.json()
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return []

  const results = (data.results || []).filter((p: { place_id?: string }) => p.place_id && p.place_id !== placeId)

  return results.slice(0, 5).map((p: { place_id: string; name: string; rating?: number; user_ratings_total?: number }) => ({
    placeId: p.place_id,
    name: p.name,
    rating: p.rating ?? null,
    userRatingsTotal: p.user_ratings_total ?? null,
    photoCount: 0,
  }))
}

function computePercentile(value: number, values: number[]): number {
  if (values.length === 0) return 50
  const sorted = [...values].sort((a, b) => a - b)
  const rank = sorted.filter((v) => v <= value).length
  return Math.round((rank / (sorted.length + 1)) * 100)
}

export async function computeMEOScore(
  place: Record<string, unknown>,
  apiKey: string,
  optionalCategory?: string
): Promise<MEOScoreOutput | null> {
  if (!apiKey?.trim()) return null

  const geometry = place.geometry as { location?: { lat: number; lng: number } } | undefined
  const lat = geometry?.location?.lat
  const lng = geometry?.location?.lng
  if (lat == null || lng == null) return null

  const placeId = place.place_id as string
  const types = (place.types as string[]) || []
  const category = resolveCategory(types, optionalCategory)
  const primaryType = getPrimaryTypeForSearch(types)

  const competitors = await fetchNearbyCompetitors(apiKey, lat, lng, placeId, primaryType, 10000)

  const rating = typeof place.rating === 'number' ? place.rating : null
  const totalReviews = typeof place.user_ratings_total === 'number' ? place.user_ratings_total : null
  const photos = (place.photos as unknown[]) || []
  const photoCount = photos.length
  const hasWebsite = !!(place.website || place.websiteUri)
  const hasPhone = !!(place.formatted_phone_number || place.international_phone_number)
  const hasHours = !!(place.opening_hours)

  const businessName = (place.name as string) || 'Unknown'
  const formattedAddress = (place.formatted_address as string) || ''
  const franchise = isFranchise(businessName)

  // Local market context
  const compRatings = competitors.map((c) => c.rating).filter((r): r is number => r != null)
  const compReviews = competitors.map((c) => c.userRatingsTotal).filter((r): r is number => r != null)
  const compPhotos = competitors.map((c) => c.photoCount ?? 0)

  const localAvgRating = compRatings.length > 0 ? compRatings.reduce((a, b) => a + b, 0) / compRatings.length : 0
  const localAvgReviews = compReviews.length > 0 ? compReviews.reduce((a, b) => a + b, 0) / compReviews.length : 0
  const localAvgPhotos = compPhotos.length > 0 ? compPhotos.reduce((a, b) => a + b, 0) / compPhotos.length : 0

  const allRatings = rating != null ? [...compRatings, rating] : compRatings
  const allReviews = totalReviews != null ? [...compReviews, totalReviews] : compReviews
  const allPhotos = [...compPhotos, photoCount]

  const ratingPercentile = rating != null && allRatings.length > 0 ? computePercentile(rating, allRatings) : 50
  const reviewsPercentile = totalReviews != null && allReviews.length > 0 ? computePercentile(totalReviews, allReviews) : 50
  const photosPercentile = allPhotos.length > 0 ? computePercentile(photoCount, allPhotos) : 50

  // Signal scoring
  let profileCompleteness = 0
  if (hasWebsite) profileCompleteness += 1
  if (hasPhone) profileCompleteness += 1
  if (hasHours) profileCompleteness += 0.5
  profileCompleteness += 0.5 // category accuracy
  profileCompleteness = Math.min(3, profileCompleteness)

  let reviewAuthority = 0
  if (totalReviews != null && rating != null) {
    const reviewScore = Math.min(5, Math.log10(totalReviews + 1) * 2)
    const ratingScore = rating >= 4.5 ? 5 : rating >= 4 ? 4 : rating >= 3.5 ? 3 : rating >= 3 ? 2 : 1
    const vsLocal = totalReviews >= localAvgReviews ? 3 : totalReviews >= localAvgReviews * 0.5 ? 2 : 1
    reviewAuthority = Math.min(15, reviewScore + ratingScore + vsLocal)
  }

  let visualPresence = 0
  if (photoCount >= 20) visualPresence = 10
  else if (photoCount >= 10) visualPresence = 7
  else if (photoCount >= 5) visualPresence = 5
  else if (photoCount >= 1) visualPresence = 2

  const engagementSignals = 4 // Estimate - we don't have review response rate
  const visibilitySignals = franchise ? 5 : 2

  let competitiveAdvantage = 0
  if (competitors.length >= 3) {
    const ratingAdv = rating != null && localAvgRating > 0 ? (rating - localAvgRating) * 5 : 0
    const reviewAdv = totalReviews != null && localAvgReviews > 0 ? Math.sign(Math.log10(totalReviews + 1) - Math.log10(localAvgReviews + 1)) * 3 : 0
    competitiveAdvantage = Math.max(-10, Math.min(10, Math.round(ratingAdv + reviewAdv)))
  }

  // Baseline
  let baseline = 45
  if (franchise) baseline = 67
  else if (competitors.length >= 3) {
    const avgPercentile = (ratingPercentile + reviewsPercentile) / 2
    if (avgPercentile >= 80) baseline = 68
    else if (avgPercentile >= 60) baseline = 58
    else if (avgPercentile >= 40) baseline = 52
  }

  const rawScore = baseline + profileCompleteness + reviewAuthority + visualPresence + engagementSignals + visibilitySignals + competitiveAdvantage
  let meoScore = Math.round(Math.max(0, Math.min(100, rawScore)))

  if (franchise) {
    meoScore = Math.max(67, Math.min(78, meoScore))
    if (rating != null && rating < 3.5) meoScore -= 5
    if (!hasWebsite || !hasPhone) meoScore -= 3
  } else if (meoScore > 75) {
    meoScore = Math.min(75, meoScore)
  }

  meoScore = Math.max(0, Math.min(100, meoScore))

  const grade = meoScore >= 85 ? 'A' : meoScore >= 70 ? 'B' : meoScore >= 55 ? 'C' : meoScore >= 40 ? 'D' : 'F'

  let dominanceType = 'average'
  if (meoScore >= 68 && ratingPercentile >= 70) dominanceType = 'local_leader'
  else if (meoScore >= 60) dominanceType = 'strong_listing'
  else if (meoScore >= 50) dominanceType = 'average'
  else dominanceType = 'weak_presence'

  const deficiencies: string[] = []
  if (!hasHours) deficiencies.push('Missing opening hours')
  if (!hasWebsite) deficiencies.push('No website listed')
  if (!hasPhone) deficiencies.push('No phone number')
  if (totalReviews != null && localAvgReviews > 0 && totalReviews < localAvgReviews * 0.5) deficiencies.push('Low review count vs competitors')
  if (photoCount < 5) deficiencies.push('Weak photo presence')
  if (rating != null && rating < 3.5) deficiencies.push('Below-average rating')

  const optimizationTips: string[] = []
  if (photoCount < 20) optimizationTips.push('Add 20+ photos to your listing')
  if (!hasHours) optimizationTips.push('Add opening hours')
  if (totalReviews != null && totalReviews < 50) optimizationTips.push('Improve review acquisition')
  optimizationTips.push('Respond to reviews regularly')
  if (!hasWebsite) optimizationTips.push('Add website to profile')
  if (profileCompleteness < 2.5) optimizationTips.push('Complete all profile fields')

  return {
    status: 'ok',
    businessName,
    formattedAddress,
    category,
    rating,
    totalReviews,
    photoCount,
    hasWebsite,
    hasPhone,
    hasHours,
    isFranchise: franchise,
    meoScore,
    grade,
    dominanceType,
    marketContext: {
      localAvgRating: Math.round(localAvgRating * 10) / 10,
      localAvgReviews: Math.round(localAvgReviews),
      localAvgPhotos: Math.round(localAvgPhotos),
      competitorCount: competitors.length,
      ratingPercentile,
      reviewsPercentile,
      photosPercentile,
    },
    deficiencies,
    optimizationTips,
    scoringBreakdown: {
      profileCompleteness,
      reviewAuthority,
      visualPresence,
      engagementSignals,
      visibilitySignals,
      competitiveAdvantage,
      baseline,
    },
  }
}
