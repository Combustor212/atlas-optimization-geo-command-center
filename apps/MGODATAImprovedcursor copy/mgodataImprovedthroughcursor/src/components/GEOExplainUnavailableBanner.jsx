import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Banner shown when GEO explain is unavailable (404/expired)
 * Provides regenerate functionality
 */
export default function GEOExplainUnavailableBanner({ 
  onRegenerate,
  isRegenerating = false 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-900 mb-2">
                AI Query Analysis Unavailable
              </h3>
              <p className="text-sm text-amber-800 mb-4">
                The detailed AI query analysis has expired or is unavailable. 
                Your GEO score is still valid, but the query breakdown is missing.
              </p>
              
              <Button
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                size="sm"
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate Analysis
                  </>
                )}
              </Button>
              
              <p className="text-xs text-amber-700 mt-3">
                This will create a new analysis with fresh AI query evaluations (30-60 seconds).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}


