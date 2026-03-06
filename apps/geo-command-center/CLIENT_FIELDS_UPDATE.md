# Client Phone and Business Name Update

## Summary
Added phone number and business name fields to the client information section.

## Changes Made

### 1. Database Schema
- **File**: `supabase/schema.sql`
- Added `phone TEXT` column to clients table
- Added `business_name TEXT` column to clients table

### 2. TypeScript Types
- **File**: `src/types/database.ts`
- Updated `Client` interface to include:
  - `phone: string | null`
  - `business_name: string | null`

### 3. Add Client Form
- **File**: `src/components/clients/AddClientForm.tsx`
- Added "Business Name" input field (optional)
- Added "Phone" input field with `type="tel"` (optional)
- Fields are ordered: Name, Business Name, Email, Phone

### 4. Server Action
- **File**: `src/app/(dashboard)/dashboard/clients/actions.ts`
- Updated `createClientAction` to handle new fields:
  - `phone`: extracted from form data or null
  - `business_name`: extracted from form data or null

### 5. Display on Clients List
- **File**: `src/app/(dashboard)/dashboard/clients/page.tsx`
- Updated client cards to show:
  - Business name (if exists) below client name in smaller text
  - Phone number (if exists) below email in smaller text

### 6. Display on Client Detail Page
- **File**: `src/app/(dashboard)/dashboard/clients/[id]/page.tsx`
- Updated header to show:
  - Business name (if exists) below client name
  - Phone number (if exists) below email

### 7. Database Migration
- **File**: `supabase/migrations/add_client_phone_business_name.sql`
- Created migration script to add columns to existing database
- Safe to run on existing databases (uses `IF NOT EXISTS`)

## Database Migration Instructions

### Option 1: Using Supabase CLI
```bash
# Navigate to the geo-command-center directory
cd apps/geo-command-center

# Run the migration
supabase db push
```

### Option 2: Manual SQL Execution
Run the following SQL in your Supabase SQL Editor:

```sql
-- Add phone column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add business_name column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS business_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN clients.phone IS 'Contact phone number for the client';
COMMENT ON COLUMN clients.business_name IS 'Business name of the client';
```

### Option 3: Fresh Database
If you're setting up a fresh database, just run the updated `supabase/schema.sql` file which already includes these columns.

## Testing

After applying the migration:

1. Go to the Clients page
2. Click "Add Client"
3. Verify the form shows all 4 fields: Name, Business Name, Email, Phone
4. Add a test client with all fields filled
5. Verify the client shows up in the clients list with business name and phone
6. Click on the client to view details
7. Verify the client detail page shows all information

## Notes

- Both new fields are **optional** - only Name and Email are required
- Existing clients will have `null` values for phone and business_name until updated
- The UI gracefully handles missing values (doesn't show empty fields)
- Phone input uses `type="tel"` for better mobile experience
