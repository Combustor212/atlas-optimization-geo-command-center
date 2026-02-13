# Agency OS

Internal operating system for managing CRM, SEO, GEO, and MEO services for local business clients.

## Features

✅ **Dashboard** - Real-time overview of operations
- Active clients count
- Overdue invoices tracking
- Expiring contracts alerts
- Upcoming tasks overview

✅ **Business Management** - Complete client database
- Contact information
- Industry and location data
- Status tracking (Lead → Prospect → Active → Paused → Churned)
- Activity history

✅ **Deals Pipeline** - Visual sales pipeline
- Kanban-style board with 6 stages
- Drag-and-drop workflow (via buttons)
- Expected MRR and setup fee tracking
- Convert deals to contracts

✅ **Contracts** - Contract lifecycle management
- Start/end date tracking
- Auto-renewal configuration
- Days remaining calculations
- MRR and setup fee tracking
- Service flags (SEO, GEO, MEO, CRM)
- One-click contract renewal

✅ **Invoices** - Complete billing workflow
- Auto-generated invoice numbers
- Status tracking (Draft → Sent → Paid/Overdue)
- Payment link storage
- Overdue detection
- Quick "Mark as Paid" action

✅ **Tasks (Work Items)** - Operational task management
- Task categories (SEO, GEO, MEO, CRM, ADMIN)
- Status workflow (To Do → In Progress → Blocked → Done)
- Priority levels
- Assignment to team members
- Due date tracking
- Checklist support (JSON)
- Pre-built templates for common tasks

✅ **Activity Logging** - Audit trail for all actions

✅ **Authentication** - NextAuth with role-based access (ADMIN, TEAM)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Docker)
- **ORM**: Prisma
- **Auth**: NextAuth.js
- **UI**: Tailwind CSS + shadcn/ui
- **Validation**: Zod
- **State Management**: Server Actions

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git

## Getting Started

### 1. Clone the Repository

```bash
cd Atlas-Optimization-Tracking-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example env file:

```bash
cp .env.example .env
```

The `.env.example` contains:

```
DATABASE_URL="postgresql://agencyos:agencyos_dev_password@localhost:5432/agencyos"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"
NODE_ENV="development"
```

⚠️ **Important**: For production, change `NEXTAUTH_SECRET` to a secure random string. Generate one with:

```bash
openssl rand -base64 32
```

### 4. Start PostgreSQL with Docker

```bash
docker-compose up -d
```

This starts PostgreSQL on port 5432. Verify it's running:

```bash
docker ps
```

### 5. Set Up the Database

Generate Prisma client:

```bash
npm run db:generate
```

Push the schema to the database:

```bash
npm run db:push
```

Seed the database with sample data:

```bash
npm run db:seed
```

The seed script creates:
- 2 users (admin and team member)
- 5 businesses (various statuses)
- Contracts with different expiration dates
- Invoices (some overdue)
- Tasks with assignments and due dates
- Activity logs

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Log In

The seed script creates two test users:

**Admin Account**:
- Email: `admin@agency.com`
- Password: `password123`

**Team Member Account**:
- Email: `john@agency.com`
- Password: `password123`

## Project Structure

```
├── app/
│   ├── (auth)/              # Auth routes (login)
│   │   └── login/
│   ├── (app)/               # Protected app routes
│   │   ├── dashboard/       # Main dashboard
│   │   ├── businesses/      # Client management
│   │   ├── deals/           # Sales pipeline
│   │   ├── contracts/       # Contract management
│   │   ├── invoices/        # Invoice tracking
│   │   └── tasks/           # Task management
│   ├── actions/             # Server actions
│   │   ├── businesses.ts
│   │   ├── deals.ts
│   │   ├── contracts.ts
│   │   ├── invoices.ts
│   │   └── tasks.ts
│   ├── api/
│   │   └── auth/[...nextauth]/  # NextAuth config
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Redirects to /dashboard
│   ├── providers.tsx        # Client providers
│   └── globals.css
├── components/
│   ├── forms/               # Form components
│   │   └── business-form.tsx
│   ├── layout/              # Layout components
│   │   ├── header.tsx
│   │   └── sidebar.tsx
│   ├── deals/
│   │   └── deals-pipeline.tsx
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── db.ts                # Prisma client singleton
│   ├── auth.ts              # Auth utilities
│   └── utils.ts             # Helper functions
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed script
├── types/
│   └── next-auth.d.ts       # NextAuth type extensions
├── docker-compose.yml       # PostgreSQL setup
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Database Schema

### Core Entities

