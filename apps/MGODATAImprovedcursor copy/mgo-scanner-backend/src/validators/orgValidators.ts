/**
 * Zod Validators for Organization & Location Endpoints
 */
import { z } from 'zod';

// Organization validators
export const createOrgSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100, 'Name too long'),
});

export const updateOrgSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100, 'Name too long').optional(),
});

export const addMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
});

// Location validators
export const createLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(200, 'Name too long'),
  addressLine1: z.string().max(200, 'Address too long').optional(),
  addressLine2: z.string().max(200, 'Address too long').optional(),
  city: z.string().min(1, 'City is required').max(100, 'City too long'),
  state: z.string().max(100, 'State too long').optional(),
  zipCode: z.string().max(20, 'Zip code too long').optional(),
  country: z.string().min(1, 'Country is required').max(100, 'Country too long'),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  phone: z.string().max(50, 'Phone too long').optional(),
  googlePlaceId: z.string().max(200, 'Place ID too long').optional(),
});

export const updateLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(200, 'Name too long').optional(),
  addressLine1: z.string().max(200, 'Address too long').optional(),
  addressLine2: z.string().max(200, 'Address too long').optional(),
  city: z.string().min(1, 'City is required').max(100, 'City too long').optional(),
  state: z.string().max(100, 'State too long').optional(),
  zipCode: z.string().max(20, 'Zip code too long').optional(),
  country: z.string().min(1, 'Country is required').max(100, 'Country too long').optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  phone: z.string().max(50, 'Phone too long').optional(),
  googlePlaceId: z.string().max(200, 'Place ID too long').optional(),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;



