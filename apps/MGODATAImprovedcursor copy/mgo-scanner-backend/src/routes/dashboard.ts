/**
 * Dashboard Routes
 * Metrics, trends, deltas, and analytics
 */
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { ScanStatus } from '@prisma/client';

/**
 * GET /api/locations/:locationId/metrics
 * Get latest metrics and key stats for a location
 */
export async function handleGetLocationMetrics(req: Request, res: Response): Promise<void> {
  try {
    const { locationId } = req.params;

    // Verify location exists and user has access
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { organizationId: true, name: true },
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

    // Get latest completed scan
    const latestScan = await prisma.scan.findFirst({
      where: {
        locationId,
        status: ScanStatus.COMPLETE,
      },
      orderBy: { completedAt: 'desc' },
      include: {
        scanMetrics: true,
      },
    });

    // Get previous scan for comparison
    const previousScan = latestScan
      ? await prisma.scan.findFirst({
          where: {
            locationId,
            status: ScanStatus.COMPLETE,
            completedAt: { lt: latestScan.completedAt! },
          },
          orderBy: { completedAt: 'desc' },
          select: {
            scoreOverall: true,
            completedAt: true,
          },
        })
      : null;

    // Get scan count
    const scanCount = await prisma.scan.count({
      where: {
        locationId,
        status: ScanStatus.COMPLETE,
      },
    });

    // Compute trend
    let trend: 'up' | 'down' | 'stable' | null = null;
    let trendValue: number | null = null;

    if (latestScan && previousScan && latestScan.scoreOverall && previousScan.scoreOverall) {
      trendValue = latestScan.scoreOverall - previousScan.scoreOverall;
      if (trendValue > 0) trend = 'up';
      else if (trendValue < 0) trend = 'down';
      else trend = 'stable';
    }

    res.status(200).json({
      success: true,
      data: {
        locationName: location.name,
        latestScore: latestScan?.scoreOverall || null,
        scoreBreakdown: latestScan?.scoreBreakdown || null,
        lastScanDate: latestScan?.completedAt || null,
        totalScans: scanCount,
        trend,
        trendValue,
        metrics: latestScan?.scanMetrics || null,
      },
    });
  } catch (error) {
    logger.error('Get location metrics error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/locations/:locationId/deltas
 * Get improvement history (deltas between scans)
 */
export async function handleGetLocationDeltas(req: Request, res: Response): Promise<void> {
  try {
    const { locationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

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

    // Get deltas with scan info
    const deltas = await prisma.scanDelta.findMany({
      where: { locationId },
      include: {
        fromScan: {
          select: {
            completedAt: true,
            scoreOverall: true,
          },
        },
        toScan: {
          select: {
            completedAt: true,
            scoreOverall: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.status(200).json({
      success: true,
      data: { deltas },
    });
  } catch (error) {
    logger.error('Get location deltas error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/locations/:locationId/trends
 * Get score trends over time
 */
export async function handleGetLocationTrends(req: Request, res: Response): Promise<void> {
  try {
    const { locationId } = req.params;
    const days = Math.min(parseInt(req.query.days as string) || 30, 365);

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

    // Get completed scans in date range
    const since = new Date();
    since.setDate(since.getDate() - days);

    const scans = await prisma.scan.findMany({
      where: {
        locationId,
        status: ScanStatus.COMPLETE,
        completedAt: { gte: since },
      },
      select: {
        completedAt: true,
        scoreOverall: true,
        scoreBreakdown: true,
      },
      orderBy: { completedAt: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: {
        trends: scans.map((s) => ({
          date: s.completedAt,
          score: s.scoreOverall,
          breakdown: s.scoreBreakdown,
        })),
      },
    });
  } catch (error) {
    logger.error('Get location trends error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/locations/:locationId/issues
 * Get derived issues/recommendations from latest scan
 */
export async function handleGetLocationIssues(req: Request, res: Response): Promise<void> {
  try {
    const { locationId } = req.params;

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

    // Get latest scan
    const latestScan = await prisma.scan.findFirst({
      where: {
        locationId,
        status: ScanStatus.COMPLETE,
      },
      orderBy: { completedAt: 'desc' },
      select: {
        resultPayload: true,
      },
    });

    if (!latestScan) {
      res.status(404).json({
        success: false,
        error: 'No completed scans found',
      });
      return;
    }

    // Extract issues from result payload
    const issues = extractIssuesFromScanResult(latestScan.resultPayload as any);

    res.status(200).json({
      success: true,
      data: { issues },
    });
  } catch (error) {
    logger.error('Get location issues error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Extract actionable issues from scan result
 */
function extractIssuesFromScanResult(resultPayload: any): any[] {
  const issues: any[] = [];

  // MEO issues
  if (resultPayload?.meo) {
    const meo = resultPayload.meo;

    // Check for missing/incomplete profile
    if (meo.placeDetails) {
      const place = meo.placeDetails;

      if (!place.website) {
        issues.push({
          category: 'MEO',
          severity: 'medium',
          title: 'Missing Website',
          description: 'Add a website to your Google Business Profile',
        });
      }

      if (!place.phoneNumber) {
        issues.push({
          category: 'MEO',
          severity: 'medium',
          title: 'Missing Phone Number',
          description: 'Add a phone number to your profile',
        });
      }

      if ((place.photos?.length || 0) < 5) {
        issues.push({
          category: 'MEO',
          severity: 'high',
          title: 'Insufficient Photos',
          description: 'Add more photos to your profile (recommended: 10+)',
        });
      }

      if ((place.userRatingsTotal || 0) < 10) {
        issues.push({
          category: 'MEO',
          severity: 'high',
          title: 'Low Review Count',
          description: 'Encourage customers to leave reviews',
        });
      }
    }
  }

  // GEO issues
  if (resultPayload?.geo) {
    const geo = resultPayload.geo;

    if (geo.rank && geo.rank > 5) {
      issues.push({
        category: 'GEO',
        severity: 'high',
        title: 'Low Search Ranking',
        description: `Your business ranks #${geo.rank} in local search. Focus on improving visibility.`,
      });
    }
  }

  return issues;
}



