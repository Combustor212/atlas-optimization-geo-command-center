/**
 * Admin endpoints for Stripe configuration management
 */
import { Request, Response } from 'express';
import {
  upsertStripeConfig,
  getAllStripeConfigs,
  getStripeConfigByMode,
  setActiveMode,
  deleteStripeConfig,
  testStripeConnection,
} from '../db/stripeConfigRepo';
import { getDB } from '../db/schema';
import { logger } from '../lib/logger';

/**
 * POST /api/admin/stripe/config
 * Save or update Stripe configuration
 */
export async function handleSaveStripeConfig(req: Request, res: Response): Promise<void> {
  try {
    const {
      tenant_id = 'default',
      mode,
      active_mode,
      secret_key,
      publishable_key,
      webhook_secret,
      connected_account_id,
      updated_by,
    } = req.body;
    
    // Validation
    if (!mode || !['test', 'live'].includes(mode)) {
      res.status(400).json({ error: 'Invalid mode. Must be "test" or "live"' });
      return;
    }
    
    if (!secret_key || !publishable_key) {
      res.status(400).json({ error: 'secret_key and publishable_key are required' });
      return;
    }
    
    if (!secret_key.startsWith('sk_')) {
      res.status(400).json({ error: 'Invalid secret_key format' });
      return;
    }
    
    if (!publishable_key.startsWith('pk_')) {
      res.status(400).json({ error: 'Invalid publishable_key format' });
      return;
    }
    
    // Save config
    upsertStripeConfig({
      tenant_id,
      mode,
      active_mode: active_mode || mode,
      secret_key,
      publishable_key,
      webhook_secret,
      connected_account_id,
      updated_by,
    });
    
    logger.info('Stripe config saved', { tenant_id, mode, updated_by });
    
    res.json({
      success: true,
      message: 'Stripe configuration saved successfully',
    });
  } catch (error) {
    logger.error('Failed to save Stripe config', { error: (error as Error).message });
    res.status(500).json({
      error: 'Failed to save configuration',
      message: (error as Error).message,
    });
  }
}

/**
 * GET /api/admin/stripe/config
 * Get all Stripe configurations for a tenant
 */
export function handleGetStripeConfigs(req: Request, res: Response): void {
  try {
    const tenant_id = (req.query.tenant_id as string) || 'default';
    
    const configs = getAllStripeConfigs(tenant_id);
    
    // Mask sensitive fields before sending to client
    const masked = configs.map((config) => ({
      id: config.id,
      tenant_id: config.tenant_id,
      mode: config.mode,
      active_mode: config.active_mode,
      secret_key_preview: config.secret_key.substring(0, 15) + '...',
      publishable_key: config.publishable_key,
      has_webhook_secret: !!config.webhook_secret,
      connected_account_id: config.connected_account_id,
      created_at: config.created_at,
      updated_at: config.updated_at,
      updated_by: config.updated_by,
    }));
    
    res.json({ configs: masked });
  } catch (error) {
    logger.error('Failed to get Stripe configs', { error: (error as Error).message });
    res.status(500).json({
      error: 'Failed to retrieve configurations',
      message: (error as Error).message,
    });
  }
}

/**
 * POST /api/admin/stripe/test-connection
 * Test Stripe API keys
 */
export async function handleTestStripeConnection(req: Request, res: Response): Promise<void> {
  try {
    const { secret_key, publishable_key } = req.body;
    
    if (!secret_key || !publishable_key) {
      res.status(400).json({ error: 'secret_key and publishable_key are required' });
      return;
    }
    
    logger.info('Testing Stripe connection');
    
    const result = await testStripeConnection(secret_key, publishable_key);
    
    if (result.ok) {
      res.json({
        success: true,
        message: 'Connection successful',
        account_id: result.account_id,
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Connection failed',
        message: result.error,
      });
    }
  } catch (error) {
    logger.error('Failed to test Stripe connection', { error: (error as Error).message });
    res.status(500).json({
      error: 'Failed to test connection',
      message: (error as Error).message,
    });
  }
}

/**
 * PUT /api/admin/stripe/active-mode
 * Switch between test and live mode
 */
