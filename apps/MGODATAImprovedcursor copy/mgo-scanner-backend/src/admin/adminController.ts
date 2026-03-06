/**
 * Admin Console Controller
 * Handles all admin console page rendering
 */
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { sanitize, prettyJson } from './safeJson';

/**
 * Dashboard - KPIs and stats
 */
export async function renderDashboard(req: Request, res: Response): Promise<void> {
  try {
    // Try to get counts, but fall back to zeros if DB unavailable
    let stats = {
      users: 0,
      orgs: 0,
      locations: 0,
      scans: 0,
      scansLast24h: 0,
      scansLast7d: 0,
      failedJobs: 0,
    };

    try {
      const [userCount, orgCount, locationCount, scanCount] = await Promise.all([
        prisma.user.count(),
        prisma.organization.count(),
        prisma.location.count(),
        prisma.scan.count(),
      ]);

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [scansLast24h, scansLast7d, failedJobs] = await Promise.all([
        prisma.scan.count({ where: { createdAt: { gte: last24h } } }),
        prisma.scan.count({ where: { createdAt: { gte: last7d } } }),
        prisma.job.count({ where: { status: 'FAILED' } }),
      ]);

      stats = {
        users: userCount,
        orgs: orgCount,
        locations: locationCount,
        scans: scanCount,
        scansLast24h,
        scansLast7d,
        failedJobs,
      };
    } catch (dbError) {
      logger.warn('Database unavailable, showing empty stats', { error: (dbError as Error).message });
    }

    res.render('admin/dashboard', {
      title: 'Dashboard',
      stats,
    });
  } catch (error) {
    logger.error('Admin dashboard error', { error: (error as Error).message });
    res.status(500).send('Internal server error');
  }
}

/**
 * Users list
 */
export async function renderUsers(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = (page - 1) * limit;
    const search = req.query.q as string | undefined;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.render('admin/users', {
      title: 'Users',
      users: users.map(sanitize),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      search: search || '',
    });
  } catch (error) {
    logger.error('Admin users error', { error: (error as Error).message });
    res.status(500).send('Internal server error');
  }
}

/**
 * User detail
 */
export async function renderUserDetail(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizationMembers: {
          include: {
            org: true,
          },
        },
        scans: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            scoreOverall: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).send('User not found');
      return;
    }

    res.render('admin/userDetail', {
      title: `User: ${user.email}`,
      user: sanitize(user),
    });
  } catch (error) {
    logger.error('Admin user detail error', { error: (error as Error).message });
    res.status(500).send('Internal server error');
  }
}

/**
 * Organizations list
 */
export async function renderOrganizations(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = (page - 1) * limit;
    const search = req.query.q as string | undefined;

    const where: any = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where,
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
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.organization.count({ where }),
    ]);

    res.render('admin/organizations', {
      title: 'Organizations',
      orgs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      search: search || '',
    });
  } catch (error) {
    logger.error('Admin organizations error', { error: (error as Error).message });
    res.status(500).send('Internal server error');
  }
}

/**
 * Organization detail
 */
export async function renderOrganizationDetail(req: Request, res: Response): Promise<void> {
  try {
    const { orgId } = req.params;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
          },
        },
        locations: {
          take: 50,
        },
        scans: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            locationId: true,
            status: true,
            scoreOverall: true,
            createdAt: true,
          },
        },
      },
    });

    if (!org) {
      res.status(404).send('Organization not found');
      return;
    }

    res.render('admin/organizationDetail', {
      title: `Organization: ${org.name}`,
      org,
    });
  } catch (error) {
    logger.error('Admin org detail error', { error: (error as Error).message });
    res.status(500).send('Internal server error');
  }
}

/**
 * Locations list
 */
