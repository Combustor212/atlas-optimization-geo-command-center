import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function RecentBusinesses({ businesses, isLoading }) {
  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600 bg-green-100 border-green-200";
    if (score >= 60) return "text-yellow-600 bg-yellow-100 border-yellow-200";
    return "text-red-600 bg-red-100 border-red-200";
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-indigo-600" />
          Recent Businesses
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to={createPageUrl("Businesses")}>
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="space-y-3 p-4 border rounded-xl animate-pulse bg-slate-50/50">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          ))
        ) : businesses.length > 0 ? (
          businesses.map((business) => (
            <div key={business.id} className="p-4 border border-slate-200/60 rounded-xl hover:shadow-md transition-all duration-200 bg-white/60">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg">{business.name}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {business.city}, {business.state}
                  </p>
                </div>
                <Badge className={`${getScoreColor((Math.random() * 40) + 60)} border`}>
                  {Math.round((Math.random() * 40) + 60)}%
                </Badge>
              </div>
              <Badge variant="outline" className="text-xs">{business.category}</Badge>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No businesses added yet</p>
            <Button asChild size="sm" className="mt-2">
              <Link to={createPageUrl("Businesses")}>Add Your First Business</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}