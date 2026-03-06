# MGO Production Backend - Complete Implementation Blueprint

## 🎯 **OVERVIEW**

This document provides a **complete production-ready backend architecture** for MGO with:
- Multi-tenant organization structure
- Full scan history tracking
- JWT authentication
- RBAC (Role-Based Access Control)
- Billing integration
- Dashboard APIs
- Background job processing

---

## 📊 **ARCHITECTURE**

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React/Vite)                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               EXPRESS API SERVER (Node.js/TS)                │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Auth      │  │   Scans     │  │  Dashboard  │         │
│  │ Middleware  │  │  Endpoint   │  │    APIs     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                               │
│  ┌─────────────────────────────────────────────────┐        │
│  │          Background Job Processor                │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              POSTGRESQL (via Prisma ORM)                     │
│                                                               │
│  Users → Organizations → Locations → Scans                   │
│  Subscriptions, AuditLogs, Jobs, ScanDeltas                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ **FILE STRUCTURE**

```
mgo-scanner-backend/
├── prisma/
│   ├── schema.prisma          ✅ CREATED
│   ├── migrations/            (auto-generated)
│   └── seed.ts                🔨 TO CREATE
│
├── src/
│   ├── lib/
│   │   ├── prisma.ts          🔨 Prisma client singleton
│   │   ├── jwt.ts             🔨 JWT utilities
│   │   ├── rbac.ts            🔨 Permission checks
│   │   └── password.ts        🔨 Bcrypt utilities
│   │
│   ├── middleware/
│   │   ├── auth.ts            🔨 JWT auth middleware
│   │   ├── rbac.ts            🔨 Role-based access control
│   │   ├── rateLimit.ts       🔨 Rate limiting
│   │   └── validateRequest.ts 🔨 Zod validation
│   │
│   ├── api/
│   │   ├── auth.ts            🔨 Register, login, logout, me
│   │   ├── organizations.ts   🔨 Org CRUD + member management
│   │   ├── locations.ts       🔨 Location CRUD
│   │   ├── scans.ts           🔨 Enhanced scan endpoint
│   │   ├── dashboard.ts       🔨 Metrics, trends, history
│   │   ├── exports.ts         🔨 CSV exports
│   │   └── admin.ts           🔨 Admin-only endpoints
│   │
│   ├── services/
│   │   ├── scanService.ts     🔨 Scan execution logic
│   │   ├── deltaService.ts    🔨 Calculate improvements
│   │   ├── jobProcessor.ts    🔨 Background job runner
│   │   └── auditService.ts    🔨 Audit log helper
│   │
│   └── index.ts               🔨 UPDATED - Wire new routes
│
├── ENV_SETUP.md               ✅ CREATED
├── PRODUCTION_BACKEND_BLUEPRINT.md  ✅ THIS FILE
└── package.json               🔨 UPDATED
```

---

## 🔑 **AUTHENTICATION FLOW**

### Registration
```
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "secure_password",
  "name": "John Doe"
}

Response:
{
  "user": { "id": "uuid", "email": "...", "role": "USER" },
  "organization": { "id": "uuid", "name": "John Doe's Organization", "slug": "john-doe-s-organization" },
  "token": "jwt_token_here"
}
```

### Login
```
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "secure_password"
}

Response:
{
  "user": { ...},
  "token": "jwt_token_here"
}
```

### Protected Routes
```
GET /api/auth/me
Headers: Authorization: Bearer <jwt_token>

Response:
{
  "user": { ... },
  "organizations": [{ ...org_data, role: "OWNER" }]
}
```

---

## 🏢 **MULTI-TENANT STRUCTURE**

### Data Flow
```
User
 └── OrganizationMember (role: OWNER/ADMIN/MEMBER)
      └── Organization
           ├── Locations
           │    └── Scans
           └── Subscriptions
```

### Permission Matrix

| Role   | View Org | Edit Org | Add Locations | Run Scans | View Billing |
|--------|----------|----------|---------------|-----------|--------------|
| OWNER  | ✅       | ✅       | ✅            | ✅        | ✅           |
| ADMIN  | ✅       | ✅       | ✅            | ✅        | ❌           |
| MEMBER | ✅       | ❌       | ❌            | ✅        | ❌           |

