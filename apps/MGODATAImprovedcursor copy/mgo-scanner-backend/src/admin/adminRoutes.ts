/**
 * Admin Console Routes
 */
import express from 'express';
import { requireAdminAccess } from './adminAuthMiddleware';
import * as controller from './adminController';

const router = express.Router();

// Apply admin authentication to all routes
router.use(requireAdminAccess);

// Dashboard
router.get('/', controller.renderDashboard);

// Users
router.get('/users', controller.renderUsers);
router.get('/users/:userId', controller.renderUserDetail);

// Organizations
router.get('/orgs', controller.renderOrganizations);
router.get('/orgs/:orgId', controller.renderOrganizationDetail);

// Locations
router.get('/locations', controller.renderLocations);
router.get('/locations/:locationId', controller.renderLocationDetail);

// Scans
router.get('/scans', controller.renderScans);
router.get('/scans/:scanId', controller.renderScanDetail);

// Jobs
router.get('/jobs', controller.renderJobs);
router.get('/jobs/:jobId', controller.renderJobDetail);

// Audit Logs
router.get('/audit-logs', controller.renderAuditLogs);

export default router;



