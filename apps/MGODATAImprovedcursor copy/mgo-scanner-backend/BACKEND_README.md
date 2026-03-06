# MGO Production Backend

Production-ready backend for the MGO app with multi-tenant support, permanent scan tracking, authentication, billing, and dashboards.

## 🎯 Features

- **Multi-Tenant Architecture**: User → Organization → Location(s) hierarchy
- **Permanent Scan History**: Every scan stored with full inputs, outputs, scores, and deltas
- **JWT Authentication**: Secure user registration, login, and session management
- **Role-Based Access Control (RBAC)**: User, Admin, and Organization-level permissions
- **Background Job Queue**: DB-backed async processing for scans and emails
- **Billing Integration**: Stripe subscription management and feature gating
- **Dashboard APIs**: Metrics, trends, deltas, and issues for each location
- **Admin Panel**: System-wide stats, audit logs, and data exports
- **Audit Logging**: Complete activity tracking for compliance

## 🛠️ Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: JWT (jsonwebtoken + bcrypt)
- **Validation**: Zod
- **Background Jobs**: Custom DB-backed queue
- **Email**: Resend (for lead capture)
- **Payments**: Stripe

## 📦 Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate
```

## ⚙️ Environment Setup

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mgodb?schema=public"

# JWT
JWT_SECRET="your_super_secret_jwt_key_change_in_production"

# Encryption (for Stripe secrets)
ENCRYPTION_MASTER_KEY="your_64_char_hex_key_for_encryption"

# Stripe (optional, can be configured via admin UI)
STRIPE_SECRET_KEY_TEST="sk_test_..."
STRIPE_PUBLISHABLE_KEY_TEST="pk_test_..."
STRIPE_WEBHOOK_SECRET_TEST="whsec_test_..."

# Resend (for emails)
RESEND_API_KEY="re_your_resend_api_key"

# Google Places API
GOOGLE_PLACES_API_KEY="AIzaSy..._your_google_api_key"

# OpenAI (for GEO engine)
OPENAI_API_KEY="sk-..._your_openai_api_key"

# Server
PORT=3000
NODE_ENV=development
```

**Generate secrets:**
```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Master Key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🗄️ Database Setup

### 1. Start PostgreSQL

**Using Docker:**
```bash
docker run --name mgodb \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:16
```

**Or install locally** via Homebrew, apt, etc.

### 2. Run Migrations

```bash
# Create and apply migrations
npm run db:migrate

# Or for production
npm run db:migrate:deploy
```

### 3. Seed Development Data

```bash
npm run db:seed
```

This creates:
- Admin user: `admin@mgodata.com` / `admin123`
- Test user: `test@example.com` / `password123`
- Demo user: `demo@example.com` / `password123`
- Sample organizations, locations, and scans

## 🚀 Running the Server

### Development Mode (with hot reload)
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## 🎯 Admin Console & API Docs

### **NEW:** Built-in Admin Console
Access a full visual database admin interface at:
- **Dashboard:** `http://localhost:3000/admin`
- **API Docs:** `http://localhost:3000/docs`

**Features:**
- View all users, orgs, locations, scans
- Monitor background jobs
- View audit logs
- Search and filter data
- Pretty JSON viewers
- Protected by JWT or Basic Auth

**Quick Setup:**
```bash
# Add to .env
ADMIN_USER=admin
ADMIN_PASS=your-password
```

Then visit: `http://localhost:3000/admin`

📖 **See [ADMIN_CONSOLE_README.md](./ADMIN_CONSOLE_README.md) for complete guide**

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout (requires auth)
- `GET /api/auth/me` - Get current user (requires auth)

### Organizations
- `POST /api/orgs` - Create organization
- `GET /api/orgs` - List user's organizations
- `GET /api/orgs/:orgId` - Get organization details
- `PATCH /api/orgs/:orgId` - Update organization
- `POST /api/orgs/:orgId/members` - Add member
- `PATCH /api/orgs/:orgId/members/:userId` - Update member role
- `DELETE /api/orgs/:orgId/members/:userId` - Remove member

### Locations
- `POST /api/orgs/:orgId/locations` - Create location
- `GET /api/orgs/:orgId/locations` - List locations
- `GET /api/locations/:locationId` - Get location details
- `PATCH /api/locations/:locationId` - Update location

### Scans
- `POST /api/scans/run` - Start a scan (returns immediately)
- `GET /api/scans/:scanId` - Get scan details
- `GET /api/locations/:locationId/scans` - Get scan history
- `POST /api/scans/:scanId/retry` - Retry failed scan

### Dashboard
- `GET /api/locations/:locationId/metrics` - Latest score & metrics
- `GET /api/locations/:locationId/deltas` - Improvement history
- `GET /api/locations/:locationId/trends` - Score trends over time
- `GET /api/locations/:locationId/issues` - Actionable issues

### Billing
- `GET /api/billing/status` - Get subscription status

