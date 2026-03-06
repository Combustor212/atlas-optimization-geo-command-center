// ============================================================================
// Full-screen loading overlay shown during scan execution
// Unified design: matches ScanResults loading screen for consistent UX
// ============================================================================

import React from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ScanLoadingOverlay({ isVisible }) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-50"
    >
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-3" />
        <p className="text-slate-600 text-sm font-medium">AI visibility analysis in progress</p>
        <p className="text-slate-500 text-xs mt-1">Results will appear when the scan is complete</p>
      </div>
    </motion.div>
  );
}
