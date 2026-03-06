/**
 * Admin endpoints for Free Scan Lead management
 */
import { Request, Response } from 'express';
import { getRecentFreeScanSubmissions, getFreeScanStats, getFreeScanSubmission } from '../db/freeScanRepo';
import { processFreeScanEmail } from '../services/emailQueueProcessor';
import { logger } from '../lib/logger';

/**
 * GET /api/admin/free-scan-leads
 * Get recent free scan submissions
 */
export function handleGetFreeScanLeads(req: Request, res: Response): void {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    
    const submissions = getRecentFreeScanSubmissions(limit);
    const stats = getFreeScanStats();
    
    // Mask sensitive data in list view
    const masked = submissions.map((sub) => ({
      id: sub.id,
      created_at: sub.created_at,
      businessName: sub.form_data.businessName,
      city: sub.form_data.city,
      state: sub.form_data.state,
      email: sub.form_data.email ? maskEmail(sub.form_data.email) : null,
      phone: sub.form_data.phone ? maskPhone(sub.form_data.phone) : null,
      meoScore: sub.form_data.meoScore,
      geoScore: sub.form_data.geoScore,
      email_status: sub.email_status,
      email_sent_at: sub.email_sent_at,
      email_retry_count: sub.email_retry_count,
    }));
    
    res.json({
      submissions: masked,
      stats,
    });
  } catch (error) {
    logger.error('Failed to get free scan leads', { error: (error as Error).message });
    res.status(500).json({
      error: 'Failed to retrieve leads',
      message: (error as Error).message,
    });
  }
}

/**
 * GET /api/admin/free-scan-leads/:id
 * Get full details of a specific submission
 */
export function handleGetFreeScanLeadDetails(req: Request, res: Response): void {
  try {
    const { id } = req.params;
    
    const submission = getFreeScanSubmission(id);
    
    if (!submission) {
      res.status(404).json({
        error: 'Submission not found',
        message: `No submission found with ID: ${id}`,
      });
      return;
    }
    
    // Return full data for detail view (still mask some fields)
    res.json({
      ...submission,
      form_data: {
        ...submission.form_data,
        email: submission.form_data.email ? maskEmail(submission.form_data.email) : null,
        phone: submission.form_data.phone ? maskPhone(submission.form_data.phone) : null,
      },
      metadata: {
        ...submission.metadata,
        ipHashed: submission.metadata.ipHashed, // Already hashed
      },
    });
  } catch (error) {
    logger.error('Failed to get lead details', {
      id: req.params.id,
      error: (error as Error).message,
    });
    res.status(500).json({
      error: 'Failed to retrieve lead details',
      message: (error as Error).message,
    });
  }
}

/**
 * POST /api/admin/free-scan-leads/:id/retry-email
 * Manually retry sending email for a submission
 */
export async function handleRetryFreeScanEmail(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    
    const submission = getFreeScanSubmission(id);
    
    if (!submission) {
      res.status(404).json({
        error: 'Submission not found',
        message: `No submission found with ID: ${id}`,
      });
      return;
    }
    
    logger.info('Manually retrying free scan email', {
      id,
      businessName: submission.form_data.businessName,
    });
    
    // Process email immediately
    await processFreeScanEmail(id);
    
    // Get updated submission
    const updated = getFreeScanSubmission(id);
    
    res.json({
      success: true,
      message: 'Email retry initiated',
      email_status: updated?.email_status,
    });
  } catch (error) {
    logger.error('Failed to retry email', {
      id: req.params.id,
      error: (error as Error).message,
    });
    res.status(500).json({
      error: 'Failed to retry email',
      message: (error as Error).message,
    });
  }
}

/**
 * GET /api/admin/free-scan-leads/stats
 * Get statistics about free scan submissions
 */
export function handleGetFreeScanStats(req: Request, res: Response): void {
  try {
    const stats = getFreeScanStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get stats', { error: (error as Error).message });
    res.status(500).json({
      error: 'Failed to retrieve stats',
      message: (error as Error).message,
    });
  }
}

/**
 * Helper: Mask email for display
 */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user[0]}${user[1]}***@${domain}`;
}

/**
 * Helper: Mask phone for display
 */
function maskPhone(phone: string): string {
  if (!phone) return '***';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return '***';
  return `***-***-${cleaned.slice(-4)}`;
}



