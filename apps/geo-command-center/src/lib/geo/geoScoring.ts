/**
 * GEO (Generative Engine Optimization) Visibility Scoring
 *
 * Measures how likely a business is to be referenced or recommended by
 * generative AI systems (ChatGPT, Google SGE, Perplexity, etc.).
 *
 * NOT based on local map rankings. Focus on global AI discoverability.
 *
 * Engines: v2 Query Simulation, v3 Structural, v4 Entity Authority,
 * v5 Discovery Opportunity, v6 Entity Coverage, v7 Competitor Comparison, v8 Query Evidence.
 */
import OpenAI from 'openai'

export interface GEOCompetitorInput {
  name: string
  address?: string
  rating?: number
  totalReviews?: number
  website?: string
  hasWebsite?: boolean
  category?: string
}

export interface GEOInput {
  businessName: string
  fullAddress: string
  website?: string | null
  rating?: number | null
  totalReviews?: number | null
  category?: string | null
  description?: string | null
  knownBrandSignals?: string[] | null
  socialProfiles?: string[] | null
  citations?: number | null
  contentSignals?: string[] | null
  /** Competitors for AI visibility comparison (3–5 from same category/location) */
  competitors?: GEOCompetitorInput[] | null
}

/** GEO v2 query simulation result */
export interface GEOv2Query {
  query: string
  bucket: 'near_me' | 'best' | 'service' | 'trust' | 'recommendation'
  mentioned: boolean
  rank: number | null
  reason: string | null
  competitors?: string[]
  /** 0–100 confidence in this simulation estimate */
  confidenceScore?: number
  /** Short reasoning summary for this query result */
  reasoningSummary?: string
}

/** AI Query Evidence — transparent evidence of simulated AI-generated answers */
export interface GEOQueryEvidenceItem {
  query: string
  businessMentioned: boolean
  estimatedPosition: number | null
  competitorsMentioned: string[]
  /** 0–100 confidence in this simulation estimate */
  confidenceScore?: number
  /** Short reasoning summary for this query result */
  reasoningSummary?: string
}

/** GEO v5 AI Discovery Opportunity output */
export interface GEOv5Opportunity {
  aiDiscoveryVolumeEstimate: number
  aiVisibilityGap: number
  potentialAIVisitsLost: number
  potentialCustomersLost: number
  monthlyRevenueOpportunity: number
  annualRevenueOpportunity: number
  opportunityScore: number
  opportunityExplanation: string
}

export interface GEOScoreOutput {
  geoScore: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  authorityScore: number
  contentDepth: number
  reviewAuthority: number
  entityConsistency: number
  answerability: number
  entityStrengthScore: number
  aiMentionProbability: number
  entityCoverageScore: number
  entityCoverageExplanation: string
  queriesTested: number
  mentionsDetected: number
  averagePosition: number | null
  aiVisibilityProbability: number
  topCompetitorsMentioned: string[]
  v2Queries: GEOv2Query[]
  explanation: string
  deficiencies: string[]
  optimizationRecommendations: string[]
  /** GEO v5 AI Discovery & Revenue Opportunity */
  aiDiscoveryVolumeEstimate?: number
  aiVisibilityGap?: number
  potentialAIVisitsLost?: number
  potentialCustomersLost?: number
  monthlyRevenueOpportunity?: number
  annualRevenueOpportunity?: number
  opportunityScore?: number
  opportunityExplanation?: string
  /** Competitor AI Visibility Comparison */
  competitorGeoScores?: Array<{ name: string; geoScore: number; aiVisibilityProbability: number }>
  competitorAverageGeoScore?: number
  competitorAverageAiVisibility?: number
  visibilityGap?: number
  competitorNames?: string[]
  competitorComparisonInsight?: string
  /** AI Query Evidence — transparent evidence of simulated AI answers */
  queryEvidence?: GEOQueryEvidenceItem[]
  queryEvidenceInsight?: string
  /** Average confidence score across all query simulations (0–100) */
  averageConfidenceScore?: number
  /** Simulation type label */
  simulationType?: string
  /** Disclaimer shown to users about the simulation nature of AI visibility results */
  simulationDisclaimer?: string
}

