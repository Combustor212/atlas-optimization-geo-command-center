/**
 * Repository for Free Scan Submissions
 * Handles lead capture and email status tracking
 */
import { getDB } from './schema';
import { logger } from '../lib/logger';
import crypto from 'crypto';

export interface FreeScanSubmission {
  id: string;
  created_at: string;
  scan_request_id?: string;
  is_free_scan: boolean;
  form_data: any; // JSON
  metadata: any; // JSON
  email_status: 'pending' | 'sent' | 'failed' | 'retry';
  email_sent_at?: string;
  email_error?: string;
  email_retry_count: number;
  idempotency_key: string;
}

/**
 * Generate idempotency key from stable inputs
 */
export function generateIdempotencyKey(scanRequestId: string, formData: any): string {
  const stableInput = `${scanRequestId}-${formData.businessName}-${formData.email}-${formData.city}`;
  return crypto.createHash('sha256').update(stableInput).digest('hex');
}

/**
 * Hash IP address for privacy
 */
export function hashIP(ip: string): string {
  if (!ip) return 'unknown';
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

/**
 * Create a new free scan submission
 */
export function createFreeScanSubmission(params: {
  scanRequestId?: string;
  formData: any;
  metadata: any;
  idempotencyKey: string;
}): string {
  const db = getDB();
  const id = crypto.randomUUID();
  
  try {
    logger.info('Creating free scan submission', {
      id,
      businessName: params.formData.businessName,
      idempotencyKey: params.idempotencyKey.substring(0, 16) + '...',
    });
    
    db.prepare(`
      INSERT INTO free_scan_submissions (
        id, scan_request_id, is_free_scan, form_data, metadata,
        email_status, email_retry_count, idempotency_key
      ) VALUES (?, ?, 1, ?, ?, 'pending', 0, ?)
    `).run(
      id,
      params.scanRequestId || null,
      JSON.stringify(params.formData),
      JSON.stringify(params.metadata),
      params.idempotencyKey
    );
    
    logger.info('Free scan submission created', { id });
    return id;
  } catch (error) {
    // Check if it's a unique constraint error (duplicate idempotency key)
    if ((error as any).code === 'SQLITE_CONSTRAINT' && (error as any).message?.includes('idempotency_key')) {
      logger.info('Duplicate free scan submission detected (idempotency)', {
        idempotencyKey: params.idempotencyKey.substring(0, 16) + '...',
      });
      
      // Get existing submission ID
      const existing = db
        .prepare('SELECT id FROM free_scan_submissions WHERE idempotency_key = ?')
        .get(params.idempotencyKey) as { id: string } | undefined;
      
      if (existing) {
        return existing.id;
      }
    }
    
    throw error;
  }
}

/**
 * Get submission by ID
 */
export function getFreeScanSubmission(id: string): FreeScanSubmission | null {
  const db = getDB();
  
  const row = db
    .prepare('SELECT * FROM free_scan_submissions WHERE id = ?')
    .get(id) as any | undefined;
  
  if (!row) {
    return null;
  }
  
  return {
    ...row,
    is_free_scan: Boolean(row.is_free_scan),
    form_data: JSON.parse(row.form_data),
    metadata: JSON.parse(row.metadata),
  };
}

/**
 * Update email status
 */
export function updateEmailStatus(id: string, status: 'sent' | 'failed' | 'retry', error?: string): void {
  const db = getDB();
  
  logger.info('Updating email status', { id, status, error: error ? error.substring(0, 100) : undefined });
  
  if (status === 'sent') {
    db.prepare(`
      UPDATE free_scan_submissions
      SET email_status = ?, email_sent_at = datetime('now'), email_error = NULL
      WHERE id = ?
    `).run(status, id);
  } else if (status === 'failed' || status === 'retry') {
    db.prepare(`
      UPDATE free_scan_submissions
      SET email_status = ?, email_error = ?, email_retry_count = email_retry_count + 1
      WHERE id = ?
    `).run(status, error || null, id);
  }
}

/**
 * Get pending email submissions (for retry processing)
 */
export function getPendingEmailSubmissions(limit: number = 10): FreeScanSubmission[] {
  const db = getDB();
  
  const rows = db
    .prepare(`
      SELECT * FROM free_scan_submissions
      WHERE email_status IN ('pending', 'retry')
        AND email_retry_count < 5
      ORDER BY created_at ASC
      LIMIT ?
    `)
    .all(limit) as any[];
  
  return rows.map((row) => ({
    ...row,
    is_free_scan: Boolean(row.is_free_scan),
    form_data: JSON.parse(row.form_data),
    metadata: JSON.parse(row.metadata),
  }));
}

/**
 * Get recent free scan submissions (for admin page)
 */
export function getRecentFreeScanSubmissions(limit: number = 50): FreeScanSubmission[] {
  const db = getDB();
  
  const rows = db
    .prepare(`
      SELECT * FROM free_scan_submissions
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(limit) as any[];
  
  return rows.map((row) => ({
    ...row,
    is_free_scan: Boolean(row.is_free_scan),
    form_data: JSON.parse(row.form_data),
    metadata: JSON.parse(row.metadata),
  }));
}

/**
 * Get submission statistics
 */
export function getFreeScanStats(): {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  today: number;
  thisWeek: number;
} {
  const db = getDB();
  
  const total = (db.prepare('SELECT COUNT(*) as count FROM free_scan_submissions').get() as any).count;
  const pending = (db.prepare('SELECT COUNT(*) as count FROM free_scan_submissions WHERE email_status = ?').get('pending') as any).count;
  const sent = (db.prepare('SELECT COUNT(*) as count FROM free_scan_submissions WHERE email_status = ?').get('sent') as any).count;
  const failed = (db.prepare('SELECT COUNT(*) as count FROM free_scan_submissions WHERE email_status = ?').get('failed') as any).count;
  
  const today = (db.prepare(`
    SELECT COUNT(*) as count FROM free_scan_submissions
    WHERE date(created_at) = date('now')
  `).get() as any).count;
  
  const thisWeek = (db.prepare(`
    SELECT COUNT(*) as count FROM free_scan_submissions
    WHERE created_at >= date('now', '-7 days')
  `).get() as any).count;
  
  return { total, pending, sent, failed, today, thisWeek };
}