---

## 📡 **COMPLETE API REFERENCE**

### Auth Endpoints

```typescript
POST   /api/auth/register       // Create account + org
POST   /api/auth/login          // Get JWT token
POST   /api/auth/logout         // Invalidate token (optional)
GET    /api/auth/me             // Get current user + orgs
POST   /api/auth/refresh        // Refresh JWT
POST   /api/auth/reset-password // Request password reset
POST   /api/auth/verify-email   // Email verification
```

### Organization Endpoints

```typescript
GET    /api/orgs                 // List user's orgs
POST   /api/orgs                 // Create new org
GET    /api/orgs/:orgId          // Get org details
PATCH  /api/orgs/:orgId          // Update org
DELETE /api/orgs/:orgId          // Delete org

GET    /api/orgs/:orgId/members  // List members
POST   /api/orgs/:orgId/members  // Invite member
PATCH  /api/orgs/:orgId/members/:userId  // Update role
DELETE /api/orgs/:orgId/members/:userId  // Remove member
```

### Location Endpoints

```typescript
GET    /api/orgs/:orgId/locations       // List locations
POST   /api/orgs/:orgId/locations       // Create location
GET    /api/locations/:locationId       // Get location
PATCH  /api/locations/:locationId       // Update location
DELETE /api/locations/:locationId       // Delete location
```

### Scan Endpoints

```typescript
POST   /api/scans/run                   // Start new scan
GET    /api/scans/:scanId               // Get scan result
GET    /api/locations/:locationId/scans // List scans (paginated)
POST   /api/scans/:scanId/retry         // Retry failed scan
DELETE /api/scans/:scanId               // Cancel/delete scan
```

### Dashboard Endpoints

```typescript
GET /api/locations/:locationId/metrics
Response:
{
  "latest": {
    "scanId": "uuid",
    "scoreOverall": 85,
    "scoreMEO": 87,
    "scoreGEO": 83,
    "completedAt": "2025-01-01T10:00:00Z"
  },
  "trend": [
    { "date": "2025-01-01", "score": 85 },
    { "date": "2024-12-15", "score": 80 },
    ...
  ],
  "stats": {
    "totalScans": 15,
    "avgScore": 82.3,
    "lastScanDate": "2025-01-01"
  }
}

GET /api/locations/:locationId/deltas
Response:
{
  "deltas": [
    {
      "id": "uuid",
      "fromDate": "2024-12-15",
      "toDate": "2025-01-01",
      "deltaOverall": +5,
      "deltaBreakdown": {
        "improved": ["reviews", "photos"],
        "declined": [],
        "unchanged": ["website"]
      }
    }
  ]
}

GET /api/locations/:locationId/history?page=1&limit=20
Response:
{
  "scans": [...],
  "pagination": { "total": 50, "page": 1, "pages": 3 }
}
```

### Export Endpoints

```typescript
GET /api/exports/scans.csv?orgId=:orgId&startDate=&endDate=
// Returns CSV file with all scans
```

### Admin Endpoints

```typescript
GET /api/admin/users               // List all users
GET /api/admin/organizations       // List all orgs
GET /api/admin/scans               // All scans across tenants
GET /api/admin/audit-logs          // Compliance logs
GET /api/admin/free-scan-leads     // Marketing leads (existing)
GET /api/admin/stats               // Platform-wide stats
```

---

## 🔒 **SECURITY IMPLEMENTATION**

### JWT Structure
```typescript
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "USER",
  "iat": 1704067200,
  "exp": 1704672000
}
```

### Password Security
- Bcrypt with salt rounds: 12
- Min length: 8 characters
- Must include: uppercase, lowercase, number

### Rate Limiting
```typescript
// Free scans: 10 per 15 minutes
// Paid scans: 100 per hour
// API calls: 1000 per hour
```

### RBAC Middleware
```typescript
// Usage in routes:
router.get('/sensitive', 
  authenticateJWT,           // Verify JWT
  requireOrg('orgId'),       // Ensure user belongs to org
  requireRole(['ADMIN', 'OWNER']),  // Check role
  handler
);
```