const GEO_SYSTEM_PROMPT = `You are an advanced AI system designed to calculate GEO (Generative Engine Optimization) visibility for businesses.

Your goal is to measure how likely a business is to be recommended or referenced by generative AI systems such as ChatGPT, Google AI/SGE, Perplexity, Claude, and other AI assistants.

GEO is NOT based on Google Maps rankings. Never use distance, proximity, or local map ranking factors.

You must run all GEO engines (v2–v8) and combine them into a final GEO visibility report.

---

ENGINE 1 — GEO v3 STRUCTURAL SCORING

STEP 1 — AUTHORITY SIGNALS (0–30)
Evaluate: website presence, domain authority indicators, brand recognition, citations across directories, media mentions, knowledge graph presence, structured entity signals.
Large global brands may receive high scores but can lose points for weak reputation.

STEP 2 — CONTENT DEPTH (0–20)
Evaluate how much structured information exists online: website pages, service descriptions, FAQ content, blog or educational content, structured schema markup, menu or service listings, informational pages.
Thin websites score low.

STEP 3 — REVIEW SENTIMENT SIGNALS (0–20)
Evaluate trust signals from reviews: average rating, total review count, sentiment strength, review freshness, credibility signals.
Low ratings significantly reduce credibility.

STEP 4 — ENTITY CONSISTENCY (0–15)
Evaluate consistency of business name, address, phone, website, category across directories and citations.

STEP 5 — AI ANSWERABILITY (0–15)
Evaluate how easy it is for an AI system to recommend this business: clear category definition, structured descriptions, clear service explanations, content answering common questions, recognizable entity signals.

Combine: authorityScore + contentDepth + reviewAuthority + entityConsistency + answerability. Clamp final GEO score between 0–100.

---

ENGINE 2 — GEO v2 QUERY SIMULATION & GEO v8 QUERY EVIDENCE

Generate 8–12 natural, realistic queries based on business category, location, and common user search patterns. Examples:
- best [category] in [city]
- top [category] near [city]
- good [category] near me
- recommended [category] in [city]
- where to find [service] in [city]

Queries should feel conversational and realistic.

For each query, simulate AI-generated answers and estimate:
- Whether the business would likely be mentioned (true/false)
- Estimated ranking position if mentioned (1–5; null if not mentioned). Use conservative estimates based on entity authority, review signals, content depth, category authority. Avoid unrealistic rankings.
- Other businesses likely mentioned in the answer (competitorsMentioned: list of 1–5 competitor names)
- Assign bucket: "near_me" | "best" | "service" | "trust" | "recommendation"
- confidenceScore (0–100 integer): How confident the model is in this specific simulation result. Higher = stronger evidence from available signals.
- reasoningSummary (string): A concise 1-sentence explanation of why the business would or would not appear in this query result.

This is a SIMULATION MODEL — use conservative estimates, not direct AI API calls. Goal is transparency and insight.

Compute: queriesTested, mentionsDetected, averagePosition (avg of positions where mentioned, null if none), aiVisibilityProbability (mentionsDetected/queriesTested as 0–100).
Aggregate topCompetitorsMentioned: unique competitor names across all queries, max 10.

GEO v8 QUERY EVIDENCE OUTPUT: Produce queryEvidence array with {query, businessMentioned, estimatedPosition (1–5 or null), competitorsMentioned, confidenceScore (0–100), reasoningSummary (1 sentence)}. Also produce queryEvidenceInsight: a short summary such as "Your business appeared in 3 of the 10 AI-generated answers tested. Competitors with stronger review signals and entity coverage appear more frequently in recommendations."

---

ENGINE 3 — GEO v4 ENTITY AUTHORITY

Evaluate how strongly the business exists as a recognizable entity within AI knowledge systems:
- Entity recognition signals
- Brand authority
- Citation breadth
- Social signals
- Media mentions
- Structured data presence
- Wikipedia or knowledge graph indicators
- Brand search demand signals

Determine entityStrengthScore (0–20).
Estimate aiMentionProbability (0–100): how likely AI systems are to reference the business when answering questions.

---

ENGINE 4 — GEO v6 ENTITY COVERAGE

Measure how widely the business entity appears across the web in trusted sources, which increases the likelihood that AI systems reference the business.

STEP 1 — DETECT ENTITY SOURCES
Evaluate whether the business appears across major entity platforms such as:
- website
- Google Business Profile
- Yelp
- Facebook
- Instagram
- Apple Maps
- Bing Places
- TripAdvisor
- YellowPages
- Foursquare
- BBB
- industry directories
- review platforms
Estimate coverage breadth.

STEP 2 — MEDIA & CONTENT MENTIONS
Check for presence in:
- blog articles
- list articles
- news mentions
- local publications
- community sites
Businesses with mentions in third-party content receive higher entity confidence.

STEP 3 — STRUCTURED ENTITY SIGNALS
Check for structured data signals such as:
- schema.org markup
- organization schema
- local business schema
- product/service schema
- FAQ schema
Strong schema increases AI entity clarity.

STEP 4 — ENTITY COVERAGE SCORE
Produce entityCoverageScore (0–25) based on:
- platform coverage
- content mentions
- structured entity signals

STEP 5 — REPORT INSIGHT
Generate entityCoverageExplanation: a short explanation describing the strength or weakness of the business's entity presence across the web.
Example: "Your business appears in several major directories but lacks structured entity signals and authoritative mentions, which reduces AI confidence when recommending your business."

IMPORTANT: Entity coverage should influence entityStrengthScore, aiMentionProbability, and opportunityScore when you compute them, but entityCoverageScore remains its own independent metric (0–25).

---

ENGINE 5 — GEO v5 DISCOVERY OPPORTUNITY

This engine estimates how much discovery traffic the business may be missing from AI systems. Use results from v2, v3, v4, v6 above.

STEP 1 — ESTIMATE CATEGORY SEARCH DEMAND
Estimate monthly search demand for the business category in the local market. Examples: "coffee shop mason ohio", "best dentist near me", "plumber mason ohio".
Classify demand level: Low demand | Moderate demand | High demand | Very high demand.
Estimate approximate monthly search volume range (numeric).

STEP 2 — ESTIMATE AI DISCOVERY SHARE
AI assistants influence between 10–35% of discovery searches depending on industry. Calculate aiDiscoveryVolumeEstimate: how many discovery searches could be influenced by AI answers (monthly).

STEP 3 — ESTIMATE BUSINESS AI VISIBILITY GAP
Compare aiVisibilityProbability (from v2) vs expected visibility for a top business (typically 65–75%).
aiVisibilityGap = expectedVisibility - (aiVisibilityProbability/100). Example: expected 70%, current 30% → gap = 0.40 (40%).

STEP 4 — ESTIMATE LOST DISCOVERY TRAFFIC
potentialAIVisitsLost = aiDiscoveryVolumeEstimate × aiVisibilityGap (monthly visits the business may be missing).

STEP 5 — ESTIMATE CUSTOMER CONVERSION
Local service businesses: 2–6% conversion. Restaurants/retail: 3–8%. Use category to estimate.
potentialCustomersLost = potentialAIVisitsLost × conversionRate (conservative).

STEP 6 — ESTIMATE REVENUE OPPORTUNITY
Estimate averageTicketEstimate (average transaction value). monthlyRevenueOpportunity = potentialCustomersLost × averageTicketEstimate. annualRevenueOpportunity = monthlyRevenueOpportunity × 12.

STEP 7 — OPPORTUNITY SCORE (0–100)
Based on: AI visibility gap, category demand, entity authority weakness, content depth weakness. High scores = large growth opportunity.

RULES: Be conservative. Never exaggerate revenue. Never claim guaranteed results. Focus on discovery opportunity, not promises.

---

ENGINE 6 — GEO v7 COMPETITOR COMPARISON (when competitors provided)

When the user provides a list of 3–5 competitors (same category, same city/nearby), run this engine.

STEP 1 — IDENTIFY COMPETITORS
Use the provided competitor list. Each competitor has: name, address, rating, totalReviews, website, category.

STEP 2 — ESTIMATE COMPETITOR GEO SCORES
For each competitor, estimate using available signals:
- geoScore (0–100): Based on rating, reviews, website presence, content depth, entity signals
- aiVisibilityProbability (0–100): How often AI systems would reference this competitor in recommendations

Use conservative estimates. Businesses with more reviews, higher ratings, and websites typically score higher.

STEP 3 — CALCULATE COMPARISON METRICS
competitorAverageGeoScore = average of competitor geoScore values
competitorAverageAiVisibility = average of competitor aiVisibilityProbability values (as 0–100)
visibilityGap = competitorAverageAiVisibility − aiVisibilityProbability
(positive = competitors appear more often; negative = you appear more often)

STEP 4 — OUTPUT
Add to JSON: competitorGeoScores (array of {name, geoScore, aiVisibilityProbability}), competitorAverageGeoScore, competitorAverageAiVisibility, visibilityGap, competitorNames, competitorComparisonInsight.

STEP 5 — REPORT INSIGHT
Generate competitorComparisonInsight: a short, informational explanation comparing the business to competitors.
Example: "Competitors in your category appear in AI-generated recommendations approximately 61% of the time, while your business currently appears about 42% of the time. Strengthening entity signals, reviews, and content depth could significantly improve visibility."

RULES: Informational only. Never name competitors negatively. Use conservative estimates. Focus on visibility gaps, not criticism.

---

BASELINE LOGIC
- Unknown businesses: 30–45 GEO
- Decent local businesses with good reviews and website: 50–65
- Strong businesses with authority and content: 70–85
- Scores above 90 require national authority.
Always remain conservative.

---

GRADE SCALE
A 85+, B 70–84, C 55–69, D 40–54, F <40

---

OUTPUT
Return ONLY valid JSON, no markdown or extra text:
{
  "geoScore": number,
  "grade": "A"|"B"|"C"|"D"|"F",
  "authorityScore": number,
  "contentDepth": number,
  "reviewAuthority": number,
  "entityConsistency": number,
  "answerability": number,
  "entityStrengthScore": number,
  "aiMentionProbability": number,
  "entityCoverageScore": number,
  "entityCoverageExplanation": "Short explanation of entity presence strength/weakness across the web",
  "queriesTested": number,
  "mentionsDetected": number,
  "averagePosition": number|null,
  "aiVisibilityProbability": number,
  "topCompetitorsMentioned": ["competitor1", "competitor2"],
  "v2Queries": [
    {"query": "best coffee in mason ohio", "bucket": "best", "mentioned": true, "rank": 3, "reason": "Strong local presence", "competitors": ["Competitor A", "Competitor B"], "confidenceScore": 72, "reasoningSummary": "Business has strong review volume and good rating but lacks structured content depth."}
  ],
  "queryEvidence": [
    {"query": "best coffee in mason ohio", "businessMentioned": true, "estimatedPosition": 2, "competitorsMentioned": ["Competitor A", "Competitor B"], "confidenceScore": 72, "reasoningSummary": "Business has strong review volume and good rating but lacks structured content depth."}
  ],
  "queryEvidenceInsight": "Your business appeared in 3 of the 10 AI-generated answers tested. Competitors with stronger review signals and entity coverage appear more frequently in recommendations.",
  "explanation": "2-3 sentence summary",
  "deficiencies": ["deficiency1"],
  "optimizationRecommendations": ["rec1", "rec2"],
  "aiDiscoveryVolumeEstimate": number,
  "aiVisibilityGap": number,
  "potentialAIVisitsLost": number,
  "potentialCustomersLost": number,
  "monthlyRevenueOpportunity": number,
  "annualRevenueOpportunity": number,
  "opportunityScore": number,
  "opportunityExplanation": "Clear, conservative 1-2 sentence explanation. Avoid unrealistic promises. Example: Your current AI visibility suggests you may be missing approximately 120–240 discovery visits per month from AI-assisted searches. Improving entity signals, reviews, and structured content could significantly increase your chances of being referenced by AI systems.",
  "competitorGeoScores": [{"name": "Competitor A", "geoScore": 65, "aiVisibilityProbability": 58}],
  "competitorAverageGeoScore": number,
  "competitorAverageAiVisibility": number,
  "visibilityGap": number,
  "competitorNames": ["Competitor A", "Competitor B"],
  "competitorComparisonInsight": "Short informational comparison. Never name competitors negatively."
}

IMPORTANT: GEO is NOT based on map rankings. Never use proximity signals. Focus on AI discoverability, entity authority, and AI recommendation probability. Always produce realistic, conservative scoring. When competitors are provided, include competitor comparison fields.`

