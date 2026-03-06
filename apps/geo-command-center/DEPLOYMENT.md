# GEO Command Center - Production Deployment Guide

## 🚀 Quick Start

GEO Command Center is a production-ready SaaS dashboard for tracking multi-location GEO performance, revenue impact, and client management.

---

## Prerequisites

- Node.js 18+ 
- npm or pnpm
- Supabase account
- Stripe account (for subscriptions)
- Vercel account (recommended for deployment)

---

## 📦 Installation

### 1. Clone and Install Dependencies

```bash
cd apps/geo-command-center
npm install
```

### 2. Set Up Supabase

1. **Create a new Supabase project** at https://supabase.com
2. **Run the database schema**:
   - Go to SQL Editor in Supabase Dashboard
   - Copy contents from `supabase/schema.sql`
   - Execute the SQL

3. **Get your credentials**:
   - Go to Settings → API
   - Copy `Project URL` and `anon public` key

### 3. Configure Environment Variables

Create `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (Production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: API Integrations
GSC_CLIENT_ID=your-google-client-id
GSC_CLIENT_SECRET=your-google-client-secret
GSC_REDIRECT_URI=https://yourdomain.com/api/integrations/gsc/callback

GA4_PROPERTY_ID=123456789
GA4_SERVICE_ACCOUNT_KEY='{...}'

LOCAL_FALCON_API_KEY=your-local-falcon-key
```

### 4. Create First Admin User

```bash
# Go to Supabase Dashboard → Authentication → Users
# Click "Add User"
# Use email/password or magic link

# Then update user profile in SQL Editor:
UPDATE profiles 
SET role = 'admin', agency_id = (
  INSERT INTO agencies (name, slug) 
  VALUES ('Your Agency', 'your-agency') 
  RETURNING id
)
WHERE id = 'user-uuid-here';
```

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

---

## 🌐 Production Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Connect to Vercel**
   - Go to https://vercel.com
   - Import your repository
   - Set root directory to `apps/geo-command-center`
   - Add all environment variables from `.env.local`

3. **Deploy**
   - Click Deploy
   - Vercel will automatically build and deploy

### Configure Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `payment_intent.succeeded`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

---

## 🔒 Security Checklist

- [ ] All environment variables are set in production
- [ ] Supabase RLS policies are enabled
- [ ] Stripe webhook secret is configured
- [ ] Service role key is kept secret (never exposed to client)
- [ ] SSL/HTTPS is enabled on custom domain
- [ ] User roles are properly assigned
- [ ] Database backups are enabled in Supabase

---

## 📊 Database Management

### Backup Strategy

Supabase automatically backs up your database. To enable point-in-time recovery:

1. Go to Supabase Dashboard → Database → Backups
2. Enable automatic backups (included in paid plans)

### Manual Backup

```bash
# Export schema and data
pg_dump -h db.your-project.supabase.co -U postgres -d postgres > backup.sql
```

### Migrations

When updating schema:

1. Test changes in development first
2. Create migration SQL file
3. Run in Supabase SQL Editor
4. Update `schema.sql` in repository

---

## 🔧 Configuration

### Custom Domain

1. **Vercel**:
   - Go to Project Settings → Domains
   - Add your custom domain
   - Update DNS records as instructed

2. **Update Stripe**:
   - Update webhook endpoint URL
   - Update OAuth redirect URIs

### Email Configuration

Supabase uses its own SMTP by default. For custom email:

1. Go to Supabase → Authentication → Email Templates
2. Configure SMTP settings
3. Customize email templates

---

## 📈 Monitoring & Analytics

### Built-in Monitoring

- **Supabase Dashboard**: Database performance, API logs
- **Vercel Analytics**: Page views, performance metrics
- **Stripe Dashboard**: Payment and subscription tracking

### Recommended Tools

- **Sentry**: Error tracking
- **LogRocket**: Session replay
- **Mixpanel/PostHog**: Product analytics

---

## 🐛 Troubleshooting

### Common Issues

**"No agency found" error**
- Check user profile has `agency_id` set
- Verify user role is 'admin' or 'staff'

**Stripe webhook not working**
- Verify webhook secret matches
- Check endpoint URL is correct
- Review Stripe Dashboard → Webhooks → Recent Deliveries

**RLS policy errors**
- Ensure user is authenticated
- Check profile record exists
- Verify agency_id relationships

**Build errors**
- Clear `.next` folder: `rm -rf .next`
- Delete node_modules: `rm -rf node_modules`
- Reinstall: `npm install`

---

## 🚀 Scaling Considerations

### Database Performance

- Indexes are already set up for common queries
- Monitor slow queries in Supabase Dashboard
- Consider upgrading Supabase plan for larger datasets

### Rate Limiting

Implement rate limiting for API routes:

```typescript
// middleware.ts
import { rateLimit } from '@/lib/rate-limit'

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api')) {
    const { success } = await rateLimit(request.ip)
    if (!success) {
      return new Response('Too Many Requests', { status: 429 })
    }
  }
}
```

### Caching Strategy

- Use Next.js built-in caching for static pages
- Implement Redis for frequently accessed data
- Cache API responses with appropriate TTLs

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Vercel Deployment](https://vercel.com/docs)

---

## 🆘 Support

For issues or questions:

1. Check this documentation
2. Review code comments
3. Check Supabase/Stripe logs
4. Contact your development team

---

## 📄 License

Proprietary - All rights reserved
