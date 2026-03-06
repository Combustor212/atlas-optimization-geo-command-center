import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building, 
  TrendingUp, 
  AlertTriangle, 
  Star
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


export default function StatsOverview({ stats, isLoading }) {
  const statCards = [
    {
      title: "Total Businesses",
      value: stats.totalBusinesses,
      icon: Building,
      color: "bg-blue-500",
      change: "+12%",
      tooltip: "The total number of businesses you are managing.",
    },
    {
      title: "Avg Visibility Score", 
      value: `${stats.avgVisibilityScore}%`,
      icon: TrendingUp,
      color: "bg-green-500",
      change: "+5%",
      tooltip: "Your average ranking across AI, Maps, and Search.",
    },
    {
      title: "Need Attention",
      value: stats.businessesNeedingAttention,
      icon: AlertTriangle, 
      color: "bg-orange-500",
      change: "-3%",
      tooltip: "Businesses with low scores that require optimization.",
    },
    {
      title: "Total Reviews",
      value: stats.totalReviews,
      icon: Star,
      color: "bg-purple-500",
      change: "+18%",
      tooltip: "Total number of reviews collected across all platforms.",
    }
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.color} bg-opacity-10`}>
                    <stat.icon className={`w-4 h-4 ${stat.color.replace('bg-', 'text-')}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ) : (
                    <div>
                      <div className="text-2xl font-bold text-slate-900 mb-1">
                        {stat.value}
                      </div>
                      <Badge variant="secondary" className={`text-xs ${stat.change.startsWith('+') ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                        {stat.change} this month
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>{stat.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}