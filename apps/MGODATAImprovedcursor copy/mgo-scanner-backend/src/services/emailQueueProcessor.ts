/**
 * Email Queue Processor
 * Handles async email sending with retry logic for free scan leads
 */
import { logger } from '../lib/logger';
import { getPendingEmailSubmissions, updateEmailStatus, getFreeScanSubmission } from '../db/freeScanRepo';
import { sendFreeScanLeadEmail, type FreeScanEmailData } from './emailService';

// Track if processor is running
let isProcessing = false;
let processInterval: NodeJS.Timeout | null = null;

/**
 * Process a single free scan submission email
 */
export async function processFreeScanEmail(submissionId: string): Promise<void> {
  logger.info('Processing free scan email', { submissionId });
  
  const submission = getFreeScanSubmission(submissionId);
  
  if (!submission) {
    logger.error('Submission not found', { submissionId });
    return;
  }
  
  if (submission.email_status === 'sent') {
    logger.info('Email already sent, skipping', { submissionId });
    return;
  }
  
  // Build email data
  const formData = submission.form_data;
  const metadata = submission.metadata;
  
  const emailData: FreeScanEmailData = {
    timestamp: new Date(submission.created_at).toISOString(),
    submissionId: submission.id,
    scanRequestId: submission.scan_request_id,
    
    // Form fields
    businessName: formData.businessName,
    email: formData.email,
    phone: formData.phone,
    address: formData.address,
    city: formData.city,
    state: formData.state,
    zipCode: formData.zipCode,
    country: formData.country,
    website: formData.website,
    placeId: formData.placeId,
    gbpLink: formData.placeId ? `https://www.google.com/maps/place/?q=place_id:${formData.placeId}` : undefined,
    
    // Metadata
    referrer: metadata.referrer,
    landingPath: metadata.landingPath,
    userAgent: metadata.userAgent,
    utmSource: metadata.utmSource,
    utmMedium: metadata.utmMedium,
    utmCampaign: metadata.utmCampaign,
    utmTerm: metadata.utmTerm,
    utmContent: metadata.utmContent,
    
    // Scan results (if available)
    meoScore: formData.meoScore,
    geoScore: formData.geoScore,
    overallScore: formData.overallScore,
  };
  
  // Send email
  const result = await sendFreeScanLeadEmail(emailData);
  
  if (result.success) {
    updateEmailStatus(submissionId, 'sent');
    logger.info('Free scan email sent successfully', { submissionId });
  } else {
    // Check retry count
    if (submission.email_retry_count >= 4) {
      // Max retries reached, mark as failed
      updateEmailStatus(submissionId, 'failed', result.error);
      logger.error('Max retries reached for free scan email', { submissionId, error: result.error });
    } else {
      // Mark for retry
      updateEmailStatus(submissionId, 'retry', result.error);
      logger.warn('Free scan email failed, will retry', { submissionId, retryCount: submission.email_retry_count + 1, error: result.error });
    }
  }
}

/**
 * Process pending emails in the queue
 */
export async function processPendingEmails(): Promise<void> {
  if (isProcessing) {
    logger.info('Email queue processor already running, skipping');
    return;
  }
  
  isProcessing = true;
  
  try {
    const pending = getPendingEmailSubmissions(10);
    
    if (pending.length === 0) {
      // logger.info('No pending emails to process'); // Commented to reduce noise
      return;
    }
    
    logger.info('Processing pending emails', { count: pending.length });
    
    // Process emails in parallel (with concurrency limit)
    const promises = pending.map((submission) => processFreeScanEmail(submission.id));
    await Promise.allSettled(promises);
    
    logger.info('Finished processing pending emails', { count: pending.length });
  } catch (error) {
    logger.error('Error processing email queue', { error: (error as Error).message });
  } finally {
    isProcessing = false;
  }
}

/**
 * Start the email queue processor (runs every 30 seconds)
 */
export function startEmailQueueProcessor(): void {
  if (processInterval) {
    logger.warn('Email queue processor already running');
    return;
  }
  
  logger.info('Starting email queue processor');
  
  // Process immediately on start
  processPendingEmails().catch((error) => {
    logger.error('Error in initial email processing', { error: (error as Error).message });
  });
  
  // Then process every 30 seconds
  processInterval = setInterval(() => {
    processPendingEmails().catch((error) => {
      logger.error('Error in scheduled email processing', { error: (error as Error).message });
    });
  }, 30000); // 30 seconds
}

/**
 * Stop the email queue processor
 */
export function stopEmailQueueProcessor(): void {
  if (processInterval) {
    clearInterval(processInterval);
    processInterval = null;
    logger.info('Email queue processor stopped');
  }
}

/**
 * Enqueue a free scan email (fire-and-forget)
 * Does not block - processes async
 */
export function enqueueFreeScanEmail(submissionId: string): void {
  logger.info('Enqueuing free scan email', { submissionId });
  
  // Process async (don't await)
  processFreeScanEmail(submissionId).catch((error) => {
    logger.error('Error processing enqueued email', { submissionId, error: (error as Error).message });
  });
}

