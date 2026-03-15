import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import AGSLogo from './AGSLogo';
import { diagnosePollState, formatElapsed, isHardError, isSuccess } from '@/utils/geoPollDiagnostics';

/**
 * FullScreenScanLoader - Unified loading screen for scan results
 * Shows until ALL subsystems are ready (MEO + GEO score + GEO prompts)
 */
export default function FullScreenScanLoader({ 
  scanData, 
  isTimeout = false, 
  error = null, 
  onRetry,
  pollDebug = null,
  lastHttpStatus = null,
  lastErrorMessage = null,
  lastResponseKeys = null,
  scanResponseKeys = null,
  geoResponseKeys = null
}) {
  const isDev = import.meta.env.DEV;
  // Detect: backend scan response had no geo (missing or injected with GEO_MISSING)
  const scanMissingGeo = scanData?.scores?.meo != null && (
    !scanData?.geo || scanData?.geo?.error?.code === 'GEO_MISSING'
  );
  
  // Compute diagnosis
  const elapsedSeconds = pollDebug?.elapsedMs ? Math.floor(pollDebug.elapsedMs / 1000) : 0;
  const diagnosis = diagnosePollState(pollDebug, scanData, elapsedSeconds);
  
  // Extract identity for display
  const scanId = scanData?.scanId || 'none';
  const placeId = scanData?.business?.place_id || scanData?.geo?.placeId || 'none';
  const explainJobId = scanData?.geo?.explainJobId || 'none';
  // Compute checklist status
  const hasMEO = scanData?.scores?.meo != null;
  const hasGEOScore = scanData?.geo?.score != null;
  const hasGEOExplain = 
    (scanData?.geo?.explain?.version === 'v2' && 
     Array.isArray(scanData?.geo?.explain?.queries) && 
     scanData?.geo?.explain?.queries.length > 0) ||
    (scanData?.geo?.explain?.version === 'v3' && typeof scanData?.geo?.explain?.geoScore === 'number');

  const subsystems = [
    {
      id: 'meo',
      label: 'Maps Score (MEO)',
      done: hasMEO,
      status: hasMEO ? 'complete' : 'loading'
    },
    {
      id: 'geo-score',
      label: 'AI Visibility Score (GEO)',
      done: hasGEOScore,
      status: hasGEOScore ? 'complete' : 'loading'
    },
    {
      id: 'geo-prompts',
      label: 'AI Query Analysis',
      done: hasGEOExplain,
      status: error ? 'error' : isTimeout ? 'timeout' : hasGEOExplain ? 'complete' : 'loading'
    }
  ];

  const allDone = subsystems.every(s => s.done);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4"
    >
      {/* Header with logo */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-[1040px] mx-auto px-6 py-3.5">
          <AGSLogo size="md" linkTo="/" />
        </div>
      </div>

      {/* Main loader card */}
      <Card className="max-w-lg w-full shadow-2xl rounded-2xl border-2 border-slate-200">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              animate={{ rotate: allDone ? 0 : 360 }}
              transition={{ 
                duration: 2, 
                repeat: allDone ? 0 : Infinity, 
                ease: "linear" 
              }}
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center"
            >
              {allDone ? (
                <CheckCircle2 className="w-8 h-8 text-white" />
              ) : (
                <Loader2 className="w-8 h-8 text-white" />
              )}
            </motion.div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {allDone ? 'Scan Complete!' : 'Running Scan...'}
            </h2>
            
            {scanData?.business?.name && (
              <p className="text-sm text-slate-600 font-medium">
                {scanData.business.name}
              </p>
            )}
          </div>

          {/* Checklist */}
          <div className="space-y-3 mb-6">
            {subsystems.map((system, idx) => {
              const Icon = 
                system.status === 'complete' ? CheckCircle2 :
                system.status === 'error' ? AlertCircle :
                system.status === 'timeout' ? AlertCircle :
                Loader2;

              const iconColor = 
                system.status === 'complete' ? 'text-green-600' :
                system.status === 'error' ? 'text-red-600' :
                system.status === 'timeout' ? 'text-amber-600' :
                'text-blue-600';

              const bgColor = 
                system.status === 'complete' ? 'bg-green-50 border-green-200' :
                system.status === 'error' ? 'bg-red-50 border-red-200' :
                system.status === 'timeout' ? 'bg-amber-50 border-amber-200' :
                'bg-blue-50 border-blue-200';

              return (
                <motion.div
                  key={system.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`flex items-center gap-3 p-4 rounded-lg border ${bgColor} transition-all`}
                >
                  <Icon 
                    className={`w-5 h-5 ${iconColor} ${
                      system.status === 'loading' ? 'animate-spin' : ''
                    }`} 
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {system.label}
                    </p>
                    {system.status === 'timeout' && (
                      <p className="text-xs text-amber-700 mt-1">
                        Taking longer than usual...
                      </p>
                    )}
                    {system.status === 'error' && (
                      <p className="text-xs text-red-700 mt-1">
                        Generation failed
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Status messages and actions */}
          {!allDone && !error && !isTimeout && (
            <div className="text-center">
              <p className="text-sm text-slate-600">
                Evaluating ~20 AI queries • Takes 30-60 seconds
              </p>
            </div>
          )}

          {/* Timeout state */}
          {isTimeout && !error && (
            <div className="text-center space-y-3">
              <p className="text-sm text-amber-700 font-medium">
                GEO prompts are taking longer than usual
              </p>
              <Button 
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="border-amber-500 text-amber-700 hover:bg-amber-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="text-center space-y-3">
              <p className="text-sm text-red-700 font-medium">
                {error}
              </p>
              <Button 
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="border-red-500 text-red-700 hover:bg-red-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          )}

          {/* Success state (brief moment before showing results) */}
          {allDone && (
            <div className="text-center">
              <p className="text-sm text-green-700 font-medium">
                Loading your results...
              </p>
            </div>
          )}

          {/* STRICT: Scan response missing geo - big debug warning */}
          {isDev && scanMissingGeo && (
            <div className="mt-4 p-4 bg-red-100 border-2 border-red-400 rounded-lg">
              <p className="text-sm font-bold text-red-900">
                Scan response missing geo — check API_BASE_URL/proxy and backend deployment.
              </p>
              <p className="text-xs text-red-800 mt-1">
                Backend scan response did not include geo object. Verify Vite proxy, API_BASE_URL, and that mgo-scanner-backend is running.
              </p>
            </div>
          )}

          {/* DEV-ONLY Comprehensive Debug Panel */}
          {isDev && (
            <div className="mt-6 pt-4 border-t-2 border-slate-300">
              <p className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wide">
                Debug (dev)
              </p>
              
              <div className="text-xs font-mono text-slate-700 space-y-2 bg-slate-50 p-3 rounded border border-slate-200">
                {/* Retry/regenerate-explain debug */}
                {(lastHttpStatus != null || lastErrorMessage || lastResponseKeys) && (
                  <div>
                    <p className="text-slate-500 font-semibold">Regenerate-Explain:</p>
                    <p>lastHttpStatus: {lastHttpStatus ?? '—'}</p>
                    <p>lastErrorMessage: {lastErrorMessage || '—'}</p>
                    <p>lastResponseKeys: [{Array.isArray(lastResponseKeys) ? lastResponseKeys.join(', ') : '—'}]</p>
                  </div>
                )}

                {/* Scan response keys (from initial scan) */}
                {(scanResponseKeys || geoResponseKeys) && (
                  <div>
                    <p className="text-slate-500 font-semibold">Scan Response Keys:</p>
                    <p>responseKeys: [{Array.isArray(scanResponseKeys) ? scanResponseKeys.join(', ') : '—'}]</p>
                    <p>geoKeys: {geoResponseKeys ? `[${geoResponseKeys.join(', ')}]` : 'null'}</p>
                  </div>
                )}

                {/* A) Request Info */}
                <div>
                  <p className="text-slate-500 font-semibold">Request:</p>
                  <p>req: {pollDebug?.method || 'GET'} {pollDebug?.url || 'none'}</p>
                  <p>http: {pollDebug?.lastHttpStatus || '—'} {pollDebug?.lastHttpStatusText || '—'}</p>
                  <p>
                    attempt: #{pollDebug?.attemptCount || 0} / {pollDebug?.maxAttempts || 45} • 
                    elapsed: {formatElapsed(pollDebug?.elapsedMs || 0)} • 
                    next: {pollDebug?.nextPollMs || 2000}ms
                  </p>
                </div>

                {/* B) Identity */}
                <div>
                  <p className="text-slate-500 font-semibold">Identity:</p>
                  <p>scanId: {scanId.slice(0, 24)}{scanId.length > 24 ? '...' : ''}</p>
                  <p>placeId: {placeId.slice(0, 24)}{placeId.length > 24 ? '...' : ''}</p>
                  <p>jobId: {explainJobId.slice(0, 24)}{explainJobId.length > 24 ? '...' : ''}</p>
                </div>

                {/* C) Backend State */}
                <div>
                  <p className="text-slate-500 font-semibold">Backend State:</p>
                  <p>backend.status: {pollDebug?.lastStatusField || 'unknown'}</p>
                  <p>hasExplain: {pollDebug?.lastHasExplain ? 'yes' : 'no'}</p>
                  <p>explain.version: {pollDebug?.lastExplainVersion || 'none'}</p>
                  <p>queries: {pollDebug?.lastQueriesCount || 0}</p>
                  <p>response.keys: [{pollDebug?.lastResponseKeys?.join(', ') || 'none'}]</p>
                </div>

                {/* D) Diagnosis */}
                <div className={`p-2 rounded ${
                  isSuccess(diagnosis.code) ? 'bg-green-100 border border-green-300' :
                  isHardError(diagnosis.code) ? 'bg-red-100 border border-red-300' :
                  'bg-amber-100 border border-amber-300'
                }`}>
                  <p className="font-bold text-slate-900">Diagnosis:</p>
                  <p className={`font-semibold ${
                    isSuccess(diagnosis.code) ? 'text-green-800' :
                    isHardError(diagnosis.code) ? 'text-red-800' :
                    'text-amber-800'
                  }`}>
                    {diagnosis.code}
                  </p>
                  <p className="text-slate-700 text-xs mt-1">{diagnosis.reason}</p>
                </div>

                {/* E) Next Action */}
                <div className={`p-2 rounded ${
                  diagnosis.fix === 'none' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
                }`}>
                  <p className="font-bold text-slate-900">Fix:</p>
                  <p className="text-slate-700 text-xs leading-relaxed">{diagnosis.fix}</p>
                </div>

                {/* Error details if present */}
                {pollDebug?.lastError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded">
                    <p className="font-bold text-red-900">Last Error:</p>
                    <p className="text-red-700 text-xs">{pollDebug.lastError}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

