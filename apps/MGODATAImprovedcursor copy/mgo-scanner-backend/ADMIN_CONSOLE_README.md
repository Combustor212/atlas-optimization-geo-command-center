# 📊 MGO Admin Console & API Documentation

## Overview

The MGO backend now includes a built-in **Admin Console** for viewing and managing your database visually, plus **Swagger UI** for interactive API testing.

## 🔐 Security

**All admin routes are protected** by authentication. You have two options:

### Option A: JWT Authentication (Recommended)
Use your existing admin/superadmin JWT token:

```bash
# Login as admin user
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mgodata.com","password":"admin123"}'

# Use the returned accessToken in browser:
# Authorization: Bearer <your-access-token>
```

Then access admin console with the token in headers (use a browser extension like ModHeader or similar).

### Option B: Basic Auth (Fastest for Development)
Set environment variables in `.env`:

```env
ADMIN_USER=admin
ADMIN_PASS=your-secure-password
```

Your browser will prompt for username/password when accessing `/admin` or `/docs`.

---

## 📚 API Documentation

### Swagger UI
**URL:** `http://localhost:3000/docs`

- Interactive API explorer
- Try out endpoints directly from the browser
- View request/response schemas
- See all available endpoints with documentation

### OpenAPI JSON
**URL:** `http://localhost:3000/openapi.json`

- Raw OpenAPI 3.0 specification
- Use with Postman, Insomnia, or other API clients
- Import into code generators

---

## 🎯 Admin Console

### Dashboard
**URL:** `http://localhost:3000/admin`

**Features:**
- Total users, organizations, locations, scans
- Scans in last 24 hours and 7 days
- Failed jobs count
- Quick links to other sections

---

### Users Management
**List:** `http://localhost:3000/admin/users`
**Detail:** `http://localhost:3000/admin/users/:userId`

**Features:**
- Search by email or name
- View user ID, email, name, role
- See creation date and last login
- View user's organizations and memberships
- See recent scans by user
- Paginated results (50 per page)

---

### Organizations Management
**List:** `http://localhost:3000/admin/orgs`
**Detail:** `http://localhost:3000/admin/orgs/:orgId`

**Features:**
- Search by organization name
- View org ID, name, owner, member count, location count
- See all organization members with roles
- View all locations under the org
- See recent scans for the org
- Paginated results

---

### Locations Management
**List:** `http://localhost:3000/admin/locations`
**Detail:** `http://localhost:3000/admin/locations/:locationId`

**Features:**
- Search by location name or city
- View location details (name, city, state, Google Place ID)
- See latest scan score
- View last scan date
- Full scan history for each location
- Address and contact information

---

### Scans Viewer
**List:** `http://localhost:3000/admin/scans`
**Detail:** `http://localhost:3000/admin/scans/:scanId`

**Features:**
- Filter by status (QUEUED, RUNNING, COMPLETE, FAILED)
- Filter by organization
- View scan ID, location, type, status, score, date
- **Scan Detail Page:**
  - Full scan metadata
  - Overall score and breakdown
  - Input payload (pretty JSON)
  - Result payload (expandable, pretty JSON)
  - Score breakdown visualization
  - Link to related location and organization

---

### Background Jobs Monitor
**List:** `http://localhost:3000/admin/jobs`
**Detail:** `http://localhost:3000/admin/jobs/:jobId`

**Features:**
- Filter by status (PENDING, RUNNING, COMPLETE, FAILED)
- View job ID, type, status, attempts, created date
- See error messages for failed jobs
- **Job Detail Page:**
  - Full job metadata
  - Job payload (JSON)
  - Attempt count and max attempts
  - Error details if failed
  - Start and completion timestamps

---

### Audit Logs
**URL:** `http://localhost:3000/admin/audit-logs`

**Features:**
- Filter by action type
- Filter by user ID
- Filter by organization ID
- View timestamp, action, user, entity type, details
- Full audit trail of all system actions
- Paginated results

---

## 🎨 UI Features

### Consistent Design
- Clean, modern interface
- Responsive tables
- Color-coded badges for statuses:
  - 🟢 Success (COMPLETE, ACTIVE)
  - 🔴 Danger (FAILED)
  - 🔵 Info (RUNNING)
  - 🟡 Warning (QUEUED, PENDING)
  - ⚪ Secondary (general labels)

### Navigation
- Left sidebar with all sections
- Search bars on list pages
- Breadcrumbs via "Back" buttons
- Direct links between related entities

### Data Display
- **Tables:** Sortable, paginated
- **JSON Viewers:** Pretty-printed, syntax-highlighted
- **Collapsible Sections:** For large payloads
- **Badges:** Visual status indicators

### Pagination
- 50 items per page by default
- "Previous" and "Next" buttons
- Current page indicator
- Total count displayed

---

## 🔒 Security Features

### Sensitive Data Filtering
All views automatically redact:
- `passwordHash`
- `refreshTokenHash`
- `secretKeyEncrypted`
- `webhookSecretEncrypted`
- Any field containing "secret" in the name
- Encrypted keys and tokens

**Example:**
```json
{
  "email": "user@example.com",
  "passwordHash": "[REDACTED]",
  "secretKey": "[REDACTED]"
}
```

### No PII in Logs
- IPs are hashed before logging
- Sensitive fields excluded from error logs
- Audit logs do not expose raw passwords or tokens

### Access Control
- **JWT:** Requires ADMIN or SUPERADMIN role
- **Basic Auth:** Configurable via environment variables
- All routes behind authentication middleware
- 401 response with helpful message if not authenticated

---

## 🚀 Quick Start

### 1. Set Up Authentication

**Option A - Basic Auth (Quickest):**
```bash
# Add to .env
ADMIN_USER=admin
ADMIN_PASS=mySecurePassword123
```

