import React from 'react';
import { motion } from 'framer-motion';

export default function CircularProgress({ value, color, size = 120, thickness = 8, duration = 1 }) {
  const radius = (size - thickness) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={thickness}
          fill="none"
        />
        {/* Animated progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={thickness}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          animate={{ strokeDashoffset: offset }}
          transition={{ duration, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      {/* Center value */}
      <div className="absolute text-center">
        <motion.span 
          className={size >= 120 ? "text-3xl font-black text-slate-900" : "text-2xl font-black text-slate-900"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {value}
        </motion.span>
        <span className="text-lg text-slate-500">%</span>
      </div>
    </div>
  );
}