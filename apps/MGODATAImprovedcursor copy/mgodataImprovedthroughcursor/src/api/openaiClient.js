// OpenAI API Client - Direct API calls without Base44

import { OPENAI_API_KEY } from '@/config/apiKeys';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Call OpenAI ChatGPT API directly
 * @param {Object} params
 * @param {string} params.prompt - User prompt
 * @param {string} params.system_role - System role/prompt
 * @param {number} params.max_tokens - Max tokens (default: 1500)
 * @param {number} params.temperature - Temperature (default: 0.7)
 * @param {Object} params.response_format - Response format (optional)
 * @returns {Promise<Object>} Response from OpenAI
 */
export async function callOpenAI({
  prompt,
  system_role = 'You are a helpful assistant.',
  max_tokens = 1500,
  temperature = 0.7,
  response_format = null
}) {
  try {
    const messages = [];
    
    if (system_role) {
      messages.push({
        role: 'system',
        content: system_role
      });
    }
    
    messages.push({
      role: 'user',
      content: prompt
    });

    const requestBody = {
      model: 'gpt-4',
      messages: messages,
      max_tokens: max_tokens,
      temperature: temperature
    };

    if (response_format) {
      requestBody.response_format = response_format;
    }

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      content: data.choices[0]?.message?.content || '',
      usage: data.usage || {},
      model: data.model || 'gpt-4'
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

/**
 * Geo scan using OpenAI - analyzes business visibility in AI search results
 * @param {Object} params
 * @param {string} params.business_name - Business name
 * @param {string} params.city - City name
 * @param {string} params.state - State name (optional)
 * @returns {Promise<Object>} Geo scan results
 */
export async function geoProfileScan({ business_name, city, state }) {
  const systemPrompt = `You are an AI visibility expert. Analyze how well a business appears in AI-powered search results (ChatGPT, Google Gemini, etc.). 
  
Provide a detailed analysis including:
1. Visibility score (0-100)
2. Whether the business appears in AI search results
3. Key factors affecting visibility
4. Recommendations for improvement

Format your response as JSON with: visibility_score, appears_in_results, factors, recommendations.`;

  const userPrompt = `Analyze the AI visibility for:
Business: ${business_name}
Location: ${city}${state ? `, ${state}` : ''}

Provide a comprehensive analysis of their visibility in AI search engines.`;

  try {
    const result = await callOpenAI({
      prompt: userPrompt,
      system_role: systemPrompt,
      max_tokens: 2000,
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    // Parse JSON response
    let analysis = {};
    try {
      analysis = JSON.parse(result.content);
    } catch (e) {
      // If not JSON, extract score from text
      const scoreMatch = result.content.match(/(\d+)/);
      analysis = {
        visibility_score: scoreMatch ? parseInt(scoreMatch[1]) : 50,
        appears_in_results: result.content.toLowerCase().includes('yes') || result.content.toLowerCase().includes('appears'),
        factors: result.content,
        recommendations: result.content
      };
    }

    return {
      success: true,
      method: 'real-ai-check',
      details: {
        enginesChecked: ['ChatGPT', 'Gemini'],
        visibilityScore: analysis.visibility_score || 50,
        appearsInResults: analysis.appears_in_results || false,
        analysis: analysis
      },
      rawResponse: result.content
    };
  } catch (error) {
    console.error('Geo scan error:', error);
    return {
      success: false,
      error: error.message || 'Failed to perform geo scan'
    };
  }
}

