import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function TopPerformers({ businesses, isLoading }) {
  // Using placeholder scores for sorting
  const topPerformers = [...businesses]
    .sort((a, b) => ((b.id * 37) % 30 + 70) - ((a.id * 37) % 30 + 70))
    .slice(0, 3);

  return (
    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200/60 shadow-lg">
      <CardHeader>
        <CardTitle className="text-green-800 flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white/70 rounded-xl animate-pulse">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          ))
        ) : topPerformers.length > 0 ? (
          topPerformers.map((business, index) => (
            <div key={business.id} className="flex items-center gap-3 p-3 bg-white/70 rounded-xl">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
              }`}>
                {index + 1}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{business.name}</h3>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Star className="w-3 h-3" />
                  {((business.id * 41) % 10 / 10 + 4).toFixed(1)}/5 ({Math.floor((business.id * 53) % 100 + 50)} reviews)
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                {Math.round((business.id * 37) % 30 + 70)}%
              </Badge>
            </div>
          ))
        ) : (
          <div className="text-center py-6">
            <Trophy className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-green-700">No performance data yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}