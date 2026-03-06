import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function GEOExplainLoading({ geo, onRetry, timeoutMs = 15000 }) {
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    setTimedOut(false);
    const t = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(t);
  }, [geo?.algoVersion, geo?.status, geo?.score, timeoutMs]);

  return (
    <Card className="bg-white border border-slate-200 rounded-2xl shadow-lg">
      <CardContent className="p-8 sm:p-10">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-2/3" />
          <div className="text-xs font-mono text-slate-400">
            {geo?.algoVersion} • {geo?.status} • {geo?.score ?? '—'}
          </div>
        </div>
        <Skeleton className="h-5 w-1/3 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="mt-6 text-sm text-slate-600">
          {timedOut ? 'Couldn’t load explanation yet.' : 'Generating explanation…'}
        </div>
        {timedOut && (
          <div className="mt-4">
            <Button variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


