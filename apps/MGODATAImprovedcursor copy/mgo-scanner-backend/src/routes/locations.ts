/**
 * Location Routes
 */
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { createLocationSchema, updateLocationSchema } from '../validators/orgValidators';

/**
 * POST /api/orgs/:orgId/locations
 * Create a new location for an organization
 */
export async function handleCreateLocation(req: Request, res: Response): Promise<void> {
  try {
    const { orgId } = req.params;
    const validation = createLocationSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const location = await tx.location.create({
        data: {
          organizationId: orgId,
          ...validation.data,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId: req.user!.id,
          action: 'LOCATION_CREATED',
          entityType: 'Location',
          entityId: location.id,
          details: {
            name: location.name,
            city: location.city,
          },
        },
      });

      return location;
    });

    logger.info('Location created', {
      locationId: result.id,
      organizationId: orgId,
      userId: req.user!.id,
    });

    res.status(201).json({
      success: true,
      data: { location: result },
    });
  } catch (error) {
    logger.error('Create location error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/orgs/:orgId/locations
 * Get all locations for an organization
 */
export async function handleGetLocations(req: Request, res: Response): Promise<void> {
  try {
    const { orgId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const [locations, total] = await Promise.all([
      prisma.location.findMany({
        where: { organizationId: orgId },
        include: {
          _count: {
            select: {
              scans: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.location.count({
        where: { organizationId: orgId },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        locations: locations.map((loc) => ({
          ...loc,
          scanCount: loc._count.scans,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get locations error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/locations/:locationId
 * Get location details
 */
export async function handleGetLocation(req: Request, res: Response): Promise<void> {
  try {
    const { locationId } = req.params;

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            scans: true,
          },
        },
      },
    });

    if (!location) {
      res.status(404).json({
        success: false,
        error: 'Location not found',
      });
      return;
    }

    // Verify user has access to this location's organization
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

    res.status(200).json({
      success: true,
      data: {
        location: {
          ...location,
          scanCount: location._count.scans,
        },
      },
    });
  } catch (error) {
    logger.error('Get location error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * PATCH /api/locations/:locationId
 * Update location details
 */
export async function handleUpdateLocation(req: Request, res: Response): Promise<void> {
  try {
    const { locationId } = req.params;
    const validation = updateLocationSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    // Get location to verify org access
    const existingLocation = await prisma.location.findUnique({
      where: { id: locationId },
      select: { organizationId: true },
    });

    if (!existingLocation) {
      res.status(404).json({
        success: false,
        error: 'Location not found',
      });
      return;
    }

    // Verify user has access
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: existingLocation.organizationId,
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

    const result = await prisma.$transaction(async (tx) => {
      const location = await tx.location.update({
        where: { id: locationId },
        data: validation.data,
      });

      await tx.auditLog.create({
        data: {
          organizationId: existingLocation.organizationId,
          userId: req.user!.id,
          action: 'LOCATION_UPDATED',
          entityType: 'Location',
          entityId: locationId,
          details: validation.data,
        },
      });

      return location;
    });

    logger.info('Location updated', {
      locationId,
      userId: req.user!.id,
    });

    res.status(200).json({
      success: true,
      data: { location: result },
    });
  } catch (error) {
    logger.error('Update location error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}