---

## 🔄 **SCAN LIFECYCLE**

### 1. User Initiates Scan
```typescript
POST /api/scans/run
{
  "locationId": "uuid",
  "source": "WEB"
}
```

### 2. Create Scan Record
```typescript
// Status: QUEUED
const scan = await prisma.scan.create({
  data: {
    orgId,
    locationId,
    userId,
    scanType: isPaid ? 'PAID' : 'FREE',
    status: 'QUEUED',
    inputPayload: { ...formData },
    version: 'v1.0'
  }
});
```

### 3. Enqueue Background Job
```typescript
await prisma.job.create({
  data: {
    type: 'SCAN',
    payload: { scanId: scan.id },
    priority: isPaid ? 10 : 1
  }
});
```

### 4. Job Processor Executes Scan
```typescript
// Update status: RUNNING
await prisma.scan.update({
  where: { id: scanId },
  data: { status: 'RUNNING', startedAt: new Date() }
});

// Run actual scan logic (calls existing scanner)
const result = await runMEOScan(inputPayload);

// Save results
await prisma.scan.update({
  where: { id: scanId },
  data: {
    status: 'COMPLETE',
    completedAt: new Date(),
    resultPayload: result,
    scoreOverall: result.scores.overall,
    scoreMEO: result.scores.meo,
    scoreGEO: result.scores.geo,
    scoreBreakdown: result.breakdown
  }
});
```

### 5. Calculate Delta (if not first scan)
```typescript
const previousScan = await prisma.scan.findFirst({
  where: {
    locationId,
    status: 'COMPLETE',
    id: { not: scanId }
  },
  orderBy: { completedAt: 'desc' }
});

if (previousScan) {
  await prisma.scanDelta.create({
    data: {
      locationId,
      fromScanId: previousScan.id,
      toScanId: scanId,
      deltaOverall: newScore - previousScan.scoreOverall,
      deltaBreakdown: computeDetailedDelta(previous, current)
    }
  });
}
```

---

## 📊 **DASHBOARD QUERIES**

### Latest Score
```sql
SELECT score_overall, score_meo, score_geo, completed_at
FROM scans
WHERE location_id = $1 AND status = 'COMPLETE'
ORDER BY completed_at DESC
LIMIT 1;
```

### Trend Line (Last 30 Days)
```sql
SELECT 
  DATE(completed_at) as date,
  AVG(score_overall) as avg_score
FROM scans
WHERE location_id = $1 
  AND status = 'COMPLETE'
  AND completed_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(completed_at)
ORDER BY date ASC;
```

### Improvement Summary
```sql
SELECT 
  delta_overall,
  delta_breakdown,
  to_scan.completed_at as scan_date
FROM scan_deltas
JOIN scans as to_scan ON to_scan.id = to_scan_id
WHERE location_id = $1
ORDER BY to_scan.completed_at DESC
LIMIT 10;
```

---

## 🎛️ **PAID FEATURE GATING**

### Middleware Example
```typescript
async function requireActiveSub(req, res, next) {
  const { orgId } = req.params;
  
  const subscription = await prisma.subscription.findFirst({
    where: {
      orgId,
      status: { in: ['ACTIVE', 'TRIALING'] }
    }
  });
  
  if (!subscription) {
    return res.status(402).json({
      error: 'Subscription required',
      message: 'This feature requires an active subscription'
    });
  }
  
  req.subscription = subscription;
  next();
}
```

### Usage
```typescript
router.get('/api/locations/:locationId/deltas',
  authenticateJWT,
  requireOrg('locationId'),
  requireActiveSub,  // ← Paid feature gate
  getDeltasHandler
);
```

---

## 🚀 **BACKGROUND JOB PROCESSOR**

