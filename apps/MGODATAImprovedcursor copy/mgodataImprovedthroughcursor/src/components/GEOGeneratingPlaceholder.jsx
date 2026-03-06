import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * GEOGeneratingPlaceholder
 * Shows a clean, intentional "Generating GEO score..." state
 * while the explain job is running.
 */
export default function GEOGeneratingPlaceholder({ debugInfo }) {
  const isDev = import.meta.env.DEV;
  const urlParams = new URLSearchParams(window.location.search);
  const showDebug = isDev || urlParams.get('debug') === '1';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="p-8">
          <div className="flex items-start gap-4">
            {/* Animated spinner */}
            <div className="flex-shrink-0">
              <div className="relative">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                <Sparkles className="w-4 h-4 text-indigo-500 absolute -top-1 -right-1" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Generating GEO score...
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Analyzing 20 search queries to compute your AI visibility score
                </p>
              </div>

              {/* Progress skeleton */}
              <div className="space-y-2">
                <div className="h-2 bg-blue-200 rounded-full w-3/4 animate-pulse" />
                <div className="h-2 bg-blue-200 rounded-full w-1/2 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="h-2 bg-blue-200 rounded-full w-2/3 animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>

              <p className="text-xs text-gray-500 mt-4">
                ⏱ This typically takes 30–60 seconds
              </p>
            </div>
          </div>

          {/* DEV-ONLY: Minimal debug line (or ?debug=1) */}
          {showDebug && debugInfo && (
            <div className="mt-6 pt-4 border-t border-blue-200">
              <div className="text-xs font-mono text-gray-600 space-y-1">
                <div>
                  <span className="text-gray-500">Poll #{debugInfo.attemptCount}</span>
                  {' • '}
                  <span className="text-gray-500">HTTP {debugInfo.lastHttpStatus || '—'}</span>
                  {' • '}
                  <span className="text-gray-500">Status: {debugInfo.lastStatusField || 'pending'}</span>
                  {' • '}
                  <span className="text-gray-500">Elapsed: {Math.round(debugInfo.elapsedMs / 1000)}s</span>
                </div>
                <div className="text-gray-400">
                  JobID: ...{debugInfo.jobId?.slice(-8) || '—'}
                  {' • '}
                  Has explain: {debugInfo.lastHasExplain ? 'yes' : 'no'}
                  {debugInfo.lastHasExplain && (
                    <>
                      {' • '}
                      v{debugInfo.lastExplainVersion}
                      {' • '}
                      {debugInfo.lastQueriesCount} queries
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

