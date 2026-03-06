import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft, ArrowRight, SkipForward, Sparkles, Hand, BarChart2, TrendingUp, Search, Star, PartyPopper } from "lucide-react";

const RANDALL_AVATAR =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d742e6c4913147eef6a1ba/4cceef92d_ChatGPTImageSep27202503_59_46PM.png";

const WALKTHROUGH_STEPS = [
  {
    id: "welcome",
    title: "Hi, I'm Randall!",
    Icon: Hand,
    description: "Let me show you around AGS in just 3 minutes. You'll learn how to dominate local search with AI-powered tools.",
    bullets: [
      "You can skip anytime",
      "I'll explain each feature clearly",
      "Let's get started!"
    ],
    target: null,
  },
  {
    id: "dashboard-stats",
    title: "Dashboard Statistics",
    Icon: BarChart2,
    description: "Your visibility score shows how well you rank in local search. Higher scores mean more customers find you.",
    bullets: [
      "Track your daily progress",
      "Spot issues that need fixing",
      "Compare performance over time"
    ],
    target: '[data-onboard="dashboard-stats"]',
  },
  {
    id: "dashboard-trends",
    title: "Growth Trends",
    Icon: TrendingUp,
    description: "Month-over-month growth charts help you see what's working and what needs improvement.",
    bullets: [
      "Identify growth opportunities",
      "Detect declining metrics early",
      "Share progress with stakeholders"
    ],
    target: '[data-onboard="dashboard-trends"]',
  },
  {
    id: "scanner",
    title: "GEO & MEO Scanner",
    Icon: Search,
    description: "Scan your business presence on Google Maps, Apple Maps, and AI engines like ChatGPT and Perplexity.",
    bullets: [
      "Get deterministic audit scores",
      "See exactly what needs fixing",
      "Receive AI-generated action plans"
    ],
    target: '[data-onboard="scanner"]',
  },
  {
    id: "reputation",
    title: "Reputation Manager",
    Icon: Star,
    description: "Track and respond to reviews across all platforms. Use AI-powered templates to reply faster and boost ratings.",
    bullets: [
      "Monitor Google, Yelp, Facebook reviews",
      "Generate AI-powered responses",
      "Send automated review requests"
    ],
    target: '[data-onboard="reputation"]',
  },
  {
    id: "analytics",
    title: "Analytics & Reports",
    Icon: BarChart2,
    description: "View comprehensive performance reports. Track calls, measure growth, and export client-ready PDFs anytime.",
    bullets: [
      "Compare trends over time",
      "Export to PDF or CSV",
      "Share with clients instantly"
    ],
    target: '[data-onboard="analytics"]',
  },
  {
    id: "complete",
    title: "That's It!",
    Icon: PartyPopper,
    description: "You're now ready to use AGS like a pro. Remember, I'm always available in the bottom-right corner if you need help.",
    bullets: [
      "Click my avatar anytime for assistance",
      "Ask questions about any feature",
      "Restart this tour whenever you need"
    ],
    target: null,
  },
];

