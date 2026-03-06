
import React from 'react';
import { motion } from 'framer-motion';

export default function RadarLoader() {
  return (
    <div className="relative w-6 h-6 mx-auto inline-block">
      {/* Radar circles */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 border-2 border-white rounded-full opacity-75"
          animate={{
            scale: [0.5, 2],
            opacity: [0.8, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.6,
          }}
        />
      ))}
      
      {/* Rotating scanner line */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute top-1/2 left-1/2 w-3 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent origin-left -translate-x-0" />
      </motion.div>
      
      {/* Center dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1.5 h-1.5 bg-white rounded-full shadow-lg shadow-white/50" />
      </div>
    </div>
  );
}
