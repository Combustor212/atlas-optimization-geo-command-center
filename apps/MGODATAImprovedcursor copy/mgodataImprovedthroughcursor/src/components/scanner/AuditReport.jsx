import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Star, 
  Palette, 
  Brain, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Info,
  Sparkles,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Radar Chart Component
const RadarChart = ({ scores, weights }) => {
  const metrics = [
    { key: 'visibility', label: 'Visibility', icon: Eye, color: 'text-blue-500' },
    { key: 'reputation', label: 'Reputation', icon: Star, color: 'text-amber-500' },
    { key: 'branding', label: 'Branding', icon: Palette, color: 'text-purple-500' },
    { key: 'ai_readiness', label: 'AI Ready', icon: Brain, color: 'text-indigo-500' },
    { key: 'engagement', label: 'Engagement', icon: TrendingUp, color: 'text-green-500' }
  ];

  const angleStep = (2 * Math.PI) / metrics.length;
  const centerX = 120;
  const centerY = 120;
  const maxRadius = 100;

  // Calculate points for the score polygon
  const scorePoints = metrics.map((metric, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const score = scores[metric.key] || 0;
    const radius = (score / 100) * maxRadius;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  });

  const scorePathD = scorePoints.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ') + ' Z';

  return (
    <div className="flex flex-col items-center gap-6">
      <svg width="240" height="240" viewBox="0 0 240 240" className="drop-shadow-lg">
        {/* Grid circles */}
        {[20, 40, 60, 80, 100].map((radius, i) => (
          <circle
            key={i}
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
            opacity={0.5}
          />
        ))}

        {/* Grid lines */}
        {metrics.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = centerX + maxRadius * Math.cos(angle);
          const y = centerY + maxRadius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={centerX}
              y1={centerY}
              x2={x}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
              opacity={0.5}
            />
          );
        })}

        {/* Score polygon */}
        <motion.path
          d={scorePathD}
          fill="url(#radarGradient)"
          fillOpacity="0.4"
          stroke="url(#radarStroke)"
          strokeWidth="3"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {/* Score points */}
        {scorePoints.map((point, i) => (
          <motion.circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="5"
            fill="url(#radarStroke)"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          />
        ))}

        {/* Gradients */}
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id="radarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>
      </svg>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-md">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const weight = weights[metric.key] * 100;
          return (
            <div key={metric.key} className="flex items-center gap-2">
              <Icon className={cn("w-4 h-4", metric.color)} />
              <div className="text-xs">
                <div className="font-semibold text-slate-900">{metric.label}</div>
                <div className="text-slate-500">{weight.toFixed(0)}% weight</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Performance Bar Component
const PerformanceBar = ({ label, score, icon: Icon, color }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center", color)}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-900">{label}</span>
        </div>
        <span className="text-lg font-bold text-slate-900">{score}</span>
      </div>
      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={cn("h-full rounded-full bg-gradient-to-r shadow-sm", color)}
        />
      </div>
    </motion.div>
  );
};