**Option B - JWT:**
```bash
# Register/login as admin user
# See BACKEND_README.md for full auth flow
```

### 2. Start Backend Server
```bash
cd mgo-scanner-backend
npm run dev
```

Backend will run on `http://localhost:3000`

### 3. Start Frontend (Optional - for full app)
```bash
cd mgodataImprovedthroughcursor
npm run dev
```

Frontend will run on `http://localhost:5173` with proxy to backend.

### 4. Access Admin Console

**Option A - Via Frontend (Recommended):**
Open in browser: `http://localhost:5173/admin`

**Option B - Direct Backend:**
Open in browser: `http://localhost:3000/admin`

Both work identically! Frontend proxies requests to backend.

If using Basic Auth, enter credentials when prompted.

### 5. Explore API Docs

**Via Frontend:** `http://localhost:5173/docs`  
**Direct Backend:** `http://localhost:3000/docs`

---

## ⚠️ Important: Vite Proxy Configuration

The frontend (Vite) is configured to proxy admin routes to the backend:

**File:** `mgodataImprovedthroughcursor/vite.config.js`

```javascript
server: {
  proxy: {
    '/admin': 'http://localhost:3000',
    '/docs': 'http://localhost:3000',
    '/openapi.json': 'http://localhost:3000',
  }
}
```

**What this means:**
- Visiting `http://localhost:5173/admin` → proxies to → `http://localhost:3000/admin`
- No `/pricing` redirect
- Admin routes bypass React Router entirely

**If admin routes don't work:**
1. Restart Vite dev server (config changes need restart)
2. Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)
3. Check both servers are running

---

## 📊 Common Use Cases

### Check System Health
1. Go to `/admin`
2. View dashboard stats
3. Check failed jobs count

### Find a User
1. Go to `/admin/users`
2. Use search bar (email or name)
3. Click user to see details

### Debug a Failed Scan
1. Go to `/admin/scans`
2. Filter by status: FAILED
3. Click scan to see error details
4. View input/result payloads

### Monitor Background Jobs
1. Go to `/admin/jobs`
2. Filter by status: FAILED
3. Check error messages
4. View job payload for debugging

### View Audit Trail
1. Go to `/admin/audit-logs`
2. Filter by action, user, or org
3. See full activity history

### Inspect a Location's Scan History
1. Go to `/admin/locations`
2. Search for location
3. Click location to see all scans
4. View score trends over time

---

## 🛠️ Development

### File Structure
```
src/admin/
├── adminAuthMiddleware.ts   # Auth protection
├── adminController.ts        # Page logic
├── adminRoutes.ts           # Route definitions
├── safeJson.ts              # Sensitive data filtering
└── views/
    ├── layout.ejs           # Main layout
    └── admin/
        ├── dashboard.ejs
        ├── users.ejs
        ├── userDetail.ejs
        ├── scans.ejs
        ├── scanDetail.ejs
        ├── organizations.ejs
        ├── organizationDetail.ejs
        ├── locations.ejs
        ├── locationDetail.ejs
        ├── jobs.ejs
        ├── jobDetail.ejs
        └── auditLogs.ejs
```

### Adding a New Page

1. **Create Controller Function** in `adminController.ts`:
```typescript
export async function renderMyNewPage(req: Request, res: Response): Promise<void> {
  const data = await prisma.myModel.findMany();
  res.render('admin/myNewPage', { title: 'My Page', data });
}
```

2. **Add Route** in `adminRoutes.ts`:
```typescript
router.get('/my-new-page', controller.renderMyNewPage);
```

3. **Create Template** at `views/admin/myNewPage.ejs`:
```html
<div class="header">
  <h1><%= title %></h1>
</div>
<div class="content">
  <!-- Your content here -->
</div>
```

4. **Add to Sidebar** in `layout.ejs`:
```html
<a href="/admin/my-new-page">🔧 My Page</a>
```

---

## 🐛 Troubleshooting

### "Authentication Required" page
- **JWT:** Ensure you're sending `Authorization: Bearer <token>` header
- **Basic Auth:** Check `ADMIN_USER` and `ADMIN_PASS` in `.env`
- Verify your JWT token hasn't expired (15min lifetime)
- Verify your user role is ADMIN or SUPERADMIN

### Templates not rendering
- Check EJS view files exist in `src/admin/views/`
- Look for errors in server logs
- Ensure `app.set('view engine', 'ejs')` is configured

### Data not showing
- Verify PostgreSQL is running and connected
- Check Prisma connection: `npm run db:studio`
- Look for errors in browser console and server logs

### Sensitive data visible
- Check `safeJson.ts` sanitization function
- Add field names to `SENSITIVE_FIELDS` array
- Ensure `sanitize()` is called before rendering

---

## 📝 Notes

- Admin console uses **EJS templates** (server-side rendering)
- No separate frontend build needed
- All pages are self-contained
- Swagger UI served from `swagger-ui-express` package
- OpenAPI spec is static JSON file in `src/openapi.json`

---

## 🎯 Next Steps

1. **Enhance OpenAPI Spec:** Add more endpoint documentation
2. **Add Filters:** More filtering options on list pages
3. **Bulk Actions:** Select multiple items for bulk operations
4. **Charts:** Add visual charts for trends (Chart.js or similar)
5. **Export:** Add CSV/JSON export buttons
6. **Real-time:** WebSocket updates for job status

---

## 🤝 Support

For issues or questions:
1. Check server logs: `npm run dev`
2. Verify database connection: `npm run db:studio`
3. Test endpoints via Swagger UI: `/docs`
4. Review audit logs: `/admin/audit-logs`

---

**The admin console is now live! Access it at `http://localhost:3000/admin` 🚀**

