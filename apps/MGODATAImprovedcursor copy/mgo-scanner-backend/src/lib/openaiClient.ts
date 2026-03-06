/**
 * OpenAI Client Singleton
 * Configured for GEO query evaluation with structured outputs
 */

import OpenAI from 'openai';
import { logger } from './logger';

// Initialize OpenAI client
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  logger.warn('[OpenAI Client] OPENAI_API_KEY not set - GEO explain will fail');
}

export const openaiClient = new OpenAI({
  apiKey: apiKey || 'sk-placeholder',
  timeout: 30000, // 30 second timeout
  maxRetries: 2
});

// Model configuration
export const OPENAI_GEO_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

logger.info('[OpenAI Client] Initialized', { 
  model: OPENAI_GEO_MODEL,
  hasApiKey: !!apiKey
});

