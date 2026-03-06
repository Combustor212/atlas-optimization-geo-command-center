import React from 'react';
import { AlertTriangle, TrendingUp, Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InsightCard({ type, headline, description }) {
  const configs = {
    urgent: {
      icon: AlertTriangle,
      bg: "bg-red-50",
      border: "border-red-200",
      iconBg: "bg-red-100",
      iconColor: "text-red-600"
    },
    warning: {
      icon: TrendingUp,
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600"
    },
    success: {
      icon: Check,
      bg: "bg-green-50",
      border: "border-green-200",
      iconBg: "bg-green-100",
      iconColor: "text-green-600"
    },
    info: {
      icon: Info,
      bg: "bg-blue-50",
      border: "border-blue-200",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600"
    }
  };

  const config = configs[type] || configs.info;
  const Icon = config.icon;

  return (
    <div className={cn(
      "p-4 rounded-xl border-2 transition-all hover:shadow-md",
      config.bg,
      config.border
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("p-2.5 rounded-lg flex-shrink-0", config.iconBg)}>
          <Icon className={cn("w-5 h-5", config.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-900 mb-1.5 flex items-center gap-2">
            <span>{headline}</span>
          </h4>
          <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}