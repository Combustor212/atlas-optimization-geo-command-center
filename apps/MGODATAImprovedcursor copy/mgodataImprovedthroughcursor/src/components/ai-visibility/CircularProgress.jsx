import React from 'react';
import { cn } from '@/lib/utils';

export default function CircularProgress({ value, size = 140, strokeWidth = 12, showLabel = true }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const getColor = (val) => {
    if (val >= 80) return 'stroke-green-500';
    if (val >= 60) return 'stroke-amber-500';
    return 'stroke-red-500';
  };

  const getGlowColor = (val) => {
    if (val >= 80) return 'shadow-green-500/50';
    if (val >= 60) return 'shadow-amber-500/50';
    return 'shadow-red-500/50';
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", getGlowColor(value), "shadow-2xl rounded-full")}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-slate-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-all duration-700', getColor(value))}
          strokeLinecap="round"
        />
      </svg>
      {showLabel && (
        <div className="absolute text-center">
          <span className="text-4xl font-black text-slate-900">{value}</span>
          <span className="text-sm text-slate-500 block mt-1">/ 100</span>
        </div>
      )}
    </div>
  );
}