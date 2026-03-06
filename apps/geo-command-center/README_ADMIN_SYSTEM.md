# 🛡️ Admin System - Complete Overview

## Quick Start

### View Current Admins (3 Ways)

#### 1. Web Dashboard (Recommended) ⭐
```
1. Log in at /login
2. Navigate to /dashboard/users
3. See Admin Summary Card at the top
```

#### 2. Run Script
```bash
cd apps/geo-command-center
node scripts/check-admins.js
```

#### 3. Database Query
```sql
-- Run in Supabase SQL Editor
SELECT p.id, p.full_name, au.email, p.role
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.role = 'admin';
```

---

## 🎯 What You Can Do

### As an Admin, you can:

✅ **View all users** - See admins, staff, and clients organized by role  
✅ **Invite new users** - Create accounts for admins, staff, or clients  
✅ **Change user roles** - Promote staff to admin, demote admin to staff, etc.  
✅ **Reset passwords** - Send password reset emails to any user  
✅ **View user activity** - See when users last signed in  
✅ **Manage your profile** - Edit name, email, and password  

---

## 📱 User Interface

### Main Features on `/dashboard/users`

1. **Admin Summary Card**
   - Shows count of admins
   - Lists all administrators with avatars
   - Displays last activity time

2. **Invite User Button** (Top-right)
   - Opens modal to invite new users
   - Can invite admins, staff, or clients
   - Sends automatic password setup email

3. **User Tables** (Grouped by role)
   - **Administrators Table** - All admins
   - **Staff Members Table** - All staff
   - **Clients Table** - All client users

4. **Per-User Actions**
   - **Change Role** - Dropdown to change user role
   - **Reset Password** - Send password reset email
   - **View Details** - Name, email, last sign-in

---

## 🔑 User Roles Explained

### Admin 👑
- **Full system access**
- Can manage all users
- Can change any user's role
- Can view and manage all agency data
- Can invite new users
- Can reset any user's password

### Staff 👤
- Can manage clients and locations
- Can generate reports
- **Cannot** manage users
- **Cannot** access /dashboard/users
- **Cannot** change roles

### Client 👥
- View only their own data
- Can see their locations and reports
- **Cannot** see other clients
- **Cannot** manage anything
- Very restricted access

---

## 🚀 Common Tasks

### Create Your First Admin

If you're setting up the system for the first time:

1. **Sign up** at `/signup`
2. **Get your user ID** from Supabase → Authentication → Users
3. **Run this SQL** in Supabase SQL Editor:
   ```sql
   UPDATE profiles 
   SET role = 'admin', 
       agency_id = 'a0000000-0000-0000-0000-000000000001'
   WHERE id = 'YOUR-USER-ID';
   ```
4. **Refresh** the page - you now have admin access!

### Invite a New Admin

1. Go to `/dashboard/users`
2. Click **"Invite User"**
3. Enter:
   - Email: `newadmin@example.com`
   - Full Name: `John Doe` (optional)
   - Role: **Admin**
4. Click **"Send Invite"**
5. They receive an email to set their password

### Promote Staff to Admin

1. Go to `/dashboard/users`
2. Find user in **"Staff Members"** table
3. Click the role dropdown
4. Select **"Admin"**
5. Done! Change takes effect immediately

### Demote Admin to Staff

1. Go to `/dashboard/users`
2. Find user in **"Administrators"** table
3. Click the role dropdown
4. Select **"Staff"**
5. They lose admin access immediately

⚠️ **Note:** You cannot change your own role (prevents accidental lockout)

---

## 🔐 Security

### What's Protected

✅ Only admins can access `/dashboard/users`  
✅ Only admins can invite users  
✅ Only admins can change roles  
✅ Users can only manage their own agency  
✅ Password changes require current password  
✅ Email changes require current password  
✅ Row Level Security (RLS) enforces all rules  

### Best Practices

1. **Limit admin accounts** - Only give admin to trusted users
2. **Use staff role** for most team members
3. **Regular audit** - Check who has admin access monthly
4. **Remove access** when team members leave
5. **Strong passwords** - Enforce 6+ character minimum

