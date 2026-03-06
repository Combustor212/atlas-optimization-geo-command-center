/**
 * GEO Benchmark API Routes
 * Handles GET /api/geo/benchmark and POST /api/geo/refresh
 */

import { Request, Response } from 'express';
import { logger } from '../lib/logger';
import { runGEOBenchmark } from '../geo/geoEngine';

/**
 * GET /api/geo/benchmark?placeId=...&radius=5000&force=0
 * Returns GEO benchmark results (cached by default)
 */
export async function handleGEOBenchmark(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  // No-cache headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const { placeId, radius, force } = req.query;

    // Validate required params
    if (!placeId || typeof placeId !== 'string') {
      res.status(400).json({
        error: 'Missing or invalid placeId parameter',
        message: 'placeId query parameter is required',
        details: { received: placeId }
      });
      return;
    }

    // Parse optional params
    const radiusMeters = radius ? parseInt(radius as string, 10) : 5000;
    const forceRefresh = force === '1' || force === 'true';

    if (isNaN(radiusMeters) || radiusMeters < 1000 || radiusMeters > 50000) {
      res.status(400).json({
        error: 'Invalid radius parameter',
        message: 'radius must be between 1000 and 50000 meters',
        details: { received: radius }
      });
      return;
    }

    logger.info('[GEO API] Benchmark request', { placeId, radiusMeters, forceRefresh });

    // Run benchmark
    const result = await runGEOBenchmark(placeId, { radiusMeters, forceRefresh });

    // Check if error
    if ('error' in result) {
      const statusCode = result.code === 'INSUFFICIENT_COMPETITORS' ? 503 : 500;
      res.status(statusCode).json(result);
      return;
    }

    const totalTime = Date.now() - startTime;
    logger.info('[GEO API] Benchmark complete', {
      placeId,
      geoScore: result.geoScore,
      timeMs: totalTime
    });

    res.status(200).json({
      ...result,
      meta: {
        processingTimeMs: totalTime,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error('[GEO API] Benchmark error', { error: error.message });

    res.status(500).json({
      error: 'Internal server error',
      code: 'UNKNOWN',
      message: error.message || 'Unknown error occurred',
      details: { timestamp: new Date().toISOString() }
    });
  }
}

/**
 * POST /api/geo/refresh
 * Forces a fresh GEO benchmark (bypasses cache)
 * Body: { placeId: string, radius?: number }
 */
export async function handleGEORefresh(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  // No-cache headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const { placeId, radius } = req.body;

    // Validate required params
    if (!placeId || typeof placeId !== 'string') {
      res.status(400).json({
        error: 'Missing or invalid placeId',
        message: 'placeId is required in request body',
        details: { received: placeId }
      });
      return;
    }

    // Parse optional params
    const radiusMeters = radius ? parseInt(radius, 10) : 5000;

    if (isNaN(radiusMeters) || radiusMeters < 1000 || radiusMeters > 50000) {
      res.status(400).json({
        error: 'Invalid radius',
        message: 'radius must be between 1000 and 50000 meters',
        details: { received: radius }
      });
      return;
    }

    logger.info('[GEO API] Refresh request', { placeId, radiusMeters });

    // Force refresh
    const result = await runGEOBenchmark(placeId, { radiusMeters, forceRefresh: true });

    // Check if error
    if ('error' in result) {
      const statusCode = result.code === 'INSUFFICIENT_COMPETITORS' ? 503 : 500;
      res.status(statusCode).json(result);
      return;
    }

    const totalTime = Date.now() - startTime;
    logger.info('[GEO API] Refresh complete', {
      placeId,
      geoScore: result.geoScore,
      timeMs: totalTime
    });

    res.status(200).json({
      ...result,
      meta: {
        processingTimeMs: totalTime,
        timestamp: new Date().toISOString(),
        refreshed: true
      }
    });
  } catch (error: any) {
    logger.error('[GEO API] Refresh error', { error: error.message });

    res.status(500).json({
      error: 'Internal server error',
      code: 'UNKNOWN',
      message: error.message || 'Unknown error occurred',
      details: { timestamp: new Date().toISOString() }
    });
  }
}




