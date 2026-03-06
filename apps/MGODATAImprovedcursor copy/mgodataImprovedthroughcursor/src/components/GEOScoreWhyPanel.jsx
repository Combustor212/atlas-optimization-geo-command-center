import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trophy,
  Target,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Info,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Fetch GEO benchmark data from backend
 */
const fetchGEOBenchmark = async (placeId, radiusMeters = 5000, forceRefresh = false) => {
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
  const url = `${backendUrl}/api/geo/benchmark?placeId=${placeId}&radius=${radiusMeters}${forceRefresh ? '&force=1' : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    cache: 'no-store'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `GEO benchmark failed: ${response.status}`);
  }

  return response.json();
};

/**
 * Driver item component
 */
const DriverItem = ({ driver }) => {
  const statusColors = {
    good: 'bg-green-100 text-green-800 border-green-300',
    warn: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    bad: 'bg-red-100 text-red-800 border-red-300'
  };

  return (
    <div className={cn('p-4 rounded-lg border-2', statusColors[driver.status])}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1">{driver.title}</h4>
          <p className="text-xs opacity-90 mb-2">{driver.explanation}</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="font-medium">Your value: {driver.observedValue}</span>
            {driver.competitorMedian !== undefined && (
              <span className="opacity-75">Competitor median: {driver.competitorMedian}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className="font-bold">
            {driver.impactLabel}
          </Badge>
          {driver.cta && (
            <Button size="sm" variant="outline" className="text-xs">
              {driver.cta}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Query win/loss item
 */
const QueryItem = ({ query, type }) => {
  const Icon = type === 'win' ? ThumbsUp : ThumbsDown;
  const colorClass = type === 'win' ? 'text-green-700' : 'text-red-700';
  
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', colorClass)} />
      <span className="text-slate-700">{query}</span>
    </div>
  );
};

/**
 * Main GEO Score Why Panel
 */
export default function GEOScoreWhyPanel({ placeId, currentGEOScore, radiusMeters = 5000, showDebug = false }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const { data: geoData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['geoBenchmark', placeId, radiusMeters],
    queryFn: () => fetchGEOBenchmark(placeId, radiusMeters),
    enabled: !!placeId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    cacheTime: 1000 * 60 * 60, // 1 hour
    retry: 1
  });

  const handleRefresh = () => {
    refetch({ queryFn: () => fetchGEOBenchmark(placeId, radiusMeters, true) });
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="bg-white border border-slate-200 rounded-2xl shadow-lg">
        <CardContent className="p-8 sm:p-10">
          <Skeleton className="h-8 w-2/3 mb-6" />
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-6 w-1/3 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (isError) {
    const isInsufficientCompetitors = error?.message?.includes('Insufficient competitors');
    
    return (
      <Card className="bg-red-50 border border-red-200 rounded-2xl shadow-lg">
        <CardContent className="p-8 sm:p-10 text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">
            {isInsufficientCompetitors ? 'Not Enough Competitors Found' : 'Error Loading GEO Insights'}
          </h2>
          <p className="text-red-700 mb-4">
            {isInsufficientCompetitors
              ? 'We need at least 8 competitors in your area to generate accurate GEO rankings. Try expanding your search radius or check back later.'
              : error?.message || 'Failed to fetch GEO benchmark data. Please try refreshing.'}
          </p>
          <Button onClick={handleRefresh} variant="outline" className="text-red-700 border-red-300 hover:bg-red-100">
            <RotateCcw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!geoData) return null;

  const {
    geoScore,
    percentile,
    niche,
    nicheLabel,
    locationLabel,
    drivers = [],
    topQueryWins = [],
    topQueryLosses = [],
    confidence,
    confidenceReasons = [],
    lastRefreshedAt
  } = geoData;

  const lastRefreshedText = lastRefreshedAt ? formatDistanceToNow(parseISO(lastRefreshedAt), { addSuffix: true }) : 'N/A';

  return (
    <Card className="bg-white border border-slate-200 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
      <CardContent className="p-8 sm:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
            Why your GEO score is {geoScore}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-500 hover:text-slate-700"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </Button>
        </div>

        {isExpanded && (
          <div className="space-y-8">
            {/* Debug Panel (if ?debug=1) */}
            {showDebug && (
              <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl text-xs font-mono">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-yellow-700" />
                  <span className="font-bold text-yellow-900">Debug Info (GEO Benchmark)</span>
                </div>
                <div className="space-y-1 text-yellow-800">
                  <div>Place ID: {placeId}</div>
                  <div>Niche: {nicheLabel || niche}</div>
                  <div>Location: {locationLabel}</div>
                  <div>Competitors: {geoData.competitors?.length || 0}</div>
                  <div>Queries: {geoData.queries?.length || 0}</div>
                  <div>Confidence: {confidence}</div>
                </div>
              </div>
            )}

            {/* A. Header Row: Score + Percentile + Refresh */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <span className="text-5xl font-extrabold text-indigo-600">{geoScore}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-600">/ 100 GEO</span>
                  <span className="text-xs text-slate-500">{percentile}th percentile</span>
                </div>
              </div>
              <div className="flex-1 text-center">
                <Badge variant="outline" className={cn(
                  'text-sm font-semibold',
                  confidence === 'high' && 'bg-green-100 text-green-800 border-green-300',
                  confidence === 'medium' && 'bg-yellow-100 text-yellow-800 border-yellow-300',
                  confidence === 'low' && 'bg-red-100 text-red-800 border-red-300'
                )}>
                  {confidence === 'high' && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                  {confidence === 'medium' && <AlertCircle className="w-3 h-3 mr-1 inline" />}
                  {confidence === 'low' && <AlertTriangle className="w-3 h-3 mr-1 inline" />}
                  Confidence: {confidence}
                </Badge>
                {confidenceReasons.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">{confidenceReasons[0]}</p>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Data refreshed: {lastRefreshedText}</span>
                <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* B. Primary Callout */}
            <Card className="bg-indigo-50 border border-indigo-200 rounded-xl shadow-sm">
              <CardContent className="p-5 flex items-start gap-4">
                <Info className="w-6 h-6 text-indigo-600 shrink-0" />
                <p className="text-base font-medium text-indigo-900">
                  Your business ranks in the <strong>{percentile}th percentile</strong> for AI-generated recommendations in the <strong>{nicheLabel || niche}</strong> category near <strong>{locationLabel}</strong>.
                </p>
              </CardContent>
            </Card>

            {/* C. Top Impact Drivers */}
            {drivers.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-600" />
                  Top Impact Drivers
                </h3>
                <div className="space-y-3">
                  {drivers.slice(0, 5).map((driver, idx) => (
                    <DriverItem key={idx} driver={driver} />
                  ))}
                </div>
              </div>
            )}

            {/* D. Query Wins vs Losses */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Wins */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-green-600" />
                  Top Query Wins
                </h3>
                <Card className="bg-green-50 border border-green-200 rounded-xl">
                  <CardContent className="p-5">
                    {topQueryWins.length > 0 ? (
                      <div className="space-y-2">
                        {topQueryWins.map((query, idx) => (
                          <QueryItem key={idx} query={query} type="win" />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-green-800">No top-3 rankings found yet. Focus on the drivers above to improve.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Losses */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-red-600" />
                  Top Query Losses
                </h3>
                <Card className="bg-red-50 border border-red-200 rounded-xl">
                  <CardContent className="p-5">
                    {topQueryLosses.length > 0 ? (
                      <div className="space-y-2">
                        {topQueryLosses.slice(0, 5).map((query, idx) => (
                          <QueryItem key={idx} query={query} type="loss" />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-red-800">Great! You're ranking well for most queries.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

