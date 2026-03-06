/**
 * Authentication Middleware
 */
import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractBearerToken, JWTPayload } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { UserRole, OrgMemberRole } from '@prisma/client';

// Extend Express Request to include user and organization
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
      organizationId?: string;
      organizationRole?: OrgMemberRole;
    }
  }
}

/**
 * Require authentication (access token must be valid)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
    });
    return;
  }

  // Attach user info to request
  req.user = {
    id: payload.userId,
    email: payload.email,
    role: payload.role as UserRole,
  };
  req.organizationId = payload.organizationId;

  next();
}

/**
 * Optional authentication (attach user if token is present, but don't require it)
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role as UserRole,
      };
      req.organizationId = payload.organizationId;
    }
  }

  next();
}

/**
 * Require specific user role (ADMIN or SUPERADMIN)
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: allowedRoles,
        current: req.user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Require specific organization role (OWNER, ADMIN, or MEMBER)
 * Must be used AFTER requireAuth
 */
export function requireOrgRole(...allowedRoles: OrgMemberRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.organizationId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    try {
      // Fetch organization membership
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: req.organizationId,
            userId: req.user.id,
          },
        },
      });

      if (!membership) {
        res.status(403).json({
          success: false,
          error: 'Not a member of this organization',
          code: 'NOT_ORG_MEMBER',
        });
        return;
      }

      if (!allowedRoles.includes(membership.role)) {
        res.status(403).json({
          success: false,
          error: 'Insufficient organization permissions',
          code: 'FORBIDDEN',
          required: allowedRoles,
          current: membership.role,
        });
        return;
      }

      // Attach org role to request
      req.organizationRole = membership.role;

      next();
    } catch (error) {
      logger.error('Organization role check failed', {
        error: (error as Error).message,
        userId: req.user.id,
        organizationId: req.organizationId,
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

/**
 * Verify user has access to a specific organization
 * Extracts orgId from route params and validates membership
 */
export async function requireOrgAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const orgId = req.params.orgId || req.body.organizationId;

  if (!orgId) {
    res.status(400).json({
      success: false,
      error: 'Organization ID required',
      code: 'ORG_ID_REQUIRED',
    });
    return;
  }

  try {
    // Check if user is a member of this organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: req.user.id,
        },
      },
    });

    if (!membership) {
      res.status(403).json({
        success: false,
        error: 'Access denied to this organization',
        code: 'ORG_ACCESS_DENIED',
      });
      return;
    }

    // Attach org info to request
    req.organizationId = orgId;
    req.organizationRole = membership.role;

    next();
  } catch (error) {
    logger.error('Organization access check failed', {
      error: (error as Error).message,
      userId: req.user.id,
      orgId,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
}

