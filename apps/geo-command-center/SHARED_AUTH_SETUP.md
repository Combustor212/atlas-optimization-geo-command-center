# Shared Auth Setup (Atlas GS + GEO Command Center)

Both apps now use **Supabase Auth** with the same credentials. One admin account works for both.

## 1. Shared Supabase Project

Use the **same Supabase project** for both apps:

- Atlas GS `.env` / `.env.local`
- GEO Command Center `.env.local`

Required vars (identical in both):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 2. Create Admin (One-Time)

From the **Atlas GS** folder:

```bash
cd "Atlas GS Tracking system 2"
npx tsx scripts/create-admin-supabase.ts
```

Enter name, email, password. This creates:

- Supabase Auth user
- Profile with `role: admin`
- Prisma User for Atlas GS

## 3. Login

Use the same email and password in both apps:

- **Atlas GS**: http://localhost:3000
- **GEO Command Center**: http://localhost:3001

## 4. Database Setup

- **GEO Command Center**: Run `supabase/schema.sql` in Supabase SQL Editor (creates profiles, etc.)
- **Atlas GS**: Run `npx prisma migrate dev` for the schema change (adds `supabase_user_id`)
