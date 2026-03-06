/**
 * Billing Middleware
 * Feature gating based on subscription status
 */
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

/**
 * Require active subscription
 */
export function requireActiveSubscription(req: Request, res: Response, next: NextFunction): void {
  // This will be called after requireAuth, so req.organizationId is set
  if (!req.organizationId) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  // Check subscription status
  prisma.subscription
    .findFirst({
      where: {
        organizationId: req.organizationId,
        status: { in: ['active', 'trialing'] },
      },
      orderBy: { createdAt: 'desc' },
    })
    .then((subscription) => {
      if (!subscription) {
        res.status(403).json({
          success: false,
          error: 'Active subscription required',
          code: 'SUBSCRIPTION_REQUIRED',
          upgradeUrl: '/billing/upgrade',
        });
        return;
      }

      // Check if subscription is expired
      if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < new Date()) {
        res.status(403).json({
          success: false,
          error: 'Subscription expired',
          code: 'SUBSCRIPTION_EXPIRED',
          upgradeUrl: '/billing/upgrade',
        });
        return;
      }

      // Attach subscription info to request
      (req as any).subscription = subscription;
      next();
    })
    .catch((error) => {
      logger.error('Subscription check failed', {
        error: (error as Error).message,
        organizationId: req.organizationId,
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    });
}

/**
 * Require specific plan level
 */
export function requirePlan(...allowedPlans: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.organizationId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          organizationId: req.organizationId,
          status: { in: ['active', 'trialing'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!subscription) {
        res.status(403).json({
          success: false,
          error: 'Active subscription required',
          code: 'SUBSCRIPTION_REQUIRED',
          upgradeUrl: '/billing/upgrade',
        });
        return;
      }

      if (!allowedPlans.includes(subscription.plan)) {
        res.status(403).json({
          success: false,
          error: 'Plan upgrade required',
          code: 'PLAN_UPGRADE_REQUIRED',
          currentPlan: subscription.plan,
          requiredPlans: allowedPlans,
          upgradeUrl: '/billing/upgrade',
        });
        return;
      }

      (req as any).subscription = subscription;
      next();
    } catch (error) {
      logger.error('Plan check failed', {
        error: (error as Error).message,
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
 * Check feature entitlement
 */
export function requireFeature(featureName: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.organizationId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          organizationId: req.organizationId,
          status: { in: ['active', 'trialing'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!subscription) {
        res.status(403).json({
          success: false,
          error: 'Active subscription required',
          code: 'SUBSCRIPTION_REQUIRED',
          feature: featureName,
          upgradeUrl: '/billing/upgrade',
        });
        return;
      }

      // Define feature entitlements per plan
      const featureMap: Record<string, string[]> = {
        basic: ['scans', 'history'],
        pro: ['scans', 'history', 'exports', 'api_access'],
        elite: ['scans', 'history', 'exports', 'api_access', 'white_label', 'priority_support'],
      };

      const allowedFeatures = featureMap[subscription.plan] || [];

      if (!allowedFeatures.includes(featureName)) {
        res.status(403).json({
          success: false,
          error: 'Feature not available in your plan',
          code: 'FEATURE_NOT_AVAILABLE',
          feature: featureName,
          currentPlan: subscription.plan,
          upgradeUrl: '/billing/upgrade',
        });
        return;
      }

      (req as any).subscription = subscription;
      next();
    } catch (error) {
      logger.error('Feature check failed', {
        error: (error as Error).message,
        organizationId: req.organizationId,
        feature: featureName,
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}