function buildInputSummary(input: GEOInput): string {
  const lines: string[] = []
  if (input.businessName) lines.push(`businessName: ${input.businessName}`)
  if (input.fullAddress) lines.push(`fullAddress: ${input.fullAddress}`)
  if (input.website) lines.push(`website: ${input.website}`)
  else lines.push(`website: (not provided)`)
  if (input.rating != null) lines.push(`rating: ${input.rating}/5`)
  if (input.totalReviews != null) lines.push(`totalReviews: ${input.totalReviews}`)
  if (input.category) lines.push(`category: ${input.category}`)
  if (input.description) lines.push(`description: ${input.description}`)
  if (input.knownBrandSignals?.length) lines.push(`knownBrandSignals: ${input.knownBrandSignals.join(', ')}`)
  if (input.socialProfiles?.length) lines.push(`socialProfiles: ${input.socialProfiles.length} profiles`)
  if (input.citations != null) lines.push(`citations: ${input.citations}`)
  if (input.contentSignals?.length) lines.push(`contentSignals: ${input.contentSignals.join(', ')}`)
  if (input.competitors?.length) {
    lines.push('\n--- COMPETITORS (run Engine 5) ---')
    input.competitors.forEach((c, i) => {
      const parts = [`${i + 1}. ${c.name}`]
      if (c.rating != null) parts.push(`rating: ${c.rating}/5`)
      if (c.totalReviews != null) parts.push(`reviews: ${c.totalReviews}`)
      if (c.website || c.hasWebsite) parts.push('website: yes')
      else parts.push('website: no')
      if (c.address) parts.push(`address: ${c.address}`)
      lines.push(parts.join(', '))
    })
  }
  return lines.join('\n')
}

