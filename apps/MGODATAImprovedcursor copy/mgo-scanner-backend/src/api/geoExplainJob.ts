/**
 * GEO Explain Job API - Polling endpoint for async explain generation
 */

import { Request, Response } from 'express';
import { getExplainJob, createExplainJob } from '../geo/explainJobs';
import { logger } from '../lib/logger';
import { resolveCategory, getFallbackCategory } from '../geo/resolveCategory';
import { getPlaceDetails } from '../lib/places';
import type { CategoryResolution } from '../geo/resolveCategory';

/**
 * GET /api/geo/explain-job/:jobId
 * Poll for GEO explain job status and result
 * 
 * Note: Job map is in-memory and expires after 1 hour.
 * Frontend is responsible for persisting completed explain to localStorage.
 */
export function handleGetExplainJob(req: Request, res: Response): void {
  const { jobId } = req.params;

  if (!jobId) {
    res.status(400).json({
      status: 'failed',
      step: 'INIT',
      progress: 0,
      hasExplain: false,
      error: 'Missing jobId'
    });
    return;
  }

  const job = getExplainJob(jobId);
  
  // DEV: Log lookup result
  if (process.env.NODE_ENV === 'development') {
    logger.info(`[GEO_POLL] jobId=${jobId.slice(0, 20)}... found=${!!job}`);
  }

  // STRICT: Always return valid payload, even for 404
  if (!job) {
    logger.warn('[GEO Explain Job API] Job not found or expired', { jobId });
    res.status(404).json({
      status: 'failed',
      step: 'INIT',
      progress: 0,
      hasExplain: false,
      error: 'JOB_NOT_FOUND'
    });
    return;
  }
  
  // DEV-ONLY: Structured log to match frontend diagnostics
  if (process.env.NODE_ENV === 'development') {
    const hasExplain = !!(job.result && job.status === 'completed');
    const version = hasExplain ? (job.result?.version || 'none') : 'none';
    const queriesCount = hasExplain && Array.isArray(job.result?.queries) ? job.result.queries.length : 0;
    
    logger.info(`[GEO_POLL] jobId=${jobId.slice(0, 12)}... http=200 status=${job.status} hasExplain=${hasExplain} version=${version} q=${queriesCount}`);
  }
  
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  
  // STRICT: Always return complete payload with all required fields
  const hasExplain = !!(job.result && job.status === 'completed');
  
  const body = {
    status: job.status, // 'queued' | 'running' | 'completed' | 'failed'
    step: job.step || 'INIT',
    progress: job.progress || 0,
    hasExplain,
    error: job.error || null,
    ...(hasExplain && { explain: job.result })
  };
  
  res.status(200).json(body);
}

/**
 * POST /api/geo/regenerate-explain
 * Regenerate GEO explain for a place (creates new job)
 * 
 * Body: { placeId: string, categoryOverride?: string | { key, label }, locationLabel?: string }
 * - placeId: required
 * - categoryOverride: optional; if provided, use it; else fetch place + resolve category with fallback
 */
export async function handleRegenerateExplain(req: Request, res: Response): Promise<void> {
  const { placeId, categoryOverride, locationLabel } = req.body;

  if (!placeId || typeof placeId !== 'string') {
    res.status(400).json({
      error: { code: 'MISSING_PLACE_ID', message: 'placeId is required' }
    });
    return;
  }

  try {
    let categoryResolution: CategoryResolution;
    let resolvedLocationLabel = locationLabel || 'Unknown Location';

    if (categoryOverride) {
      // Use provided category (from scan response or user)
      const key = typeof categoryOverride === 'string'
        ? categoryOverride.toLowerCase().replace(/\s+/g, '_')
        : (categoryOverride.key || categoryOverride.label?.toLowerCase().replace(/\s+/g, '_') || 'local_business');
      const label = typeof categoryOverride === 'string'
        ? categoryOverride
        : (categoryOverride.label || categoryOverride.key || 'Local business');
      categoryResolution = {
        key,
        label,
        confidence: typeof categoryOverride?.confidence === 'number' ? categoryOverride.confidence : 0.8,
        source: 'regenerate',
        debug: { methodsTried: ['regenerate_override'], finalMethod: 'regenerate_override', timestamp: new Date().toISOString() }
      };
      logger.info('[GEO Regenerate] Using categoryOverride', { placeId, key, label });
    } else {
      // Fetch place details and resolve category with fallback
      logger.info('[GEO Regenerate] Fetching place details', { placeId });
      const placeDetails = await getPlaceDetails(placeId);
      if (!placeDetails) {
        logger.error('[GEO Regenerate] Place not found', { placeId });
        res.status(404).json({
          error: { code: 'PLACE_NOT_FOUND', message: 'Could not retrieve place details' }
        });
        return;
      }
      resolvedLocationLabel = placeDetails.formatted_address || placeDetails.vicinity || resolvedLocationLabel;

      try {
        categoryResolution = await resolveCategory(placeDetails);
        if (!categoryResolution.key || !categoryResolution.label) {
          logger.warn('[GEO Regenerate] resolveCategory returned null - using fallback', { placeId });
          categoryResolution = getFallbackCategory(placeDetails);
        }
      } catch (resolveErr: any) {
        const errMsg = resolveErr instanceof Error ? resolveErr.message : String(resolveErr);
        logger.error('[GEO Regenerate] resolveCategory threw - using fallback', { placeId, error: errMsg });
        categoryResolution = getFallbackCategory(placeDetails);
      }
      logger.info('[GEO Regenerate] Category resolved', {
        placeId,
        key: categoryResolution.key,
        label: categoryResolution.label
      });
    }

    logger.info('[GEO Regenerate] createExplainJob starting', { placeId });
    let newJobId: string;
    try {
      newJobId = await createExplainJob(placeId, categoryResolution, resolvedLocationLabel);
      logger.info('[GEO Regenerate] createExplainJob result', {
        type: typeof newJobId,
        value: newJobId
      });
    } catch (jobErr: unknown) {
      const message = jobErr instanceof Error ? jobErr.message : String(jobErr);
      logger.error('[GEO Regenerate] createExplainJob threw', { placeId, error: message });
      res.status(500).json({
        error: { code: 'JOB_CREATE_FAILED', message }
      });
      return;
    }

    // Defensive logging: typeof and value
    logger.info('[GEO Regenerate] createExplainJob returned', {
      placeId,
      typeofNewJobId: typeof newJobId,
      newJobIdValue: JSON.stringify(newJobId)
    });

    // STRICT: Never return 200 without explainJobId
    if (!newJobId || typeof newJobId !== 'string') {
      logger.error('[GEO Regenerate] createExplainJob returned invalid jobId', { placeId });
      res.status(500).json({
        error: { code: 'JOB_CREATE_INVALID', message: 'Backend failed to create explain job' }
      });
      return;
    }

    res.status(200).json({ explainJobId: newJobId });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : null;

    logger.error('[GEO Regenerate] Failed', {
      placeId,
      message: errMsg,
      stack: errStack
    });

    res.status(500).json({
      error: {
        code: 'REGENERATE_FAILED',
        message: errMsg,
        stack: process.env.NODE_ENV === 'development' ? errStack : undefined
      }
    });
  }
}