export default function DemoWalkthrough({ show, onExit }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const tooltipRef = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const step = WALKTHROUGH_STEPS[currentStep];
  const totalSteps = WALKTHROUGH_STEPS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Position tooltip near target element
  useEffect(() => {
    if (!show) return;

    const positionTooltip = () => {
      if (!step.target) {
        // Center tooltip for welcome/complete steps
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        setTooltipPosition({
          top: (viewportHeight / 2) - 200,
          left: (viewportWidth / 2) - 225,
        });
        setHighlightRect(null);
        return;
      }

      const targetEl = document.querySelector(step.target);
      if (!targetEl) {
        console.warn(`Target not found: ${step.target}`);
        // Fallback to center
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        setTooltipPosition({
          top: (viewportHeight / 2) - 200,
          left: (viewportWidth / 2) - 225,
        });
        setHighlightRect(null);
        return;
      }

      // Scroll target into view
      targetEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

      // Get target position
      const rect = targetEl.getBoundingClientRect();
      setHighlightRect({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });

      // Calculate tooltip position with smart placement
      const tooltipWidth = 450;
      const tooltipHeight = 400;
      const padding = 24;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = 0;
      let left = 0;

      // Try placing to the right first
      if (rect.right + tooltipWidth + padding < viewportWidth) {
        left = rect.right + padding;
        top = Math.max(padding, Math.min(rect.top, viewportHeight - tooltipHeight - padding));
      }
      // Try placing to the left
      else if (rect.left - tooltipWidth - padding > 0) {
        left = rect.left - tooltipWidth - padding;
        top = Math.max(padding, Math.min(rect.top, viewportHeight - tooltipHeight - padding));
      }
      // Try placing below
      else if (rect.bottom + tooltipHeight + padding < viewportHeight) {
        left = Math.max(padding, Math.min(rect.left, viewportWidth - tooltipWidth - padding));
        top = rect.bottom + padding;
      }
      // Try placing above
      else if (rect.top - tooltipHeight - padding > 0) {
        left = Math.max(padding, Math.min(rect.left, viewportWidth - tooltipWidth - padding));
        top = rect.top - tooltipHeight - padding;
      }
      // Fallback: center on screen
      else {
        left = (viewportWidth / 2) - (tooltipWidth / 2);
        top = (viewportHeight / 2) - (tooltipHeight / 2);
      }

      setTooltipPosition({ top, left });
    };

    // Position immediately and after a small delay for animations
    positionTooltip();
    const timer = setTimeout(positionTooltip, 300);

    // Reposition on resize/scroll
    window.addEventListener("resize", positionTooltip);
    window.addEventListener("scroll", positionTooltip, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", positionTooltip);
      window.removeEventListener("scroll", positionTooltip, true);
    };
  }, [show, currentStep, step.target]);

  // Dragging handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX - tooltipPosition.left,
        y: e.clientY - tooltipPosition.top,
      };
    }
  };

  // Handle dragging with event listeners
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const newLeft = e.clientX - dragStartPos.current.x;
      const newTop = e.clientY - dragStartPos.current.y;

      // Keep within viewport bounds
      const maxLeft = window.innerWidth - 450;
      const maxTop = window.innerHeight - 400;

      setTooltipPosition({
        left: Math.max(0, Math.min(newLeft, maxLeft)),
        top: Math.max(0, Math.min(newTop, maxTop)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, tooltipPosition.left, tooltipPosition.top]);

  // Navigation handlers
  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    localStorage.setItem("walkthrough_completed", "true");
    if (onExit) onExit();
  };

  const handleExit = () => {
    localStorage.setItem("walkthrough_completed", "true");
    if (onExit) onExit();
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: "none" }}>
        {/* Backdrop (click to exit) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40"
          style={{ pointerEvents: "auto" }}
          onClick={handleExit}
        />

        {/* Highlight Box */}
        {highlightRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="absolute pointer-events-none"
            style={{
              top: highlightRect.top - 8,
              left: highlightRect.left - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
              border: "2px solid #6366f1",
              borderRadius: "12px",
              boxShadow: "0 0 25px rgba(99,102,241,0.9), 0 0 50px rgba(99,102,241,0.5)",
              zIndex: 10000,
            }}
          />
        )}

        {/* Tooltip Card */}
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute bg-white rounded-2xl shadow-2xl border-2 border-indigo-100 overflow-hidden"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            width: 450,
            maxWidth: "calc(100vw - 32px)",
            pointerEvents: "auto",
            cursor: isDragging ? "grabbing" : "default",
            zIndex: 10001,
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Header with Drag Handle */}
          <div className="drag-handle bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 cursor-grab active:cursor-grabbing">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={RANDALL_AVATAR}
                  alt="Randall"
                  className="w-12 h-12 rounded-full border-2 border-white shadow-lg"
                />
                <div>
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    {step.Icon && (() => { const Icon = step.Icon; return <Icon className="w-5 h-5" />; })()}
                    {step.title}
                  </h3>
                  <p className="text-indigo-100 text-xs">
                    Step {currentStep + 1} of {totalSteps}
                  </p>
                </div>
              </div>
              <button
                onClick={handleExit}
                className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <p className="text-slate-700 leading-relaxed">{step.description}</p>

            {step.bullets && step.bullets.length > 0 && (
              <ul className="space-y-2">
                {step.bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                    <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="border-slate-300 hover:bg-slate-100"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              >
                <SkipForward className="w-4 h-4 mr-1" />
                Skip
              </Button>
            </div>

            <Button
              onClick={handleNext}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              {currentStep === totalSteps - 1 ? (
                <>
                  Finish
                  <Sparkles className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}