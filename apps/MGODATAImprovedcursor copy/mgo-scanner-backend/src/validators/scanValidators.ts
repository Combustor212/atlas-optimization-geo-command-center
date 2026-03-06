/**
 * Zod Validators for Scan Endpoints
 */
import { z } from 'zod';

export const runScanSchema = z.object({
  locationId: z.string().uuid('Invalid location ID'),
  scanType: z.enum(['FREE', 'PAID', 'SCHEDULED']).default('PAID'),
  source: z.string().max(50).optional().default('web'),
  inputPayload: z.object({
    businessName: z.string().min(1),
    city: z.string().min(1),
    state: z.string().optional(),
    country: z.string().optional(),
    googlePlaceId: z.string().optional(),
    website: z.string().optional(),
    // Add other scan input fields as needed
  }).passthrough(), // Allow additional fields
});

export const getScanHistorySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['QUEUED', 'RUNNING', 'COMPLETE', 'FAILED', 'CANCELED']).optional(),
});

export type RunScanInput = z.infer<typeof runScanSchema>;
export type GetScanHistoryInput = z.infer<typeof getScanHistorySchema>;



