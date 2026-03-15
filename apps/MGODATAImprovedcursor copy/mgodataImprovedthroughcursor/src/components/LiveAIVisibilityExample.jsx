// ============================================================================
// Live AI Visibility Example
// Shows businesses how AI systems recommend businesses before they run the scan
// ============================================================================

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

/** Real businesses used for example (Austin pizza query) */
const EXAMPLE_DATA = {
  query: 'best pizza in Austin',
  businesses: ['Via 313', 'Home Slice Pizza', 'Bufalina'],
};

export default function LiveAIVisibilityExample({ onScanClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-10"
    >
      <div className="text-center mb-6">
        <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          See How AI Recommends Businesses
        </h3>
        <p className="text-slate-600 text-base sm:text-lg max-w-xl mx-auto">
          AI assistants like ChatGPT and Google AI recommend businesses when people ask questions like these.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto border border-slate-200 bg-white/95 shadow-lg rounded-2xl overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          {/* Query example */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Example query
            </p>
            <p className="text-slate-900 font-medium text-lg">
              &ldquo;{EXAMPLE_DATA.query}&rdquo;
            </p>
          </div>

          {/* AI answer mock */}
          <div className="mb-6 p-4 bg-slate-50/80 border border-slate-100 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-slate-700">Example AI answer</span>
            </div>
            <ol className="space-y-2 text-slate-800">
              {EXAMPLE_DATA.businesses.map((name, i) => (
                <li key={i} className="flex items-center gap-2 text-sm sm:text-base">
                  <span className="text-slate-400 font-medium w-5">{i + 1}.</span>
                  {name}
                </li>
              ))}
            </ol>
          </div>

          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Your business may not appear in AI answers like this if visibility signals are weak.
          </p>

          <div className="text-center">
            <button
              type="button"
              onClick={onScanClick}
              className="text-slate-600 hover:text-slate-900 font-medium text-sm underline underline-offset-2 transition-colors"
            >
              Scan below for free analysis
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
