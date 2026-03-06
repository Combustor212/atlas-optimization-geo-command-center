/**
 * Email Service - Handles all email operations
 * Uses Resend for delivery
 */
import { Resend } from 'resend';
import { logger } from '../lib/logger';

let resendClient: Resend | null = null;

/**
 * Get or create Resend client
 */
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    logger.warn('RESEND_API_KEY not configured. Email sending disabled.');
    return null;
  }
  
  if (!resendClient) {
    resendClient = new Resend(apiKey);
    logger.info('Resend email client initialized');
  }
  
  return resendClient;
}

export interface FreeScanEmailData {
  timestamp: string;
  businessName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  website?: string;
  placeId?: string;
  gbpLink?: string;
  scanRequestId?: string;
  submissionId: string;
  
  // Metadata
  referrer?: string;
  landingPath?: string;
  userAgent?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  
  // Scan results (optional)
  meoScore?: number;
  geoScore?: number;
  overallScore?: number;
}

/**
 * Send free scan lead email to b@mgodata.com
 */
export async function sendFreeScanLeadEmail(data: FreeScanEmailData): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();
  
  if (!resend) {
    logger.error('Cannot send email: Resend not configured');
    return { success: false, error: 'Email service not configured' };
  }
  
  try {
    const subject = `[MGO] Free scan lead — ${data.businessName || 'Unknown'} — ${data.city || ''}${data.state ? ', ' + data.state : ''}`;
    
    const plainTextBody = generatePlainTextEmail(data);
    const htmlBody = generateHtmlEmail(data);
    
    logger.info('Sending free scan lead email', {
      submissionId: data.submissionId,
      businessName: data.businessName,
      email: data.email ? '***' : undefined, // Mask in logs
    });
    
    const response = await resend.emails.send({
      from: 'MGO Scanner <noreply@mgodata.com>',
      to: ['info@atlasgrowths.com'],
      subject,
      text: plainTextBody,
      html: htmlBody,
    });
    
    if (response.error) {
      logger.error('Resend email error', { error: response.error });
      return { success: false, error: response.error.message };
    }
    
    logger.info('Free scan lead email sent', {
      submissionId: data.submissionId,
      emailId: response.data?.id,
    });
    
    return { success: true };
  } catch (error) {
    logger.error('Failed to send free scan lead email', {
      submissionId: data.submissionId,
      error: (error as Error).message,
    });
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Generate plain text email body
 */
function generatePlainTextEmail(data: FreeScanEmailData): string {
  const lines = [
    '===========================================',
    'NEW FREE SCAN LEAD',
    '===========================================',
    '',
    `Timestamp: ${data.timestamp}`,
    `Submission ID: ${data.submissionId}`,
    '',
    '--- BUSINESS INFORMATION ---',
    `Business Name: ${data.businessName || 'N/A'}`,
    `Contact Email: ${data.email || 'Not provided'}`,
    `Phone: ${data.phone || 'Not provided'}`,
    `Website: ${data.website || 'Not provided'}`,
    '',
    '--- LOCATION ---',
    `Address: ${data.address || 'N/A'}`,
    `City: ${data.city || 'N/A'}`,
    `State: ${data.state || 'N/A'}`,
    `Zip Code: ${data.zipCode || 'N/A'}`,
    `Country: ${data.country || 'N/A'}`,
    '',
    '--- GOOGLE BUSINESS PROFILE ---',
    `Place ID: ${data.placeId || 'N/A'}`,
    `GBP Link: ${data.gbpLink || 'N/A'}`,
    '',
  ];
  
  // Add scan scores if available
  if (data.meoScore !== undefined || data.geoScore !== undefined) {
    lines.push('--- SCAN RESULTS ---');
    if (data.meoScore !== undefined) lines.push(`MEO Score: ${data.meoScore}`);
    if (data.geoScore !== undefined) lines.push(`GEO Score: ${data.geoScore}`);
    if (data.overallScore !== undefined) lines.push(`Overall Score: ${data.overallScore}`);
    lines.push('');
  }
  
  // Add UTM tracking
  if (data.utmSource || data.utmMedium || data.utmCampaign) {
    lines.push('--- TRACKING DATA ---');
    if (data.utmSource) lines.push(`Source: ${data.utmSource}`);
    if (data.utmMedium) lines.push(`Medium: ${data.utmMedium}`);
    if (data.utmCampaign) lines.push(`Campaign: ${data.utmCampaign}`);
    if (data.utmTerm) lines.push(`Term: ${data.utmTerm}`);
    if (data.utmContent) lines.push(`Content: ${data.utmContent}`);
    if (data.referrer) lines.push(`Referrer: ${data.referrer}`);
    if (data.landingPath) lines.push(`Landing Page: ${data.landingPath}`);
    lines.push('');
  }
  
  lines.push('===========================================');
  lines.push('This email was automatically sent by MGO Scanner');
  lines.push('===========================================');
  
  return lines.join('\n');
}

/**
 * Generate HTML email body
 */
function generateHtmlEmail(data: FreeScanEmailData): string {
  const scoreSection = (data.meoScore !== undefined || data.geoScore !== undefined) ? `
    <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #7c3aed; border-radius: 4px;">
      <h3 style="margin: 0 0 10px 0; color: #7c3aed; font-size: 16px;">📊 Scan Results</h3>
      ${data.meoScore !== undefined ? `<p style="margin: 5px 0;"><strong>MEO Score:</strong> ${data.meoScore}</p>` : ''}
      ${data.geoScore !== undefined ? `<p style="margin: 5px 0;"><strong>GEO Score:</strong> ${data.geoScore}</p>` : ''}
      ${data.overallScore !== undefined ? `<p style="margin: 5px 0;"><strong>Overall Score:</strong> ${data.overallScore}</p>` : ''}
    </div>
  ` : '';
  
  const trackingSection = (data.utmSource || data.referrer) ? `
    <div style="margin: 20px 0; padding: 15px; background-color: #f1f5f9; border-left: 4px solid #64748b; border-radius: 4px;">
      <h3 style="margin: 0 0 10px 0; color: #64748b; font-size: 16px;">📍 Tracking Data</h3>
      ${data.utmSource ? `<p style="margin: 5px 0;"><strong>Source:</strong> ${data.utmSource}</p>` : ''}
      ${data.utmMedium ? `<p style="margin: 5px 0;"><strong>Medium:</strong> ${data.utmMedium}</p>` : ''}
      ${data.utmCampaign ? `<p style="margin: 5px 0;"><strong>Campaign:</strong> ${data.utmCampaign}</p>` : ''}
      ${data.referrer ? `<p style="margin: 5px 0;"><strong>Referrer:</strong> ${data.referrer}</p>` : ''}
      ${data.landingPath ? `<p style="margin: 5px 0;"><strong>Landing Page:</strong> ${data.landingPath}</p>` : ''}
    </div>
  ` : '';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>New Free Scan Lead</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">🎯 New Free Scan Lead</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">Received ${data.timestamp}</p>
  </div>
  
  <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <div style="margin-bottom: 20px;">
      <h2 style="margin: 0 0 15px 0; color: #7c3aed; font-size: 18px; border-bottom: 2px solid #7c3aed; padding-bottom: 5px;">🏢 Business Information</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #64748b; width: 140px;">Business Name:</td>
          <td style="padding: 8px 0;">${data.businessName || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Contact Email:</td>
          <td style="padding: 8px 0;">${data.email || '<em style="color: #94a3b8;">Not provided</em>'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Phone:</td>
          <td style="padding: 8px 0;">${data.phone || '<em style="color: #94a3b8;">Not provided</em>'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Website:</td>
          <td style="padding: 8px 0;">${data.website ? `<a href="${data.website}" style="color: #7c3aed;">${data.website}</a>` : '<em style="color: #94a3b8;">Not provided</em>'}</td>
        </tr>
      </table>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h2 style="margin: 0 0 15px 0; color: #7c3aed; font-size: 18px; border-bottom: 2px solid #7c3aed; padding-bottom: 5px;">📍 Location</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #64748b; width: 140px;">Address:</td>
          <td style="padding: 8px 0;">${data.address || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #64748b;">City:</td>
          <td style="padding: 8px 0;">${data.city || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #64748b;">State:</td>
          <td style="padding: 8px 0;">${data.state || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Zip Code:</td>
          <td style="padding: 8px 0;">${data.zipCode || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Country:</td>
          <td style="padding: 8px 0;">${data.country || 'N/A'}</td>
        </tr>
      </table>
    </div>
    
    ${data.placeId ? `
    <div style="margin-bottom: 20px;">
      <h2 style="margin: 0 0 15px 0; color: #7c3aed; font-size: 18px; border-bottom: 2px solid #7c3aed; padding-bottom: 5px;">🗺️ Google Business Profile</h2>
      <p style="margin: 5px 0;"><strong>Place ID:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 3px; font-size: 13px;">${data.placeId}</code></p>
      ${data.gbpLink ? `<p style="margin: 5px 0;"><strong>GBP Link:</strong> <a href="${data.gbpLink}" style="color: #7c3aed;">${data.gbpLink}</a></p>` : ''}
    </div>
    ` : ''}
    
    ${scoreSection}
    ${trackingSection}
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
      <p style="margin: 5px 0;">Submission ID: <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 3px;">${data.submissionId}</code></p>
      ${data.scanRequestId ? `<p style="margin: 5px 0;">Scan Request ID: <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 3px;">${data.scanRequestId}</code></p>` : ''}
      <p style="margin: 15px 0 5px 0;">This email was automatically sent by MGO Scanner</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}



