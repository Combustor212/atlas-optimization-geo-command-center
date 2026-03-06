/**
 * MGO Scanner Backend Service Entry Point
 */
import 'dotenv/config';
import express from 'express';
import { handleScan } from './api/scan';
import { handleMEOScan, handleMEOScanHealth } from './api/meoScan';
import { handleMEOExplain } from './api/meoExplain';
import { handleGEOBenchmark, handleGEORefresh } from './api/geoBenchmark';
import { handleGetExplainJob, handleRegenerateExplain } from './api/geoExplainJob';
import { handleGetNearbyCompetitors } from './api/nearbyCompetitors';
import { handleStripeWebhook, handleTestWebhook } from './api/stripeWebhook';
import {
  handleSaveStripeConfig,
  handleGetStripeConfigs,
  handleTestStripeConnection,
  handleSetActiveMode,
  handleDeleteStripeConfig,
  handleSavePlanMapping,
  handleGetPlanMappings,
} from './api/stripeAdmin';
import {
  handleCreateCheckoutSession,
  handleCreatePortalSession,
  handleGetSubscriptionStatus,
} from './api/stripeCheckout';
import {
  handleGetFreeScanLeads,
  handleGetFreeScanLeadDetails,
  handleRetryFreeScanEmail,
  handleGetFreeScanStats,
} from './api/freeScanLeads';
import { handleSubmitLead } from './api/agsLeads';
import { logger } from './lib/logger';
import { getDB, checkDBHealth } from './db/schema';
import { startEmailQueueProcessor, stopEmailQueueProcessor } from './services/emailQueueProcessor';

// New production backend imports
import { testPrismaConnection, disconnectPrisma } from './lib/prisma';
import { startWorker, stopWorker } from './jobs/queueService';
import { requireAuth, requireRole, requireOrgAccess } from './middleware/authMiddleware';
import { requireActiveSubscription, requireFeature } from './middleware/billingMiddleware';
import { setupAuthRoutes } from './routes/auth';
import {
  handleCreateOrganization,
  handleGetOrganizations,
  handleGetOrganization,
  handleUpdateOrganization,
  handleAddMember,
  handleUpdateMemberRole,
  handleRemoveMember,
} from './routes/organizations';
import {
  handleCreateLocation,
  handleGetLocations,
  handleGetLocation,
  handleUpdateLocation,
} from './routes/locations';
import {
  handleRunScan,
  handleGetScan,
  handleGetLocationScans,
  handleRetryScan,
} from './routes/scans';
import {
  handleGetLocationMetrics,
  handleGetLocationDeltas,
  handleGetLocationTrends,
  handleGetLocationIssues,
} from './routes/dashboard';
import { handleGetBillingStatus } from './routes/billing';
import {
  handleGetAuditLogs,
  handleGetUsers,
  handleGetAllOrganizations,
  handleGetSystemStats,
  handleExportScans,
} from './routes/admin';
import { UserRole, OrgMemberRole } from '@prisma/client';

// Admin console & Swagger UI imports
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import openApiSpec from './openapi.json';
import adminRoutes from './admin/adminRoutes';
import { requireAdminAccess } from './admin/adminAuthMiddleware';
import ejs from 'ejs';

const app = express();
const PORT = process.env.PORT || 3000;

// Set up EJS for admin console templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'admin/views'));

// Custom EJS layout middleware
app.use((req, res, next) => {
  const originalRender = res.render.bind(res);
  res.render = function (view: string, options: any = {}) {
    // Render the view content first
    ejs.renderFile(
      path.join(__dirname, 'admin/views', `${view}.ejs`),
      options,
      (err, html) => {
        if (err) {
          logger.error('EJS render error', { error: err.message });
          res.status(500).send('Template rendering error');
          return;
        }
        // Then render it within the layout
        ejs.renderFile(
          path.join(__dirname, 'admin/views/layout.ejs'),
          { ...options, body: html },
          (layoutErr, finalHtml) => {
            if (layoutErr) {
              logger.error('EJS layout render error', { error: layoutErr.message });
              res.status(500).send('Layout rendering error');
              return;
            }
            res.send(finalHtml);
          }
        );
      }
    );
  };
  next();
});

// Initialize databases
try {
  // Legacy SQLite DB (for Stripe config and free scan leads)
  getDB();
  const health = checkDBHealth();
  if (!health.ok) {
    logger.error('SQLite database health check failed', { error: health.error });
  } else {
    logger.info('SQLite database initialized successfully');
  }
} catch (error) {
  logger.error('Failed to initialize SQLite database', { error: (error as Error).message });
}