---

## 📊 API Endpoints

### List All Admins
```bash
GET /api/users/admins

Response:
{
  "admins": [...],
  "count": 3,
  "agency_id": "..."
}
```

### Invite New User
```bash
POST /api/users/invite
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "admin"
}
```

### Update User Role
```bash
POST /api/users/update-role
{
  "userId": "user-uuid",
  "role": "admin"
}
```

### Reset User Password
```bash
POST /api/users/reset-password
{
  "userId": "user-uuid"
}
```

---

## 🗂️ File Structure

```
apps/geo-command-center/
├── src/
│   ├── app/
│   │   ├── (dashboard)/dashboard/users/
│   │   │   └── page.tsx                    # Main user management page
│   │   └── api/users/
│   │       ├── admins/route.ts             # List admins API
│   │       ├── invite/route.ts             # Invite user API
│   │       ├── update-role/route.ts        # Change role API
│   │       └── reset-password/route.ts     # Password reset API
│   ├── components/
│   │   ├── users/
│   │   │   ├── AdminSummaryCard.tsx        # Admin list card
│   │   │   ├── InviteUserModal.tsx         # Invite form
│   │   │   ├── InviteUserButton.tsx        # Invite button wrapper
│   │   │   ├── UsersTable.tsx              # User table component
│   │   │   ├── RoleSelect.tsx              # Role dropdown
│   │   │   ├── RoleBadge.tsx               # Role badge display
│   │   │   └── UserHeader.tsx              # Page header
│   │   └── profile/
│   │       └── EditNameModal.tsx           # Profile edit modal
│   └── lib/
│       └── data/
│           └── users.ts                    # User data functions
├── supabase/
│   ├── schema.sql                          # Database schema
│   ├── seed.sql                            # Seed data
│   └── queries/
│       └── list-admins.sql                 # Helper SQL queries
├── scripts/
│   └── check-admins.js                     # CLI admin checker
└── docs/
    ├── ADMIN_MANAGEMENT.md                 # Detailed documentation
    └── ADMIN_SYSTEM_SUMMARY.md             # Quick summary
```

---

## 🛠️ Troubleshooting

### "No admins found"

**Problem:** Admin Summary Card shows no admins

**Solutions:**
1. Check if users have `role = 'admin'` in profiles table
2. Verify users are assigned to an agency
3. Run SQL:
   ```sql
   SELECT id, full_name, role, agency_id 
   FROM profiles 
   WHERE role = 'admin';
   ```

### "Cannot access /dashboard/users"

**Problem:** Gets redirected when visiting page

**Solutions:**
1. Verify you're logged in
2. Check your role is 'admin':
   ```sql
   SELECT role FROM profiles WHERE id = auth.uid();
   ```
3. If role is wrong, update it:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE id = 'YOUR-ID';
   ```

### "Invite email not received"

**Problem:** New user doesn't get setup email

**Solutions:**
1. Check spam folder
2. Verify Supabase email settings
3. Check SMTP configuration in Supabase dashboard
4. Manually send password reset from Supabase → Auth → Users

### "Service Role Key error"

**Problem:** Cannot invite users - missing SUPABASE_SERVICE_ROLE_KEY

**Solutions:**
1. Add to `.env.local`:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your-service-key-here
   ```
2. Get key from Supabase → Settings → API → service_role key
3. **Important:** Never commit this key to git!

---

## 🎓 Additional Resources

- **Full Documentation:** `ADMIN_MANAGEMENT.md`
- **Quick Summary:** `ADMIN_SYSTEM_SUMMARY.md`
- **SQL Helpers:** `supabase/queries/list-admins.sql`
- **CLI Tool:** `scripts/check-admins.js`

---

## 📞 Need Help?

1. Check `ADMIN_MANAGEMENT.md` for detailed instructions
2. Run `node scripts/check-admins.js` to debug admin issues
3. Check Supabase logs for API errors
4. Verify environment variables are set correctly

---

**Last Updated:** February 2026  
**System Version:** GEO Command Center v1.0
