# Architectural Conventions

## Overview

This document outlines the shared conventions for building features in this Next.js 14 App Router + TypeScript + Tailwind + Supabase SaaS application.

## 🏗️ Core Principles

1. **Agency-Scoped by Default** - Every resource must be scoped to an agency
2. **Server-Side Validation** - Never trust client data, validate on server
3. **Defense in Depth** - Use RLS + server-side checks + role enforcement
4. **Consistent Patterns** - Follow established conventions for maintainability

---

## 📁 Shared Utilities

### 1. Supabase Server Client

**Location:** `/lib/supabase/server.ts`

```typescript
import { createClient } from '@/lib/supabase/server'

// In any server component or API route
const supabase = await createClient()
```

- ✅ Cookie-aware session management
- ✅ Automatic JWT handling
- ✅ Works in Server Components and API routes

### 2. Authentication & Scoping

**Location:** `/lib/auth/scope.ts`

#### Get Current User
```typescript
import { getSessionUser } from '@/lib/auth/scope'

const user = await getSessionUser()
// Returns: { id, email, role, agency_id, client_id } | null
```

#### Require Specific Role
```typescript
import { requireRole } from '@/lib/auth/scope'

// In API routes or Server Components
const user = await requireRole(['admin', 'staff'])
// Redirects to /login if not authenticated
// Redirects to /unauthorized if wrong role
```

#### Get Agency Scope
```typescript
import { getAgencyScope } from '@/lib/auth/scope'

const scope = await getAgencyScope()
// Returns: { agency_id, role, client_id?, user_id }
```

#### Check Access
```typescript
import { canAccessClient, verifyAgencyAccess } from '@/lib/auth/scope'

const hasAccess = await canAccessClient(clientId)
const isValid = await verifyAgencyAccess(resourceAgencyId, userAgencyId)
```

### 3. Request Validation

**Location:** `/lib/validation.ts`

#### Define Schema
```typescript
import { z } from 'zod'

export const mySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().positive(),
})
```

#### Validate Request Body
```typescript
import { validateBody, mySchema } from '@/lib/validation'

const validation = await validateBody(request, mySchema)
if (!validation.success) {
  return errors.validationError(validation.error)
}

const data = validation.data // Fully typed!
```

#### Built-in Schemas
- ✅ `aiVisibilitySchema` - AI visibility tracking
- ✅ `searchVisibilitySchema` - Search visibility tracking
- ✅ Common field schemas: `uuidSchema`, `emailSchema`, `urlSchema`

### 4. Error Responses

**Location:** `/lib/api/errors.ts`

#### Standard Errors
```typescript
import { errors } from '@/lib/api/errors'

return errors.unauthorized()
return errors.forbidden('Custom message')
return errors.notFound('Resource')
return errors.badRequest('Invalid input')
return errors.validationError(message)
return errors.agencyMismatch()
return errors.insufficientPermissions()
return errors.internalError()
return errors.methodNotAllowed(['POST', 'GET'])
```

#### Success Responses
```typescript
import { successResponse, createdResponse, noContentResponse } from '@/lib/api/errors'

return successResponse({ data: result }) // 200
return createdResponse({ id: newId }) // 201
return noContentResponse() // 204
```

---

## 🛣️ API Route Pattern

### Template for New API Routes

```typescript
import { createClient } from '@/lib/supabase/server'
import { requireRole, getAgencyScope } from '@/lib/auth/scope'
import { validateBody, mySchema } from '@/lib/validation'
import { errors, createdResponse } from '@/lib/api/errors'

export async function POST(request: Request) {
  try {
    // 1. Authentication & Role Check
    const user = await requireRole(['admin', 'staff'])
    
    // 2. Get Agency Scope
    const scope = await getAgencyScope()
    if (!scope || !scope.agency_id) {
      return errors.forbidden('No agency access')
    }

    // 3. Validate Request Body
    const validation = await validateBody(request, mySchema)
    if (!validation.success) {
      return errors.validationError(validation.error)
    }

    const data = validation.data
    const supabase = await createClient()

    // 4. Verify Agency Ownership (Defense in Depth)
    // Even with RLS, explicitly check agency ownership
    const { data: resource } = await supabase
      .from('some_table')
      .select('agency_id')
      .eq('id', data.resource_id)
      .single()

    if (!resource || resource.agency_id !== scope.agency_id) {
      return errors.agencyMismatch()
    }

    // 5. Perform Database Operation
    const { data: result, error } = await supabase
      .from('my_table')
      .insert([data])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return errors.internalError('Failed to create record')
    }

    // 6. Return Success Response
    return createdResponse(result)
    
  } catch (error) {
    console.error('API error:', error)
    return errors.internalError()
  }
}

// Restrict HTTP methods
export async function GET() {
  return errors.methodNotAllowed(['POST'])
}
```

