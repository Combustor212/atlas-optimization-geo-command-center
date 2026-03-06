/**
 * Admin Routes
 * Admin-only endpoints for system management
 */
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

/**
 * GET /api/admin/audit-logs
 * Get audit logs (admin only)
 */
export async function handleGetAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = (page - 1) * limit;

    const action = req.query.action as string | undefined;
    const organizationId = req.query.organizationId as string | undefined;
    const userId = req.query.userId as string | undefined;

    const where: any = {};
    if (action) where.action = action;
    if (organizationId) where.organizationId = organizationId;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
          organization: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get audit logs error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
export async function handleGetUsers(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          lastLogin: true,
          _count: {
            select: {
              memberships: true,
              scans: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.user.count(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get users error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/admin/organizations
 * Get all organizations (admin only)
 */
export async function handleGetAllOrganizations(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = (page - 1) * limit;

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        include: {
          owner: {
            select: {
              email: true,
              name: true,
            },
          },
          _count: {
            select: {
              members: true,
              locations: true,
              scans: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.organization.count(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        organizations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get organizations error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/admin/stats
 * Get system-wide statistics (admin only)
 */
export async function handleGetSystemStats(req: Request, res: Response): Promise<void> {
  try {
    const [userCount, orgCount, locationCount, scanCount, activeSubscriptions] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.location.count(),
      prisma.scan.count(),
      prisma.subscription.count({
        where: {
          status: { in: ['active', 'trialing'] },
        },
      }),
    ]);

    // Get scans by status
    const scansByStatus = await prisma.scan.groupBy({
      by: ['status'],
      _count: true,
    });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentScans = await prisma.scan.count({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
    });

    const recentUsers = await prisma.user.count({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        totals: {
          users: userCount,
          organizations: orgCount,
          locations: locationCount,
          scans: scanCount,
          activeSubscriptions,
        },
        scansByStatus: scansByStatus.reduce((acc: any, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
        recentActivity: {
          scansLast7Days: recentScans,
          usersLast7Days: recentUsers,
        },
      },
    });
  } catch (error) {
    logger.error('Get system stats error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/admin/exports/scans.csv
 * Export scans to CSV (admin only)
 */
export async function handleExportScans(req: Request, res: Response): Promise<void> {
  try {
    const organizationId = req.query.organizationId as string | undefined;

    const where: any = {};
    if (organizationId) where.organizationId = organizationId;

    const scans = await prisma.scan.findMany({
      where,
      include: {
        location: {
          select: {
            name: true,
            city: true,
          },
        },
        organization: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000, // Limit to prevent memory issues
    });

    // Generate CSV
    const headers = [
      'Scan ID',
      'Organization',
      'Location',
      'City',
      'Status',
      'Score',
      'Created At',
      'Completed At',
    ];

    const rows = scans.map((scan) => [
      scan.id,
      scan.organization.name,
      scan.location.name,
      scan.location.city,
      scan.status,
      scan.scoreOverall || '',
      scan.createdAt.toISOString(),
      scan.completedAt?.toISOString() || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=scans.csv');
    res.status(200).send(csv);
  } catch (error) {
    logger.error('Export scans error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}



