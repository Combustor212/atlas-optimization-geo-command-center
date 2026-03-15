/**
 * Demand-driven visibility opportunity estimation for Book a Call.
 * Uses AI discovery demand, visibility gaps, and conversion rates instead of
 * monthly customers × visibility lift.
 */

/** Midpoints for average customer value ranges */
const CUSTOMER_VALUE_MIDPOINTS = {
  'Under $50': 30,
  '$50–$200': 125,
  '$200–$1,000': 600,
  '$1,000–$5,000': 3000,
  '$5,000+': 7500,
};

/** Expected AI visibility for strong businesses (65–75% midpoint) */
const EXPECTED_VISIBILITY = 0.70;

/**
 * Estimate AI discovery demand from monthly revenue (proxy for market size).
 * Low: 200–500, Moderate: 500–1000, High: 1000–2000, Very high: 2000+
 */
function getAiDiscoveryVolumeEstimate(qualificationAnswers) {
  const revenue = qualificationAnswers?.monthlyRevenue;
  if (!revenue) return { min: 500, max: 1000 }; // Default moderate
  switch (revenue) {
    case 'Under $10k':
      return { min: 200, max: 500 };
    case '$10k–$50k':
      return { min: 500, max: 1000 };
    case '$50k–$100k':
      return { min: 800, max: 1200 };
    case '$100k–$500k':
      return { min: 1000, max: 2000 };
    case '$500k+':
      return { min: 2000, max: 3000 };
    default:
      return { min: 500, max: 1000 };
  }
}

/**
 * Get conversion rate range based on customer source (proxy for category).
 * Restaurants/retail (Google/Maps): 4–8%
 * Local services (word of mouth, etc.): 2–6%
 */
function getConversionRateRange(qualificationAnswers) {
  const source = qualificationAnswers?.mainCustomerSource;
  if (source === 'Google / Maps') return { min: 0.04, max: 0.08 };
  if (source === 'Word of mouth' || source === 'Website / SEO') return { min: 0.02, max: 0.06 };
  return { min: 0.04, max: 0.06 }; // Default moderate
}

/**
 * Get average customer value midpoint.
 */
function getCustomerValueMidpoint(qualificationAnswers) {
  const val = qualificationAnswers?.averageCustomerValue;
  return val && CUSTOMER_VALUE_MIDPOINTS[val] != null
    ? CUSTOMER_VALUE_MIDPOINTS[val]
    : 125;
}

/**
 * Calculate AI visibility gap (0–1).
 * aiVisibilityGap = expectedVisibility - aiVisibilityProbability, clamped.
 */
function getAiVisibilityGap(geoScore) {
  if (geoScore == null || typeof geoScore !== 'number') {
    return 0.35; // Default when no geoScore (assume moderate gap)
  }
  const aiVisibilityProbability = geoScore / 100;
  const gap = EXPECTED_VISIBILITY - aiVisibilityProbability;
  return Math.max(0, Math.min(1, gap));
}

/**
 * Calculate opportunity score (0–100) from visibility gap, demand, and weaknesses.
 */
function calculateOpportunityScore(geoScore, qualificationAnswers, aiVisibilityGap) {
  const demand = getAiDiscoveryVolumeEstimate(qualificationAnswers);
  const demandMid = (demand.min + demand.max) / 2;
  const demandLevel = demandMid < 400 ? 0.25 : demandMid < 750 ? 0.5 : demandMid < 1500 ? 0.75 : 1;
  const visibilityGapScore = aiVisibilityGap * 40; // max 40
  const demandScore = demandLevel * 25; // max 25
  const weaknessScore = geoScore != null && typeof geoScore === 'number'
    ? (1 - geoScore / 100) * 35 // max 35 when geoScore=0
    : 35 * 0.5; // default when no score
  const score = Math.round(visibilityGapScore + demandScore + weaknessScore);
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate demand-driven opportunity estimate.
 *
 * @param {Object} params
 * @param {number|null} params.geoScore - GEO score from scan (0-100)
 * @param {Object} params.qualificationAnswers - Answers from Step 2
 * @param {string} [params.category] - Optional business category (for future use)
 * @param {string} [params.location] - Optional location (for future use)
 *
 * @returns {{
 *   aiDiscoveryVolumeEstimate: { min: number, max: number },
 *   aiVisibilityGap: number,
 *   potentialCustomersLost: { min: number, max: number },
 *   monthlyRevenueOpportunity: { min: number, max: number },
 *   annualRevenueOpportunity: { min: number, max: number },
 *   opportunityScore: number
 * }}
 */
export function calculateOpportunity({ geoScore, qualificationAnswers, category, location }) {
  const { min: volMin, max: volMax } = getAiDiscoveryVolumeEstimate(qualificationAnswers);
  const aiVisibilityGap = getAiVisibilityGap(geoScore);
  const { min: convMin, max: convMax } = getConversionRateRange(qualificationAnswers);
  const avgCustomerValue = getCustomerValueMidpoint(qualificationAnswers);

  // lostVisits = aiDiscoveryVolumeEstimate × aiVisibilityGap
  const lostVisitsMin = Math.round(volMin * aiVisibilityGap);
  const lostVisitsMax = Math.round(volMax * aiVisibilityGap);

  // potentialCustomersLost = lostVisits × conversionRate
  const potentialCustomersMin = Math.round(lostVisitsMin * convMin);
  const potentialCustomersMax = Math.round(lostVisitsMax * convMax);

  // Revenue opportunity: potentialCustomersLost × averageCustomerValue
  const revenueMin = Math.round(potentialCustomersMin * avgCustomerValue);
  const revenueMax = Math.round(potentialCustomersMax * avgCustomerValue);

  const opportunityScore = calculateOpportunityScore(geoScore, qualificationAnswers, aiVisibilityGap);

  return {
    aiDiscoveryVolumeEstimate: { min: volMin, max: volMax },
    aiVisibilityGap: Math.round(aiVisibilityGap * 100) / 100,
    potentialCustomersLost: { min: potentialCustomersMin, max: potentialCustomersMax },
    monthlyRevenueOpportunity: { min: revenueMin, max: revenueMax },
    annualRevenueOpportunity: { min: revenueMin * 12, max: revenueMax * 12 },
    opportunityScore,
  };
}
