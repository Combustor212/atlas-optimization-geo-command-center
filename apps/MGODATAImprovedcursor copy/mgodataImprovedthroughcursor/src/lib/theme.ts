import { gradients, gradientHover, gradientColors, type GradientKey } from "@/styles/theme-gradients";

export const THEME = {
  gradient: "aiBlue" as GradientKey,
};

export const getActiveGradient = () => gradients[THEME.gradient];
export const getActiveGradientHover = () => gradientHover[THEME.gradient];
export const getActiveGradientColors = () => gradientColors[THEME.gradient];

if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
  console.log("Active gradient:", THEME.gradient);
}
