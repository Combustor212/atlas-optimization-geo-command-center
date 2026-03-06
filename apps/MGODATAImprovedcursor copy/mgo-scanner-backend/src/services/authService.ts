/**
 * Authentication Service
 */
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { generateTokenPair, hashToken, JWTPayload } from '../lib/jwt';
import { logger } from '../lib/logger';
import { RegisterInput, LoginInput } from '../validators/authValidators';
import { UserRole, MemberRole } from '@prisma/client';

const BCRYPT_ROUNDS = 10;

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    organizationId: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  error?: string;
}

/**
 * Register a new user with their own organization
 */
export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      return { success: false, error: 'Email already registered' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    // Create user + organization + membership in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          name: input.name,
          role: UserRole.USER,
        },
      });

      // Create organization with user as owner
      const organization = await tx.organization.create({
        data: {
          name: input.organizationName,
          ownerUserId: user.id,
        },
      });

      // Create organization membership
      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: MemberRole.OWNER,
        },
      });

      // Log audit event
      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          action: 'USER_REGISTERED',
          entityType: 'User',
          entityId: user.id,
          details: {
            email: user.email,
            organizationName: organization.name,
          },
        },
      });

      return { user, organization };
    });

    // Generate tokens
    const jwtPayload: JWTPayload = {
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      organizationId: result.organization.id,
    };

    const tokens = generateTokenPair(jwtPayload);

    // Store hashed refresh token
    await prisma.user.update({
      where: { id: result.user.id },
      data: {
        lastLogin: new Date(),
      },
    });

    // TODO: Store refresh token in separate RefreshToken table with expiry
    // For now, we'll validate it via JWT expiry only

    logger.info('User registered successfully', {
      userId: result.user.id,
      email: result.user.email,
      organizationId: result.organization.id,
    });

    return {
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        organizationId: result.organization.id,
      },
      tokens,
    };
  } catch (error) {
    logger.error('Registration failed', { error: (error as Error).message });
    return { success: false, error: 'Registration failed' };
  }
}

/**
 * Login user with email and password
 */
export async function loginUser(input: LoginInput): Promise<AuthResult> {
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        memberships: {
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user || !user.passwordHash) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Verify password
    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Get primary organization
    const primaryOrgId = user.memberships[0]?.organizationId;
    if (!primaryOrgId) {
      return { success: false, error: 'No organization found for user' };
    }

    // Generate tokens
    const jwtPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: primaryOrgId,
    };

    const tokens = generateTokenPair(jwtPayload);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        organizationId: primaryOrgId,
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id,
      },
    });

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: primaryOrgId,
      },
      tokens,
    };
  } catch (error) {
    logger.error('Login failed', { error: (error as Error).message });
    return { success: false, error: 'Login failed' };
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthResult> {
  try {
    const { verifyToken } = await import('../lib/jwt');
    const payload = verifyToken(refreshToken);

    if (!payload) {
      return { success: false, error: 'Invalid or expired refresh token' };
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        memberships: {
          where: { organizationId: payload.organizationId },
          take: 1,
        },
      },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.memberships.length === 0) {
      return { success: false, error: 'Organization membership not found' };
    }

    // Generate new token pair
    const jwtPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: payload.organizationId,
    };

    const tokens = generateTokenPair(jwtPayload);

    logger.info('Access token refreshed', { userId: user.id });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: payload.organizationId,
      },
      tokens,
    };
  } catch (error) {
    logger.error('Token refresh failed', { error: (error as Error).message });
    return { success: false, error: 'Token refresh failed' };
  }
}

/**
 * Logout user (client should discard tokens)
 */
export async function logoutUser(userId: string, organizationId: string): Promise<void> {
  try {
    // Log audit event
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: userId,
      },
    });

    logger.info('User logged out', { userId });
  } catch (error) {
    logger.error('Logout audit log failed', { error: (error as Error).message });
  }
}



