import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Star, Activity, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isValid, parseISO } from "date-fns";

export default function RecentActivity({ auditReports, reviews, isLoading }) {
  // Helper function to safely format dates
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

  const activities = [
    ...auditReports.map(report => ({
      id: report.id,
      type: 'audit',
      title: `${report.title}`,
      date: report.occurredAt,
      score: report.score,
      severity: report.score >= 80 ? 'success' : report.score >= 60 ? 'warning' : 'error'
    })),
    ...reviews.map(review => ({
      id: review.id,
      type: 'review',
      title: `New ${review.rating}-star review on ${review.source}`,
      date: review.created_date, // Using built-in created_date field
      rating: review.rating,
      severity: review.rating >= 4 ? 'success' : review.rating >= 3 ? 'warning' : 'error'
    }))
  ].filter(activity => activity.date) // Filter out activities without dates
   .sort((a, b) => {
     const dateA = new Date(a.date);
     const dateB = new Date(b.date);
     if (isValid(dateA) && isValid(dateB)) {
       return dateB - dateA;
     }
     return 0;
   })
   .slice(0, 8);

  const getSeverityColor = (severity) => {
    const colors = {
      success: "bg-green-100 text-green-700 border-green-200",
      warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
      error: "bg-red-100 text-red-700 border-red-200"
    };
    return colors[severity] || colors.success;
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
      <CardHeader>
        <CardTitle className="text-slate-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-xl animate-pulse bg-slate-50/50">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-12" />
            </div>
          ))
        ) : activities.length > 0 ? (
          activities.map((activity) => (
            <div key={`${activity.type}-${activity.id}`} className="flex items-center gap-3 p-3 border border-slate-200/60 rounded-xl hover:bg-slate-50/50 transition-all duration-200">
              <div className={`p-2 rounded-full ${getSeverityColor(activity.severity)}`}>
                {activity.type === 'audit' ? (
                  <FileText className="w-4 h-4" />
                ) : (
                  <Star className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(activity.date)}
                </p>
              </div>
              {activity.type === 'audit' && (
                <Badge className={getSeverityColor(activity.severity)} variant="secondary">
                  {activity.score}%
                </Badge>
              )}
              {activity.type === 'review' && (
                <Badge className={getSeverityColor(activity.severity)} variant="secondary">
                  {activity.rating}★
                </Badge>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-6">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No recent activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}