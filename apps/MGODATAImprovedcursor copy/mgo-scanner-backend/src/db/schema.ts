/**
 * Database schema and initialization for MGO backend
 * Uses better-sqlite3 for simplicity and performance
 */
import Database from 'better-sqlite3';
import path from 'path';
import { logger } from '../lib/logger';

let db: Database.Database | null = null;

/**
 * Get or create database connection
 */
export function getDB(): Database.Database {
  if (db) {
    return db;
  }
  
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'mgo.db');
  const isProduction = process.env.NODE_ENV === 'production';
  
  logger.info('Initializing database', { dbPath, isProduction });
  
  // Create data directory if it doesn't exist
  const fs = require('fs');
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  db = new Database(dbPath, {
    verbose: isProduction ? undefined : (msg) => logger.info('SQL', { query: msg }),
  });
  
  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  
  // Run migrations
  runMigrations(db);
  
  return db;
}

/**
 * Run database migrations
 */
function runMigrations(database: Database.Database): void {
  logger.info('Running database migrations');
  
  // Create migrations table
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  
  const migrations = [
    {
      name: '001_initial_schema',
      sql: `
        -- Stripe Configuration (per-tenant, encrypted)
        CREATE TABLE IF NOT EXISTS stripe_configs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tenant_id TEXT NOT NULL DEFAULT 'default',
          mode TEXT NOT NULL CHECK(mode IN ('test', 'live')),
          active_mode TEXT NOT NULL DEFAULT 'test' CHECK(active_mode IN ('test', 'live')),
          
          -- Encrypted fields (use encryption.ts to encrypt/decrypt)
          secret_key_encrypted TEXT NOT NULL,
          webhook_secret_encrypted TEXT,
          
          -- Public fields (safe to store as-is)
          publishable_key TEXT NOT NULL,
          connected_account_id TEXT,
          
          -- Metadata
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_by TEXT,
          
          UNIQUE(tenant_id, mode)
        );
        
        -- Stripe Customers (maps our users to Stripe customers)
        CREATE TABLE IF NOT EXISTS stripe_customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tenant_id TEXT NOT NULL DEFAULT 'default',
          user_id TEXT NOT NULL,
          email TEXT NOT NULL,
          stripe_customer_id TEXT NOT NULL UNIQUE,
          
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          
          UNIQUE(tenant_id, user_id)
        );
        
        -- Stripe Subscriptions
        CREATE TABLE IF NOT EXISTS stripe_subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tenant_id TEXT NOT NULL DEFAULT 'default',
          user_id TEXT NOT NULL,
          stripe_subscription_id TEXT NOT NULL UNIQUE,
          stripe_customer_id TEXT NOT NULL,
          
          status TEXT NOT NULL,
          price_id TEXT NOT NULL,
          product_id TEXT,
          
          current_period_start TEXT,
          current_period_end TEXT,
          cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
          canceled_at TEXT,
          
          trial_start TEXT,
          trial_end TEXT,
          
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          
          FOREIGN KEY (stripe_customer_id) REFERENCES stripe_customers(stripe_customer_id)
        );
        
        -- Webhook Events (idempotency tracking)
        CREATE TABLE IF NOT EXISTS stripe_webhook_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id TEXT NOT NULL UNIQUE,
          event_type TEXT NOT NULL,
          processed_at TEXT NOT NULL DEFAULT (datetime('now')),
          
          -- Store full event for debugging
          event_data TEXT NOT NULL
        );
        
        -- Plan Mappings (MGO plans -> Stripe Price IDs)
        CREATE TABLE IF NOT EXISTS plan_mappings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tenant_id TEXT NOT NULL DEFAULT 'default',
          plan_key TEXT NOT NULL,
          plan_name TEXT NOT NULL,
          
          stripe_price_id_test TEXT,
          stripe_price_id_live TEXT,
          stripe_product_id TEXT,
          
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          
          UNIQUE(tenant_id, plan_key)
        );
        
        -- Create indices
        CREATE INDEX IF NOT EXISTS idx_stripe_customers_user ON stripe_customers(user_id);
        CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_user ON stripe_subscriptions(user_id);
        CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status ON stripe_subscriptions(status);
        CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON stripe_webhook_events(event_type);
      `,
    },
    {
      name: '002_free_scan_lead_capture',
      sql: `
        -- Free Scan Submissions (lead capture)
        CREATE TABLE IF NOT EXISTS free_scan_submissions (
          id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          
          -- Scan tracking
          scan_request_id TEXT,
          is_free_scan INTEGER NOT NULL DEFAULT 1,
          
          -- Form data (JSON)
          form_data TEXT NOT NULL,
          
          -- Metadata (JSON) - IP hashed, user agent, referrer, UTMs
          metadata TEXT NOT NULL,
          
          -- Email delivery status
          email_status TEXT NOT NULL DEFAULT 'pending' CHECK(email_status IN ('pending', 'sent', 'failed', 'retry')),
          email_sent_at TEXT,
          email_error TEXT,
          email_retry_count INTEGER NOT NULL DEFAULT 0,
          
          -- Idempotency
          idempotency_key TEXT NOT NULL UNIQUE
        );
        
        -- Create indices for querying
        CREATE INDEX IF NOT EXISTS idx_free_scans_created ON free_scan_submissions(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_free_scans_email_status ON free_scan_submissions(email_status);
        CREATE INDEX IF NOT EXISTS idx_free_scans_idempotency ON free_scan_submissions(idempotency_key);
      `,
    },
    {
      name: '003_geo_explain_jobs',
      sql: `
        -- GEO Explain Jobs (scan state persistence)
        CREATE TABLE IF NOT EXISTS geo_explain_jobs (
          job_id TEXT PRIMARY KEY,
          place_id TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('queued', 'running', 'completed', 'failed')),
          step TEXT NOT NULL,
          progress INTEGER NOT NULL DEFAULT 0,
          error TEXT,
          result TEXT, -- JSON of GEOExplainData
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        
        -- Create indices for querying
        CREATE INDEX IF NOT EXISTS idx_geo_jobs_place ON geo_explain_jobs(place_id);
        CREATE INDEX IF NOT EXISTS idx_geo_jobs_status ON geo_explain_jobs(status);
        CREATE INDEX IF NOT EXISTS idx_geo_jobs_created ON geo_explain_jobs(created_at DESC);
      `,
    },
  ];
  
  for (const migration of migrations) {
    const existing = database.prepare('SELECT name FROM migrations WHERE name = ?').get(migration.name);
    
    if (!existing) {
      logger.info('Applying migration', { name: migration.name });
      database.exec(migration.sql);
      database.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name);
    }
  }
  
  logger.info('Migrations completed');
}

/**
 * Close database connection
 */
export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

/**
 * Health check for database
 */
export function checkDBHealth(): { ok: boolean; error?: string } {
  try {
    const db = getDB();
    db.prepare('SELECT 1').get();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