export async function renderLocations(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = (page - 1) * limit;
    const search = req.query.q as string | undefined;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [locations, total] = await Promise.all([
      prisma.location.findMany({
        where,
        include: {
          org: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.location.count({ where }),
    ]);

    // Get latest scan for each location
    const locationIds = locations.map((l) => l.id);
    const latestScans = await prisma.scan.groupBy({
      by: ['locationId'],
      where: {
        locationId: { in: locationIds },
        status: 'COMPLETE',
      },
      _max: {
        completedAt: true,
        scoreOverall: true,
      },
    });

    const scanMap = latestScans.reduce((acc: any, scan) => {
      if (scan.locationId) {
        acc[scan.locationId] = {
          lastScanDate: scan._max.completedAt,
          latestScore: scan._max.scoreOverall,
        };
      }
      return acc;
    }, {});

    const locationsWithScans = locations.map((loc) => ({
      ...loc,
      lastScanDate: scanMap[loc.id]?.lastScanDate || null,
      latestScore: scanMap[loc.id]?.latestScore || null,
    }));

    res.render('admin/locations', {
      title: 'Locations',
      locations: locationsWithScans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      search: search || '',
    });
  } catch (error) {
    logger.error('Admin locations error', { error: (error as Error).message });
    res.status(500).send('Internal server error');
  }
}

/**
 * Location detail
 */
export async function renderLocationDetail(req: Request, res: Response): Promise<void> {
  try {
    const { locationId } = req.params;

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        org: {
          select: {
            id: true,
            name: true,
          },
        },
        scans: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            scanType: true,
            status: true,
            scoreOverall: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!location) {
      res.status(404).send('Location not found');
      return;
    }

    res.render('admin/locationDetail', {
      title: `Location: ${location.name}`,
      location,
    });
  } catch (error) {
    logger.error('Admin location detail error', { error: (error as Error).message });
    res.status(500).send('Internal server error');
  }
}

/**
 * Scans list
 */
export async function renderScans(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const orgId = req.query.orgId as string | undefined;

    const where: any = {};
    if (status) where.status = status;
    if (orgId) where.orgId = orgId;

    const [scans, total] = await Promise.all([
      prisma.scan.findMany({
        where,
        include: {
          location: {
            select: {
              name: true,
              city: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.scan.count({ where }),
    ]);

    res.render('admin/scans', {
      title: 'Scans',
      scans: scans.map(sanitize),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: { status, orgId },
    });
  } catch (error) {
    logger.error('Admin scans error', { error: (error as Error).message });
    res.status(500).send('Internal server error');
  }
}

/**
 * Scan detail
 */
export async function renderScanDetail(req: Request, res: Response): Promise<void> {
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
            org: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!scan) {
      res.status(404).send('Scan not found');
      return;
    }

    res.render('admin/scanDetail', {
      title: `Scan: ${scan.id.substring(0, 8)}...`,
      scan: sanitize(scan),
      inputPayloadJson: prettyJson(scan.inputPayload),
      resultPayloadJson: prettyJson(scan.resultPayload),
      scoreBreakdownJson: prettyJson(scan.scoreBreakdown),
    });
  } catch (error) {
    logger.error('Admin scan detail error', { error: (error as Error).message });
    res.status(500).send('Internal server error');
  }
}

/**
 * Jobs list
 */
export async function renderJobs(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (status) where.status = status;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.job.count({ where }),
    ]);

    res.render('admin/jobs', {
      title: 'Background Jobs',
      jobs: jobs.map(sanitize),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: { status },
    });
  } catch (error) {
    logger.error('Admin jobs error', { error: (error as Error).message });
    res.status(500).send('Internal server error');
  }
}

/**
 * Job detail
 */
export async function renderJobDetail(req: Request, res: Response): Promise<void> {
  try {
    const { jobId } = req.params;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      res.status(404).send('Job not found');
      return;
    }

    res.render('admin/jobDetail', {
      title: `Job: ${job.id.substring(0, 8)}...`,
      job: sanitize(job),
      payloadJson: prettyJson(job.payload),
    });
  } catch (error) {
    logger.error('Admin job detail error', { error: (error as Error).message });
    res.status(500).send('Internal server error');
  }
}

/**
 * Audit logs list
 */
export async function renderAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = (page - 1) * limit;
    const action = req.query.action as string | undefined;
    const orgId = req.query.orgId as string | undefined;
    const userId = req.query.userId as string | undefined;

    const where: any = {};
    if (action) where.action = action;
    if (orgId) where.orgId = orgId;
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
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.render('admin/auditLogs', {
      title: 'Audit Logs',
      logs: logs.map(sanitize),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: { action, orgId, userId },
    });
  } catch (error) {
    logger.error('Admin audit logs error', { error: (error as Error).message });
    res.status(500).send('Internal server error');
  }
}

