/**
 * DB-Backed Job Queue Service
 * Simple background job processing without Redis dependency
 */
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export enum JobType {
  SCAN = 'SCAN',
  EMAIL = 'EMAIL',
}

export enum JobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface JobPayload {
  type: JobType;
  data: any;
}

let workerRunning = false;
let workerInterval: NodeJS.Timeout | null = null;

/**
 * Enqueue a new job
 */
export async function enqueueJob(
  type: JobType,
  data: any,
  idempotencyKey?: string
): Promise<string> {
  try {
    // Check for duplicate if idempotency key provided
    if (idempotencyKey) {
      const existing = await prisma.$queryRaw<any[]>`
        SELECT id FROM "JobQueue" 
        WHERE "idempotencyKey" = ${idempotencyKey}
        AND status IN ('PENDING', 'RUNNING', 'COMPLETED')
        LIMIT 1
      `;

      if (existing && existing.length > 0) {
        logger.debug('Job already exists', { idempotencyKey });
        return existing[0].id;
      }
    }

    const job = await prisma.$executeRaw`
      INSERT INTO "JobQueue" (id, type, status, payload, "idempotencyKey", "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::text,
        ${type}::text,
        'PENDING'::text,
        ${JSON.stringify(data)}::jsonb,
        ${idempotencyKey || null},
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    // Get the inserted ID
    const result = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "JobQueue" 
      WHERE "idempotencyKey" = ${idempotencyKey || null}
      AND type = ${type}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    const jobId = result[0]?.id || crypto.randomUUID();

    logger.info('Job enqueued', { jobId, type, idempotencyKey });
    return jobId;
  } catch (error) {
    logger.error('Failed to enqueue job', {
      error: (error as Error).message,
      type,
    });
    throw error;
  }
}

/**
 * Process a single job
 */
async function processJob(job: any): Promise<void> {
  const { id, type, payload } = job;

  try {
    logger.info('Processing job', { jobId: id, type });

    // Mark as running
    await prisma.$executeRaw`
      UPDATE "JobQueue"
      SET status = 'RUNNING'::text, "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    // Process based on type
    if (type === JobType.SCAN) {
      const { processScanJob } = await import('./scanJob');
      await processScanJob(payload);
    } else if (type === JobType.EMAIL) {
      const { processEmailJob } = await import('./emailJob');
      await processEmailJob(payload);
    } else {
      throw new Error(`Unknown job type: ${type}`);
    }

    // Mark as completed
    await prisma.$executeRaw`
      UPDATE "JobQueue"
      SET status = 'COMPLETED'::text, "completedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    logger.info('Job completed', { jobId: id, type });
  } catch (error) {
    logger.error('Job failed', {
      jobId: id,
      type,
      error: (error as Error).message,
    });

    // Increment retry count
    const retries = job.retries || 0;
    const maxRetries = 5;

    if (retries < maxRetries) {
      await prisma.$executeRaw`
        UPDATE "JobQueue"
        SET 
          status = 'PENDING'::text,
          retries = ${retries + 1},
          error = ${(error as Error).message},
          "updatedAt" = NOW()
        WHERE id = ${id}
      `;
      logger.info('Job will be retried', { jobId: id, retries: retries + 1 });
    } else {
      await prisma.$executeRaw`
        UPDATE "JobQueue"
        SET 
          status = 'FAILED'::text,
          error = ${(error as Error).message},
          "updatedAt" = NOW()
        WHERE id = ${id}
      `;
      logger.error('Job permanently failed', { jobId: id });
    }
  }
}

/**
 * Worker loop - polls for pending jobs
 */
async function workerLoop(): Promise<void> {
  if (!workerRunning) return;

  try {
    // Get next pending job (FIFO with retry backoff)
    const jobs = await prisma.$queryRaw<any[]>`
      SELECT * FROM "JobQueue"
      WHERE status = 'PENDING'::text
      AND (retries = 0 OR "updatedAt" < NOW() - INTERVAL '1 minute' * POW(2, retries))
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;

    if (jobs && jobs.length > 0) {
      await processJob(jobs[0]);
    }
  } catch (error) {
    logger.error('Worker loop error', { error: (error as Error).message });
  }

  // Schedule next iteration
  if (workerRunning) {
    setTimeout(workerLoop, 1000); // Poll every 1 second
  }
}

/**
 * Start the background worker
 */
export function startWorker(): void {
  if (workerRunning) {
    logger.warn('Worker already running');
    return;
  }

  workerRunning = true;
  logger.info('Starting job queue worker');
  workerLoop();
}

/**
 * Stop the background worker
 */
export function stopWorker(): void {
  workerRunning = false;
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
  logger.info('Job queue worker stopped');
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<any> {
  const job = await prisma.$queryRaw<any[]>`
    SELECT * FROM "JobQueue"
    WHERE id = ${jobId}
    LIMIT 1
  `;

  return job && job.length > 0 ? job[0] : null;
}



