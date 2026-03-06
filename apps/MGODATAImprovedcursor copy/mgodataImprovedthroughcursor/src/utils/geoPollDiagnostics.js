/**
 * GEO Poll Diagnostics
 * Deterministic diagnosis codes with specific fixes
 */

export const DiagnosisCodes = {
  // Frontend / Config
  GEO_POLL_NOT_STARTED: 'GEO_POLL_NOT_STARTED',
  GEO_JOBID_MISSING: 'GEO_JOBID_MISSING',
  GEO_RESPONSE_INCOMPLETE: 'GEO_RESPONSE_INCOMPLETE',
  
  // Network / Routing
  GEO_POLL_404: 'GEO_POLL_404',
  GEO_POLL_401_403: 'GEO_POLL_401_403',
  GEO_POLL_5XX: 'GEO_POLL_5XX',
  
  // Backend State
  GEO_PENDING_TOO_LONG: 'GEO_PENDING_TOO_LONG',
  GEO_COMPLETED_NO_EXPLAIN: 'GEO_COMPLETED_NO_EXPLAIN',
  GEO_EXPLAIN_SHAPE_MISMATCH: 'GEO_EXPLAIN_SHAPE_MISMATCH',
  
  // Success
  GEO_SUCCESS: 'GEO_SUCCESS'
};

/**
 * Diagnose poll state and return code + reason + fix
 * @param {object} debugInfo - Debug info from polling hook
 * @param {object} scanData - Current scan data
 * @param {number} elapsedSeconds - Time elapsed since polling started
 * @returns {object} { code, reason, fix }
 */