1. **User** - Team members with roles (ADMIN, TEAM)
2. **Business** - Client companies with contact info and status
3. **Deal** - Sales pipeline opportunities
4. **Contract** - Active service agreements with MRR tracking
5. **Invoice** - Billing documents with payment tracking
6. **WorkItem** - Tasks with checklists and assignments
7. **ActivityLog** - Audit trail for all actions

### Key Relationships

- Business has many: Deals, Contracts, Invoices, WorkItems
- Contract belongs to Business, optionally linked to Deal
- Invoice belongs to Business, optionally linked to Contract
- WorkItem belongs to Business, optionally linked to Contract
- WorkItem can be assigned to User
- ActivityLog tracks changes across all entities

## Development Commands

```bash
# Development
npm run dev              # Start dev server

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema changes
npm run db:migrate       # Create migration
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio

# Build
npm run build            # Build for production
npm start                # Start production server

# Linting
npm run lint             # Run ESLint
```

## Key Features Explained

### Contract Expiration Tracking

Contracts automatically calculate:
- **Days Remaining**: `endDate - today`
- **Renewal Window**: Shows alert when within `renewalNoticeDays` of expiration
- **Auto-Renewal Flag**: Indicates contracts set to auto-renew

### Invoice Status Management

Invoices follow this workflow:
1. **DRAFT** - Created but not sent
2. **SENT** - Sent to client
3. **PAID** - Payment received
4. **OVERDUE** - Past due date without payment
5. **VOID** - Cancelled

Status automatically updates to OVERDUE when `dueDate < today` and status is SENT.

### Task Templates

Pre-built templates available in `app/actions/tasks.ts`:
- **SEO Monthly Report** - Keyword tracking, traffic analysis, reporting
- **GEO Citations** - Local directory submissions
- **MEO Weekly Post** - Google Business Profile content
- **CRM Setup** - Pipeline configuration and training

### Activity Logging

All create/update/delete operations are logged with:
- User who performed the action
- Entity type and ID
- Action type (CREATED, UPDATED, STATUS_CHANGED, etc.)
- Timestamp

## Role-Based Access

**ADMIN Role**:
- Full access to all features
- Can manage users (future feature)
- Can view all data

**TEAM Role**:
- Can view and edit businesses, deals, contracts, invoices, tasks
- Cannot manage users

## Deployment

### Prerequisites for Production

1. PostgreSQL database (e.g., Supabase, Railway, AWS RDS)
2. Node.js hosting (e.g., Vercel, Railway, DigitalOcean)

### Environment Variables for Production

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="<secure-random-string>"
NODE_ENV="production"
```

### Vercel Deployment

1. Push code to GitHub
2. Import repository in Vercel
3. Set environment variables
4. Deploy

Vercel will automatically:
- Install dependencies
- Run build
- Deploy the application

### Database Migration for Production

```bash
# After deployment, run migrations
npx prisma migrate deploy
```

## Customization

### Adding New Services

To add services beyond SEO/GEO/MEO/CRM:

1. Update `Contract` model in `prisma/schema.prisma`
2. Add new boolean field: `serviceNEWSERVICE Boolean @default(false)`
3. Run `npm run db:push`
4. Update contract forms to include new service

### Adding New Task Categories

1. Update `WorkItemCategory` enum in `prisma/schema.prisma`
2. Add new value to enum
3. Run `npm run db:push`
4. Add new templates in `app/actions/tasks.ts`

### Customizing Invoice Numbers

Edit the `generateInvoiceNumber` function in `app/actions/invoices.ts` to change format.

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps

# Restart PostgreSQL
docker-compose restart

# View logs
docker-compose logs postgres
```

### Prisma Client Issues

```bash
# Regenerate Prisma client
npm run db:generate

# Reset database (⚠️ destroys all data)
npx prisma migrate reset
```

### Authentication Issues

1. Verify `NEXTAUTH_SECRET` is set
2. Verify `NEXTAUTH_URL` matches your domain
3. Clear browser cookies and try again

## Future Enhancements

Potential features to add:
- [ ] Email notifications for overdue invoices
- [ ] Automated invoice generation from contracts
- [ ] File uploads for contracts/invoices
- [ ] Calendar view for tasks
- [ ] Reporting and analytics dashboard
- [ ] Client portal for viewing invoices/tasks
- [ ] Recurring task automation
- [ ] Integration with payment processors (Stripe)
- [ ] Email sending for invoices
- [ ] Advanced filtering and search
- [ ] Export to CSV/PDF

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the code comments
3. Inspect browser console for errors
4. Check server logs in terminal

## License

Private/Internal use only.

---

**Built with ❤️ for agency operations management**