// Initialize Prisma (PostgreSQL)
testPrismaConnection().then((connected) => {
  if (connected) {
    logger.info('Prisma PostgreSQL connection successful');
    // Start background job worker
    startWorker();
  } else {
    logger.warn('Prisma PostgreSQL connection failed - some features may not work');
  }
});

// Start email queue processor (for free scan lead emails)
startEmailQueueProcessor();

// Middleware - CRITICAL: Stripe webhook needs raw body
// We apply raw body parser ONLY to webhook route, JSON parser to everything else
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// CORS middleware - allow AGS frontend (dev + prod) to call API
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin'); // Avoid CORB blocking JSON responses
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mgo-scanner-backend' });
});

// Root - friendly landing so browser visits don't show "invalid response"
app.get('/', (req, res) => {
  res.type('html').send(`
    <!DOCTYPE html>
    <html><head><title>MGO Scanner Backend</title></head>
    <body style="font-family:system-ui;max-width:600px;margin:4rem auto;padding:2rem">
      <h1>MGO Scanner Backend</h1>
      <p>API server is running. Key endpoints:</p>
      <ul>
        <li><a href="/health">/health</a> - Health check</li>
        <li><a href="/api/meo/scan/health">/api/meo/scan/health</a> - MEO scan health</li>
        <li>POST /api/meo/scan - Run scan</li>
        <li>POST /api/leads - Submit lead (from AGS)</li>
      </ul>
    </body></html>
  `);
});

// ==============================================================================
// SWAGGER UI & ADMIN CONSOLE
// ==============================================================================

// Serve OpenAPI JSON
app.get('/openapi.json', requireAdminAccess, (req, res) => {
  res.json(openApiSpec);
});

// Serve Swagger UI
app.use('/docs', requireAdminAccess, swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MGO API Docs',
}));

// Admin Console Routes
app.use('/admin', adminRoutes);

// ==============================================================================
// PRODUCTION BACKEND ROUTES (NEW)
// ==============================================================================

// Auth routes (public)
setupAuthRoutes(app);

// Organization routes (authenticated)
app.post('/api/orgs', requireAuth, handleCreateOrganization);
app.get('/api/orgs', requireAuth, handleGetOrganizations);
app.get('/api/orgs/:orgId', requireAuth, requireOrgAccess, handleGetOrganization);
app.patch('/api/orgs/:orgId', requireAuth, requireOrgAccess, handleUpdateOrganization);

// Organization member routes (authenticated)
app.post('/api/orgs/:orgId/members', requireAuth, requireOrgAccess, handleAddMember);
app.patch('/api/orgs/:orgId/members/:userId', requireAuth, requireOrgAccess, handleUpdateMemberRole);
app.delete('/api/orgs/:orgId/members/:userId', requireAuth, requireOrgAccess, handleRemoveMember);

// Location routes (authenticated)
app.post('/api/orgs/:orgId/locations', requireAuth, requireOrgAccess, handleCreateLocation);
app.get('/api/orgs/:orgId/locations', requireAuth, requireOrgAccess, handleGetLocations);
app.get('/api/locations/:locationId', requireAuth, handleGetLocation);
app.patch('/api/locations/:locationId', requireAuth, handleUpdateLocation);

// Scan routes (authenticated, some require subscription)
app.post('/api/scans/run', requireAuth, handleRunScan);
app.get('/api/scans/:scanId', requireAuth, handleGetScan);
app.get('/api/locations/:locationId/scans', requireAuth, handleGetLocationScans);
app.post('/api/scans/:scanId/retry', requireAuth, handleRetryScan);

// Dashboard routes (authenticated, premium features may require subscription)
app.get('/api/locations/:locationId/metrics', requireAuth, handleGetLocationMetrics);
app.get('/api/locations/:locationId/deltas', requireAuth, handleGetLocationDeltas);
app.get('/api/locations/:locationId/trends', requireAuth, handleGetLocationTrends);
app.get('/api/locations/:locationId/issues', requireAuth, handleGetLocationIssues);

// Billing routes (authenticated)
app.get('/api/billing/status', requireAuth, handleGetBillingStatus);

