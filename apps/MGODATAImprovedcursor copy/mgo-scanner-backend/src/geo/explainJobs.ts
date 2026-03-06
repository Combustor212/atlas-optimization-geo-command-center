/**
 * GEO Explain Job Manager
 * Handles async generation of GEO explain data with polling
 */

import { logger } from '../lib/logger';
import { runGEOBenchmark } from './geoEngine';
import type { CategoryResolution } from './resolveCategory';
import { classifyIndustry, type IndustryClassification } from './industryClassifier';
import { getDB } from '../db/schema';

export interface GEOExplainJob {
  jobId: string;
  placeId: string;
  status: 'queued' | 'running' | 'completed' | 'failed'; // STRICT: no 'pending' or 'unknown'
  step: 'INIT' | 'BENCHMARK' | 'CLASSIFY' | 'GENERATE_QUERIES' | 'EVALUATE' | 'DONE';
  progress: number; // 0-100
  result?: GEOExplainData;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

import { generateGEOQueries } from './queryGenerator';
import { evaluateQueries, calculateStats, type GEOQueryResult, type GEOExplainStats } from './queryEvaluator';

export interface GEOExplainData {
  version: 'v2';
  generatedAt: string;
  stats: GEOExplainStats;
  queries: GEOQueryResult[];
  geoScore: number;
  percentile: number;
  nicheLabel: string;
  locationLabel: string;
  industryClassification?: IndustryClassification;
}

// In-memory job store (for fast access, backed by DB)
const explainJobs = new Map<string, GEOExplainJob>();

/**
 * Persist job to database
 */
function persistJob(job: GEOExplainJob): void {
  try {
    const db = getDB();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO geo_explain_jobs 
      (job_id, place_id, status, step, progress, error, result, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      job.jobId,
      job.placeId,
      job.status,
      job.step,
      job.progress,
      job.error,
      job.result ? JSON.stringify(job.result) : null,
      job.createdAt,
      job.updatedAt
    );
    
    logger.info('[GEO Explain Jobs] Persisted to DB', { jobId: job.jobId, status: job.status });
  } catch (error) {
    logger.error('[GEO Explain Jobs] Failed to persist to DB', {
      jobId: job.jobId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Load job from database
 */
function loadJobFromDB(jobId: string): GEOExplainJob | undefined {
  try {
    const db = getDB();
    const stmt = db.prepare(`
      SELECT * FROM geo_explain_jobs WHERE job_id = ?
    `);
    
    const row = stmt.get(jobId) as any;
    if (!row) return undefined;
    
    const job: GEOExplainJob = {
      jobId: row.job_id,
      placeId: row.place_id,
      status: row.status,
      step: row.step,
      progress: row.progress,
      error: row.error,
      result: row.result ? JSON.parse(row.result) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
    return job;
  } catch (error) {
    logger.error('[GEO Explain Jobs] Failed to load from DB', {
      jobId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return undefined;
  }
}

// Cleanup old jobs (older than 2 hours)
setInterval(() => {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const db = getDB();
    const result = db.prepare(`
      DELETE FROM geo_explain_jobs WHERE created_at < ?
    `).run(twoHoursAgo);
    
    if (result.changes > 0) {
      logger.info('[GEO Explain Jobs] Cleaned up old jobs from DB', { count: result.changes });
    }
    
    // Also clean up in-memory cache
    const entries = Array.from(explainJobs.entries());
    for (const [jobId, job] of entries) {
      if (job.createdAt < twoHoursAgo) {
        explainJobs.delete(jobId);
      }
    }
  } catch (error) {
    logger.error('[GEO Explain Jobs] Cleanup failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}, 15 * 60 * 1000); // Every 15 minutes

/**
 * Create a new explain job and start generation in background
 */
export function createExplainJob(
  placeId: string,
  categoryResolution: CategoryResolution,
  locationLabel: string
): string {
  const jobId = `geo_explain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const job: GEOExplainJob = {
    jobId,
    placeId,
    status: 'queued', // STRICT: use 'queued' not 'pending'
    step: 'INIT',
    progress: 0,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Store in memory AND persist to DB
  explainJobs.set(jobId, job);
  persistJob(job);
  
  // DEV: Log creation with key consistency check
  if (process.env.NODE_ENV === 'development') {
    logger.info(`[GEO_CREATE] jobId=${jobId} ttl=2h placeId=${placeId.slice(0, 20)}...`);
  } else {
    logger.info('[GEO Explain Jobs] Created job', { jobId, placeId, status: 'queued' });
  }

  // Start generation in background (don't await)
  generateExplainData(jobId, placeId, categoryResolution, locationLabel).catch((error) => {
    logger.error('[GEO Explain Jobs] Generation failed', {
      jobId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    const failedJob = explainJobs.get(jobId);
    if (failedJob) {
      failedJob.status = 'failed';
      failedJob.step = 'DONE';
      failedJob.progress = 100;
      failedJob.error = error instanceof Error ? error.message : 'Unknown error';
      failedJob.updatedAt = new Date().toISOString();
    }
  });

  return jobId;
}

/**
 * Get job status and result
 */
export function getExplainJob(jobId: string): GEOExplainJob | null {
  // Try memory first (fast path)
  let job = explainJobs.get(jobId);
  
  // If not in memory, try loading from DB (recovery path)
  if (!job) {
    job = loadJobFromDB(jobId);
    if (job) {
      // Cache in memory for future requests
      explainJobs.set(jobId, job);
      logger.info('[GEO Explain Jobs] Loaded job from DB', { jobId });
    }
  }
  
  return job || null;
}

/**
 * Background task to generate explain data
 */
async function generateExplainData(
  jobId: string,
  placeId: string,
  categoryResolution: CategoryResolution,
  locationLabel: string
): Promise<void> {
  const job = explainJobs.get(jobId);
  if (!job) {
    logger.error('[GEO Explain Jobs] Job not found', { jobId });
    return;
  }

  // STRICT STATE MACHINE: Update status and persist each step
  const updateJobState = (status: 'queued' | 'running' | 'completed' | 'failed', step: string, progress: number, error: string | null = null) => {
    job.status = status;
    job.step = step as any;
    job.progress = progress;
    if (error) job.error = error;
    job.updatedAt = new Date().toISOString();
    persistJob(job); // Persist every state transition
    logger.info('[GEO Explain Jobs] State transition', { jobId, status, step, progress });
  };

  updateJobState('running', 'BENCHMARK', 10, null);
  
  logger.info('[GEO Explain Jobs] Starting generation', { jobId, placeId });

  // TIMEOUT PROTECTION: Set a hard timeout of 120 seconds
  const GENERATION_TIMEOUT_MS = 120000;
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('GEO generation timeout (120s)')), GENERATION_TIMEOUT_MS);
  });

  try {
    await Promise.race([
      (async () => {
        // Run GEO benchmark to get base score (this is the expensive operation)
        updateJobState('running', 'BENCHMARK', 20, null);
        
        const benchmarkResult = await runGEOBenchmark(placeId, {
          radiusMeters: 5000,
          targetQueryCount: 50,
          forceRefresh: true,
          categoryResolution,
          locationLabel
        });

        if ('error' in benchmarkResult) {
          throw new Error(benchmarkResult.message || 'Benchmark failed');
        }

        // Step 1: Classify industry for better query generation
        updateJobState('running', 'CLASSIFY', 40, null);
        
        const businessName = benchmarkResult.nicheLabel || categoryResolution.label || 'Business';
        const location = locationLabel || 'Unknown';
        const category = categoryResolution.label || benchmarkResult.niche || 'local business';
        
        const industryClassification = await classifyIndustry(
          businessName,
          category,
          placeId
        );
        
        logger.info('[GEO Explain Jobs] Industry classified', {
          jobId,
          industry: industryClassification.industry,
          vertical: industryClassification.vertical,
          serviceKeywords: industryClassification.serviceKeywords,
          confidence: industryClassification.confidence
        });

        // Step 2: Generate queries using industry classification
        updateJobState('running', 'GENERATE_QUERIES', 50, null);
        
        const querySet = generateGEOQueries(
          category,
          location,
          { industryClassification }
        );

        logger.info('[GEO Explain Jobs] Generated queries', {
          jobId,
          count: querySet.queries.length
        });

        // Evaluate queries in parallel
        updateJobState('running', 'EVALUATE', 60, null);
        
        const queryResults = await evaluateQueries(
          querySet.queries,
          businessName,
          placeId,
          location,
          5 // concurrency limit
        );

        // Calculate statistics
        updateJobState('running', 'EVALUATE', 90, null);
        const stats = calculateStats(queryResults);

        logger.info('[GEO Explain Jobs] Query evaluation complete', {
          jobId,
          stats: {
            tested: stats.queriesTested,
            mentions: stats.mentions,
            top3: stats.top3
          }
        });

        // Transform benchmark result into explain data v2
        const explainData: GEOExplainData = {
          version: 'v2',
          generatedAt: new Date().toISOString(),
          stats,
          queries: queryResults,
          geoScore: benchmarkResult.geoScore ?? 0,
          percentile: benchmarkResult.percentile ?? 0,
          nicheLabel: benchmarkResult.nicheLabel,
          locationLabel: benchmarkResult.locationLabel,
          industryClassification
        };
        
        updateJobState('completed', 'DONE', 100, null);
        job.result = explainData;
        
        logger.info('[GEO Explain Jobs] Generation completed', { 
          jobId, 
          geoScore: explainData.geoScore,
          queriesEvaluated: explainData.queries.length,
          mentions: explainData.stats.mentions
        });
      })(),
      timeoutPromise
    ]);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    updateJobState('failed', 'DONE', 100, errorMessage);
    logger.error('[GEO Explain Jobs] Generation failed', {
      jobId,
      error: errorMessage
    });
    // Don't re-throw - job is marked as failed
  }
}




