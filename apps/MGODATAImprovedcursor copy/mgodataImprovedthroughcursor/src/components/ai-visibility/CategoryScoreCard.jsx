import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function CategoryScoreCard({ icon, label, score, tooltip, color = "indigo" }) {
  const colorSchemes = {
    indigo: {
      bg: "from-indigo-50 to-purple-50",
      border: "border-indigo-200",
      text: "text-indigo-600",
      ring: "stroke-indigo-500"
    },
    green: {
      bg: "from-green-50 to-emerald-50",
      border: "border-green-200",
      text: "text-green-600",
      ring: "stroke-green-500"
    },
    amber: {
      bg: "from-amber-50 to-orange-50",
      border: "border-amber-200",
      text: "text-amber-600",
      ring: "stroke-amber-500"
    },
    purple: {
      bg: "from-purple-50 to-pink-50",
      border: "border-purple-200",
      text: "text-purple-600",
      ring: "stroke-purple-500"
    },
    blue: {
      bg: "from-blue-50 to-cyan-50",
      border: "border-blue-200",
      text: "text-blue-600",
      ring: "stroke-blue-500"
    }
  };

  const colors = colorSchemes[color] || colorSchemes.indigo;
  const radius = 35;
  const strokeWidth = 8;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className={cn(
            "bg-gradient-to-br border-2 shadow-lg hover:shadow-xl transition-all cursor-help",
            colors.bg,
            colors.border
          )}>
            <CardContent className="p-6 text-center">
              <div className="text-3xl mb-3">{icon}</div>
              <div className="relative inline-flex items-center justify-center mb-3">
                <svg width="80" height="80" className="transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="none"
                    className="text-white/50"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className={cn('transition-all duration-700', colors.ring)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className={cn("text-xl font-black", colors.text)}>{score}</span>
                  <span className="text-xs text-slate-500 block">%</span>
                </div>
              </div>
              <p className="text-sm font-bold text-slate-900">{label}</p>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}