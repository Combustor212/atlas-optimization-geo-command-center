/**
 * Stripe Webhook Handler
 * Processes subscription events from Stripe with signature verification and idempotency
 */
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { getActiveStripeConfig } from '../db/stripeConfigRepo';
import { upsertSubscription, recordWebhookEvent } from '../services/stripeService';
import { logger } from '../lib/logger';

/**
 * POST /api/stripe/webhook
 * Handle incoming webhook events from Stripe
 * 
 * CRITICAL: This endpoint must receive raw body (not parsed JSON)
 * Configure in Express with: express.raw({ type: 'application/json' })
 */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers['stripe-signature'];
    
    if (!signature || typeof signature !== 'string') {
      logger.error('Missing Stripe signature header');
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }
    
    // Get webhook secret from config
    // We need to determine tenant_id from the event, but we don't have it yet
    // For now, use default tenant (can be enhanced to support multi-tenant)
    const config = getActiveStripeConfig('default');
    
    if (!config || !config.webhook_secret) {
      logger.error('Webhook secret not configured');
      res.status(500).json({ error: 'Webhook not configured' });
      return;
    }
    
    // Verify webhook signature
    let event: Stripe.Event;
    
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(config.secret_key, { apiVersion: '2025-12-15.clover' });
      
      // Reconstruct event from raw body
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        config.webhook_secret
      );
    } catch (err) {
      logger.error('Webhook signature verification failed', {
        error: (err as Error).message,
      });
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }
    
    logger.info('Webhook event received', {
      event_id: event.id,
      event_type: event.type,
    });
    
    // Check idempotency - have we processed this event before?
    const alreadyProcessed = !recordWebhookEvent(event.id, event.type, event);
    
    if (alreadyProcessed) {
      logger.info('Webhook event already processed', {
        event_id: event.id,
        event_type: event.type,
      });
      res.json({ received: true, status: 'already_processed' });
      return;
    }
    
    // Process event based on type
    try {
      await processWebhookEvent(event);
      
      res.json({ received: true, status: 'processed' });
    } catch (processError) {
      logger.error('Failed to process webhook event', {
        event_id: event.id,
        event_type: event.type,
        error: (processError as Error).message,
        stack: (processError as Error).stack,
      });
      
      // Still return 200 to prevent Stripe from retrying
      // (we've recorded the event, can retry manually if needed)
      res.json({ received: true, status: 'error', error: (processError as Error).message });
    }
  } catch (error) {
    logger.error('Webhook handler error', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Process individual webhook event types
 */
async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  const tenant_id = 'default'; // TODO: Extract from metadata if multi-tenant
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      logger.info('Checkout session completed', {
        session_id: session.id,
        customer: session.customer,
        subscription: session.subscription,
      });
      
      // If this created a subscription, it will be handled by subscription.created event
      break;
    }
    
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      
      logger.info('Subscription created/updated', {
        subscription_id: subscription.id,
        customer: subscription.customer,
        status: subscription.status,
      });
      
      upsertSubscription(tenant_id, subscription);
      break;
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      
      logger.info('Subscription deleted', {
        subscription_id: subscription.id,
        customer: subscription.customer,
      });
      
      upsertSubscription(tenant_id, subscription);
      break;
    }
    
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      
      logger.info('Invoice paid', {
        invoice_id: invoice.id,
        customer: invoice.customer,
        subscription: (invoice as any).subscription,
        amount_paid: invoice.amount_paid,
      });
      
      // Subscription status will be updated by subscription.updated event
      break;
    }
    
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      
      logger.error('Invoice payment failed', {
        invoice_id: invoice.id,
        customer: invoice.customer,
        subscription: (invoice as any).subscription,
        amount_due: invoice.amount_due,
      });
      
      // TODO: Send notification to user about failed payment
      break;
    }
    
    case 'customer.subscription.trial_will_end': {
      const subscription = event.data.object as Stripe.Subscription;
      
      logger.info('Trial ending soon', {
        subscription_id: subscription.id,
        customer: subscription.customer,
        trial_end: subscription.trial_end,
      });
      
      // TODO: Send notification to user about trial ending
      break;
    }
    
    default:
      logger.info('Unhandled webhook event type', { type: event.type });
  }
}

/**
 * Test webhook endpoint (for development)
 * GET /api/stripe/webhook/test
 */
export function handleTestWebhook(req: Request, res: Response): void {
  res.json({
    message: 'Webhook endpoint is active',
    events_supported: [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.paid',
      'invoice.payment_failed',
    ],
  });
}