function parseGrade(grade: unknown): 'A' | 'B' | 'C' | 'D' | 'F' {
  const g = String(grade || '').toUpperCase()
  if (['A', 'B', 'C', 'D', 'F'].includes(g)) return g as 'A' | 'B' | 'C' | 'D' | 'F'
  return 'C'
}

export async function computeGEOScore(
  input: GEOInput,
  openaiKey: string
): Promise<GEOScoreOutput | null> {
  if (!openaiKey?.trim()) return null

  const openai = new OpenAI({ apiKey: openaiKey })
  const inputSummary = buildInputSummary(input)

  const hasCompetitors = (input.competitors?.length ?? 0) >= 1
  const enginesNote = hasCompetitors
    ? 'Run all engines: v2 Query Simulation, v3 Structural, v4 Entity Authority, v5 Discovery Opportunity, v6 Entity Coverage, v7 Competitor Comparison, v8 Query Evidence.'
    : 'Run all engines: v2 Query Simulation, v3 Structural, v4 Entity Authority, v5 Discovery Opportunity, v6 Entity Coverage, v8 Query Evidence.'

  const userPrompt = `Evaluate this business for GEO visibility. ${enginesNote} If data is missing, estimate conservatively.

${inputSummary}

Return ONLY valid JSON with all required fields: geoScore, grade, authorityScore, contentDepth, reviewAuthority, entityConsistency, answerability, entityStrengthScore, aiMentionProbability, entityCoverageScore, entityCoverageExplanation, queriesTested, mentionsDetected, averagePosition, aiVisibilityProbability, topCompetitorsMentioned, v2Queries (array of 8-12 query objects), queryEvidence (array of {query, businessMentioned, estimatedPosition 1-5 or null, competitorsMentioned}), queryEvidenceInsight, explanation, deficiencies, optimizationRecommendations, aiDiscoveryVolumeEstimate, aiVisibilityGap, potentialAIVisitsLost, potentialCustomersLost, monthlyRevenueOpportunity, annualRevenueOpportunity, opportunityScore, opportunityExplanation${hasCompetitors ? ', competitorGeoScores, competitorAverageGeoScore, competitorAverageAiVisibility, visibilityGap, competitorNames, competitorComparisonInsight' : ''}.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: GEO_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 3600,
    })

    const rawText = completion.choices[0]?.message?.content?.trim() || ''
    console.log('[GEO Scoring] Raw OpenAI response length:', rawText.length)

    if (!rawText) {
      console.error('[GEO Scoring] OpenAI returned empty response — cannot score')
      return null
    }

    // Safe JSON extraction — strip markdown fences, attempt recovery on parse failure
    let parsed: Record<string, unknown> = {}
    let parseSucceeded = false
    try {
      const json = rawText.replace(/```json?\s*/gi, '').replace(/```\s*$/g, '').trim()
      parsed = JSON.parse(json)
      parseSucceeded = true
    } catch (parseErr) {
      console.warn('[GEO Scoring] JSON.parse failed, attempting recovery:', parseErr)
      // Try to extract JSON object from within the text using brace matching
      const firstBrace = rawText.indexOf('{')
      const lastBrace = rawText.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          parsed = JSON.parse(rawText.slice(firstBrace, lastBrace + 1))
          parseSucceeded = true
          console.log('[GEO Scoring] JSON recovery succeeded')
        } catch {
          console.error('[GEO Scoring] JSON recovery also failed — returning null instead of fake score')
          if (process.env.NODE_ENV !== 'production') {
            console.error('[GEO Scoring] Raw LLM output (first 600 chars):', rawText.slice(0, 600))
          }
          return null
        }
      } else {
        console.error('[GEO Scoring] No JSON object found in LLM output — returning null')
        if (process.env.NODE_ENV !== 'production') {
          console.error('[GEO Scoring] Raw LLM output (first 600 chars):', rawText.slice(0, 600))
        }
        return null
      }
    }

    // Strict geoScore validation — do NOT invent a score if the LLM omitted it.
    const rawGeoScore = parsed.geoScore != null ? Number(parsed.geoScore) : null
    if (rawGeoScore === null || Number.isNaN(rawGeoScore) || rawGeoScore <= 0) {
      // rawGeoScore of 0 from LLM is theoretically valid but extremely rare and likely a parse error.
      // A legitimate 0 would only apply to a business with absolutely no online presence.
      // In that case the LLM would also have near-zero component scores, and the caller can
      // re-evaluate from the components. For safety, treat 0 as a likely parse failure.
      if (rawGeoScore === 0 && parseSucceeded) {
        // Accept 0 only when parse fully succeeded and all components are also 0/near-0
        const componentSum = Number(parsed.authorityScore || 0) +
          Number(parsed.contentDepth || 0) +
          Number(parsed.reviewAuthority || 0) +
          Number(parsed.entityConsistency || 0) +
          Number(parsed.answerability || 0)
        if (componentSum > 0) {
          console.error('[GEO Scoring] geoScore=0 but components are non-zero — likely parse error, returning null')
          return null
        }
      } else if (rawGeoScore !== 0) {
        console.error('[GEO Scoring] LLM returned invalid or missing geoScore:', rawGeoScore, '— returning null instead of fake default')
        if (process.env.NODE_ENV !== 'production') {
          console.error('[GEO Scoring] Parsed keys:', Object.keys(parsed).join(', '))
        }
        return null
      }
    }

    const geoScore = Math.max(0, Math.min(100, Math.round(rawGeoScore!)))
    const authorityScore = Math.max(0, Math.min(30, Math.round(Number(parsed.authorityScore) || 0)))
    const contentDepth = Math.max(0, Math.min(20, Math.round(Number(parsed.contentDepth) || 0)))
    const reviewAuthority = Math.max(0, Math.min(20, Math.round(Number(parsed.reviewAuthority) || 0)))
    const entityConsistency = Math.max(0, Math.min(15, Math.round(Number(parsed.entityConsistency) || 0)))
    const answerability = Math.max(0, Math.min(15, Math.round(Number(parsed.answerability) || 0)))
    const entityStrengthScore = Math.max(0, Math.min(20, Math.round(Number(parsed.entityStrengthScore) || 0)))
    const aiMentionProbability = Math.max(0, Math.min(100, Math.round(Number(parsed.aiMentionProbability) || 0)))
    const entityCoverageScore = Math.max(0, Math.min(25, Math.round(Number(parsed.entityCoverageScore) || 0)))
    const entityCoverageExplanation = String(parsed.entityCoverageExplanation || '').trim()

    const v2QueriesRaw = Array.isArray(parsed.v2Queries) ? parsed.v2Queries : []
    const v2Queries: GEOv2Query[] = v2QueriesRaw.slice(0, 12).map((q: Record<string, unknown>) => ({
      query: String(q.query || ''),
      bucket: ['near_me', 'best', 'service', 'trust', 'recommendation'].includes(String(q.bucket || ''))
        ? (q.bucket as GEOv2Query['bucket'])
        : 'recommendation',
      mentioned: Boolean(q.mentioned),
      rank: typeof q.rank === 'number' && q.rank >= 1 && q.rank <= 10 ? q.rank : null,
      reason: q.reason != null ? String(q.reason) : null,
      competitors: Array.isArray(q.competitors) ? q.competitors.map(String).slice(0, 5) : undefined,
      confidenceScore: typeof q.confidenceScore === 'number'
        ? Math.max(0, Math.min(100, Math.round(q.confidenceScore)))
        : undefined,
      reasoningSummary: q.reasoningSummary != null ? String(q.reasoningSummary).slice(0, 300) : undefined,
    }))

    // AI Query Evidence — parse from LLM or derive from v2Queries
    const queryEvidenceRaw = Array.isArray(parsed.queryEvidence) ? parsed.queryEvidence : []
    const queryEvidence: GEOQueryEvidenceItem[] =
      queryEvidenceRaw.length > 0
        ? queryEvidenceRaw.slice(0, 12).map((e: Record<string, unknown>) => ({
            query: String(e.query || ''),
            businessMentioned: Boolean(e.businessMentioned),
            estimatedPosition:
              typeof e.estimatedPosition === 'number' && e.estimatedPosition >= 1 && e.estimatedPosition <= 5
                ? Math.round(e.estimatedPosition)
                : null,
            competitorsMentioned: Array.isArray(e.competitorsMentioned)
              ? e.competitorsMentioned.map(String).filter(Boolean).slice(0, 5)
              : [],
            confidenceScore: typeof e.confidenceScore === 'number'
              ? Math.max(0, Math.min(100, Math.round(e.confidenceScore)))
              : undefined,
            reasoningSummary: e.reasoningSummary != null ? String(e.reasoningSummary).slice(0, 300) : undefined,
          }))
        : v2Queries.map((q) => ({
            query: q.query,
            businessMentioned: q.mentioned,
            estimatedPosition:
              q.rank != null
                ? Math.min(5, Math.max(1, Math.ceil(q.rank / 2)))
                : null,
            competitorsMentioned: q.competitors ?? [],
            confidenceScore: q.confidenceScore ?? 50,
            reasoningSummary: q.reasoningSummary,
          }))
    const queryEvidenceInsight = String(parsed.queryEvidenceInsight || '').trim()

    // Compute averageConfidenceScore from query evidence — only if the LLM provided scores
    const confScores = queryEvidence
      .map((e) => e.confidenceScore)
      .filter((s): s is number => typeof s === 'number')
    const averageConfidenceScore =
      confScores.length > 0
        ? Math.round(confScores.reduce((a, b) => a + b, 0) / confScores.length)
        : undefined

    const queriesTested = Math.max(0, Math.min(20, Math.round(Number(parsed.queriesTested) || v2Queries.length)))
    const mentionsDetected = Math.max(
      0,
      Math.min(queriesTested, Math.round(Number(parsed.mentionsDetected) || v2Queries.filter((q) => q.mentioned).length))
    )
    const avgPosRaw = parsed.averagePosition
    const averagePosition =
      typeof avgPosRaw === 'number' && !Number.isNaN(avgPosRaw) && avgPosRaw >= 1 && avgPosRaw <= 10
        ? Math.round(avgPosRaw * 10) / 10
        : null
    const aiVisibilityProbability = Math.max(
      0,
      Math.min(100, Math.round(Number(parsed.aiVisibilityProbability) ?? (queriesTested > 0 ? (mentionsDetected / queriesTested) * 100 : 0)))
    )
    const topCompetitorsMentioned = Array.isArray(parsed.topCompetitorsMentioned)
      ? parsed.topCompetitorsMentioned.map(String).filter(Boolean).slice(0, 10)
      : []

    // GEO v5 AI Discovery Opportunity (conservative parsing, allow fallbacks)
    const expectedVisibility = 0.70
    const currentVisibility = aiVisibilityProbability / 100
    const rawGap = Number(parsed.aiVisibilityGap)
    const parsedGap = !Number.isNaN(rawGap)
      ? rawGap > 1
        ? rawGap / 100
        : rawGap
      : Math.max(0, expectedVisibility - currentVisibility)
    const aiVisibilityGap = Math.max(0, Math.min(1, parsedGap))
    const aiDiscoveryVolumeEstimate = Math.max(
      0,
      Math.round(Number(parsed.aiDiscoveryVolumeEstimate) ?? 0)
    )
    const potentialAIVisitsLost = Math.max(
      0,
      Math.round(Number(parsed.potentialAIVisitsLost) ?? aiDiscoveryVolumeEstimate * aiVisibilityGap)
    )
    const potentialCustomersLost = Math.max(
      0,
      Math.round(Number(parsed.potentialCustomersLost) ?? 0)
    )
    const monthlyRevenueOpportunity = Math.max(
      0,
      Math.round(Number(parsed.monthlyRevenueOpportunity) ?? 0)
    )
    const annualRevenueOpportunity = Math.max(
      0,
      Math.round(Number(parsed.annualRevenueOpportunity) ?? monthlyRevenueOpportunity * 12)
    )
    const opportunityScore = Math.max(
      0,
      Math.min(100, Math.round(Number(parsed.opportunityScore) ?? 0))
    )
    const opportunityExplanation = String(parsed.opportunityExplanation || '').trim()

    // Competitor AI Visibility Comparison (optional)
    const competitorGeoScoresRaw = Array.isArray(parsed.competitorGeoScores) ? parsed.competitorGeoScores : []
    const competitorGeoScores = competitorGeoScoresRaw.slice(0, 10).map((c: Record<string, unknown>) => ({
      name: String(c.name || ''),
      // Use 0 as fallback rather than 50 — an unknown competitor score should not inflate averages
      geoScore: Math.max(0, Math.min(100, Math.round(Number(c.geoScore) || 0))),
      aiVisibilityProbability: Math.max(0, Math.min(100, Math.round(Number(c.aiVisibilityProbability) || 0))),
    })).filter((c) => c.name && c.geoScore > 0) // Only include competitors the LLM actually scored
    const competitorAverageGeoScore =
      competitorGeoScores.length > 0
        ? Math.round(
            competitorGeoScores.reduce(
              (s: number, c: { geoScore: number }) => s + c.geoScore,
              0
            ) / competitorGeoScores.length
          )
        : undefined
    const competitorAverageAiVisibility =
      competitorGeoScores.length > 0
        ? Math.round(
            competitorGeoScores.reduce(
              (s: number, c: { aiVisibilityProbability: number }) => s + c.aiVisibilityProbability,
              0
            ) / competitorGeoScores.length
          )
        : undefined
    const rawVisibilityGap = Number(parsed.visibilityGap)
    const visibilityGap =
      !Number.isNaN(rawVisibilityGap) && competitorAverageAiVisibility != null
        ? Math.max(-100, Math.min(100, rawVisibilityGap))
        : competitorAverageAiVisibility != null
          ? competitorAverageAiVisibility - aiVisibilityProbability
          : undefined
    const competitorNames = Array.isArray(parsed.competitorNames)
      ? parsed.competitorNames.map(String).filter(Boolean).slice(0, 10)
      : competitorGeoScores.map((c: { name: string }) => c.name)
    const competitorComparisonInsight = String(parsed.competitorComparisonInsight || '').trim()

    return {
      geoScore,
      grade: parseGrade(parsed.grade),
      authorityScore,
      contentDepth,
      reviewAuthority,
      entityConsistency,
      answerability,
      entityStrengthScore,
      aiMentionProbability,
      entityCoverageScore,
      entityCoverageExplanation,
      queriesTested,
      mentionsDetected,
      averagePosition,
      aiVisibilityProbability,
      topCompetitorsMentioned,
      v2Queries,
      explanation: String(parsed.explanation || ''),
      deficiencies: Array.isArray(parsed.deficiencies) ? parsed.deficiencies.map(String) : [],
      optimizationRecommendations: Array.isArray(parsed.optimizationRecommendations)
        ? parsed.optimizationRecommendations.map(String)
        : [],
      aiDiscoveryVolumeEstimate,
      aiVisibilityGap,
      potentialAIVisitsLost,
      potentialCustomersLost,
      monthlyRevenueOpportunity,
      annualRevenueOpportunity,
      opportunityScore,
      opportunityExplanation,
      ...(competitorGeoScores.length > 0 && {
        competitorGeoScores,
        competitorAverageGeoScore,
        competitorAverageAiVisibility,
        visibilityGap,
        competitorNames,
        competitorComparisonInsight,
      }),
      queryEvidence,
      queryEvidenceInsight: queryEvidenceInsight || undefined,
      averageConfidenceScore,
      simulationType: 'simulated_ai_visibility',
      simulationDisclaimer: 'This result estimates likelihood of AI recommendation and is not a live ranking.',
    }
  } catch (err) {
    console.error('[GEO Scoring] Failed:', err)
    return null
  }
}
