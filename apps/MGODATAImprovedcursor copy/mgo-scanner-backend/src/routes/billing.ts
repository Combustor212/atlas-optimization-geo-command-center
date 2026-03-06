/**
 * Billing Routes
 * Subscription status and management
 */
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

/**
 * GET /api/billing/status
 * Get current subscription status for user's organization
 */
export async function handleGetBillingStatus(req: Request, res: Response): Promise<void> {
  try {
    if (!req.organizationId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const subscription = await prisma.subscription.findFirst({
      where: { organizationId: req.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    // Also get Stripe subscription if exists
    const stripeSubscription = await prisma.stripeSubscription.findFirst({
      where: { organizationId: req.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: {
        subscription: subscription || null,
        stripeSubscription: stripeSubscription || null,
        hasActiveSubscription: subscription?.status === 'active' || subscription?.status === 'trialing',
      },
    });
  } catch (error) {
    logger.error('Get billing status error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}



