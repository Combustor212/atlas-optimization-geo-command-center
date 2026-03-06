import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Activity,
  Target,
  Star,
  Globe,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const MetricCard = ({ title, score, trend, icon: Icon, color, description }) => {
  const isTrendUp = trend && parseFloat(trend) > 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          color === 'green' && 'bg-green-100',
          color === 'indigo' && 'bg-indigo-100',
          color === 'amber' && 'bg-amber-100',
          color === 'purple' && 'bg-purple-100'
        )}>
          <Icon className={cn(
            "w-5 h-5",
            color === 'green' && 'text-green-600',
            color === 'indigo' && 'text-indigo-600',
            color === 'amber' && 'text-amber-600',
            color === 'purple' && 'text-purple-600'
          )} />
        </div>
        {trend && (
          <Badge className={cn(
            "text-xs font-semibold",
            isTrendUp ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
          )}>
            {isTrendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {trend}
          </Badge>
        )}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{score}<span className="text-base text-slate-500">%</span></p>
        {description && <p className="text-xs text-slate-600 mt-1">{description}</p>}
      </div>
    </motion.div>
  );
};

export default function VisibilityPulse() {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching visibility metrics
    // In production, this would fetch from actual backend endpoints
    setTimeout(() => {
      setMetrics({
        overall: 82,
        overall_trend: '+8%',
        directory: 87,
        directory_trend: '+5%',
        heatmap: 78,
        heatmap_trend: '+12%',
        competitor: 75,
        competitor_trend: '-3%',
        sentiment: 89,
        sentiment_trend: '+6%',
        strongest: 'Google Business Profile',
        weakest: 'Yelp',
        insights: [
          'Directory consistency improved by 5% this week',
          'Local visibility strongest within 1-mile radius',
          'Competitor analysis shows review gap opportunity',
          'Customer sentiment trending positive at 89%'
        ]
      });
      setIsLoading(false);
    }, 500);
  }, []);

  if (isLoading || !metrics) {
    return (
      <Card className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-indigo-200/60 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600 animate-pulse" />
            Loading Visibility Pulse...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-indigo-200/60 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            Visibility Pulse
          </CardTitle>
          <Badge className="bg-indigo-100 text-indigo-700 border-indigo-300 font-bold">
            Overall: {metrics.overall}%
          </Badge>
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Weighted blend of all visibility metrics
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score Banner */}
        <div className="bg-white rounded-xl p-6 border-2 border-indigo-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Overall Visibility Score</p>
              <div className="flex items-baseline gap-2">
                <p className="text-5xl font-bold text-indigo-600">{metrics.overall}</p>
                <Badge className="bg-green-50 text-green-700 border-green-200">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {metrics.overall_trend} this week
                </Badge>
              </div>
            </div>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-600 mb-1">Strongest in:</p>
              <p className="font-semibold text-green-700">{metrics.strongest}</p>
            </div>
            <div>
              <p className="text-slate-600 mb-1">Needs attention:</p>
              <p className="font-semibold text-amber-700">{metrics.weakest}</p>
            </div>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Directory Sync"
            score={metrics.directory}
            trend={metrics.directory_trend}
            icon={Globe}
            color="green"
            description="NAP consistency"
          />
          <MetricCard
            title="GEO Heatmap"
            score={metrics.heatmap}
            trend={metrics.heatmap_trend}
            icon={Target}
            color="indigo"
            description="Local visibility"
          />
          <MetricCard
            title="Competitive"
            score={metrics.competitor}
            trend={metrics.competitor_trend}
            icon={BarChart3}
            color="amber"
            description="Market position"
          />
          <MetricCard
            title="Sentiment"
            score={metrics.sentiment}
            trend={metrics.sentiment_trend}
            icon={Star}
            color="purple"
            description="Review sentiment"
          />
        </div>

        {/* AI Insights */}
        <div className="bg-white rounded-xl p-4 border border-indigo-200">
          <h4 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            This Week's Insights
          </h4>
          <div className="space-y-2">
            {metrics.insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0" />
                <p className="text-slate-700">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}