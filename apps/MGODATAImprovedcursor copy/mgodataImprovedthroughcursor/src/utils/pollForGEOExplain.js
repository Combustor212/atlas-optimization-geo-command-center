/**
 * Poll for GEO explain job completion (promise-based, for use in async flow)
 * Used by FrontendOnlyScanner to wait for GEO results before redirecting
 */

import { buildApiUrl } from '../config/api';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_TIME_MS = 60000; // 60 seconds - keep loading screen until GEO ready

function normalizeExplain(resp) {
  if (!resp) return null;
  const candidate = resp?.explain ?? resp?.result ?? resp;
  const unwrapped = candidate?.explain || candidate;
  if (!unwrapped) return null;
  const version = unwrapped.version || unwrapped.v;
  const queries = unwrapped.queries || unwrapped.q;
  if (version !== 'v2' || !Array.isArray(queries) || queries.length === 0) return null;
  return { ...unwrapped, version: 'v2', queries };
}

/** Check if geo object has valid v2 explain (no polling needed) */
export function hasValidExplainV2(geo) {
  if (!geo?.explain) return false;
  const e = geo.explain;
  return e.version === 'v2' && Array.isArray(e.queries) && e.queries.length > 0;
}

/**
 * Poll until GEO explain is ready or timeout
 * @param {string} jobId - explain job ID
 * @param {{ onProgress?: (msg: string) => void }} options
 * @returns {Promise<{ explain: object, geoScore?: number } | null>} Resolved explain or null on timeout
 */
export async function pollForGEOExplain(jobId, { onProgress } = {}) {
  if (!jobId || typeof jobId !== 'string') return null;

  const startTime = Date.now();
  let attempt = 0;

  const poll = async () => {
    attempt += 1;
    const elapsed = Date.now() - startTime;

    if (elapsed > MAX_POLL_TIME_MS) {
      return null;
    }

    onProgress?.(`Analyzing AI visibility (GEO)... ${Math.round(elapsed / 1000)}s`);

    const url = buildApiUrl(`/api/geo/explain-job/${jobId}`);
    const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    if (data.status === 'failed') {
      return null;
    }

    const explain = normalizeExplain(data);
    if (explain) {
      const rawExplain = data.explain ?? data.result ?? explain;
      const geoScore = rawExplain?.geoScore ?? rawExplain?.score ?? null;
      return { explain, geoScore };
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    return poll();
  };

  return poll();
}
