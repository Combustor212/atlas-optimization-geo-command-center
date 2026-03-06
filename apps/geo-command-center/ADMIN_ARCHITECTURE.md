# Admin System Architecture

## User Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      User Signs In                           │
│                     /login (Auth)                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Check User Role     │
              │  (from profiles)     │
              └──────────┬───────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌────────┐      ┌────────┐     ┌─────────┐
    │ Admin  │      │ Staff  │     │ Client  │
    │  👑    │      │  👤    │     │  👥     │
    └───┬────┘      └───┬────┘     └────┬────┘
        │               │                │
        │               │                │
        ▼               ▼                ▼
```

## Admin Capabilities

```
┌────────────────────────────────────────────────────────────┐
│                    Admin Dashboard                          │
│                   /dashboard/users                          │
└────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌────────────────┐
│ View All      │    │ Invite New    │    │ Manage Roles   │
│ Admins        │    │ Users         │    │ & Permissions  │
│               │    │               │    │                │
│ • Admin Card  │    │ • Email       │    │ • Change Role  │
│ • User Table  │    │ • Name        │    │ • Reset Pass   │
│ • Last Login  │    │ • Role        │    │ • View Details │
└───────────────┘    └───────────────┘    └────────────────┘
```

## Data Model

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  auth.users  │         │   profiles   │         │   agencies   │
│              │         │              │         │              │
│ • id (PK)    │◄────────│ • id (PK,FK) │────────►│ • id (PK)    │
│ • email      │         │ • agency_id  │         │ • name       │
│ • password   │         │ • role ◄─────┼─────┐   │ • slug       │
│ • metadata   │         │ • full_name  │     │   └──────────────┘
└──────────────┘         │ • client_id  │     │
                         └──────────────┘     │
                                              │
                         ┌────────────────────┘
                         │
                         ▼
                    ┌─────────┐
                    │  Roles  │
                    ├─────────┤
                    │ admin   │ ← Full access
                    │ staff   │ ← Can manage clients
                    │ client  │ ← View only own data
                    └─────────┘
```

## API Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│                  /dashboard/users page                       │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┬───────────────┐
         │               │               │               │
         ▼               ▼               ▼               ▼
┌────────────────┐ ┌────────────┐ ┌──────────────┐ ┌─────────────┐
│ GET /api/      │ │ POST /api/ │ │ POST /api/   │ │ POST /api/  │
│ users/admins   │ │ users/     │ │ users/       │ │ users/reset-│
│                │ │ invite     │ │ update-role  │ │ password    │
│ List all       │ │            │ │              │ │             │
│ administrators │ │ Create new │ │ Change user  │ │ Send reset  │
│                │ │ user       │ │ role         │ │ email       │
└────────┬───────┘ └─────┬──────┘ └──────┬───────┘ └──────┬──────┘
         │               │                │                │
         └───────────────┴────────────────┴────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │ Supabase Auth & DB     │
                    │                        │
                    │ • Validate admin role  │
                    │ • Check agency_id      │
                    │ • Apply RLS policies   │
                    │ • Execute query        │
                    └────────────────────────┘
```

## Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
└─────────────────────────────────────────────────────────────┘

Layer 1: Authentication
┌──────────────────────────────────────────┐
│ Supabase Auth - JWT Token Required       │
└──────────────────────────────────────────┘
                    ↓
Layer 2: Role Authorization
┌──────────────────────────────────────────┐
│ Check user.role === 'admin'              │
│ Redirect if not admin                    │
└──────────────────────────────────────────┘
                    ↓
Layer 3: Agency Isolation
┌──────────────────────────────────────────┐
│ Filter by user.agency_id                 │
│ Can only see/modify own agency users     │
└──────────────────────────────────────────┘
                    ↓
Layer 4: Row Level Security (RLS)
┌──────────────────────────────────────────┐
│ Database enforces policies               │
│ • get_user_agency_id()                   │
│ • is_agency_member()                     │
└──────────────────────────────────────────┘
                    ↓
Layer 5: Self-Protection
┌──────────────────────────────────────────┐
│ Cannot change own role                   │
│ Prevents accidental lockout              │
└──────────────────────────────────────────┘
```

## Component Hierarchy

```
UsersPage (Server Component)
│
├─ Header
│  ├─ Title & Description
│  └─ InviteUserButton (Client)
│     └─ InviteUserModal (Client)
│        └─ Form (email, name, role)
│
├─ AdminSummaryCard (Client)
│  └─ Fetches /api/users/admins
│     └─ Displays admin list with avatars
│
├─ UsersTable (role="admin")
│  └─ Filtered admin users
│     ├─ RoleSelect (Client)
│     └─ ResetPasswordButton (Client)
│
├─ UsersTable (role="staff")
│  └─ Filtered staff users
│     ├─ RoleSelect (Client)
│     └─ ResetPasswordButton (Client)
│
├─ UsersTable (role="client")
│  └─ Filtered client users
│     ├─ RoleSelect (Client)
│     └─ ResetPasswordButton (Client)
│
└─ Role Permissions Legend
   └─ Explains each role
```

## Invite User Flow

```
1. Admin clicks "Invite User"
        ↓
2. Modal opens with form
        ↓
3. Admin fills:
   • Email (required)
   • Name (optional)
   • Role (required)
        ↓
4. Submit → POST /api/users/invite
        ↓
5. Backend:
   ├─ Verify admin role
   ├─ Check email unique
   ├─ Generate temp password
   ├─ Create auth user
   ├─ Update profile with role & agency
   └─ Send password reset email
        ↓
6. User receives email
        ↓
7. User clicks link
        ↓
8. User sets own password
        ↓
9. User can now login
```

## Role Change Flow

```
1. Admin clicks role dropdown
        ↓
2. Selects new role (e.g., staff → admin)
        ↓
3. POST /api/users/update-role
        ↓
4. Backend:
   ├─ Verify requestor is admin
   ├─ Verify target user in same agency
   ├─ Check not changing own role
   └─ Update profiles.role
        ↓
5. Page refreshes
        ↓
6. User now has new role/permissions
        ↓
7. Next login reflects new access level
```

## Database Schema (Simplified)

```sql
-- Core Tables
auth.users (managed by Supabase)
├─ id (PK)
├─ email
└─ encrypted_password

profiles (your app)
├─ id (PK, FK → auth.users.id)
├─ agency_id (FK → agencies.id)
├─ client_id (FK → clients.id)
├─ role (admin | staff | client)
└─ full_name

agencies
├─ id (PK)
├─ name
└─ slug

-- RLS Policies
✓ Users can read own profile
✓ Admins can read/write agency users
✓ Agency isolation enforced
✓ Cannot read other agencies' data
```

## Deployment Checklist

```
[ ] Environment Variables Set
    ├─ NEXT_PUBLIC_SUPABASE_URL
    ├─ NEXT_PUBLIC_SUPABASE_ANON_KEY
    └─ SUPABASE_SERVICE_ROLE_KEY

[ ] Database Schema Applied
    ├─ supabase/schema.sql executed
    └─ RLS policies enabled

[ ] First Admin Created
    ├─ User signed up
    ├─ Role set to 'admin'
    └─ Agency assigned

[ ] Email Configuration
    ├─ SMTP configured in Supabase
    └─ Password reset emails working

[ ] Access Tested
    ├─ Admin can view /dashboard/users
    ├─ Staff cannot access /dashboard/users
    └─ Client cannot access /dashboard/users

[ ] Features Verified
    ├─ Invite user works
    ├─ Role changes work
    ├─ Password reset works
    └─ Admin summary card shows data
```
