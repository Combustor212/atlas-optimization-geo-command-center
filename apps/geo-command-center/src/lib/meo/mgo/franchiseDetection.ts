/**
 * Franchise Detection - MGO backend compatible
 */
import type { FranchiseDetectionResult } from './meoSchema'

const MAJOR_NATIONAL_FRANCHISES = [
  'mcdonalds', "mcdonald's", 'burger king', 'wendys', "wendy's", 'taco bell', 'kfc', 'subway', 'pizza hut', 'dominos', "domino's", 'papa johns', "papa john's",
  'chipotle', 'panera', 'chick-fil-a', 'chick fil a', 'sonic', 'arbys', "arby's", 'dairy queen', 'popeyes', 'jimmy johns', "jimmy john's", 'five guys',
  'walmart', 'target', 'costco', 'home depot', 'lowes', "lowe's", 'best buy', 'kroger', 'walgreens', 'cvs', 'rite aid', '7-eleven', 'circle k',
  'jiffy lube', 'midas', 'meineke', 'valvoline', 'tire kingdom', 'firestone', 'pep boys', 'autozone', 'advance auto parts', "o'reilly", 'napa auto',
  'marriott', 'hilton', 'holiday inn', 'comfort inn', 'la quinta', 'motel 6', 'super 8', 'days inn', 'hampton inn', 'courtyard', 'residence inn',
  'planet fitness', 'la fitness', 'anytime fitness', "gold's gym", '24 hour fitness', 'cvs pharmacy', 'walgreens pharmacy', 'minute clinic', 'urgent care',
]

const REGIONAL_FRANCHISES = [
  'skyline chili', 'goldstar', 'gold star', "larosa's", 'larosas', "graeters", "graeter's", 'united dairy farmers', 'udf',
  'penn station', 'city bbq', 'bibibop', 'condado', 'hot head burritos', 'melt bar', 'swensons', "swenson's",
]

const LOCAL_FRANCHISES = ['franchise', 'authorized dealer', 'licensed', 'certified dealer']

const FAST_FOOD_INDICATORS = [
  'mcdonalds', "mcdonald's", 'burger king', 'wendys', "wendy's", 'taco bell', 'kfc', 'subway', 'pizza hut', 'dominos', "domino's", 'papa johns', "papa john's",
  'chipotle', 'panera', 'chick-fil-a', 'chick fil a', 'sonic', 'arbys', "arby's", 'dairy queen', 'popeyes', 'jimmy johns', "jimmy john's", 'five guys',
  'white castle', 'hardees', "hardee's", 'jack in the box', 'in-n-out', 'whataburger', 'culvers', "culver's", 'shake shack', 'smashburger',
]

function isMajorNationalFranchise(businessName: string): boolean {
  const nameLower = businessName.toLowerCase().trim()
  return MAJOR_NATIONAL_FRANCHISES.some((f) => nameLower === f || nameLower.includes(f) || f.includes(nameLower))
}

function isRegionalFranchise(businessName: string): boolean {
  const nameLower = businessName.toLowerCase().trim()
  return REGIONAL_FRANCHISES.some((f) => nameLower.includes(f) || f.includes(nameLower))
}

function hasLocalFranchiseIndicators(businessName: string): boolean {
  const nameLower = businessName.toLowerCase().trim()
  return LOCAL_FRANCHISES.some((i) => nameLower.includes(i))
}

function isFastFood(businessName: string, types?: string[]): boolean {
  const nameLower = businessName.toLowerCase().trim()
  if (types?.some((t) => t.toLowerCase() === 'fast_food' || t.toLowerCase() === 'meal_takeaway')) return true
  return FAST_FOOD_INDICATORS.some((i) => nameLower.includes(i) || i.includes(nameLower))
}

function calculateFranchiseBoost(franchiseType: 'local' | 'regional' | 'national' | null): number {
  if (!franchiseType) return 0
  switch (franchiseType) {
    case 'national': return 10
    case 'regional': return 6
    case 'local': return 4
    default: return 0
  }
}

export function detectFranchise(businessName: string, types?: string[]): FranchiseDetectionResult {
  const isMajorNational = isMajorNationalFranchise(businessName)
  const isRegional = isRegionalFranchise(businessName)
  const isLocal = hasLocalFranchiseIndicators(businessName)
  const isFastFoodBusiness = isFastFood(businessName, types)

  let franchiseType: 'local' | 'regional' | 'national' | null = null
  let isFranchise = false

  if (isMajorNational) {
    franchiseType = 'national'
    isFranchise = true
  } else if (isRegional) {
    franchiseType = 'regional'
    isFranchise = true
  } else if (isLocal) {
    franchiseType = 'local'
    isFranchise = true
  }

  const franchiseBoost = calculateFranchiseBoost(franchiseType)

  return {
    isFranchise,
    isMajorNationalFranchise: isMajorNational,
    isRegionalFranchise: isRegional,
    isFastFood: isFastFoodBusiness,
    franchiseType,
    franchiseBoost,
  }
}