export function handleSetActiveMode(req: Request, res: Response): void {
  try {
    const { tenant_id = 'default', mode } = req.body;
    
    if (!mode || !['test', 'live'].includes(mode)) {
      res.status(400).json({ error: 'Invalid mode. Must be "test" or "live"' });
      return;
    }
    
    // Check that config exists for this mode
    const config = getStripeConfigByMode(tenant_id, mode);
    if (!config) {
      res.status(404).json({
        error: 'No configuration found for this mode',
        message: `Please configure ${mode} mode first`,
      });
      return;
    }
    
    setActiveMode(tenant_id, mode);
    
    logger.info('Active Stripe mode changed', { tenant_id, mode });
    
    res.json({
      success: true,
      message: `Switched to ${mode} mode`,
      active_mode: mode,
    });
  } catch (error) {
    logger.error('Failed to set active mode', { error: (error as Error).message });
    res.status(500).json({
      error: 'Failed to update active mode',
      message: (error as Error).message,
    });
  }
}

/**
 * DELETE /api/admin/stripe/config
 * Delete Stripe configuration
 */
export function handleDeleteStripeConfig(req: Request, res: Response): void {
  try {
    const { tenant_id = 'default', mode } = req.body;
    
    if (!mode || !['test', 'live'].includes(mode)) {
      res.status(400).json({ error: 'Invalid mode. Must be "test" or "live"' });
      return;
    }
    
    deleteStripeConfig(tenant_id, mode);
    
    logger.info('Stripe config deleted', { tenant_id, mode });
    
    res.json({
      success: true,
      message: 'Configuration deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete Stripe config', { error: (error as Error).message });
    res.status(500).json({
      error: 'Failed to delete configuration',
      message: (error as Error).message,
    });
  }
}

/**
 * POST /api/admin/stripe/plan-mapping
 * Save plan mapping (MGO plan -> Stripe Price ID)
 */
export function handleSavePlanMapping(req: Request, res: Response): void {
  try {
    const {
      tenant_id = 'default',
      plan_key,
      plan_name,
      stripe_price_id_test,
      stripe_price_id_live,
      stripe_product_id,
    } = req.body;
    
    if (!plan_key || !plan_name) {
      res.status(400).json({ error: 'plan_key and plan_name are required' });
      return;
    }
    
    const db = getDB();
    
    db.prepare(`
      INSERT INTO plan_mappings (
        tenant_id, plan_key, plan_name,
        stripe_price_id_test, stripe_price_id_live, stripe_product_id,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(tenant_id, plan_key) DO UPDATE SET
        plan_name = excluded.plan_name,
        stripe_price_id_test = excluded.stripe_price_id_test,
        stripe_price_id_live = excluded.stripe_price_id_live,
        stripe_product_id = excluded.stripe_product_id,
        updated_at = datetime('now')
    `).run(
      tenant_id,
      plan_key,
      plan_name,
      stripe_price_id_test || null,
      stripe_price_id_live || null,
      stripe_product_id || null
    );
    
    logger.info('Plan mapping saved', { tenant_id, plan_key });
    
    res.json({
      success: true,
      message: 'Plan mapping saved successfully',
    });
  } catch (error) {
    logger.error('Failed to save plan mapping', { error: (error as Error).message });
    res.status(500).json({
      error: 'Failed to save plan mapping',
      message: (error as Error).message,
    });
  }
}

/**
 * GET /api/admin/stripe/plan-mappings
 * Get all plan mappings for a tenant
 */
export function handleGetPlanMappings(req: Request, res: Response): void {
  try {
    const tenant_id = (req.query.tenant_id as string) || 'default';
    
    const db = getDB();
    const mappings = db
      .prepare('SELECT * FROM plan_mappings WHERE tenant_id = ? ORDER BY plan_key ASC')
      .all(tenant_id);
    
    res.json({ mappings });
  } catch (error) {
    logger.error('Failed to get plan mappings', { error: (error as Error).message });
    res.status(500).json({
      error: 'Failed to retrieve plan mappings',
      message: (error as Error).message,
    });
  }
}



