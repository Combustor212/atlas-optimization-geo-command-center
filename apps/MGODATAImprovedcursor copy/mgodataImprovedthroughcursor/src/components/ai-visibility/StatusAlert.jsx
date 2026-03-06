import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StatusAlert({ error, errorType, isSuccess, totalMentions }) {
  if (isSuccess) {
    return (
      <Card className="bg-green-50 border-2 border-green-200">
        <CardContent className="p-4 flex items-start gap-3">
          <Check className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-green-900">AI Data Fetched Successfully</p>
            <p className="text-xs text-green-700 mt-1">
              Real-time visibility analysis completed using GPT API.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!error) return null;

  const isCritical = errorType === 'missing_key' || errorType === 'invalid_key' || errorType === 'invalid_endpoint';
  
  return (
    <Card className={cn(
      "border-2",
      isCritical ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"
    )}>
      <CardContent className="p-4 flex items-start gap-3">
        <AlertTriangle className={cn(
          "w-6 h-6 flex-shrink-0",
          isCritical ? "text-red-600" : "text-orange-600"
        )} />
        <div>
          <p className={cn(
            "text-sm font-bold",
            isCritical ? "text-red-900" : "text-orange-900"
          )}>
            {error}
          </p>
          <p className={cn(
            "text-xs mt-1",
            isCritical ? "text-red-700" : "text-orange-700"
          )}>
            {isCritical 
              ? "Using fallback baseline scoring (minimum 10%). Fix the issue above for accurate AI visibility analysis."
              : "Analysis temporarily unavailable. Using baseline scoring until service is restored."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}