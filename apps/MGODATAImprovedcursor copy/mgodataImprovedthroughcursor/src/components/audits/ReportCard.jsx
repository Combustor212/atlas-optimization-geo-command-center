import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isValid } from 'date-fns';
import { Building, Calendar, TrendingUp, Star, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

// Circular Progress Ring
const CircularProgress = ({ value, size = 80, strokeWidth = 8, label = "Score" }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const getColor = (val) => {
    if (val >= 80) return "text-green-500";
    if (val >= 60) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-slate-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-700", getColor(value))}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center">
        <span className={cn("text-2xl font-bold", getColor(value))}>{value}</span>
        <span className="text-[10px] text-slate-500 block mt-0.5">{label}</span>
      </div>
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const configs = {
    'Completed': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
    'In Progress': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
    'Pending': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  };

  const config = configs[status] || configs['Pending'];

  return (
    <Badge className={cn("px-3 py-1 font-semibold border-2", config.bg, config.text, config.border)}>
      <span className={cn("w-2 h-2 rounded-full mr-2 inline-block", config.dot)} />
      {status}
    </Badge>
  );
};

// Category Badge Component
const CategoryBadge = ({ category }) => {
  const configs = {
    'Onboarding': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    'Google Maps': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    'Reviews': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    'AI Visibility': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    'General': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  };

  const config = configs[category] || configs['General'];

  return (
    <Badge variant="outline" className={cn("px-2 py-0.5 text-xs font-medium border", config.bg, config.text, config.border)}>
      {category}
    </Badge>
  );
};

export default function ReportCard({ report, business, viewMode = 'grid' }) {
    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown date';
        
        try {
            const date = new Date(dateString);
            if (isValid(date)) {
                return format(date, 'MMM d, yyyy');
            }
            return 'Invalid date';
        } catch (error) {
            return 'Invalid date';
        }
    };

    const businessLogo = business?.name?.[0] || 'B';

    if (viewMode === 'list') {
        return (
            <Card className="group bg-white border-slate-200 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300">
                <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                        {/* Business Logo */}
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shrink-0">
                            {businessLogo}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-lg text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                        {business?.name || 'Unknown Business'}
                                    </h3>
                                    <p className="text-sm font-medium text-indigo-600 mt-0.5">{report.title}</p>
                                </div>
                                <div className="flex gap-2 items-start ml-4 shrink-0">
                                    <CategoryBadge category={report.category} />
                                    <StatusBadge status={report.status} />
                                </div>
                            </div>
                            
                            <p className="text-sm text-slate-500 mb-3">{report.subtitle || 'No description available'}</p>

                            {/* Metrics Row */}
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                        <Eye className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Visibility</p>
                                        <p className="text-sm font-bold text-slate-900">{report.metrics?.visibility || 0}%</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                        <Star className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Reviews/mo</p>
                                        <p className="text-sm font-bold text-slate-900">{report.metrics?.reviewVelocity || 0}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <TrendingUp className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">MEO Score</p>
                                        <p className="text-sm font-bold text-slate-900">{report.metrics?.meoScore || 0}%</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 ml-auto text-sm text-slate-500">
                                    <Calendar className="w-4 h-4" />
                                    {formatDate(report.occurredAt)}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="group bg-white border-slate-200 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:border-indigo-300">
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {/* Business Logo */}
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                            {businessLogo}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                {business?.name || 'Unknown Business'}
                            </h3>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                {formatDate(report.occurredAt)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                    <CategoryBadge category={report.category} />
                    <StatusBadge status={report.status} />
                </div>

                <CardTitle className="text-base font-semibold text-indigo-600">
                    {report.title}
                </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
                <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5rem]">
                    {report.subtitle || 'No description available'}
                </p>

                {/* Score Ring */}
                <div className="flex items-center justify-center py-4">
                    <CircularProgress value={report.score?.toFixed(0) || 0} />
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                    <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                <Eye className="w-4 h-4 text-green-600" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mb-1">Visibility</p>
                        <p className="text-lg font-bold text-slate-900">{report.metrics?.visibility || 0}%</p>
                    </div>

                    <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                <Star className="w-4 h-4 text-amber-600" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mb-1">Reviews/mo</p>
                        <p className="text-lg font-bold text-slate-900">{report.metrics?.reviewVelocity || 0}</p>
                    </div>

                    <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-blue-600" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mb-1">MEO</p>
                        <p className="text-lg font-bold text-slate-900">{report.metrics?.meoScore || 0}%</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}