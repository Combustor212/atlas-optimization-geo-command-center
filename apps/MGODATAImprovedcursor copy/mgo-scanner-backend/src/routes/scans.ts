/**
 * Scan Routes
 */
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { runScanSchema, getScanHistorySchema } from '../validators/scanValidators';
import { enqueueJob, JobType } from '../jobs/queueService';
import { ScanType, ScanStatus } from '@prisma/client';

/**
 * POST /api/scans/run
 * Start a new scan (returns immediately with scanId)
 */
export async function handleRunScan(req: Request, res: Response): Promise<void> {
  try {
    const validation = runScanSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    const { locationId, scanType, source, inputPayload } = validation.data;

    // Verify location exists and user has access
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { organizationId: true },
    });

    if (!location) {
      res.status(404).json({
        success: false,
        error: 'Location not found',
      });
      return;
    }

    // Verify user has access to this organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: location.organizationId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    // Create scan record
    const scan = await prisma.scan.create({
      data: {
        organizationId: location.organizationId,
        locationId,
        userId: req.user!.id,
        scanType: scanType as ScanType,
        status: ScanStatus.QUEUED,
        source: source || 'web',
        inputPayload,
      },
    });

    // Enqueue background job
    const jobId = await enqueueJob(
      JobType.SCAN,
      {
        scanId: scan.id,
        locationId,
        organizationId: location.organizationId,
        userId: req.user!.id,
        inputPayload,
      },
      `scan-${scan.id}` // Idempotency key
    );

    // Log audit event
    await prisma.auditLog.create({
      data: {
        organizationId: location.organizationId,
        userId: req.user!.id,
        action: 'SCAN_STARTED',
        entityType: 'Scan',
        entityId: scan.id,
        details: {
          locationId,
          scanType,
        },
      },
    });

    logger.info('Scan queued', {
      scanId: scan.id,
      locationId,
      jobId,
    });

    res.status(202).json({
      success: true,
      data: {
        scanId: scan.id,
        status: scan.status,
        message: 'Scan queued successfully',
      },
    });
  } catch (error) {
    logger.error('Run scan error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/scans/:scanId
 * Get scan details and results
 */
export async function handleGetScan(req: Request, res: Response): Promise<void> {
  try {
    const { scanId } = req.params;

    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        scanMetrics: true,
      },
    });

    if (!scan) {
      res.status(404).json({
        success: false,
        error: 'Scan not found',
      });
      return;
    }

    // Verify user has access
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: scan.organizationId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { scan },
    });
  } catch (error) {
    logger.error('Get scan error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/locations/:locationId/scans
 * Get scan history for a location
 */
export async function handleGetLocationScans(req: Request, res: Response): Promise<void> {
  try {
    const { locationId } = req.params;
    const validation = getScanHistorySchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    const { page, limit, status } = validation.data;
    const offset = (page - 1) * limit;

    // Verify location exists and user has access
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { organizationId: true },
    });

    if (!location) {
      res.status(404).json({
        success: false,
        error: 'Location not found',
      });
      return;
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: location.organizationId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    // Build query
    const where: any = { locationId };
    if (status) {
      where.status = status;
    }

    const [scans, total] = await Promise.all([
      prisma.scan.findMany({
        where,
        select: {
          id: true,
          scanType: true,
          status: true,
          createdAt: true,
          completedAt: true,
          scoreOverall: true,
          scoreBreakdown: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.scan.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        scans,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get location scans error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * POST /api/scans/:scanId/retry
 * Retry a failed scan
 */
export async function handleRetryScan(req: Request, res: Response): Promise<void> {
  try {
    const { scanId } = req.params;

    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      select: {
        id: true,
        status: true,
        organizationId: true,
        locationId: true,
        inputPayload: true,
      },
    });

    if (!scan) {
      res.status(404).json({
        success: false,
        error: 'Scan not found',
      });
      return;
    }

    // Verify user has access
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: scan.organizationId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    // Only allow retry for failed scans
    if (scan.status !== ScanStatus.FAILED) {
      res.status(400).json({
        success: false,
        error: 'Can only retry failed scans',
      });
      return;
    }

    // Reset scan status
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: ScanStatus.QUEUED,
        resultPayload: {},
      },
    });

    // Re-enqueue job
    const jobId = await enqueueJob(
      JobType.SCAN,
      {
        scanId: scan.id,
        locationId: scan.locationId,
        organizationId: scan.organizationId,
        userId: req.user!.id,
        inputPayload: scan.inputPayload,
      },
      `scan-retry-${scan.id}-${Date.now()}` // New idempotency key for retry
    );

    logger.info('Scan retry queued', {
      scanId,
      jobId,
    });

    res.status(200).json({
      success: true,
      data: {
        scanId,
        status: ScanStatus.QUEUED,
        message: 'Scan retry queued successfully',
      },
    });
  } catch (error) {
    logger.error('Retry scan error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}



