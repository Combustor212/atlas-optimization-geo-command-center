/**
 * Scan Job Processor
 * Executes scan logic and stores results
 */
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { ScanStatus } from '@prisma/client';

// Import existing scan engines
import { runMEOScan } from '../meo/meoEngine';
import { runGEOBenchmark } from '../geo/geoEngine';

export interface ScanJobPayload {
  scanId: string;
  locationId: string;
  organizationId: string;
  userId?: string;
  inputPayload: any;
}

/**
 * Process a scan job
 */
export async function processScanJob(payload: ScanJobPayload): Promise<void> {
  const { scanId, locationId, organizationId, inputPayload } = payload;

  try {
    logger.info('Starting scan job', { scanId, locationId });

    // Update scan status to RUNNING
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: ScanStatus.RUNNING,
      },
    });

    // Run MEO scan
    const meoResult = await runMEOScan({
      businessName: inputPayload.businessName,
      city: inputPayload.city,
      state: inputPayload.state,
      country: inputPayload.country || 'US',
      placeId: inputPayload.googlePlaceId,
    });

    // Run GEO scan if place ID available
    let geoResult = null;
    if (inputPayload.googlePlaceId) {
      try {
        geoResult = await runGEOBenchmark({
          placeId: inputPayload.googlePlaceId,
          businessName: inputPayload.businessName,
          city: inputPayload.city,
        });
      } catch (error) {
        logger.warn('GEO scan failed, continuing with MEO only', {
          error: (error as Error).message,
          scanId,
        });
      }
    }

    // Compute overall score and breakdown
    const scoreOverall = computeOverallScore(meoResult, geoResult);
    const scoreBreakdown = {
      meo: meoResult?.score || 0,
      geo: geoResult?.score || 0,
    };

    // Store result
    const resultPayload = {
      meo: meoResult,
      geo: geoResult,
      timestamp: new Date().toISOString(),
    };

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: ScanStatus.COMPLETE,
        completedAt: new Date(),
        resultPayload,
        scoreOverall,
        scoreBreakdown,
        version: '1.0',
      },
    });

    // Compute delta vs previous scan
    await computeAndStoreDelta(locationId, scanId);

    // Create scan metrics (optional normalized table)
    if (meoResult?.placeDetails) {
      await prisma.scanMetrics.upsert({
        where: { scanId },
        create: {
          scanId,
          rating: meoResult.placeDetails.rating || null,
          reviewCount: meoResult.placeDetails.userRatingsTotal || null,
          photoCount: meoResult.placeDetails.photos?.length || null,
        },
        update: {
          rating: meoResult.placeDetails.rating || null,
          reviewCount: meoResult.placeDetails.userRatingsTotal || null,
          photoCount: meoResult.placeDetails.photos?.length || null,
        },
      });
    }

    logger.info('Scan job completed', {
      scanId,
      locationId,
      scoreOverall,
    });
  } catch (error) {
    logger.error('Scan job failed', {
      scanId,
      locationId,
      error: (error as Error).message,
      stack: (error as Error).stack,
    });

    // Update scan status to FAILED
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: ScanStatus.FAILED,
        resultPayload: {
          error: (error as Error).message,
        },
      },
    });

    throw error;
  }
}

/**
 * Compute overall score from MEO and GEO results
 */
function computeOverallScore(meoResult: any, geoResult: any): number {
  const meoScore = meoResult?.score || 0;
  const geoScore = geoResult?.score || 0;

  // Weighted average: 60% MEO, 40% GEO
  if (geoScore > 0) {
    return Math.round(meoScore * 0.6 + geoScore * 0.4);
  }

  // MEO only
  return meoScore;
}

/**
 * Compute delta between current scan and previous scan
 */
async function computeAndStoreDelta(locationId: string, currentScanId: string): Promise<void> {
  try {
    // Get previous completed scan for this location
    const previousScan = await prisma.scan.findFirst({
      where: {
        locationId,
        status: ScanStatus.COMPLETE,
        id: { not: currentScanId },
      },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        scoreOverall: true,
        scoreBreakdown: true,
      },
    });

    if (!previousScan || !previousScan.scoreOverall) {
      logger.debug('No previous scan found for delta computation', { locationId });
      return;
    }

    // Get current scan
    const currentScan = await prisma.scan.findUnique({
      where: { id: currentScanId },
      select: {
        scoreOverall: true,
        scoreBreakdown: true,
      },
    });

    if (!currentScan || !currentScan.scoreOverall) {
      logger.warn('Current scan has no score', { scanId: currentScanId });
      return;
    }

    // Compute deltas
    const deltaOverall = currentScan.scoreOverall - previousScan.scoreOverall;
    const deltaBreakdown = computeBreakdownDelta(
      previousScan.scoreBreakdown as any,
      currentScan.scoreBreakdown as any
    );

    // Store delta
    await prisma.scanDelta.create({
      data: {
        locationId,
        fromScanId: previousScan.id,
        toScanId: currentScanId,
        deltaOverall,
        deltaBreakdown,
      },
    });

    logger.info('Scan delta computed', {
      locationId,
      fromScanId: previousScan.id,
      toScanId: currentScanId,
      deltaOverall,
    });
  } catch (error) {
    logger.error('Failed to compute scan delta', {
      locationId,
      currentScanId,
      error: (error as Error).message,
    });
    // Don't throw - delta computation failure shouldn't fail the scan
  }
}

/**
 * Compute breakdown delta
 */
function computeBreakdownDelta(previous: any, current: any): any {
  if (!previous || !current) return {};

  const delta: any = {};

  // MEO delta
  if (typeof previous.meo === 'number' && typeof current.meo === 'number') {
    delta.meo = current.meo - previous.meo;
  }

  // GEO delta
  if (typeof previous.geo === 'number' && typeof current.geo === 'number') {
    delta.geo = current.geo - previous.geo;
  }

  return delta;
}



