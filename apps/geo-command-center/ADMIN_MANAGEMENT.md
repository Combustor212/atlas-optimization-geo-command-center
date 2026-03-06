# Admin Management Guide

## Overview

The GEO Command Center has a comprehensive admin management system that allows you to view, invite, and manage administrators and other users in your agency.

## How to View Current Admins

### Method 1: Web Dashboard (Recommended)

1. Log in as an admin
2. Navigate to `/dashboard/users`
3. View the **Admin Summary Card** at the top showing all administrators
4. See detailed admin information in the **Administrators** table

### Method 2: API Endpoint

```bash
# Call the admins API endpoint
curl -X GET https://your-domain.com/api/users/admins \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

Response:
```json
{
  "admins": [
    {
      "id": "uuid",
      "full_name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "last_sign_in_at": "2026-02-13T19:00:00Z"
    }
  ],
  "count": 1,
  "agency_id": "agency-uuid"
}
```

### Method 3: Direct Database Query

Run this SQL in your Supabase SQL Editor:

```sql
SELECT 
  p.id,
  p.full_name,
  au.email,
  p.role,
  a.name as agency_name,
  p.created_at,
  au.last_sign_in_at
FROM profiles p
JOIN auth.users au ON p.id = au.id
LEFT JOIN agencies a ON p.agency_id = a.id
WHERE p.role = 'admin'
ORDER BY p.created_at DESC;
```

## User Roles

### Admin
- **Full access** to all features
- Can manage users (invite, promote, demote)
- Can change user roles
- Can reset passwords
- Can view all agency data
- Can manage clients and locations

### Staff
- Can view and manage clients
- Can view and manage locations
- Can generate reports
- **Cannot** manage users or change roles
- **Cannot** access user management page

### Client
- Limited to viewing their own data only
- Can view their locations and reports
- **Cannot** access other clients' data
- **Cannot** manage anything

## How to Invite New Users

### Via Web Dashboard

1. Navigate to `/dashboard/users`
2. Click the **"Invite User"** button in the top-right
3. Fill in the form:
   - **Email** (required): User's email address
   - **Full Name** (optional): User's display name
   - **Role** (required): Select admin, staff, or client
4. Click **"Send Invite"**

The user will receive an email with instructions to set their password.

### Via API

```bash
curl -X POST https://your-domain.com/api/users/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email": "newuser@example.com",
    "fullName": "New User",
    "role": "staff"
  }'
```

## How to Promote User to Admin

### Via Web Dashboard

1. Navigate to `/dashboard/users`
2. Find the user in the **Staff Members** or **Clients** table
3. Click the **role dropdown** next to their name
4. Select **"Admin"**
5. The change takes effect immediately

### Via API

```bash
curl -X POST https://your-domain.com/api/users/update-role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "userId": "user-uuid",
    "role": "admin"
  }'
```

### Via Direct Database Query

```sql
-- Promote user to admin (replace USER_ID with actual UUID)
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'USER_ID';
```

## How to Reset User Password

### Via Web Dashboard

1. Navigate to `/dashboard/users`
2. Find the user in any table
3. Click the **"Reset Password"** button in the Actions column
4. User will receive a password reset email

### Via API

```bash
curl -X POST https://your-domain.com/api/users/reset-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "userId": "user-uuid"
  }'
```

## Initial Setup: Creating Your First Admin

If you need to manually create the first admin user:

### Step 1: Sign up via the web interface
Navigate to `/signup` and create an account

### Step 2: Find your user ID in Supabase
1. Go to Supabase Dashboard → Authentication → Users
2. Copy your user's UUID

### Step 3: Promote yourself to admin
Run this SQL in Supabase SQL Editor:

```sql
-- Replace YOUR-USER-UUID with the UUID from step 2
-- Replace YOUR-AGENCY-UUID with your agency's UUID (or use the demo agency)
UPDATE profiles 
SET 
  role = 'admin',
  agency_id = 'YOUR-AGENCY-UUID'
WHERE id = 'YOUR-USER-UUID';
```

### Step 4: Create agency if needed
If you don't have an agency yet:

```sql
INSERT INTO agencies (id, name, slug) 
VALUES (
  'a0000000-0000-0000-0000-000000000001', 
  'My Agency', 
  'my-agency'
)
ON CONFLICT DO NOTHING;

-- Then assign it to your profile
UPDATE profiles 
SET agency_id = 'a0000000-0000-0000-0000-000000000001'
WHERE id = 'YOUR-USER-UUID';
```

## Security Considerations

### Admin Privileges
- Only admins can access `/dashboard/users`
- Only admins can invite new users
- Only admins can change user roles
- Admins cannot change their own role (prevents accidental lockout)
- All admin actions are scoped to their agency only

### Password Requirements
- Minimum 6 characters
- Users can change their own password in their profile
- Changing password requires current password verification
- Admin password resets send secure email links

### Agency Isolation
- Admins can only manage users within their own agency
- Row Level Security (RLS) enforces data separation
- Cross-agency access is prevented at the database level

## Troubleshooting

### "No admins found" in Admin Summary
Check if users have been assigned to an agency:

```sql
SELECT id, full_name, role, agency_id 
FROM profiles 
WHERE role = 'admin';
```

### User can't access admin features
Verify their role is set correctly:

```sql
SELECT p.id, p.full_name, p.role, au.email
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'user@example.com';
```

### User invitation email not received
1. Check Supabase email settings
2. Verify SMTP configuration
3. Check spam folder
4. Manually send password reset via Supabase dashboard

## Environment Variables Required

Make sure these are set in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Required for inviting users
```

## Files Reference

### API Routes
- `/api/users/admins/route.ts` - List all admins
- `/api/users/invite/route.ts` - Invite new users
- `/api/users/update-role/route.ts` - Change user roles
- `/api/users/reset-password/route.ts` - Reset passwords

### Components
- `/components/users/AdminSummaryCard.tsx` - Shows admin list
- `/components/users/InviteUserModal.tsx` - Invite user form
- `/components/users/UsersTable.tsx` - User management table
- `/components/users/RoleSelect.tsx` - Role dropdown
- `/components/users/RoleBadge.tsx` - Role display badge

### Pages
- `/dashboard/users/page.tsx` - Main user management page

### Database
- `profiles` table - User profiles with roles
- `auth.users` table - Supabase auth users
- `agencies` table - Agency information