// Insight Card Component
const InsightCard = ({ insight, index }) => {
  const configs = {
    success: {
      icon: CheckCircle2,
      bg: "from-green-50 to-emerald-50",
      border: "border-green-200",
      iconBg: "bg-green-500",
      textColor: "text-green-900"
    },
    warning: {
      icon: AlertTriangle,
      bg: "from-amber-50 to-orange-50",
      border: "border-amber-200",
      iconBg: "bg-amber-500",
      textColor: "text-amber-900"
    },
    urgent: {
      icon: AlertCircle,
      bg: "from-red-50 to-pink-50",
      border: "border-red-200",
      iconBg: "bg-red-500",
      textColor: "text-red-900"
    }
  };

  const config = configs[insight.type] || configs.warning;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={cn(
        "group relative bg-gradient-to-br rounded-2xl p-6 border-2 shadow-lg hover:shadow-2xl transition-all duration-300",
        config.bg,
        config.border
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform",
          config.iconBg
        )}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h5 className={cn("font-bold text-base mb-2", config.textColor)}>
            {insight.headline}
          </h5>
          <p className="text-sm text-slate-700 leading-relaxed">
            {insight.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// Recommendation Card Component
const RecommendationCard = ({ recommendation, index }) => {
  const impactColors = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-green-100 text-green-700 border-green-200"
  };

  const effortColors = {
    high: "bg-purple-100 text-purple-700",
    medium: "bg-blue-100 text-blue-700",
    low: "bg-slate-100 text-slate-700"
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="bg-white/90 backdrop-blur-sm rounded-xl p-5 border border-slate-200 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-3">
        <Badge className={cn("text-xs font-semibold border", impactColors[recommendation.impact])}>
          {recommendation.impact} impact
        </Badge>
        <Badge variant="outline" className={cn("text-xs font-medium", effortColors[recommendation.effort])}>
          {recommendation.effort} effort
        </Badge>
      </div>
      <p className="text-sm text-slate-800 font-medium leading-relaxed">
        {recommendation.task}
      </p>
    </motion.div>
  );
};

// Main Audit Report Component
export default function AuditReport({ auditData }) {
  const { audit, business, city, state, industry, timestamp } = auditData;
  const { scores, weights, insights, recommendations, summary } = audit;

  const metrics = [
    { key: 'visibility', label: 'Visibility', icon: Eye, color: 'from-blue-500 to-cyan-500' },
    { key: 'reputation', label: 'Reputation', icon: Star, color: 'from-amber-500 to-orange-500' },
    { key: 'branding', label: 'Branding', icon: Palette, color: 'from-purple-500 to-pink-500' },
    { key: 'ai_readiness', label: 'AI Readiness', icon: Brain, color: 'from-indigo-500 to-purple-500' },
    { key: 'engagement', label: 'Engagement', icon: TrendingUp, color: 'from-green-500 to-emerald-500' }
  ];

  return (
    <div className="w-full space-y-6">
      {/* Header Card */}
      <Card className="shadow-2xl border-0 bg-gradient-to-br from-purple-50 via-orange-50 to-pink-50 relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-500 to-orange-500 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-orange-500 to-pink-500 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>

        <CardHeader className="relative z-10 border-b border-purple-200/50 bg-white/60 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-3xl font-black text-slate-900 flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-orange-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                Digital Audit Report
              </CardTitle>
              <p className="text-slate-600 font-medium text-lg">{business}</p>
              <p className="text-slate-500 text-sm">{city}, {state} • {industry}</p>
            </div>
            <div className="text-right">
              <div className="inline-flex flex-col items-end">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-600 to-orange-600 flex flex-col items-center justify-center shadow-lg">
                  <div className="text-4xl font-black text-white">{scores.final}</div>
                  <div className="text-xs text-white/80 uppercase tracking-wide">Score</div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative z-10 p-8">
          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-100 shadow-lg mb-8"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-slate-900 mb-2">Executive Summary</h4>
                <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
              </div>
            </div>
          </motion.div>

          {/* Radar Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-purple-100 shadow-lg mb-8"
          >
            <h4 className="font-bold text-lg text-slate-900 mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Performance Overview
            </h4>
            <RadarChart scores={scores} weights={weights} />
          </motion.div>

          {/* Performance Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-purple-100 shadow-lg mb-8"
          >
            <h4 className="font-bold text-lg text-slate-900 mb-6">Performance Breakdown</h4>
            <div className="space-y-6">
              {metrics.map((metric) => (
                <PerformanceBar
                  key={metric.key}
                  label={metric.label}
                  score={scores[metric.key]}
                  icon={metric.icon}
                  color={metric.color}
                />
              ))}
            </div>
          </motion.div>

          {/* Key Insights */}
          {insights && insights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-8"
            >
              <h4 className="font-bold text-lg text-slate-900 mb-6">Key Insights</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} index={i} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Recommended Actions */}
          {recommendations && recommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h4 className="font-bold text-lg text-slate-900 mb-6">Recommended Actions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((rec, i) => (
                  <RecommendationCard key={i} recommendation={rec} index={i} />
                ))}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}