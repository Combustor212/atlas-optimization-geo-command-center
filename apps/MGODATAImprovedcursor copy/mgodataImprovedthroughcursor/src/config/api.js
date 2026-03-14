/**
 * API Configuration
 * Centralized API endpoint configuration
 */

/**
 * Get the API base URL
 * In development with Vite proxy: use relative URLs (proxy will handle routing)
 * In production: use absolute URL from env var
 *
 * IMPORTANT: VITE_API_URL must be the BASE URL only (e.g. https://admin.atlasgrowths.com).
 * If you set it to a full path (e.g. .../api/meo/scan), we normalize to origin so
 * buildApiUrl('/api/meo/scan') produces the correct URL.
 */
export function getApiBaseUrl() {
  // Check if we're in development with Vite proxy
  const isDev = import.meta.env.DEV;

  if (isDev) {
    // Use relative URLs - Vite proxy will handle /api routes
    return '';
  }

  const raw = import.meta.env.VITE_API_URL || 'http://localhost:3002';
  if (!raw || !raw.startsWith('http')) return raw;

  // Normalize: strip any path so we always get origin (fixes VITE_API_URL=/api/meo/scan mistake)
  try {
    return new URL(raw).origin;
  } catch {
    return raw;
  }
}

/**
 * Build full API URL for an endpoint
 * @param {string} path - API path (e.g., '/api/geo/explain-job/123')
 * @returns {string} Full URL
 */
export function buildApiUrl(path) {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

// Export as constant for backward compatibility
export const API_BASE_URL = getApiBaseUrl();

/**
 * Geo Command Center dashboard URL - AGS funnels users here to manage clients, locations, and GEO tracking
 */
export function getGeoCommandCenterUrl(path = '') {
  const base = import.meta.env.VITE_GEO_COMMAND_CENTER_URL || 'http://localhost:3000';
  const cleanPath = path.startsWith('/') ? path : path ? `/${path}` : '';
  return `${base}${cleanPath}`;
}

/**
 * Booking API base URL - Geo Command Center hosts the booking endpoints.
 * Used for fetching available slots and scheduling Google Meet calls.
 * Dev: relative URL so Vite proxy (/api -> localhost:3000) handles it, avoiding CORS.
 * Prod: absolute URL from VITE_GEO_COMMAND_CENTER_URL.
 */
export function getBookingApiUrl(path = '') {
  const cleanPath = path.startsWith('/') ? path : path ? `/${path}` : '';
  if (import.meta.env.DEV) {
    return cleanPath || '/';
  }
  const base = import.meta.env.VITE_GEO_COMMAND_CENTER_URL || '';
  return base ? `${base}${cleanPath}` : cleanPath || '/';
}

/**
 * Book a Call URL - funnels users to schedule a sales consultation
 * Use ?book=1 to auto-open the Book a Call modal on GetSupport page
 */
export function getBookACallUrl() {
  const base = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const path = '/get-support?book=1';
  return base ? `${base}${path}` : path;
}