export function diagnosePollState(debugInfo, scanData, elapsedSeconds) {
  const {
    attemptCount = 0,
    lastHttpStatus = null,
    lastStatusField = null,
    lastHasExplain = false,
    lastResponseKeys = [],
    lastError = null
  } = debugInfo || {};

  const explainJobId = scanData?.geo?.explainJobId;
  const hasGeoScore = scanData?.geo?.score != null;

  // Backend response missing geo entirely (proxy/CORS/API_BASE_URL issue)
  if (!scanData?.geo && scanData?.scores?.meo != null) {
    return {
      code: DiagnosisCodes.GEO_RESPONSE_INCOMPLETE,
      reason: 'Backend scan response did not include geo object',
      fix: 'Backend response incomplete. Verify API_BASE_URL, Vite proxy, and CORS. Scan and regenerate-explain must use same base URL.'
    };
  }
  
  // Parse explain data if present
  const explainData = scanData?.geo?.explain;
  const explainVersion = explainData?.version || explainData?.v || null;
  const queriesCount = Array.isArray(explainData?.queries) ? explainData.queries.length : 0;

  // FRONTEND / CONFIG ISSUES
  
  // Poll never started (we have jobId but no requests sent)
  if (attemptCount === 0 && explainJobId) {
    return {
      code: DiagnosisCodes.GEO_POLL_NOT_STARTED,
      reason: 'Poll hook mounted but no requests sent',
      fix: 'Check shouldPollGEO condition; ensure polling enabled when jobId exists and explain not ready'
    };
  }
  
  // JobId missing - backend did not return explainJobId (CRITICAL: causes "GEO invalid state null")
  // Without jobId, polling never starts → lastHttpStatus=null, lastStatusField=null
  if (!explainJobId && attemptCount === 0) {
    return {
      code: DiagnosisCodes.GEO_JOBID_MISSING,
      reason: 'Backend scan response did not include explainJobId — polling cannot start',
      fix: 'Backend did not return geo.explainJobId. Common causes: (1) Category could not be resolved for this business — check backend logs for resolveCategory; (2) createExplainJob threw — check mgo-scanner-backend logs; (3) CORS/proxy blocking scan response — verify Vite proxy and API_BASE_URL. If you have placeId + geo.category, the recovery flow may create a job via /api/geo/regenerate-explain.'
    };
  }

  // NETWORK / ROUTING ISSUES
  
  // 404 - Job not found
  if (lastHttpStatus === 404) {
    return {
      code: DiagnosisCodes.GEO_POLL_404,
      reason: 'Explain job not found in backend store',
      fix: 'Job expired (>1hr) OR wrong URL/proxy OR jobId prefix mismatch; verify Vite /api proxy; check backend key prefix; confirm jobId in backend logs'
    };
  }
  
  // Auth issues
  if (lastHttpStatus === 401 || lastHttpStatus === 403) {
    return {
      code: DiagnosisCodes.GEO_POLL_401_403,
      reason: 'Authentication/authorization failed',
      fix: 'Session/cookies not sent; ensure same-origin via /api proxy or credentials:include; check CORS config'
    };
  }
  
  // Server errors
  if (lastHttpStatus && lastHttpStatus >= 500) {
    return {
      code: DiagnosisCodes.GEO_POLL_5XX,
      reason: `Backend error ${lastHttpStatus}`,
      fix: `Backend threw exception; check backend logs for stack trace; error: ${lastError || 'unknown'}`
    };
  }

  // BACKEND STATE ISSUES
  
  // Success case (check this before other backend states)
  if (explainVersion === 'v2' && queriesCount > 0) {
    return {
      code: DiagnosisCodes.GEO_SUCCESS,
      reason: `Valid explain with ${queriesCount} queries`,
      fix: 'none'
    };
  }
  
  // Completed but no explain
  if (lastHttpStatus === 200 && lastStatusField === 'completed' && !lastHasExplain) {
    return {
      code: DiagnosisCodes.GEO_COMPLETED_NO_EXPLAIN,
      reason: 'Backend marked completed but explain field missing',
      fix: 'Job completion not saving result; verify explainJobs.ts persist step; check job.result assignment; response keys: ' + lastResponseKeys.join(',')
    };
  }
  
  // Explain present but shape mismatch
  if (lastHttpStatus === 200 && lastHasExplain && (!explainVersion || explainVersion !== 'v2' || queriesCount === 0)) {
    return {
      code: DiagnosisCodes.GEO_EXPLAIN_SHAPE_MISMATCH,
      reason: 'Explain present but version/queries invalid',
      fix: `Normalizer rejecting payload; version=${explainVersion || 'none'} queries=${queriesCount}; check explain keys: ${lastResponseKeys.join(',')}; verify backend saves {version:'v2', queries:[...]}`
    };
  }
  
  // Pending/generating too long
  const LONG_THRESHOLD_SECONDS = 60;
  if (lastHttpStatus === 200 && 
      ['pending', 'generating', 'running'].includes(lastStatusField) && 
      elapsedSeconds > LONG_THRESHOLD_SECONDS) {
    return {
      code: DiagnosisCodes.GEO_PENDING_TOO_LONG,
      reason: `Backend status=${lastStatusField} for ${Math.round(elapsedSeconds)}s`,
      fix: 'Backend job likely stuck; check worker execution logs; verify GEO benchmark completes; add server-side timeout to mark failed'
    };
  }
  
  // Default: Still waiting (not an error yet)
  if (lastHttpStatus === 200 && ['queued', 'running'].includes(lastStatusField)) {
    return {
      code: 'GEO_GENERATING',
      reason: `Backend processing (${lastStatusField})`,
      fix: 'Wait for completion; typical time 30-60s'
    };
  }
  
  // STRICT: Any other state is an error (no 'unknown' allowed)
  return {
    code: 'GEO_INVALID_STATE',
    reason: lastError || `Invalid backend state: ${lastStatusField}`,
    fix: `Backend returned unexpected status; http=${lastHttpStatus} status=${lastStatusField} hasExplain=${lastHasExplain}; Expected: queued|running|completed|failed`
  };
}

/**
 * Format elapsed time nicely
 */
export function formatElapsed(ms) {
  if (!ms) return '0s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Check if diagnosis is a hard error (should stop polling)
 */
export function isHardError(code) {
  return [
    DiagnosisCodes.GEO_POLL_404,
    DiagnosisCodes.GEO_POLL_401_403,
    DiagnosisCodes.GEO_POLL_5XX,
    DiagnosisCodes.GEO_JOBID_MISSING,
    DiagnosisCodes.GEO_RESPONSE_INCOMPLETE,
    DiagnosisCodes.GEO_COMPLETED_NO_EXPLAIN,
    DiagnosisCodes.GEO_EXPLAIN_SHAPE_MISMATCH
  ].includes(code);
}

/**
 * Check if diagnosis is success
 */
export function isSuccess(code) {
  return code === DiagnosisCodes.GEO_SUCCESS;
}


