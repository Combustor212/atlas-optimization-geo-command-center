/**
 * Customer-facing Stripe endpoints
 * Checkout sessions and customer portal
 */
import { Request, Response } from 'express';
import { createCheckoutSession, createCustomerPortalSession } from '../services/stripeService';
import { logger } from '../lib/logger';
import { getDB } from '../db/schema';

/**
 * POST /api/stripe/create-checkout-session
 * Create a Stripe Checkout session for subscription purchase
 */
export async function handleCreateCheckoutSession(req: Request, res: Response): Promise<void> {
  try {
    const {
      tenant_id,
      user_id,
      email,
      plan_key,
      success_url,
      cancel_url,
      trial_days,
    } = req.body;
    
    // Validation
    if (!user_id || !email) {
      res.status(400).json({ error: 'user_id and email are required' });
      return;
    }
    
    if (!plan_key) {
      res.status(400).json({ error: 'plan_key is required' });
      return;
    }
    
    if (!success_url || !cancel_url) {
      res.status(400).json({ error: 'success_url and cancel_url are required' });
      return;
    }
    
    // Get price_id for the plan from plan_mappings
    const db = getDB();
    const effective_tenant_id = tenant_id || 'default';
    
    const mapping = db
      .prepare(`
        SELECT stripe_price_id_test, stripe_price_id_live
        FROM plan_mappings
        WHERE tenant_id = ? AND plan_key = ?
      `)
      .get(effective_tenant_id, plan_key) as
        | { stripe_price_id_test: string; stripe_price_id_live: string }
        | undefined;
    
    if (!mapping) {
      res.status(404).json({
        error: 'Plan not found',
        message: `No price mapping found for plan: ${plan_key}`,
      });
      return;
    }
    
    // Determine which price_id to use based on active mode
    const config_row = db
      .prepare('SELECT active_mode FROM stripe_configs WHERE tenant_id = ? LIMIT 1')
      .get(effective_tenant_id) as { active_mode: 'test' | 'live' } | undefined;
    
    const active_mode = config_row?.active_mode || 'test';
    const price_id =
      active_mode === 'live' ? mapping.stripe_price_id_live : mapping.stripe_price_id_test;
    
    if (!price_id) {
      res.status(400).json({
        error: 'Price not configured',
        message: `No ${active_mode} price ID configured for plan: ${plan_key}`,
      });
      return;
    }
    
    logger.info('Creating checkout session', {
      tenant_id: effective_tenant_id,
      user_id,
      plan_key,
      price_id,
      active_mode,
    });
    
    // Create Stripe Checkout session
    const session = await createCheckoutSession({
      tenant_id: effective_tenant_id,
      user_id,
      email,
      price_id,
      success_url,
      cancel_url,
      trial_days,
      metadata: {
        plan_key,
      },
    });
    
    res.json({
      success: true,
      session_id: session.id,
      url: session.url,
    });
  } catch (error) {
    logger.error('Failed to create checkout session', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: (error as Error).message,
    });
  }
}

/**
 * POST /api/stripe/create-portal-session
 * Create a Stripe Customer Portal session for managing subscriptions
 */
export async function handleCreatePortalSession(req: Request, res: Response): Promise<void> {
  try {
    const { tenant_id, user_id, return_url } = req.body;
    
    // Validation
    if (!user_id) {
      res.status(400).json({ error: 'user_id is required' });
      return;
    }
    
    if (!return_url) {
      res.status(400).json({ error: 'return_url is required' });
      return;
    }
    
    logger.info('Creating portal session', {
      tenant_id: tenant_id || 'default',
      user_id,
    });
    
    // Create Stripe Customer Portal session
    const session = await createCustomerPortalSession({
      tenant_id: tenant_id || 'default',
      user_id,
      return_url,
    });
    
    res.json({
      success: true,
      session_id: session.id,
      url: session.url,
    });
  } catch (error) {
    logger.error('Failed to create portal session', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    res.status(500).json({
      error: 'Failed to create portal session',
      message: (error as Error).message,
    });
  }
}

/**
 * GET /api/stripe/subscription-status
 * Get current subscription status for a user
 */
export function handleGetSubscriptionStatus(req: Request, res: Response): void {
  try {
    const { tenant_id, user_id } = req.query;
    
    if (!user_id) {
      res.status(400).json({ error: 'user_id is required' });
      return;
    }
    
    const db = getDB();
    const effective_tenant_id = (tenant_id as string) || 'default';
    
    const subscription = db
      .prepare(`
        SELECT
          s.*,
          p.plan_key,
          p.plan_name
        FROM stripe_subscriptions s
        LEFT JOIN plan_mappings p ON (
          s.price_id = p.stripe_price_id_test OR
          s.price_id = p.stripe_price_id_live
        )
        WHERE s.tenant_id = ? AND s.user_id = ?
        ORDER BY s.created_at DESC
        LIMIT 1
      `)
      .get(effective_tenant_id, user_id as string);
    
    if (!subscription) {
      res.json({
        has_subscription: false,
        status: 'none',
        entitlement: 'free',
      });
      return;
    }
    
    res.json({
      has_subscription: true,
      subscription,
    });
  } catch (error) {
    logger.error('Failed to get subscription status', {
      error: (error as Error).message,
    });
    res.status(500).json({
      error: 'Failed to get subscription status',
      message: (error as Error).message,
    });
  }
}



