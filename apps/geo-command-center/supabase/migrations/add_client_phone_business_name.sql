-- Migration: Add phone and business_name columns to clients table
-- Date: 2026-02-13

-- Add phone column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add business_name column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS business_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN clients.phone IS 'Contact phone number for the client';
COMMENT ON COLUMN clients.business_name IS 'Business name of the client';
