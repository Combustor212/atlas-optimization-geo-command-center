/**
 * Organization Routes
 */
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import {
  createOrgSchema,
  updateOrgSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from '../validators/orgValidators';
import { MemberRole } from '@prisma/client';

/**
 * POST /api/orgs
 * Create a new organization (user becomes owner)
 */
export async function handleCreateOrganization(req: Request, res: Response): Promise<void> {
  try {
    const validation = createOrgSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    const userId = req.user!.id;

    // Create organization and membership in transaction
    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: validation.data.name,
          ownerUserId: userId,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId,
          role: MemberRole.OWNER,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          userId,
          action: 'ORG_CREATED',
          entityType: 'Organization',
          entityId: organization.id,
          details: { name: organization.name },
        },
      });

      return organization;
    });

    logger.info('Organization created', {
      organizationId: result.id,
      userId,
    });

    res.status(201).json({
      success: true,
      data: { organization: result },
    });
  } catch (error) {
    logger.error('Create organization error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/orgs
 * Get all organizations user is a member of
 */
export async function handleGetOrganizations(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                members: true,
                locations: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const organizations = memberships.map((m) => ({
      ...m.organization,
      memberRole: m.role,
      memberCount: m.organization._count.members,
      locationCount: m.organization._count.locations,
    }));

    res.status(200).json({
      success: true,
      data: { organizations },
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
 * GET /api/orgs/:orgId
 * Get organization details
 */
export async function handleGetOrganization(req: Request, res: Response): Promise<void> {
  try {
    const { orgId } = req.params;

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
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
        _count: {
          select: {
            locations: true,
            scans: true,
          },
        },
      },
    });

    if (!organization) {
      res.status(404).json({
        success: false,
        error: 'Organization not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        organization: {
          ...organization,
          locationCount: organization._count.locations,
          scanCount: organization._count.scans,
        },
      },
    });
  } catch (error) {
    logger.error('Get organization error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * PATCH /api/orgs/:orgId
 * Update organization details (OWNER/ADMIN only)
 */
export async function handleUpdateOrganization(req: Request, res: Response): Promise<void> {
  try {
    const { orgId } = req.params;
    const validation = updateOrgSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.update({
        where: { id: orgId },
        data: validation.data,
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId: req.user!.id,
          action: 'ORG_UPDATED',
          entityType: 'Organization',
          entityId: orgId,
          details: validation.data,
        },
      });

      return organization;
    });

    logger.info('Organization updated', {
      organizationId: orgId,
      userId: req.user!.id,
    });

    res.status(200).json({
      success: true,
      data: { organization: result },
    });
  } catch (error) {
    logger.error('Update organization error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * POST /api/orgs/:orgId/members
 * Add a member to organization (OWNER/ADMIN only)
 */
export async function handleAddMember(req: Request, res: Response): Promise<void> {
  try {
    const { orgId } = req.params;
    const validation = addMemberSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: validation.data.email.toLowerCase() },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Check if already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      res.status(400).json({
        success: false,
        error: 'User is already a member',
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const member = await tx.organizationMember.create({
        data: {
          organizationId: orgId,
          userId: user.id,
          role: validation.data.role as MemberRole,
        },
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
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId: req.user!.id,
          action: 'MEMBER_ADDED',
          entityType: 'OrganizationMember',
          entityId: user.id,
          details: {
            email: user.email,
            role: validation.data.role,
          },
        },
      });

      return member;
    });

    logger.info('Member added to organization', {
      organizationId: orgId,
      newMemberId: user.id,
      addedBy: req.user!.id,
    });

    res.status(201).json({
      success: true,
      data: { member: result },
    });
  } catch (error) {
    logger.error('Add member error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * PATCH /api/orgs/:orgId/members/:userId
 * Update member role (OWNER only)
 */
export async function handleUpdateMemberRole(req: Request, res: Response): Promise<void> {
  try {
    const { orgId, userId } = req.params;
    const validation = updateMemberRoleSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const member = await tx.organizationMember.update({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId,
          },
        },
        data: {
          role: validation.data.role as MemberRole,
        },
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
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId: req.user!.id,
          action: 'MEMBER_ROLE_UPDATED',
          entityType: 'OrganizationMember',
          entityId: userId,
          details: {
            newRole: validation.data.role,
          },
        },
      });

      return member;
    });

    logger.info('Member role updated', {
      organizationId: orgId,
      memberId: userId,
      updatedBy: req.user!.id,
    });

    res.status(200).json({
      success: true,
      data: { member: result },
    });
  } catch (error) {
    logger.error('Update member role error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * DELETE /api/orgs/:orgId/members/:userId
 * Remove member from organization (OWNER/ADMIN only, cannot remove self if last owner)
 */
export async function handleRemoveMember(req: Request, res: Response): Promise<void> {
  try {
    const { orgId, userId } = req.params;

    // Check if trying to remove self
    if (userId === req.user!.id) {
      // Check if last owner
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId: orgId,
          role: MemberRole.OWNER,
        },
      });

      if (ownerCount === 1) {
        res.status(400).json({
          success: false,
          error: 'Cannot remove the last owner',
        });
        return;
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.organizationMember.delete({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId: req.user!.id,
          action: 'MEMBER_REMOVED',
          entityType: 'OrganizationMember',
          entityId: userId,
        },
      });
    });

    logger.info('Member removed from organization', {
      organizationId: orgId,
      removedMemberId: userId,
      removedBy: req.user!.id,
    });

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    logger.error('Remove member error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}



