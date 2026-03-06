import { openaiClient, OPENAI_GEO_MODEL } from '../lib/openaiClient';
import { getRedisClient, isRedisConnected } from '../lib/redisClient';
import { logger } from '../lib/logger';

const REDIS_CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export interface IndustryClassification {
  industry: string;
  vertical: string;
  serviceKeywords: string[];
  confidence: number;
}

interface ClassificationResponse {
  industry: string;
  vertical: string;
  service_keywords: string[];
  confidence: number;
}

export async function classifyIndustry(
  businessName: string,
  category: string,
  placeId: string,
  types?: string[]
): Promise<IndustryClassification> {
  const cacheKey = `geo-industry:${placeId}`;
  const redis = getRedisClient();

  // Check cache
  if (isRedisConnected()) {
    try {
      const cached = await redis?.get(cacheKey);
      if (cached) {
        logger.info('[Industry Classifier] Redis cache hit', { placeId, businessName });
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      logger.error('[Industry Classifier] Redis cache read error', { placeId, error: cacheError });
    }
  }

  logger.info('[Industry Classifier] Classifying industry', { placeId, businessName, category });

  const typesContext = types?.length ? `\nGoogle Place Types: ${types.slice(0, 5).join(', ')}` : '';
  
  const prompt = `You are an industry classification expert. Given a business name and category, determine the specific industry, vertical market, and 3 core service keywords.

Business Name: "${businessName}"
Category: "${category}"${typesContext}

Classify this business and return ONLY a JSON object with:
- industry: The specific industry (e.g., "Ethnic Grocery", "Quick Service Restaurant", "Luxury Salon")
- vertical: The broader vertical (e.g., "Retail", "Food & Beverage", "Personal Care")
- service_keywords: Array of exactly 3 specific service/product keywords customers search for (e.g., ["halal meat", "specialty produce", "international foods"])
- confidence: 0-1 score of classification confidence

Rules:
- Be specific with industry (not just "Restaurant" but "Ethnic Restaurant" or "Fast Casual")
- service_keywords must be actual search terms customers use
- Confidence should be high (>0.8) for clear categories, lower for ambiguous ones
`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: OPENAI_GEO_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const rawOutput = response.choices[0].message?.content;
    if (!rawOutput) {
      throw new Error('OpenAI returned empty response.');
    }

    const parsed: ClassificationResponse = JSON.parse(rawOutput);

    const result: IndustryClassification = {
      industry: parsed.industry || category,
      vertical: parsed.vertical || 'General',
      serviceKeywords: parsed.service_keywords?.slice(0, 3) || [],
      confidence: parsed.confidence ?? 0.5,
    };

    // Cache result
    if (isRedisConnected()) {
      try {
        await redis?.setex(cacheKey, REDIS_CACHE_TTL_SECONDS, JSON.stringify(result));
        logger.info('[Industry Classifier] Redis cache set', { placeId, industry: result.industry });
      } catch (cacheError) {
        logger.error('[Industry Classifier] Redis cache write error', { placeId, error: cacheError });
      }
    }

    logger.info('[Industry Classifier] Classification complete', { 
      placeId, 
      industry: result.industry,
      vertical: result.vertical,
      serviceKeywords: result.serviceKeywords,
      confidence: result.confidence
    });

    return result;

  } catch (error: any) {
    logger.error('[Industry Classifier] Classification failed', { 
      placeId, 
      businessName,
      error: error.message 
    });
    
    // Fallback
    return {
      industry: category,
      vertical: 'General',
      serviceKeywords: [],
      confidence: 0.3,
    };
  }
}

