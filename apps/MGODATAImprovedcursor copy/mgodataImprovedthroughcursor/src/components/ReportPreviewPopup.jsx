import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

const MetricItem = ({ label, valueText, subtext, color, isPlaceholder, className }) => {
  const colorStyles = {
    purple: "text-purple-700 bg-purple-50 border-purple-100",
    green: "text-emerald-700 bg-emerald-50 border-emerald-100",
    blue: "text-blue-700 bg-blue-50 border-blue-100",
    slate: "text-slate-700 bg-slate-50 border-slate-100",
    grey: "text-slate-500 bg-slate-50 border-slate-200",
  };

  if (isPlaceholder) {
    return (
      <div className={cn("flex flex-col items-center justify-center px-2 py-3 rounded-xl border border-slate-100 bg-slate-50 min-w-[80px]", className)}>
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap mb-1">{label}</span>
        <span className="text-[10px] text-slate-500 leading-none">{subtext}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col flex-1 min-w-0 text-center", className)}>
      <div className={cn("text-[11px] font-bold px-1.5 py-1 rounded-lg border mb-1.5 truncate", colorStyles[color] || colorStyles.blue)}>
        {valueText}
      </div>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{label}</span>
      <span className="text-[9px] text-slate-400 leading-tight truncate w-full px-1">{subtext}</span>
    </div>
  );
};

export default function ReportPreviewPopup({ isVisible, position = "top", businessName, url, scanMode }) {
  // Determine content based on inputs
  const hasInput = (businessName && businessName.length > 0) || (url && url.length > 0);
  const isOnline = scanMode === 'online';

  const metrics = hasInput ? (isOnline ? [
    { label: 'SEO', val: '~50–70', sub: 'On-page + Content', color: 'blue' },
    { label: 'AI', val: '~30–50', sub: 'Answer Presence', color: 'purple' },
    { label: 'Social', val: '~30–60', sub: 'Engagement Signals', color: 'green' }
  ] : [
    { label: 'SEO', val: '~40–60', sub: 'Maps + Keywords', color: 'blue' },
    { label: 'AI', val: '~20–40', sub: 'LLM Recognition', color: 'purple' },
    { label: 'Social', val: 'Varies', sub: 'Brand Signals', color: 'slate' }
  ]) : [
    { label: 'SEO', sub: 'Visibility', isPlaceholder: true },
    { label: 'AI', sub: 'Recognition', isPlaceholder: true },
    { label: 'SOCIAL', sub: 'Brand Signals', isPlaceholder: true }
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "absolute left-1/2 -translate-x-1/2 z-[9999] w-[250px] pointer-events-none",
            position === "top" ? "bottom-full mb-4" : "top-full mt-4"
          )}
        >
          <div className="bg-white border border-slate-100 shadow-[0_12px_32px_rgba(0,0,0,0.08)] rounded-[20px] p-5 relative">
            <div className="relative z-10">
              <div className="text-center mb-4">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  ESTIMATED AI VISIBILITY
                </h4>
                
                {hasInput ? (
                  <p className="text-sm font-normal text-slate-600 leading-relaxed px-1">
                    Based on your business type, most brands fall between <span className="text-slate-900 font-bold">30–70</span>.
                  </p>
                ) : (
                  <p className="text-sm font-normal text-slate-600 leading-relaxed px-1">
                     Run a scan to see your exact visibility across MEO, SEO, AI presence, and social signals.
                  </p>
                )}
              </div>

              {hasInput ? (
                <div className="flex justify-between gap-3 mb-5 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  {metrics.map((m, i) => (
                    <MetricItem 
                      key={i} 
                      label={m.label} 
                      valueText={m.val} 
                      subtext={m.sub} 
                      color={m.color} 
                      isPlaceholder={m.isPlaceholder}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {/* Placeholder Grid Layout - 2x2 with centered bottom */}
                  <MetricItem label={metrics[0].label} subtext={metrics[0].sub} isPlaceholder={true} />
                  <MetricItem label={metrics[1].label} subtext={metrics[1].sub} isPlaceholder={true} />
                  <div className="col-span-2">
                    <MetricItem label={metrics[2].label} subtext={metrics[2].sub} isPlaceholder={true} className="w-full" />
                  </div>
                </div>
              )}

              {/* CTA Hint */}
              <div className="flex items-center justify-center gap-1 text-sm font-semibold opacity-100 pt-2 border-t border-slate-100 mt-1">
                {hasInput ? (
                  <>
                    <span className="text-purple-700">Run a scan to get your exact numbers</span>
                    <ArrowRight className="w-3 h-3 text-purple-700" />
                  </>
                ) : (
                   <span className="text-purple-700">Enter your business to preview estimated ranges →</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Triangle Pointer */}
          <div className={cn(
            "absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-slate-100 rotate-45",
            position === "top" ? "-bottom-1.5 border-t-0 border-l-0 shadow-[2px_2px_2px_rgba(0,0,0,0.02)]" : "-top-1.5 border-b-0 border-r-0 bg-white shadow-[-1px_-1px_1px_rgba(0,0,0,0.02)]"
          )} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}