---

## 🗄️ Database Conventions

### Migration Template

```sql
-- Migration: description
-- Date: YYYY-MM-DD

-- 1. Create Table
CREATE TABLE my_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Indexes
CREATE INDEX idx_my_table_agency ON my_table(agency_id);
CREATE INDEX idx_my_table_created ON my_table(created_at DESC);

-- 3. Enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- 4. Admin/Staff Policy (Read/Write for their agency)
CREATE POLICY "Agency members can manage their agency data"
  ON my_table
  FOR ALL
  USING (agency_id = get_user_agency_id())
  WITH CHECK (agency_id = get_user_agency_id());

-- 5. Client Policy (Read-only for their data)
CREATE POLICY "Clients can view their data"
  ON my_table
  FOR SELECT
  USING (
    agency_id IN (
      SELECT c.agency_id FROM clients c
      WHERE c.id = get_user_client_id()
    )
  );

-- 6. Auto-Update Trigger
CREATE TRIGGER update_my_table_updated_at
  BEFORE UPDATE ON my_table
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Required Helper Functions

Ensure these exist in your database:

```sql
-- Get user's agency_id from JWT
CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS UUID AS $$
  SELECT agency_id FROM profiles
  WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;

-- Get user's client_id from JWT
CREATE OR REPLACE FUNCTION get_user_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM profiles
  WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;

-- Check if user is agency member
CREATE OR REPLACE FUNCTION is_agency_member()
RETURNS BOOLEAN AS $$
  SELECT role IN ('admin', 'staff') FROM profiles
  WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;
```

---

## 🔐 Security Checklist

For every new feature:

- [ ] API routes require authentication with `requireRole()`
- [ ] Request bodies validated with Zod schemas
- [ ] Agency ownership verified server-side (even with RLS)
- [ ] Database tables have RLS enabled
- [ ] Policies check `agency_id` via JWT claims
- [ ] Separate policies for admin/staff vs clients
- [ ] Foreign keys reference appropriate tables
- [ ] Indexes created for performance
- [ ] No cross-agency data leakage possible
- [ ] Errors don't expose sensitive information

---

## 📊 Example: Visibility Tracking API

### AI Visibility Endpoint

**File:** `/app/api/visibility/ai/route.ts`

```typescript
export async function POST(request: Request) {
  // 1. Auth & role
  const user = await requireRole(['admin', 'staff'])
  
  // 2. Agency scope
  const scope = await getAgencyScope()
  
  // 3. Validate
  const validation = await validateBody(request, aiVisibilitySchema)
  
  // 4. Verify location belongs to agency
  const location = await verifyLocationOwnership(data.location_id, scope.agency_id)
  
  // 5. Insert with RLS enforcing agency isolation
  const result = await supabase
    .from('generative_ai_visibility')
    .insert([data])
  
  // 6. Return
  return createdResponse(result)
}
```

### Database Schema

```sql
CREATE TABLE generative_ai_visibility (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id),
  platform TEXT NOT NULL,
  visibility_score DECIMAL(5,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS ensures users only see their agency's data
ALTER TABLE generative_ai_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members access via location"
  ON generative_ai_visibility FOR ALL
  USING (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN clients c ON l.client_id = c.id
      WHERE c.agency_id = get_user_agency_id()
    )
  );
```

---

## 🎯 Key Takeaways

1. **Always use `requireRole()`** in API routes
2. **Always validate** with Zod schemas
3. **Always verify agency ownership** server-side
4. **Always enable RLS** on tables
5. **Always use helper functions** for consistency
6. **Always use standard error responses**
7. **Never return cross-agency data**
8. **Never trust client input**

---

## 📚 Related Files

- `/lib/supabase/server.ts` - Supabase client
- `/lib/auth/scope.ts` - Authentication & scoping
- `/lib/validation.ts` - Zod schemas
- `/lib/api/errors.ts` - Error responses
- `/app/api/visibility/ai/route.ts` - Example API route
- `/supabase/migrations/20260215_visibility_tracking.sql` - Example migration

---

**Follow these conventions for all new features to maintain consistency, security, and scalability!**