### Admin (Admin/Superadmin only)
- `GET /api/admin/audit-logs` - View audit logs
- `GET /api/admin/users` - List all users
- `GET /api/admin/organizations` - List all organizations
- `GET /api/admin/stats` - System-wide statistics
- `GET /api/admin/exports/scans.csv` - Export scans to CSV

### Legacy Endpoints (Existing)
- `POST /api/meo/scan` - MEO scan
- `GET /api/geo/benchmark` - GEO benchmark
- `POST /api/stripe/webhook` - Stripe webhook
- `GET /api/admin/free-scan-leads` - Free scan leads

## 🔐 Authentication

All authenticated endpoints require an `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Token Flow
1. **Register/Login** → Receive `accessToken` (15min) and `refreshToken` (7 days)
2. **Use `accessToken`** for API requests
3. **When expired** → Call `/api/auth/refresh` with `refreshToken` to get new tokens
4. **Logout** → Client discards tokens

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch
```

## 📊 Database Management

```bash
# Open Prisma Studio (GUI)
npm run db:studio

# Reset database (WARNING: deletes all data)
npm run db:reset

# Create a new migration
npx prisma migrate dev --name your_migration_name
```

## 🔧 Background Jobs

The backend includes a DB-backed job queue for:
- **Scan processing**: Runs MEO/GEO scans asynchronously
- **Delta computation**: Calculates improvements between scans
- **Email sending**: Queues and retries email delivery

Jobs are processed automatically when the server starts. No Redis required.

## 🏗️ Project Structure

```
mgo-scanner-backend/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── routes/                  # API route handlers
│   │   ├── auth.ts
│   │   ├── organizations.ts
│   │   ├── locations.ts
│   │   ├── scans.ts
│   │   ├── dashboard.ts
│   │   ├── billing.ts
│   │   └── admin.ts
│   ├── services/                # Business logic
│   │   └── authService.ts
│   ├── middleware/              # Express middleware
│   │   ├── authMiddleware.ts
│   │   └── billingMiddleware.ts
│   ├── validators/              # Zod schemas
│   │   ├── authValidators.ts
│   │   ├── orgValidators.ts
│   │   └── scanValidators.ts
│   ├── jobs/                    # Background jobs
│   │   ├── queueService.ts
│   │   ├── scanJob.ts
│   │   └── emailJob.ts
│   ├── lib/                     # Utilities
│   │   ├── prisma.ts
│   │   ├── jwt.ts
│   │   ├── logger.ts
│   │   └── ...
│   ├── meo/                     # MEO scan engine
│   ├── geo/                     # GEO scan engine
│   └── __tests__/               # Tests
├── prisma/
│   ├── schema.prisma            # Database schema
│   ├── seed.ts                  # Seed script
│   └── migrations/              # Migration history
├── package.json
├── tsconfig.json
└── .env
```

## 🔒 Security

- **Password Hashing**: bcrypt with 10 rounds
- **JWT Tokens**: Signed with HS256, short-lived access tokens
- **RBAC**: User, Admin, Superadmin roles + Organization-level roles
- **Input Validation**: Zod schemas on all endpoints
- **SQL Injection**: Protected by Prisma ORM
- **Rate Limiting**: TODO (add express-rate-limit)
- **CORS**: Configured for development (restrict in production)

## 📈 Monitoring & Logging

- **Structured Logging**: Winston logger with JSON output
- **Audit Logs**: All mutations logged to `audit_logs` table
- **Health Check**: `GET /health`

## 🚢 Deployment

### Environment Variables
Ensure all production secrets are set in your hosting environment.

### Database Migrations
```bash
npm run db:migrate:deploy
```

### Build & Start
```bash
npm run build
npm start
```

### Recommended Hosting
- **Backend**: Railway, Render, Fly.io, AWS ECS
- **Database**: Supabase, Neon, AWS RDS, Railway Postgres
- **Background Jobs**: Run as part of main process (or separate worker dyno)

## 📝 Development Workflow

1. **Make changes** to code
2. **Run migrations** if schema changed: `npm run db:migrate`
3. **Test locally**: `npm run dev`
4. **Write tests**: Add to `src/__tests__/`
5. **Commit** and push

## 🐛 Troubleshooting

### "Can't reach database server"
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Verify network connectivity

### "Prisma Client not generated"
```bash
npm run db:generate
```

### "Invalid JWT token"
- Token may be expired (access tokens last 15 minutes)
- Use `/api/auth/refresh` to get a new token
- Ensure `JWT_SECRET` matches between requests

### Background jobs not processing
- Check server logs for worker errors
- Ensure `JobQueue` table exists in database
- Verify Prisma connection is successful

## 📚 Additional Documentation

- [ENV_SETUP.md](./ENV_SETUP.md) - Detailed environment variable guide
- [PRODUCTION_BACKEND_BLUEPRINT.md](./PRODUCTION_BACKEND_BLUEPRINT.md) - Architecture overview
- [Prisma Schema](./prisma/schema.prisma) - Database schema documentation

## 🤝 Contributing

1. Create a feature branch
2. Make changes
3. Write tests
4. Submit PR

## 📄 License

ISC

