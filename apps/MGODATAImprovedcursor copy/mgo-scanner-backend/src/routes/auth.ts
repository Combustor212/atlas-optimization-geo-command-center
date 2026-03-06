/**
 * Authentication Routes
 */
import { Request, Response } from 'express';
import { registerUser, loginUser, refreshAccessToken, logoutUser } from '../services/authService';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/authValidators';
import { requireAuth } from '../middleware/authMiddleware';
import { logger } from '../lib/logger';

/**
 * POST /api/auth/register
 * Register a new user with their own organization
 */
export async function handleRegister(req: Request, res: Response): Promise<void> {
  try {
    // Validate input
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    const result = await registerUser(validation.data);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  } catch (error) {
    logger.error('Register endpoint error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * POST /api/auth/login
 * Login with email and password
 */
export async function handleLogin(req: Request, res: Response): Promise<void> {
  try {
    // Validate input
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    const result = await loginUser(validation.data);

    if (!result.success) {
      res.status(401).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  } catch (error) {
    logger.error('Login endpoint error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
export async function handleRefresh(req: Request, res: Response): Promise<void> {
  try {
    // Validate input
    const validation = refreshTokenSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    const result = await refreshAccessToken(validation.data.refreshToken);

    if (!result.success) {
      res.status(401).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  } catch (error) {
    logger.error('Refresh endpoint error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * POST /api/auth/logout
 * Logout user (client should discard tokens)
 */
export async function handleLogout(req: Request, res: Response): Promise<void> {
  try {
    // requireAuth middleware ensures req.user is set
    if (req.user && req.organizationId) {
      await logoutUser(req.user.id, req.organizationId);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout endpoint error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/auth/me
 * Get current user info
 */
export async function handleGetMe(req: Request, res: Response): Promise<void> {
  try {
    // requireAuth middleware ensures req.user is set
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user!.id,
          email: req.user!.email,
          role: req.user!.role,
          organizationId: req.organizationId,
        },
      },
    });
  } catch (error) {
    logger.error('Get me endpoint error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Setup auth routes
 */
export function setupAuthRoutes(app: any): void {
  app.post('/api/auth/register', handleRegister);
  app.post('/api/auth/login', handleLogin);
  app.post('/api/auth/refresh', handleRefresh);
  app.post('/api/auth/logout', requireAuth, handleLogout);
  app.get('/api/auth/me', requireAuth, handleGetMe);
}



