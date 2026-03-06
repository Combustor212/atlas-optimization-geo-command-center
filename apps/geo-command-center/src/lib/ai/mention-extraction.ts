/**
 * AI Mention Extraction (Manual Assisted Capture)
 * Rules: string match of business name, address, phone, website.
 * visibility_score 0-100, sentiment: rule-based or optional OpenAI.
 */

export interface LocationMatchInfo {
  businessName: string | null
  locationName: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  website: string | null
}

export interface ExtractionResult {
  mention_count: number
  visibility_score: number
  sentiment: 'positive' | 'neutral' | 'negative'
  evidence: {
    snippets: string[]
    matched_terms: string[]
    matched_types: ('name' | 'address' | 'phone' | 'website' | 'city' | 'state' | 'zip')[]
    /** 1-based position/rank of mention in AI response (for GEO scoring) */
    mention_position?: number
  }
}

const POSITIVE_WORDS = [
  'recommend', 'best', 'great', 'excellent', 'top', 'highly', 'trust', 'quality',
  'professional', 'reliable', 'highly recommend', 'highly recommended', 'love', 'awesome',
]
const NEGATIVE_WORDS = [
  'avoid', 'poor', 'bad', 'worst', 'terrible', 'don\'t recommend', 'not recommend',
  'complaint', 'disappointed', 'unreliable',
]

function normalizeForMatch(s: string | null | undefined): string {
  if (!s || typeof s !== 'string') return ''
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,#-]/g, '')
    .trim()
}

function findMatches(
  rawText: string,
  info: LocationMatchInfo
): { snippets: string[]; matched_terms: string[]; matched_types: ExtractionResult['evidence']['matched_types'] } {
  const snippets: string[] = []
  const matchedTerms: string[] = []
  const matchedTypes: ExtractionResult['evidence']['matched_types'] = []

  const terms: { value: string | null; type: ExtractionResult['evidence']['matched_types'][number] }[] = [
    { value: info.businessName, type: 'name' },
    { value: info.locationName, type: 'name' },
    { value: info.address, type: 'address' },
    { value: info.city, type: 'city' },
    { value: info.state, type: 'state' },
    { value: info.zip, type: 'zip' },
    { value: info.phone, type: 'phone' },
    { value: info.website, type: 'website' },
  ]

  for (const { value, type } of terms) {
    if (!value || value.length < 2) continue
    const norm = normalizeForMatch(value).slice(0, 150)
    if (!norm) continue
    const re = new RegExp(
      `(.{0,40})(${escapeRe(norm)})(.{0,40})`,
      'gi'
    )
    let m: RegExpExecArray | null
    const reCopy = new RegExp(re.source, re.flags)
    while ((m = reCopy.exec(rawText)) !== null) {
      const snippet = (m[1] + m[2] + m[3]).trim()
      if (snippet && !snippets.includes(snippet)) {
        snippets.push(snippet.slice(0, 200))
      }
      if (!matchedTerms.includes(value)) matchedTerms.push(value)
      if (!matchedTypes.includes(type)) matchedTypes.push(type)
    }
  }

  return { snippets, matched_terms: matchedTerms, matched_types: matchedTypes }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function ruleBasedSentiment(rawText: string): 'positive' | 'neutral' | 'negative' {
  const lower = rawText.toLowerCase()
  const pos = POSITIVE_WORDS.filter((w) => lower.includes(w)).length
  const neg = NEGATIVE_WORDS.filter((w) => lower.includes(w)).length
  if (neg > pos) return 'negative'
  if (pos > neg) return 'positive'
  return 'neutral'
}

/**
 * Extract mentions from pasted AI response text using string matching.
 * visibility_score 0-100: based on number of matched term types and snippet count.
 */
export function extractMentions(
  rawText: string,
  locationInfo: LocationMatchInfo
): ExtractionResult {
  const { snippets, matched_terms, matched_types } = findMatches(rawText, locationInfo)
  const mention_count = Math.max(1, snippets.length)
  const uniqueTypes = [...new Set(matched_types)]
  // Score: base 20 per matched type (name, address, phone, etc.) + cap at 100
  const typeScore = Math.min(100, uniqueTypes.length * 25)
  const snippetBonus = Math.min(30, snippets.length * 5)
  const visibility_score = Math.min(100, Math.round(typeScore + snippetBonus))
  const sentiment = ruleBasedSentiment(rawText)
  // mention_position: 1-based rank (first mention = 1) for GEO scoring
  const mention_position = snippets.length > 0 ? 1 : undefined

  return {
    mention_count,
    visibility_score: visibility_score || (matched_terms.length > 0 ? 20 : 0),
    sentiment,
    evidence: {
      snippets: snippets.slice(0, 20),
      matched_terms,
      matched_types: uniqueTypes,
      mention_position,
    },
  }
}

/**
 * Optional: get sentiment via OpenAI if OPENAI_API_KEY is set.
 * Falls back to rule-based otherwise.
 */
export async function getSentimentWithOptionalOpenAI(
  rawText: string,
  fallback: 'positive' | 'neutral' | 'negative'
): Promise<'positive' | 'neutral' | 'negative'> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || !rawText.trim()) return fallback

  try {
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey })
    const truncated = rawText.slice(0, 3000)
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Classify the sentiment of this AI assistant response regarding a business mention. Reply with exactly one word: positive, neutral, or negative.',
        },
        { role: 'user', content: truncated },
      ],
      max_tokens: 10,
    })
    const content = res.choices[0]?.message?.content?.toLowerCase()?.trim()
    if (content === 'positive' || content === 'neutral' || content === 'negative') return content
  } catch {
    // ignore; use fallback
  }
  return fallback
}
