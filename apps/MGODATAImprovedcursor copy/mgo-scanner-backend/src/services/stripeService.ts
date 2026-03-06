/**
 * Stripe Service - Handles all Stripe operations
 * Loads config from database, manages customers, subscriptions, etc.
 */
import Stripe from 'stripe';
import { getActiveStripeConfig } from '../db/stripeConfigRepo';
import { getDB } from '../db/schema';
import { logger } from '../lib/logger';

interface StripeCustomer {
  id?: number;
  tenant_id: string;
  user_id: string;
  email: string;
  stripe_customer_id: string;
}

interface StripeSubscription {
  id?: number;
  tenant_id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  price_id: string;
  product_id?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: number;
  canceled_at?: string;
  trial_start?: string;
  trial_end?: string;
}

/**
 * Get Stripe client instance for a tenant
 */
export function getStripeClient(tenant_id: string = 'default'): Stripe | null {
  const config = getActiveStripeConfig(tenant_id);
  
  if (!config) {
    logger.warn('No active Stripe config found', { tenant_id });
    return null;
  }
  
  logger.info('Creating Stripe client', {
    tenant_id,
    mode: config.mode,
    publishable_key: config.publishable_key.substring(0, 15) + '...',
  });
  
  return new Stripe(config.secret_key, {
    apiVersion: '2025-12-15.clover',
    typescript: true,
  });
}

/**
 * Get or create Stripe customer for a user
 */
export async function getOrCreateCustomer(params: {
  tenant_id?: string;
  user_id: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}): Promise<string> {
  const tenant_id = params.tenant_id || 'default';
  const db = getDB();
  
  // Check if customer already exists
  const existing = db
    .prepare('SELECT stripe_customer_id FROM stripe_customers WHERE tenant_id = ? AND user_id = ?')
    .get(tenant_id, params.user_id) as { stripe_customer_id: string } | undefined;
  
  if (existing) {
    logger.info('Found existing Stripe customer', {
      tenant_id,
      user_id: params.user_id,
      customer_id: existing.stripe_customer_id,
    });
    return existing.stripe_customer_id;
  }
  
  // Create new customer in Stripe
  const stripe = getStripeClient(tenant_id);
  if (!stripe) {
    throw new Error('Stripe not configured for this tenant');
  }
  
  logger.info('Creating new Stripe customer', {
    tenant_id,
    user_id: params.user_id,
    email: params.email,
  });
  
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: {
      user_id: params.user_id,
      tenant_id,
      ...params.metadata,
    },
  });
  
  // Store in database
  db.prepare(`
    INSERT INTO stripe_customers (tenant_id, user_id, email, stripe_customer_id)
    VALUES (?, ?, ?, ?)
  `).run(tenant_id, params.user_id, params.email, customer.id);
  
  logger.info('Created Stripe customer', {
    tenant_id,
    user_id: params.user_id,
    customer_id: customer.id,
  });
  
  return customer.id;
}

/**
 * Create checkout session for subscription purchase
 */
export async function createCheckoutSession(params: {
  tenant_id?: string;
  user_id: string;
  email: string;
  price_id: string;
  success_url: string;
  cancel_url: string;
  trial_days?: number;
  metadata?: Record<string, string>;
}): Promise<Stripe.Checkout.Session> {
  const tenant_id = params.tenant_id || 'default';
  const stripe = getStripeClient(tenant_id);
  
  if (!stripe) {
    throw new Error('Stripe not configured for this tenant');
  }
  
  const customer_id = await getOrCreateCustomer({
    tenant_id,
    user_id: params.user_id,
    email: params.email,
  });
  
  logger.info('Creating checkout session', {
    tenant_id,
    user_id: params.user_id,
    price_id: params.price_id,
    customer_id,
  });
  
  const session = await stripe.checkout.sessions.create({
    customer: customer_id,
    mode: 'subscription',
    line_items: [
      {
        price: params.price_id,
        quantity: 1,
      },
    ],
    success_url: params.success_url,
    cancel_url: params.cancel_url,
    subscription_data: params.trial_days
      ? {
          trial_period_days: params.trial_days,
          metadata: {
            user_id: params.user_id,
            tenant_id,
            ...params.metadata,
          },
        }
      : {
          metadata: {
            user_id: params.user_id,
            tenant_id,
            ...params.metadata,
          },
        },
    metadata: {
      user_id: params.user_id,
      tenant_id,
      ...params.metadata,
    },
  });
  
  logger.info('Created checkout session', {
    tenant_id,
    user_id: params.user_id,
    session_id: session.id,
    url: session.url,
  });
  
  return session;
}

/**
 * Create customer portal session for managing subscriptions
 */