// Admin routes (admin/superadmin only)
app.get('/api/admin/audit-logs', requireAuth, requireRole(UserRole.ADMIN, UserRole.SUPERADMIN), handleGetAuditLogs);
app.get('/api/admin/users', requireAuth, requireRole(UserRole.ADMIN, UserRole.SUPERADMIN), handleGetUsers);
app.get('/api/admin/organizations', requireAuth, requireRole(UserRole.ADMIN, UserRole.SUPERADMIN), handleGetAllOrganizations);
app.get('/api/admin/stats', requireAuth, requireRole(UserRole.ADMIN, UserRole.SUPERADMIN), handleGetSystemStats);
app.get('/api/admin/exports/scans.csv', requireAuth, requireRole(UserRole.ADMIN, UserRole.SUPERADMIN), handleExportScans);

// ==============================================================================
// LEGACY ENDPOINTS (EXISTING)
// ==============================================================================

// Legacy scan endpoint (original MGO scanner)
app.post('/api/scan', handleScan);

// MEO Scan endpoints (v10.1 - Single Source of Truth)
app.post('/api/meo/scan', handleMEOScan);
app.get('/api/meo/scan/health', handleMEOScanHealth);

// MEO Explain endpoint (UI-ready drivers + refresh)
app.get('/api/meo/explain', handleMEOExplain);

// GEO Benchmark endpoints (competitive ranking)
app.get('/api/geo/benchmark', handleGEOBenchmark);
app.post('/api/geo/refresh', handleGEORefresh);

// GEO Explain Job endpoints (polling + regenerate)
app.get('/api/geo/explain-job/:jobId', handleGetExplainJob);
app.post('/api/geo/regenerate-explain', handleRegenerateExplain);

// GEO Nearby Competitors endpoint (Phase A: Real competitors from Places API)
app.get('/api/geo/competitors/nearby', handleGetNearbyCompetitors);

// ==============================================================================
// STRIPE BILLING ENDPOINTS
// ==============================================================================

// Admin endpoints (Stripe configuration)
app.post('/api/admin/stripe/config', handleSaveStripeConfig);
app.get('/api/admin/stripe/config', handleGetStripeConfigs);
app.post('/api/admin/stripe/test-connection', handleTestStripeConnection);
app.put('/api/admin/stripe/active-mode', handleSetActiveMode);
app.delete('/api/admin/stripe/config', handleDeleteStripeConfig);
app.post('/api/admin/stripe/plan-mapping', handleSavePlanMapping);
app.get('/api/admin/stripe/plan-mappings', handleGetPlanMappings);

// Customer endpoints (Checkout & Portal)
app.post('/api/stripe/create-checkout-session', handleCreateCheckoutSession);
app.post('/api/stripe/create-portal-session', handleCreatePortalSession);
app.get('/api/stripe/subscription-status', handleGetSubscriptionStatus);

// Webhook endpoint (MUST use raw body - configured above)
app.post('/api/stripe/webhook', handleStripeWebhook);
app.get('/api/stripe/webhook/test', handleTestWebhook);

// ==============================================================================
// AGS LEADS → GEO COMMAND CENTER
// ==============================================================================
app.post('/api/leads', handleSubmitLead);

// ==============================================================================
// FREE SCAN LEAD CAPTURE ENDPOINTS
// ==============================================================================

// Admin endpoints (lead management)
app.get('/api/admin/free-scan-leads', handleGetFreeScanLeads);
app.get('/api/admin/free-scan-leads/stats', handleGetFreeScanStats);
app.get('/api/admin/free-scan-leads/:id', handleGetFreeScanLeadDetails);
app.post('/api/admin/free-scan-leads/:id/retry-email', handleRetryFreeScanEmail);

// ==============================================================================

// Start server
const server = app.listen(PORT, () => {
  logger.info('MGO Scanner Backend started', { port: PORT });
  logger.info('Endpoints', {
    health: `/health`,
    legacyScan: `/api/scan`,
    meoScan: `/api/meo/scan`,
    meoExplain: `/api/meo/explain`,
    geoBenchmark: `/api/geo/benchmark`,
    geoRefresh: `/api/geo/refresh`,
    geoExplainJob: `/api/geo/explain-job/:jobId`,
    stripeAdmin: `/api/admin/stripe/*`,
    stripeCheckout: `/api/stripe/create-checkout-session`,
    stripePortal: `/api/stripe/create-portal-session`,
    stripeWebhook: `/api/stripe/webhook`,
    freeScanLeads: `/api/admin/free-scan-leads`,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  stopEmailQueueProcessor();
  stopWorker();
  disconnectPrisma().then(() => {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  stopEmailQueueProcessor();
  stopWorker();
  disconnectPrisma().then(() => {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
});

