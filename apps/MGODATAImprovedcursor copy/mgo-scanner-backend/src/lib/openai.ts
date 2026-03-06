/**
 * OpenAI client and JSON helpers
 */
import OpenAI from 'openai';
import { GeoWebsiteAnalysis, DirectoryCitation, NAP } from '../types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

/**
 * Analyze website HTML for GEO signals
 */
export async function analyzeWebsiteForGeoSignals(
  htmlText: string,
  nap: NAP
): Promise<GeoWebsiteAnalysis> {
  const prompt = `Analyze this website HTML and extract GEO signals. Return JSON with the following structure:
{
  "found_nap": { "name": "...", "address": "...", "phone": "..." } | null,
  "nap_match": { "name": "match|partial|mismatch|missing", "address": "match|partial|mismatch|missing", "phone": "match|partial|mismatch|missing" },
  "localbusiness_schema": { "present": boolean, "valid": boolean, "has_nap": boolean, "sameAsCount": number },
  "sameAs": [ ... ],
  "service_area_clarity": "clear|some|unclear|missing",
  "what_where_clarity": "clear|some|unclear|missing",
  "faq_signals": { "present": boolean, "evidence": [strings] }
}

Compare found_nap against this reference NAP:
Name: ${nap.name}
Address: ${nap.address}
Phone: ${nap.phone}

Website HTML (first 15000 chars):
${htmlText.substring(0, 15000)}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an SEO auditor. Analyze website HTML and return structured JSON data. Always return valid JSON only, no additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content) as GeoWebsiteAnalysis;
    return parsed;
  } catch (error: any) {
    console.error('OpenAI analysis error:', error);
    // Return default structure on error
    return {
      found_nap: null,
      nap_match: {
        name: 'missing',
        address: 'missing',
        phone: 'missing'
      },
      localbusiness_schema: {
        present: false,
        valid: false,
        has_nap: false,
        sameAsCount: 0
      },
      sameAs: [],
      service_area_clarity: 'missing',
      what_where_clarity: 'missing',
      faq_signals: {
        present: false,
        evidence: []
      }
    };
  }
}

/**
 * Analyze directory page for citation
 */
export async function analyzeDirectoryPageForCitation(
  htmlText: string,
  nap: NAP
): Promise<DirectoryCitation> {
  const prompt = `Analyze this directory search results page HTML and find the best matching business listing. Return JSON:
{
  "best_listing_url": "..." | null,
  "extracted_nap": { "name": "...", "address": "...", "phone": "..." } | null,
  "match_quality": "match|partial|mismatch|missing"
}

Reference NAP to match against:
Name: ${nap.name}
Address: ${nap.address}
Phone: ${nap.phone}

Directory HTML (first 10000 chars):
${htmlText.substring(0, 10000)}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a data extraction specialist. Find business listings in directory HTML and extract NAP data. Return valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content) as Omit<DirectoryCitation, 'directory'>;
    return {
      directory: '', // Will be set by caller
      ...parsed
    };
  } catch (error: any) {
    console.error('OpenAI directory analysis error:', error);
    return {
      directory: '', // Will be set by caller
      best_listing_url: null,
      extracted_nap: null,
      match_quality: 'missing'
    };
  }
}

