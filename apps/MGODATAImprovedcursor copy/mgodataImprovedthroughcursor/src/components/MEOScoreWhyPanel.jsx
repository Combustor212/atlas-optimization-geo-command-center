import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  RefreshCcw,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  MinusCircle,
  Lock,
  Phone
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const CACHE_TTL_MS = Number(import.meta.env.VITE_MEO_EXPLAIN_CACHE_TTL_MS) || 1000 * 60 * 30;

function apiBaseUrl() {
  return import.meta.env.VITE_API_URL || "http://localhost:3002";
}

function cacheKey(placeId) {
  return `meoExplainCache:${placeId}`;
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function formatTimeAgo(iso) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diffMs = Date.now() - t;
  const min = Math.max(0, Math.floor(diffMs / 60000));
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function statusIcon(status) {
  switch (status) {
    case "good":
      return CheckCircle2;
    case "warn":
      return AlertTriangle;
    case "bad":
      return XCircle;
    case "disabled":
    default:
      return MinusCircle;
  }
}

function statusTone(status) {
  switch (status) {
    case "good":
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "warn":
      return "text-amber-800 bg-amber-50 border-amber-200";
    case "bad":
      return "text-red-700 bg-red-50 border-red-200";
    case "disabled":
    default:
      return "text-slate-600 bg-slate-50 border-slate-200";
  }
}

export default function MEOScoreWhyPanel({ placeId }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExplain = useCallback(async ({ force = false } = {}) => {
    if (!placeId) return;
    setError(null);
    setIsLoading(true);

    const base = apiBaseUrl();
    const url = new URL(`${base}/api/meo/explain`);
    url.searchParams.set("placeId", placeId);
    if (force) url.searchParams.set("force", "1");

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      const payload = json?.data;
      if (!payload) throw new Error("Missing data");

      setData(payload);
      try {
        localStorage.setItem(
          cacheKey(placeId),
          JSON.stringify({ cachedAt: Date.now(), data: payload })
        );
      } catch {
        // ignore
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, [placeId]);

  const load = useCallback(async ({ force = false } = {}) => {
    if (!placeId) {
      setIsLoading(false);
      setError("Missing place ID");
      return;
    }

    if (!force) {
      const raw = localStorage.getItem(cacheKey(placeId));
      const cached = raw ? safeJsonParse(raw) : null;
      const isFresh = cached?.cachedAt && (Date.now() - cached.cachedAt) < CACHE_TTL_MS;
      if (isFresh && cached?.data) {
        setData(cached.data);
        setIsLoading(false);
        setError(null);
        return;
      }
    }

    await fetchExplain({ force });
  }, [placeId, fetchExplain]);

  useEffect(() => {
    load({ force: false });
  }, [load]);

  const current = Number(data?.score?.current ?? 0);
  const potentialEnabled = !!data?.potential?.enabled && typeof data?.potential?.potentialScore === "number";
  const potential = potentialEnabled ? Number(data.potential.potentialScore) : null;
  const gain = potentialEnabled ? Math.max(0, potential - current) : 0;

  const lastRefreshed = data?.lastRefreshedAt || null;
  const capEnabled = !!data?.reliabilityCap?.enabled;
  const capValue = data?.reliabilityCap?.capValue;
  const capReason = data?.reliabilityCap?.reason || null;

  // Extract competitive context
  const marketContext = data?.marketContext || {};
  const competitivePercentile = marketContext.competitivePercentile || {};
  const avgPercentile = Math.round(
    (competitivePercentile.rating + competitivePercentile.reviews + competitivePercentile.photos) / 3
  ) || null;
  
  const localAvgRating = marketContext.localAvgRating || null;
  const localAvgReviews = marketContext.localAvgReviews || null;
  const localAvgPhotos = marketContext.localAvgPhotos || null;
  const marketPosition = marketContext.marketPosition || null;

  // Extract business data
  const gbpFacts = data?.gbpFacts || {};
  const rating = gbpFacts.rating || null;
  const totalReviews = gbpFacts.totalReviews || null;
  const photoCount = gbpFacts.photoCount || null;
  const isFranchise = gbpFacts.isFranchise || false;

  const drivers = Array.isArray(data?.drivers) ? data.drivers : [];
  const helped = Array.isArray(data?.helped) ? data.helped : [];
  const heldBack = Array.isArray(data?.heldBack) ? data.heldBack : [];
  const actions = Array.isArray(data?.actions) ? data.actions : [];

  // Separate drivers into helping vs limiting
  const helpingDrivers = drivers.filter(d => d.status === "good");
  const limitingDrivers = drivers.filter(d => d.status === "bad" || d.status === "warn");
  const primaryLimiter = limitingDrivers[0] || null;

  // Generate executive summary
  const executiveSummary = useMemo(() => {
    if (!avgPercentile && !primaryLimiter) {
      return "Your Maps visibility is being analyzed based on your profile completeness and local competition.";
    }
    
    const rankPhrase = avgPercentile 
      ? avgPercentile >= 70 
        ? "above most nearby competitors"
        : avgPercentile >= 50
        ? "near the middle of local competition"
        : "behind many local competitors"
      : "relative to local competitors";
    
    const limitPhrase = capEnabled && capReason
      ? capReason.toLowerCase().includes("review")
        ? "limited verified customer reviews"
        : "profile reliability signals"
      : primaryLimiter?.title?.toLowerCase() || "profile completeness";
    
    return `You rank ${rankPhrase}, but your visibility is capped due to ${limitPhrase}.`;
  }, [avgPercentile, capEnabled, capReason, primaryLimiter]);

  // Generate why section content
  const whyContent = useMemo(() => {
    if (capEnabled && capReason) {
      return {
        title: "Why Your Maps Visibility Is Capped",
        reason: capReason,
        unlock: "Book a Call"
      };
    }
    
    if (primaryLimiter) {
      return {
        title: "Why Your Visibility Is Limited",
        reason: primaryLimiter.why,
        unlock: "Book a Call"
      };
    }
    
    return null;
  }, [capEnabled, capReason, primaryLimiter]);

  const onRefresh = () => load({ force: true });

  if (isLoading) {
    return (
      <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-48 bg-slate-200 rounded" />
            <div className="h-24 w-full bg-slate-200 rounded-lg" />
            <div className="h-16 w-full bg-slate-200 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-base font-bold text-slate-900">Unable to load Maps insights</div>
              <div className="text-sm text-slate-600 mt-1">{error}</div>
            </div>
            <Button onClick={onRefresh} size="sm" className="rounded-lg">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">Maps Visibility</h3>
            <Badge variant="outline" className="text-xs font-semibold">MEO</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Updated {formatTimeAgo(lastRefreshed)}
            </span>
            <Button onClick={onRefresh} size="sm" variant="outline" className="rounded-lg h-8">
              <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* SCORE */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200">
          <div className="flex items-baseline gap-3 mb-3">
            <div className="text-5xl font-black text-slate-900">{current}</div>
            <div className="text-slate-500 font-semibold text-lg">/ 100</div>
            {capEnabled && (
              <Badge className="ml-auto bg-amber-100 text-amber-800 border-amber-300 text-xs flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Capped at {capValue}
              </Badge>
            )}
          </div>
          
          {/* Executive Summary */}
          <div className="text-sm text-slate-700 leading-relaxed">
            {executiveSummary}
          </div>
          
          {avgPercentile !== null && (
            <div className="mt-3 pt-3 border-t border-purple-200/50">
              <div className="text-xs font-semibold text-slate-600">
                Market Position: <span className="text-purple-700">{marketPosition || `Top ${100 - avgPercentile}%`}</span>
              </div>
            </div>
          )}
        </div>

        {/* WHY Section - Mandatory */}
        {whyContent && (
          <div className="p-5 rounded-xl bg-amber-50 border-2 border-amber-300">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-amber-900 mb-2">
                  {whyContent.title}
                </div>
                
                <div className="text-sm text-slate-700 mb-3">
                  {whyContent.reason}
                </div>

                <Button
                  onClick={() => { window.location.href = createPageUrl("GetSupport") + "?book=1"; }}
                  className="w-full mt-2 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl hover:scale-[1.01] transition-all"
                >
                  <Phone className="w-6 h-6 mr-2" />
                  Book a Call
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* You vs Local Market (Competitive Context) */}
        {(rating !== null || totalReviews !== null || photoCount !== null) && (
          <div className="space-y-3">
            <div className="text-sm font-bold text-slate-900">You vs Local Competitors</div>
            <div className="grid grid-cols-3 gap-3">
              {photoCount !== null && localAvgPhotos !== null && (
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="text-xs text-slate-600 font-semibold mb-2">Photos</div>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold text-slate-900">{photoCount}</div>
                    <div className="text-xs text-slate-500">
                      vs <span className="font-semibold">{Math.round(localAvgPhotos)}</span> avg
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div 
                      className={cn(
                        "h-full",
                        photoCount >= localAvgPhotos ? "bg-emerald-500" : "bg-amber-500"
                      )}
                      style={{ width: `${Math.min(100, (photoCount / (localAvgPhotos || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {totalReviews !== null && localAvgReviews !== null && (
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="text-xs text-slate-600 font-semibold mb-2">Reviews</div>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold text-slate-900">{totalReviews}</div>
                    <div className="text-xs text-slate-500">
                      vs <span className="font-semibold">{Math.round(localAvgReviews)}</span> avg
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div 
                      className={cn(
                        "h-full",
                        totalReviews >= localAvgReviews ? "bg-emerald-500" : "bg-amber-500"
                      )}
                      style={{ width: `${Math.min(100, (totalReviews / (localAvgReviews || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {rating !== null && localAvgRating !== null && (
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="text-xs text-slate-600 font-semibold mb-2">Rating</div>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold text-slate-900">{rating.toFixed(1)}</div>
                    <div className="text-xs text-slate-500">
                      vs <span className="font-semibold">{localAvgRating.toFixed(1)}</span> avg
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div 
                      className={cn(
                        "h-full",
                        rating >= localAvgRating ? "bg-emerald-500" : "bg-amber-500"
                      )}
                      style={{ width: `${Math.min(100, (rating / (localAvgRating || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Details: What's Helping vs Limiting (Cause → Effect) */}
        <details className="group">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
              <span className="text-sm font-semibold text-slate-700">View detailed breakdown</span>
              <span className="text-xs text-slate-500 group-open:hidden">Show</span>
              <span className="text-xs text-slate-500 hidden group-open:inline">Hide</span>
            </div>
          </summary>
          
          <div className="mt-4 space-y-4">
            {/* Helping vs Limiting */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <div className="text-xs font-bold text-emerald-900">What's Helping Your Visibility</div>
                </div>
                {helpingDrivers.length > 0 ? (
                  <ul className="space-y-2">
                    {helpingDrivers.slice(0, 4).map((d, i) => (
                      <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700 mt-0.5 shrink-0" />
                        <div>
                          <div className="font-semibold">{d.title}</div>
                          <div className="text-slate-600">{d.why}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-slate-600">No strong positive signals detected yet.</div>
                )}
              </div>

              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-700" />
                  <div className="text-xs font-bold text-red-900">What's Limiting Your Visibility</div>
                </div>
                {limitingDrivers.length > 0 ? (
                  <ul className="space-y-2">
                    {limitingDrivers.slice(0, 4).map((d, i) => (
                      <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                        <span className="text-red-700 mt-0.5">×</span>
                        <div>
                          <div className="font-semibold">{d.title}</div>
                          <div className="text-slate-600">{d.why}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-slate-600">No major blockers detected.</div>
                )}
              </div>
            </div>

            {/* All Factors */}
            {drivers.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-900">All Ranking Factors</div>
                {drivers.slice(0, 6).map((d) => {
                  const Icon = statusIcon(d.status);
                  return (
                    <div key={d.id} className="p-3 rounded-lg border border-slate-200 bg-white">
                      <div className="flex items-start gap-3">
                        <div className={cn("w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0", statusTone(d.status))}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-semibold text-xs text-slate-900">{d.title}</div>
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusTone(d.status))}>
                              {d.impactLabel}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            {d.why}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
