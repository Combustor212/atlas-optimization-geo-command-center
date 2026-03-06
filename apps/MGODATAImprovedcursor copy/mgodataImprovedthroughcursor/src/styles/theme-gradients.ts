export const gradients = {
  aiBlue: "linear-gradient(135deg, #0F172A, #2563EB)",
  darkData: "linear-gradient(135deg, #111827, #1F2937)",
  aiModern: "linear-gradient(135deg, #0EA5E9, #6366F1)",
  currentPurple: "linear-gradient(135deg, #7C3AED, #A855F7)",
} as const;

export const gradientHover = {
  aiBlue: "linear-gradient(135deg, #0a0f1a, #1d4ed8)",
  darkData: "linear-gradient(135deg, #0d1117, #1a1f2e)",
  aiModern: "linear-gradient(135deg, #0284c7, #4f46e5)",
  currentPurple: "linear-gradient(135deg, #6d28d9, #9333ea)",
} as const;

export type GradientKey = keyof typeof gradients;

export const gradientColors = {
  aiBlue: { start: "#0F172A", end: "#2563EB" },
  darkData: { start: "#111827", end: "#1F2937" },
  aiModern: { start: "#0EA5E9", end: "#6366F1" },
  currentPurple: { start: "#7C3AED", end: "#A855F7" },
} as const;

export const ACTIVE_GRADIENT = gradients.aiBlue;
