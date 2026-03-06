import type { Request, Response } from 'express';
import { logger } from '../lib/logger';
import { meoExplainCache } from '../lib/cache';
import { getPlaceDetailsForExplain } from '../lib/places';
import { calculateMEOScore } from '../meo/meoEngine';
import { buildMEOExplainData } from '../meo/meoExplain';

/**
 * GET /api/meo/explain?placeId=...&force=1
 *
 * - Returns a normalized, UI-ready MEOExplainData object.
 * - Caches per placeId (default 30m; configurable via MEO_EXPLAIN_CACHE_TTL_MS).
 * - `force=1` bypasses caches.
 */
export async function handleMEOExplain(req: Request, res: Response): Promise<void> {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const placeId = String(req.query.placeId || '').trim();
  const force = String(req.query.force || '') === '1';

  if (!placeId) {
    res.status(400).json({
      error: 'Validation failed',
      message: 'Missing required query parameter: placeId',
    });
    return;
  }

  const cacheKey = `meoExplain:${placeId}`;
  if (!force) {
    const cached = meoExplainCache.get<any>(cacheKey);
    if (cached) {
      res.status(200).json({
        data: cached,
        meta: { cacheHit: true },
      });
      return;
    }
  }

  try {
    logger.info('[MEO Explain] Fetching details', { placeId, force });
    const place = await getPlaceDetailsForExplain(placeId, { forceRefresh: force });

    // Use deterministic inputs derived from Place Details (no fuzzy parsing here)
    const businessName = place.name;
    const location = place.formatted_address;

    logger.info('[MEO Explain] Scoring', { placeId, businessName });
    const meoResult = await calculateMEOScore(businessName, location, place);
    
    // Check if MEO scoring failed
    if (meoResult.body.status === 'error') {
      logger.error('[MEO Explain] MEO scoring failed', {
        placeId,
        businessName,
        error: meoResult.body.gradeRationale
      });
      
      res.status(400).json({
        error: 'MEO scoring blocked',
        message: meoResult.body.gradeRationale,
        details: meoResult.body.meoBreakdown
      });
      return;
    }

    // NOTE: owner replies are not available from Places (legacy). Keep null + explicit.
    const explain = buildMEOExplainData({
      place,
      meo: meoResult.body,
      ownerReplyRate: null,
      ownerReplyRateSource: 'unavailable',
    });

    const ttlMs = Number(process.env.MEO_EXPLAIN_CACHE_TTL_MS) || 1000 * 60 * 30;
    meoExplainCache.set(cacheKey, explain, ttlMs);

    res.status(200).json({
      data: explain,
      meta: { cacheHit: false, ttlMs },
    });
  } catch (error) {
    logger.error('[MEO Explain] Error', {
      placeId,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}




