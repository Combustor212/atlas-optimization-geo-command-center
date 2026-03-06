import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Animated number counter hook
function useAnimatedNumber(targetValue, durationMs = 400) {
  const [display, setDisplay] = useState(targetValue);

  useEffect(() => {
    const start = display;
    const delta = targetValue - start;
    if (delta === 0) return;

    const startTime = performance.now();
    let animationFrame;

    const tick = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      setDisplay(Math.round(start + delta * progress));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [targetValue, durationMs]);

  return display;
}

export default function ScanCounter() {
  const [count, setCount] = useState(283); // ✅ Starting with 283 scans
  const [isLoading, setIsLoading] = useState(true);
  
  const animatedCount = useAnimatedNumber(count);
  const formattedCount = new Intl.NumberFormat().format(animatedCount);

  useEffect(() => {
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const response = await fetch('/functions/scanCounter', {
          method: 'GET',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!cancelled && data.count !== undefined) {
          setCount(data.count);
          setIsLoading(false);
        }
      } catch (error) {
        // Silently fail and use default count
        console.warn('Could not fetch scan count, using default:', error.message);
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchCount();

    // Poll every 30 seconds for updates from other users
    const interval = setInterval(fetchCount, 30000);

    // Listen for optimistic updates from current user
    const handleScanCompleted = () => {
      setCount(c => c + 1);
    };
    window.addEventListener('scan:completed', handleScanCompleted);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('scan:completed', handleScanCompleted);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-purple-100/80 text-purple-700 text-xs sm:text-sm font-bold shadow-sm"
      aria-live="polite"
    >
      <span role="img" aria-label="fire" className="text-base">🔥</span>
      {isLoading ? (
        <span className="inline-block w-32 h-4 bg-purple-200 animate-pulse rounded" />
      ) : (
        <span>{formattedCount} Scans Completed This Week</span>
      )}
    </motion.div>
  );
}