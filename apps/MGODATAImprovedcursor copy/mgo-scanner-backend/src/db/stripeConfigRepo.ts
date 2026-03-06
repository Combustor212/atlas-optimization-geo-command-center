/**
 * Repository for Stripe configuration management
 * Handles encrypted storage/retrieval of Stripe keys
 */
import { getDB } from './schema';
import { encrypt, decrypt } from './encryption';
import { logger } from '../lib/logger';

export interface StripeConfig {
  id?: number;
  tenant_id: string;
  mode: 'test' | 'live';
  active_mode: 'test' | 'live';
  secret_key: string; // NEVER log this
  publishable_key: string;
  webhook_secret?: string; // NEVER log this
  connected_account_id?: string;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface StripeConfigRow {
  id: number;
  tenant_id: string;
  mode: 'test' | 'live';
  active_mode: 'test' | 'live';
  secret_key_encrypted: string;
  publishable_key: string;
  webhook_secret_encrypted: string | null;
  connected_account_id: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

/**
 * Save or update Stripe configuration
 */
export function upsertStripeConfig(config: StripeConfig): void {
  const db = getDB();
  
  // Validate keys format
  if (!config.secret_key.startsWith('sk_')) {
    throw new Error('Invalid secret key format. Must start with sk_test_ or sk_live_');
  }
  
  if (!config.publishable_key.startsWith('pk_')) {
    throw new Error('Invalid publishable key format. Must start with pk_test_ or pk_live_');
  }
  
  // Encrypt sensitive fields
  const encrypted_secret_key = encrypt(config.secret_key);
  const encrypted_webhook_secret = config.webhook_secret ? encrypt(config.webhook_secret) : null;
  
  logger.info('Upserting Stripe config', {
    tenant_id: config.tenant_id,
    mode: config.mode,
    has_webhook_secret: !!config.webhook_secret,
    updated_by: config.updated_by,
  });
  
  const stmt = db.prepare(`
    INSERT INTO stripe_configs (
      tenant_id, mode, active_mode, secret_key_encrypted, publishable_key,
      webhook_secret_encrypted, connected_account_id, updated_by, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(tenant_id, mode) DO UPDATE SET
      active_mode = excluded.active_mode,
      secret_key_encrypted = excluded.secret_key_encrypted,
      publishable_key = excluded.publishable_key,
      webhook_secret_encrypted = excluded.webhook_secret_encrypted,
      connected_account_id = excluded.connected_account_id,
      updated_by = excluded.updated_by,
      updated_at = datetime('now')
  `);
  
  stmt.run(
    config.tenant_id,
    config.mode,
    config.active_mode || config.mode,
    encrypted_secret_key,
    config.publishable_key,
    encrypted_webhook_secret,
    config.connected_account_id || null,
    config.updated_by || null
  );
}

/**
 * Get active Stripe configuration for a tenant
 */
export function getActiveStripeConfig(tenant_id: string = 'default'): StripeConfig | null {
  const db = getDB();
  
  const stmt = db.prepare(`
    SELECT * FROM stripe_configs
    WHERE tenant_id = ? AND mode = active_mode
    ORDER BY updated_at DESC
    LIMIT 1
  `);
  
  const row = stmt.get(tenant_id) as StripeConfigRow | undefined;
  
  if (!row) {
    return null;
  }
  
  return deserializeConfig(row);
}

/**
 * Get specific Stripe configuration by mode
 */
export function getStripeConfigByMode(
  tenant_id: string = 'default',
  mode: 'test' | 'live'
): StripeConfig | null {
  const db = getDB();
  
  const stmt = db.prepare(`
    SELECT * FROM stripe_configs
    WHERE tenant_id = ? AND mode = ?
    LIMIT 1
  `);
  
  const row = stmt.get(tenant_id, mode) as StripeConfigRow | undefined;
  
  if (!row) {
    return null;
  }
  
  return deserializeConfig(row);
}

/**
 * Get all configs for a tenant (for admin UI)
 */
export function getAllStripeConfigs(tenant_id: string = 'default'): StripeConfig[] {
  const db = getDB();
  
  const stmt = db.prepare(`
    SELECT * FROM stripe_configs
    WHERE tenant_id = ?
    ORDER BY mode ASC
  `);
  
  const rows = stmt.all(tenant_id) as StripeConfigRow[];
  
  return rows.map(deserializeConfig);
}

/**
 * Set active mode for a tenant
 */
export function setActiveMode(tenant_id: string = 'default', mode: 'test' | 'live'): void {
  const db = getDB();
  
  logger.info('Setting active Stripe mode', { tenant_id, mode });
  
  const stmt = db.prepare(`
    UPDATE stripe_configs
    SET active_mode = ?, updated_at = datetime('now')
    WHERE tenant_id = ?
  `);
  
  stmt.run(mode, tenant_id);
}

/**
 * Delete Stripe configuration
 */
export function deleteStripeConfig(tenant_id: string, mode: 'test' | 'live'): void {
  const db = getDB();
  
  logger.info('Deleting Stripe config', { tenant_id, mode });
  
  const stmt = db.prepare(`
    DELETE FROM stripe_configs
    WHERE tenant_id = ? AND mode = ?
  `);
  
  stmt.run(tenant_id, mode);
}

/**
 * Test connection to Stripe (validate keys work)
 */
export async function testStripeConnection(
  secret_key: string,
  publishable_key: string
): Promise<{ ok: boolean; account_id?: string; error?: string }> {
  try {
    // Dynamic import to avoid loading Stripe SDK if not configured
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secret_key, { apiVersion: '2025-12-15.clover' });
    
    const account = await stripe.accounts.retrieve();
    
    return {
      ok: true,
      account_id: account.id,
    };
  } catch (error) {
    logger.error('Stripe connection test failed', { error: (error as Error).message });
    return {
      ok: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Helper: Deserialize database row to StripeConfig
 */
function deserializeConfig(row: StripeConfigRow): StripeConfig {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    mode: row.mode,
    active_mode: row.active_mode,
    secret_key: decrypt(row.secret_key_encrypted),
    publishable_key: row.publishable_key,
    webhook_secret: row.webhook_secret_encrypted ? decrypt(row.webhook_secret_encrypted) : undefined,
    connected_account_id: row.connected_account_id || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    updated_by: row.updated_by || undefined,
  };
}