export async function createCustomerPortalSession(params: {
  tenant_id?: string;
  user_id: string;
  return_url: string;
}): Promise<Stripe.BillingPortal.Session> {
  const tenant_id = params.tenant_id || 'default';
  const stripe = getStripeClient(tenant_id);
  
  if (!stripe) {
    throw new Error('Stripe not configured for this tenant');
  }
  
  const db = getDB();
  const customer = db
    .prepare('SELECT stripe_customer_id FROM stripe_customers WHERE tenant_id = ? AND user_id = ?')
    .get(tenant_id, params.user_id) as { stripe_customer_id: string } | undefined;
  
  if (!customer) {
    throw new Error('No Stripe customer found for this user');
  }
  
  logger.info('Creating portal session', {
    tenant_id,
    user_id: params.user_id,
    customer_id: customer.stripe_customer_id,
  });
  
  const session = await stripe.billingPortal.sessions.create({
    customer: customer.stripe_customer_id,
    return_url: params.return_url,
  });
  
  logger.info('Created portal session', {
    tenant_id,
    user_id: params.user_id,
    session_id: session.id,
    url: session.url,
  });
  
  return session;
}

/**
 * Upsert subscription from webhook event
 */
export function upsertSubscription(
  tenant_id: string,
  subscription: Stripe.Subscription
): void {
  const db = getDB();
  
  // Get user_id from customer mapping
  const customer = db
    .prepare('SELECT user_id FROM stripe_customers WHERE stripe_customer_id = ?')
    .get(subscription.customer as string) as { user_id: string } | undefined;
  
  if (!customer) {
    logger.error('Cannot upsert subscription: customer not found', {
      tenant_id,
      customer_id: subscription.customer,
      subscription_id: subscription.id,
    });
    return;
  }
  
  const price_id = subscription.items.data[0]?.price.id || '';
  const product_id = subscription.items.data[0]?.price.product as string || '';
  
  logger.info('Upserting subscription', {
    tenant_id,
    user_id: customer.user_id,
    subscription_id: subscription.id,
    status: subscription.status,
  });
  
  db.prepare(`
    INSERT INTO stripe_subscriptions (
      tenant_id, user_id, stripe_subscription_id, stripe_customer_id,
      status, price_id, product_id,
      current_period_start, current_period_end, cancel_at_period_end,
      canceled_at, trial_start, trial_end, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(stripe_subscription_id) DO UPDATE SET
      status = excluded.status,
      price_id = excluded.price_id,
      product_id = excluded.product_id,
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end,
      canceled_at = excluded.canceled_at,
      trial_start = excluded.trial_start,
      trial_end = excluded.trial_end,
      updated_at = datetime('now')
  `).run(
    tenant_id,
    customer.user_id,
    subscription.id,
    subscription.customer as string,
    subscription.status,
    price_id,
    product_id,
    (subscription as any).current_period_start ? new Date((subscription as any).current_period_start * 1000).toISOString() : null,
    (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : null,
    subscription.cancel_at_period_end ? 1 : 0,
    subscription.canceled_at ? new Date((subscription as any).canceled_at * 1000).toISOString() : null,
    (subscription as any).trial_start ? new Date((subscription as any).trial_start * 1000).toISOString() : null,
    (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000).toISOString() : null
  );
}

/**
 * Get active subscription for a user
 */
export function getUserSubscription(
  tenant_id: string,
  user_id: string
): StripeSubscription | null {
  const db = getDB();
  
  const sub = db
    .prepare(`
      SELECT * FROM stripe_subscriptions
      WHERE tenant_id = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `)
    .get(tenant_id, user_id) as StripeSubscription | undefined;
  
  return sub || null;
}

/**
 * Check if user has active subscription
 */
export function hasActiveSubscription(tenant_id: string, user_id: string): boolean {
  const sub = getUserSubscription(tenant_id, user_id);
  
  if (!sub) {
    return false;
  }
  
  const activeStatuses = ['active', 'trialing'];
  return activeStatuses.includes(sub.status);
}

/**
 * Get entitlement level for a user
 */
export function getUserEntitlement(
  tenant_id: string,
  user_id: string
): 'free' | 'basic' | 'pro' | 'elite' {
  const sub = getUserSubscription(tenant_id, user_id);
  
  if (!sub || !hasActiveSubscription(tenant_id, user_id)) {
    return 'free';
  }
  
  // Map price_id to entitlement level
  // This would be configurable via plan_mappings table
  const db = getDB();
  const mapping = db
    .prepare('SELECT plan_key FROM plan_mappings WHERE stripe_price_id_test = ? OR stripe_price_id_live = ?')
    .get(sub.price_id, sub.price_id) as { plan_key: string } | undefined;
  
  if (mapping) {
    return mapping.plan_key as any;
  }
  
  // Fallback to free if no mapping found
  return 'free';
}

/**
 * Record processed webhook event (idempotency)
 */
export function recordWebhookEvent(event_id: string, event_type: string, event_data: any): boolean {
  const db = getDB();
  
  try {
    db.prepare(`
      INSERT INTO stripe_webhook_events (event_id, event_type, event_data)
      VALUES (?, ?, ?)
    `).run(event_id, event_type, JSON.stringify(event_data));
    
    return true;
  } catch (error) {
    // If unique constraint fails, event already processed
    if ((error as any).code === 'SQLITE_CONSTRAINT') {
      logger.info('Webhook event already processed', { event_id, event_type });
      return false;
    }
    throw error;
  }
}

