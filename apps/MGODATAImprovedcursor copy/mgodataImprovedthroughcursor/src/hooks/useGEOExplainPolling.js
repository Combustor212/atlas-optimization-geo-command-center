/**
 * useGEOExplainPolling Hook
 * Polls for GEO explain job completion with hard timeout and stall detection
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { buildApiUrl } from '../config/api';

const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds
const MAX_POLL_TIME_MS = 90000; // 90 seconds hard timeout (aligned with backend 120s timeout)
const MAX_POLL_ATTEMPTS = 45; // Maximum 45 attempts (90s / 2s)
const STALL_CHECK_COUNT = 3; // If 3 consecutive identical responses, trigger early fallback
const EARLY_FALLBACK_MS = 60000; // Trigger fallback at 60s if stalled (was 15s - too aggressive; GEO benchmark + query eval can take 45-60s)

/**
 * Poll for GEO explain job result with failsafe timeouts
 * @param {string|null} jobId - The explain job ID to poll
 * @param {boolean} enabled - Whether to start polling
 * @returns {object} { data, isLoading, error, isTimeout, retry, debug, status }
 */
export function useGEOExplainPolling(jobId, enabled = true) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTimeout, setIsTimeout] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'polling' | 'done' | 'error' | 'timeout' | 'timeout_fallback'
  
  // Debug tracking
  const [debugInfo, setDebugInfo] = useState({
    method: 'GET',
    url: null,
    httpStatus: null,
    httpStatusText: null,
    attemptCount: 0,
    maxAttempts: Math.ceil(MAX_POLL_TIME_MS / POLL_INTERVAL_MS),
    elapsedMs: 0,
    nextPollMs: POLL_INTERVAL_MS,
    jobId: null,
    lastAttemptAt: null,
    lastHttpStatus: null,
    lastHttpStatusText: null,
    lastError: null,
    lastResponseKeys: [],
    lastStatusField: null,
    lastHasExplain: false,
    lastExplainVersion: null,
    lastQueriesCount: 0,
    lastResponse: null,
    stallDetected: false,
    stallCount: 0
  });
  
  const pollStartTimeRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const attemptCountRef = useRef(0);
  
  // Stall detection: track last N response hashes
  const responseHashesRef = useRef([]);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Generate a simple hash of response for stall detection
  const hashResponse = useCallback((resp) => {
    if (!resp) return 'null';
    try {
      const key = JSON.stringify({
        status: resp.status,
        hasExplain: !!(resp.explain || resp.result),
        queriesCount: resp.explain?.queries?.length || resp.result?.queries?.length || 0
      });
      return key;
    } catch {
      return 'error';
    }
  }, []);

  // Robust normalization that accepts multiple response shapes
  const normalizeGeoExplain = useCallback((resp) => {
    if (!resp) return null;

    // Try multiple paths to find explain data
    const candidate =
      resp?.explain ??
      resp?.result ??
      resp?.geo?.explain ??
      resp?.data?.explain ??
      resp?.data?.geo?.explain ??
      resp;

    const unwrapped = candidate?.explain || candidate;
    if (!unwrapped) return null;

    // Normalize version field (can be 'version' or 'v')
    const version = unwrapped.version || unwrapped.v;
    
    // Normalize queries field (can be 'queries' or 'q', but q must be array)
    let queries = unwrapped.queries || unwrapped.q;
    if (!Array.isArray(queries)) {
      queries = [];
    }

    // Must have v2 and queries
    if (version !== 'v2' || queries.length === 0) {
      return null;
    }

    // Return normalized structure
    return {
      ...unwrapped,
      version: 'v2',
      queries: queries
    };
  }, []);

  // Fetch job status
  const fetchJobStatus = useCallback(async () => {
    if (!jobId) return;

    attemptCountRef.current += 1;
    const pollUrl = buildApiUrl(`/api/geo/explain-job/${jobId}`);
    const elapsedMs = Date.now() - pollStartTimeRef.current;

    try {
      const response = await fetch(pollUrl, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      const httpStatus = response.status;
      const httpStatusText = response.statusText;
      let jobData = null;
      let responseKeys = [];

      if (response.ok) {
        jobData = await response.json();
        responseKeys = Object.keys(jobData || {});
      }

      // Hash this response for stall detection
      const currentHash = hashResponse(jobData);
      responseHashesRef.current.push(currentHash);
      if (responseHashesRef.current.length > STALL_CHECK_COUNT) {
        responseHashesRef.current.shift();
      }

      // Check for stall: all last N responses identical
      const isStalled = responseHashesRef.current.length === STALL_CHECK_COUNT &&
        responseHashesRef.current.every(h => h === responseHashesRef.current[0]) &&
        responseHashesRef.current[0] !== 'null';

      // Extract explain info for diagnostics
      const hasExplain = !!(jobData?.explain || jobData?.result);
      let explainVersion = null;
      let queriesCount = 0;
      
      if (hasExplain) {
        const explainCandidate = jobData?.explain || jobData?.result;
        explainVersion = explainCandidate?.version || explainCandidate?.v || null;
        queriesCount = Array.isArray(explainCandidate?.queries) ? explainCandidate.queries.length : 0;
      }

      // Update debug info
      setDebugInfo({
        method: 'GET',
        url: pollUrl,
        httpStatus,
        httpStatusText,
        attemptCount: attemptCountRef.current,
        maxAttempts: Math.ceil(MAX_POLL_TIME_MS / POLL_INTERVAL_MS),
        elapsedMs,
        nextPollMs: POLL_INTERVAL_MS,
        jobId,
        lastAttemptAt: new Date().toISOString(),
        lastHttpStatus: httpStatus,
        lastHttpStatusText: httpStatusText,
        lastError: null,
        lastResponseKeys: responseKeys,
        lastStatusField: jobData?.status || null,
        lastHasExplain: hasExplain,
        lastExplainVersion: explainVersion,
        lastQueriesCount: queriesCount,
        lastResponse: jobData,
        stallDetected: isStalled,
        stallCount: responseHashesRef.current.length
      });

      // EARLY FALLBACK: Stall detected and past minimum time
      if (isStalled && elapsedMs > EARLY_FALLBACK_MS) {
        setStatus('timeout_fallback');
        setIsTimeout(true);
        setIsLoading(false);
        setError('GEO analysis stalled (no progress detected)');
        clearTimers();
        return;
      }

      if (!response.ok) {
        // 404 means job expired - trigger limited presence
        if (response.status === 404) {
          setStatus('timeout_fallback');
          setError('Job expired or not found');
          setIsTimeout(false);
          setIsLoading(false);
          clearTimers();
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      // Check if explain data is present (completed job)
      const hasExplainField = !!(jobData.explain || jobData.result);
      
      if (hasExplainField) {
        const normalized = normalizeGeoExplain(jobData);

        if (normalized) {
          // Valid v2 explain with queries
          setData(normalized);
          setIsLoading(false);
          setError(null);
          setIsTimeout(false);
          setStatus('done');
          clearTimers();
          return;
        }
      }

      // STRICT: Check for explicit failure status (including 'failed' from backend)
      if (jobData.status === 'failed') {
        setError(jobData.error || 'Explain generation failed');
        setIsLoading(false);
        setStatus('error');
        clearTimers();
        return;
      }

      // STRICT: Check for completed status without explain (should never happen with new backend)
      if (jobData.status === 'completed' && !hasExplainField) {
        setError('Backend marked completed but no explain data');
        setIsLoading(false);
        setStatus('error');
        clearTimers();
        return;
      }

      // HARD TIMEOUT: No terminal state after max time OR max attempts
      if (elapsedMs > MAX_POLL_TIME_MS || attemptCountRef.current >= MAX_POLL_ATTEMPTS) {
        setStatus('timeout_fallback');
        setIsTimeout(true);
        setIsLoading(false);
        setError(`GEO analysis did not complete (${attemptCountRef.current} attempts, ${Math.round(elapsedMs/1000)}s)`);
        clearTimers();
        return;
      }

      // Continue polling only if status is queued or running
      if (jobData.status === 'queued' || jobData.status === 'running') {
        setStatus('polling');
      } else {
        // Unknown status - treat as error
        setError(`Unexpected job status: ${jobData.status}`);
        setIsLoading(false);
        setStatus('error');
        clearTimers();
      }
    } catch (err) {
      const elapsedMs = Date.now() - pollStartTimeRef.current;
      setDebugInfo(prev => ({
        ...prev,
        attemptCount: attemptCountRef.current,
        elapsedMs,
        lastAttemptAt: new Date().toISOString(),
        lastError: err.message || 'Network error',
        lastHttpStatus: null,
        lastHttpStatusText: 'Network Error'
      }));
      setError(err.message || 'Failed to poll explain job');
      setIsLoading(false);
      setStatus('error');
      clearTimers();
    }
  }, [jobId, clearTimers, normalizeGeoExplain, hashResponse]);

  // Retry function
  const retry = useCallback(() => {
    setIsTimeout(false);
    setIsLoading(true);
    setError(null);
    setData(null);
    setStatus('idle');
    attemptCountRef.current = 0;
    responseHashesRef.current = [];
    pollStartTimeRef.current = Date.now();
    
    setDebugInfo({
      method: 'GET',
      url: null,
      httpStatus: null,
      httpStatusText: null,
      attemptCount: 0,
      maxAttempts: Math.ceil(MAX_POLL_TIME_MS / POLL_INTERVAL_MS),
      elapsedMs: 0,
      nextPollMs: POLL_INTERVAL_MS,
      jobId,
      lastAttemptAt: null,
      lastHttpStatus: null,
      lastHttpStatusText: null,
      lastError: null,
      lastResponseKeys: [],
      lastStatusField: null,
      lastHasExplain: false,
      lastExplainVersion: null,
      lastQueriesCount: 0,
      lastResponse: null,
      stallDetected: false,
      stallCount: 0
    });
  }, [jobId]);

  // Start polling when enabled and jobId exists
  useEffect(() => {
    if (!enabled || !jobId) {
      clearTimers();
      setIsLoading(false);
      setStatus('idle');
      return;
    }

    setIsLoading(true);
    setStatus('polling');
    pollStartTimeRef.current = Date.now();
    attemptCountRef.current = 0;
    responseHashesRef.current = [];

    // Initial fetch
    fetchJobStatus();

    // Set up interval
    pollIntervalRef.current = setInterval(fetchJobStatus, POLL_INTERVAL_MS);

    return () => clearTimers();
  }, [enabled, jobId, fetchJobStatus, clearTimers]);

  return {
    data,
    isLoading,
    error,
    isTimeout,
    retry,
    debug: debugInfo,
    status // 'idle' | 'polling' | 'done' | 'error' | 'timeout' | 'timeout_fallback'
  };
}