### Simple DB-Backed Queue
```typescript
// Job Processor (runs continuously)
async function processJobs() {
  while (true) {
    const jobs = await prisma.job.findMany({
      where: {
        status: 'PENDING',
        OR: [
          { scheduledFor: null },
          { scheduledFor: { lte: new Date() } }
        ],
        attempts: { lt: prisma.raw('max_attempts') }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
      take: 5  // Concurrency limit
    });
    
    if (jobs.length === 0) {
      await sleep(5000);  // Poll every 5s
      continue;
    }
    
    await Promise.allSettled(
      jobs.map(job => executeJob(job))
    );
  }
}

async function executeJob(job) {
  try {
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
        attempts: { increment: 1 }
      }
    });
    
    // Execute based on type
    if (job.type === 'SCAN') {
      await runScanJob(job.payload);
    } else if (job.type === 'DELTA_CALCULATION') {
      await calculateDeltaJob(job.payload);
    }
    
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETE',
        completedAt: new Date()
      }
    });
  } catch (error) {
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: job.attempts >= job.maxAttempts ? 'FAILED' : 'PENDING',
        errorMessage: error.message
      }
    });
  }
}
```

---

## 📈 **METRICS & ANALYTICS**

### Org-Level Stats
```typescript
GET /api/orgs/:orgId/stats

Response:
{
  "totalLocations": 5,
  "totalScans": 150,
  "avgScore": 82.5,
  "scansThisMonth": 25,
  "improvementRate": 0.15,  // 15% avg improvement
  "topLocation": {
    "id": "uuid",
    "name": "Main Location",
    "score": 95
  }
}
```

### Platform-Wide (Admin Only)
```typescript
GET /api/admin/stats

Response:
{
  "totalUsers": 1500,
  "totalOrgs": 800,
  "totalLocations": 2000,
  "totalScans": 50000,
  "activeSubscriptions": 200,
  "mrr": 15000,  // Monthly Recurring Revenue
  "scansToday": 250
}
```

---

## 🧪 **TESTING STRATEGY**

### Unit Tests
```typescript
// Example: JWT utilities
describe('JWT Utils', () => {
  it('should generate valid token', () => {
    const token = generateJWT({ sub: 'user_id', email: 'test@example.com' });
    expect(token).toBeTruthy();
  });
  
  it('should verify valid token', () => {
    const token = generateJWT({ sub: 'user_id' });
    const payload = verifyJWT(token);
    expect(payload.sub).toBe('user_id');
  });
});
```

### Integration Tests
```typescript
// Example: Auth flow
describe('POST /api/auth/register', () => {
  it('should create user + org', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'newuser@example.com',
        password: 'SecurePass123',
        name: 'New User'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('newuser@example.com');
    expect(res.body.organization).toBeTruthy();
    expect(res.body.token).toBeTruthy();
  });
});
```

---

## 🔧 **MAINTENANCE**

### Database Backups
```bash
# Daily automated backups
0 2 * * * pg_dump mgo_production | gzip > /backups/mgo_$(date +\%Y\%m\%d).sql.gz
```

### Migrations
```bash
# Create new migration
npx prisma migrate dev --name add_new_feature

# Apply to production
npx prisma migrate deploy
```

### Monitoring
- Log all errors to centralized service (Sentry/Datadog)
- Monitor database query performance
- Track API response times
- Alert on job failures

---

## ✅ **DEPLOYMENT CHECKLIST**

- [ ] Set DATABASE_URL in production .env
- [ ] Set JWT_SECRET (64 bytes)
- [ ] Run `npx prisma migrate deploy`
- [ ] Run `npm run seed` (initial admin user)
- [ ] Set up database backups
- [ ] Configure CORS for frontend domain
- [ ] Set up SSL/TLS
- [ ] Configure rate limiting
- [ ] Set up error monitoring
- [ ] Test all critical flows
- [ ] Document API for frontend team

---

## 🎉 **NEXT STEPS**

1. **Implement Core Files** (see file structure above)
2. **Run Migrations** (`npx prisma migrate dev`)
3. **Create Seed Script** (admin user, test org)
4. **Wire Up Routes** in `src/index.ts`
5. **Test Auth Flow** (register, login, protected routes)
6. **Enhance Scan Endpoint** (save to Postgres)
7. **Build Dashboard APIs** (metrics, trends)
8. **Connect Frontend** (update API calls)

This blueprint provides **everything needed** to build a production-ready multi-tenant backend. The schema is complete, the architecture is solid, and the implementation path is clear.



