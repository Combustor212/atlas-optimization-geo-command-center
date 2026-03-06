import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RecommendedActions({ actions = [] }) {
  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white shadow-xl border-0">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
          <TrendingUp className="w-6 h-6 text-indigo-600" />
          Recommended Actions
        </CardTitle>
        <p className="text-sm text-slate-600 mt-1">
          Complete these tasks to improve your AI visibility score
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          {actions.map((action, idx) => (
            <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-white border-2 border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="flex-shrink-0">
                <Badge className={cn(
                  "font-bold",
                  action.impact === 'high' ? "bg-red-100 text-red-700 border-red-200" :
                  action.impact === 'medium' ? "bg-amber-100 text-amber-700 border-amber-200" :
                  "bg-green-100 text-green-700 border-green-200"
                )}>
                  {action.impact} impact
                </Badge>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">{action.task}</p>
                <p className="text-xs text-slate-500 mt-1">Effort: {action.effort}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}