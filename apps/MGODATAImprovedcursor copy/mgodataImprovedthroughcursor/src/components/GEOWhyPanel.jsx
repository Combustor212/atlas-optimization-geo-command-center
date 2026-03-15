import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, ChevronDown, ChevronUp, Target, Users, Copy, Check, RotateCcw, Search, X, Info, ExternalLink, MapPin, AlertCircle, Star, Sparkles, Award, AlertTriangle, TrendingDown, Phone } from 'lucide-react';
import { toast } from 'sonner';
import GEOExplainUnavailableBanner from './GEOExplainUnavailableBanner';
import { getNearbyCompetitors } from '@/api/functions';
import { getTargetPlaceId } from '@/utils/getTargetPlaceId';
import { getBusinessCategory, getCategoryDisplayName } from '@/utils/getBusinessCategory';
import {
  formatDistanceMiles,
  formatReviewCount,
  normalizePlaceTypesToLabels,
  filterRelevantCompetitors,
  findMainCompetitor,
  sortCompetitors
} from '@/utils/competitorUtils';
import {
  computeConfidence,
  computeDriverPoints,
  getDriverStats,
  findWeakestIntent,
  estimateLift,
  getTopCompetitors,
  getCompetitorInsights,
  getSummaryLine,
  generateActionPlan,
  formatIntent,
  getMentionLabel,
  getRankColor,
  copyPlan,
  copyText
} from '@/utils/geoExplainUtils';

export default function GEOWhyPanel({ explain, score, category, scanData, onRegenerate, isRegenerating }) {
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showPlan, setShowPlan] = useState(false);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState('weak_missing');
  const [search, setSearch] = useState('');
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [showQueries, setShowQueries] = useState(true); // Expanded by default to show queries and rankings
  const [showInsights, setShowInsights] = useState(false);
  
  // Phase A: Real nearby competitors
  const [nearbyCompetitors, setNearbyCompetitors] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState(null);
  const [selectedRadius, setSelectedRadius] = useState(8047);
  const [competitorSort, setCompetitorSort] = useState('relevance');
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    placeId: null,
    requestUrl: null,
    responseStatus: null,
    rawCount: null,
    filteredCount: null,
    error: null,
    category: null,
    topExcludedReason: null
  });

  const isV3 = explain?.version === 'v3' && typeof explain?.geoScore === 'number';
  const hasData = isV3 || (explain?.version === 'v2' && Array.isArray(explain?.queries) && explain.queries.length > 0);
  const queries = explain?.queries || [];
  const stats = explain?.stats || {};
  const industry = explain?.industryClassification?.industry || category?.label || 'Unknown';
  const location = explain?.locationLabel?.split(',')[1]?.trim() || 'Unknown';
  
  const businessPlaceId = getTargetPlaceId(scanData);
  const businessCategory = getBusinessCategory(scanData);

  const confidence = useMemo(() => computeConfidence(stats), [stats]);
  const drivers = useMemo(() => computeDriverPoints(queries), [queries]);
  const weakest = useMemo(() => findWeakestIntent(stats), [stats]);
  const lift = useMemo(() => estimateLift(weakest, queries), [weakest, queries]);
  const competitors = useMemo(() => getTopCompetitors(queries, explain, businessPlaceId), [queries, explain, businessPlaceId]);
  const competitorInsights = useMemo(() => getCompetitorInsights(competitors, queries), [competitors, queries]);
  const plan = useMemo(() => generateActionPlan(weakest, queries), [weakest, queries]);
  
  // Executive summary - One decisive sentence
  const executiveSummary = useMemo(() => {
    const totalQueries = queries.length;
    const mentionedQueries = queries.filter(q => q.mentioned).length;
    const top3Queries = queries.filter(q => q.rank && q.rank <= 3).length;
    
    if (mentionedQueries === 0) {
      return { 
        text: `Competitors dominate AI search results — you're not appearing in any queries tested.`,
        type: 'critical' 
      };
    } else if (top3Queries === totalQueries) {
      return { 
        text: `You outrank competitors consistently — appearing in top positions across all search types.`,
        type: 'excellent' 
      };
    } else if (mentionedQueries === totalQueries && weakest) {
      return { 
        text: `You rank above most competitors — ${formatIntent(weakest.key)} searches are holding you back.`,
        type: 'good' 
      };
    } else if (weakest) {
      return { 
        text: `Solid presence in most searches, but competitors beat you in ${formatIntent(weakest.key)} queries.`,
        type: 'needs-work' 
      };
    } else {
      return {
        text: `Mixed visibility across AI platforms — some categories strong, others need attention.`,
        type: 'needs-work'
      };
    }
  }, [queries, stats, weakest]);

  // Fetch nearby competitors
  useEffect(() => {
    const fetchNearbyCompetitors = async () => {
      if (!businessPlaceId) {
        const debugData = {
          placeId: null,
          requestUrl: null,
          responseStatus: 'SKIPPED',
          rawCount: 0,
          filteredCount: 0,
          error: 'TARGET_PLACE_ID_MISSING',
          category: businessCategory?.id || null,
          topExcludedReason: null
        };
        setDebugInfo(debugData);
        if (import.meta.env.DEV) {
          console.warn('[GEO Panel] ❌ No placeId found in scanData — cannot fetch competitors');
        }
        return;
      }

      setLoadingNearby(true);
      setNearbyError(null);

      try {
        const requestUrl = `/api/geo/competitors/nearby?placeId=${encodeURIComponent(businessPlaceId)}&radius=${selectedRadius}&limit=10${businessCategory?.id ? `&category=${businessCategory.id}` : ''}`;
        
        if (import.meta.env.DEV) {
          console.log('[GEO Panel] 📡 Fetching competitors:', {
            placeId: businessPlaceId,
            category: businessCategory?.id,
            radius: selectedRadius,
            url: requestUrl
          });
        }

        const response = await getNearbyCompetitors(businessPlaceId, selectedRadius, 10, businessCategory?.id);
        
        if (import.meta.env.DEV) {
          console.log('[GEO Panel] 📥 Competitors response:', {
            status: response?.status || 'unknown',
            hasCompetitors: !!response?.competitors,
            count: response?.competitors?.length || 0,
            hasError: !!response?.error,
            errorMessage: response?.error?.message
          });
        }

        if (response?.error) {
          setNearbyError(response.error.message || 'Failed to load competitors');
          const debugData = {
            placeId: businessPlaceId,
            requestUrl,
            responseStatus: response.error.code || 'ERROR',
            rawCount: 0,
            filteredCount: 0,
            error: response.error.message,
            category: businessCategory?.id || null,
            topExcludedReason: null
          };
          setDebugInfo(debugData);
          return;
        }

        let competitorsList = response?.competitors || response?.data?.competitors || response || [];
        if (!Array.isArray(competitorsList)) {
          competitorsList = [];
        }

        if (import.meta.env.DEV) {
          console.log('[GEO Panel] ✅ Nearby competitors loaded (before filtering):', {
            count: competitorsList.length,
            first: competitorsList[0]
          });
        }

        const rawCount = competitorsList.length;
        const filtered = filterRelevantCompetitors(competitorsList, businessCategory?.id);
        const filteredCount = filtered.length;

        setNearbyCompetitors(filtered);
        
        const debugData = {
          placeId: businessPlaceId,
          requestUrl,
          responseStatus: '200',
          rawCount,
          filteredCount,
          error: null,
          category: businessCategory?.id || null,
          topExcludedReason: rawCount > filteredCount ? 'irrelevant_type' : null
        };
        setDebugInfo(debugData);

      } catch (error) {
        console.error('[GEO Panel] ❌ Error fetching competitors:', error);
        setNearbyError(error.message || 'Network error');
        const debugData = {
          placeId: businessPlaceId,
          requestUrl: `/api/geo/competitors/nearby?placeId=${encodeURIComponent(businessPlaceId)}`,
          responseStatus: 'NETWORK_ERROR',
          rawCount: 0,
          filteredCount: 0,
          error: error.message,
          category: businessCategory?.id || null,
          topExcludedReason: null
        };
        setDebugInfo(debugData);
      } finally {
        setLoadingNearby(false);
      }
    };

    fetchNearbyCompetitors();
  }, [businessPlaceId, selectedRadius, businessCategory?.id]);

  const processedCompetitors = useMemo(() => {
    return sortCompetitors(nearbyCompetitors, competitorSort);
  }, [nearbyCompetitors, competitorSort]);

  const mainCompetitor = useMemo(() => {
    return findMainCompetitor(processedCompetitors);
  }, [processedCompetitors]);

  const topRatedCompetitor = useMemo(() => {
    const withRating = processedCompetitors.filter(c => c.rating);
    if (withRating.length === 0) return null;
    return withRating.reduce((max, c) => c.rating > (max?.rating || 0) ? c : max, null);
  }, [processedCompetitors]);

  // Handle query table interactions
  const handleIntentClick = (intent) => {
    setFilter(intent.toLowerCase().replace(/\s+/g, '_'));
    setShowQueries(true);
    setTimeout(() => {
      const queriesSection = document.querySelector('[data-section="queries"]');
      if (queriesSection) {
        queriesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const filteredQueries = useMemo(() => {
    let filtered = queries;

    if (filter && filter !== 'all') {
      if (filter === 'top3') {
        filtered = filtered.filter(q => q.mentioned && q.rank && q.rank <= 3);
      } else if (filter === 'weak_missing') {
        filtered = filtered.filter(q => !q.mentioned || !q.rank || q.rank > 3);
      } else if (filter === 'weak') {
        filtered = filtered.filter(q => q.mentioned && q.rank && q.rank > 3);
      } else if (filter === 'missing') {
        filtered = filtered.filter(q => !q.mentioned);
      } else {
        filtered = filtered.filter(q => q.intent && q.intent.toLowerCase().replace(/\s+/g, '_') === filter);
      }
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      filtered = filtered.filter(q => 
        q.query?.toLowerCase().includes(term) || 
        q.reason?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [queries, filter, search]);

  const toggleRow = (index) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const handleCopyQuery = (query) => {
    copyText(query);
    toast.success('Query copied!');
  };

  if (!hasData) {
    return <GEOExplainUnavailableBanner onRegenerate={onRegenerate} isRegenerating={isRegenerating} />;
  }

  // v3: Component-based GEO scoring + queries + entity authority (unified GEO v2/v3/v4)
  if (isV3) {
    const components = explain.components || [];
    const recs = explain.optimizationRecommendations || [];
    const defs = explain.deficiencies || [];
    const v3Queries = explain.queries || [];
    const topCompetitors = explain.topCompetitorsMentioned || [];
    const BUCKET_LABELS = { near_me: 'Near Me', best: 'Best/Top', service: 'Service', trust: 'Trust', recommendation: 'Recommendation' };
    return (
      <div className="space-y-6">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-8">
            <div className="mb-6">
              <div className="flex items-start justify-between gap-8">
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold text-slate-900 leading-relaxed mb-3">
                    {explain.explanation || `GEO Score: ${explain.geoScore}/100 (Grade ${explain.grade})`}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>{industry}</span>
                    <span>•</span>
                    <span>{location}</span>
                    <span>•</span>
                    <Badge variant={explain.grade === 'A' ? 'default' : explain.grade === 'B' ? 'secondary' : 'outline'}>
                      Grade {explain.grade}
                    </Badge>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-4xl font-bold text-slate-900 mb-0.5">{score ?? explain.geoScore ?? '—'}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">GEO Score</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GEO v5 — AI Discovery & Revenue Opportunity */}
        {explain?.opportunity && (
          <Card className="border border-indigo-200 bg-indigo-50/30">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                AI Discovery Opportunity (GEO v5)
              </h3>
              <p className="text-sm text-slate-600 mb-4">{explain.opportunity.opportunityExplanation}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {explain.opportunity.potentialAIVisitsLost > 0 && (
                  <div className="p-3 rounded-lg bg-white/80">
                    <div className="text-slate-500 text-xs uppercase">Potential visits lost/mo</div>
                    <div className="font-semibold text-slate-900">{explain.opportunity.potentialAIVisitsLost}</div>
                  </div>
                )}
                {explain.opportunity.potentialCustomersLost > 0 && (
                  <div className="p-3 rounded-lg bg-white/80">
                    <div className="text-slate-500 text-xs uppercase">Potential customers lost/mo</div>
                    <div className="font-semibold text-slate-900">{explain.opportunity.potentialCustomersLost}</div>
                  </div>
                )}
                {explain.opportunity.monthlyRevenueOpportunity > 0 && (
                  <div className="p-3 rounded-lg bg-white/80">
                    <div className="text-slate-500 text-xs uppercase">Monthly revenue opportunity</div>
                    <div className="font-semibold text-slate-900">
                      ${explain.opportunity.monthlyRevenueOpportunity.toLocaleString()}
                    </div>
                  </div>
                )}
                {explain.opportunity.opportunityScore > 0 && (
                  <div className="p-3 rounded-lg bg-white/80">
                    <div className="text-slate-500 text-xs uppercase">Opportunity score</div>
                    <div className="font-semibold text-slate-900">{explain.opportunity.opportunityScore}/100</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* v3: Insights from scan - recommendations and gaps */}
        <Card className="border border-slate-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Insights from AI Analysis</h3>
            <p className="text-sm text-slate-600 mb-4">
              This scan uses component-based scoring (Authority, Content, Reviews, etc.). Below are the recommendations and gaps identified.
            </p>
            <div className="space-y-3">
              {recs.map((r, i) => (
                <div key={`rec-${i}`} className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-start gap-3 min-w-0">
                  <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-slate-900 break-words min-w-0">{r}</span>
                </div>
              ))}
              {defs.map((d, i) => (
                <div key={`def-${i}`} className="p-3 rounded-lg bg-amber-50 border border-amber-100 flex items-start gap-3 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-amber-900 break-words min-w-0">{d}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
          <Card className="border border-slate-200 min-w-0 overflow-hidden">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Score Breakdown</h3>
              <div className="space-y-3">
                {components.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <span className="text-sm font-medium text-slate-700">{c.name}</span>
                    <span className="font-semibold text-slate-900">{c.score}/{c.max}</span>
                  </div>
                ))}
              </div>
              {/* Entity Authority (v4) metrics when present */}
              {(explain.entityStrengthScore != null || explain.aiMentionProbability != null) && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                  {explain.entityStrengthScore != null && (
                    <div className="flex justify-between p-2 rounded bg-slate-50">
                      <span className="text-sm text-slate-600">Entity strength</span>
                      <span className="font-semibold">{explain.entityStrengthScore}/20</span>
                    </div>
                  )}
                  {explain.aiMentionProbability != null && (
                    <div className="flex justify-between p-2 rounded bg-slate-50">
                      <span className="text-sm text-slate-600">AI mention probability</span>
                      <span className="font-semibold">{explain.aiMentionProbability}%</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border border-slate-200 min-w-0 overflow-hidden">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Optimization Recommendations</h3>
              <ul className="space-y-2">
                {recs.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700 break-words min-w-0">
                    <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    <span className="min-w-0">{r}</span>
                  </li>
                ))}
              </ul>
              {defs.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold text-slate-700 mt-4 mb-2">Gaps to address</h4>
                  <ul className="space-y-1 text-sm text-amber-700">
                    {defs.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 break-words min-w-0">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="min-w-0">{d}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {topCompetitors.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold text-slate-700 mt-4 mb-2">Likely competitors mentioned</h4>
                  <div className="flex flex-wrap gap-2">
                    {topCompetitors.map((c, i) => (
                      <span key={i} className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700">{c}</span>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Query Simulation (v2) - when queries exist */}
        {v3Queries.length > 0 && (
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-bold text-slate-900">AI Query Simulation</h3>
              </div>
              <div className="flex flex-wrap gap-2 mb-4 text-sm">
                <span className="rounded bg-slate-100 px-2 py-1">Tested: {explain.queriesTested ?? v3Queries.length}</span>
                <span className="rounded bg-slate-100 px-2 py-1">Mentioned: {explain.mentionsDetected ?? v3Queries.filter(q => q.mentioned).length}</span>
                {explain.averagePosition != null && (
                  <span className="rounded bg-slate-100 px-2 py-1">Avg position: {Number(explain.averagePosition).toFixed(1)}</span>
                )}
                {explain.aiVisibilityProbability != null && (
                  <span className="rounded bg-slate-100 px-2 py-1">Visibility: {Math.round(explain.aiVisibilityProbability)}%</span>
                )}
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {v3Queries.map((q, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${q.mentioned ? 'border-green-200 bg-green-50/50' : 'border-slate-200 bg-slate-50'}`}
                  >
                    {q.mentioned ? (
                      <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border-2 border-red-300 shrink-0 mt-0.5 inline-block" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">&ldquo;{q.query ?? ''}&rdquo;</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{BUCKET_LABELS[q.bucket] || q.bucket || '—'}</span>
                        {q.rank != null && <span>Rank #{q.rank}</span>}
                        {q.reason && <span>— {q.reason}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PRIMARY INSIGHT - Hero Section */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-8">
          <div className="mb-6">
            <div className="flex items-start justify-between gap-8">
              <div className="flex-1">
                {/* Main insight - one decisive sentence */}
                <h2 className="text-2xl font-semibold text-slate-900 leading-relaxed mb-3">
                  {executiveSummary.text}
                </h2>
                
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>{industry}</span>
                  <span>•</span>
                  <span>{location}</span>
                  <span>•</span>
                  <span>{queries.length} queries analyzed</span>
                </div>
              </div>
              
              {/* Score - supporting detail, not dominant */}
              <div className="text-right flex-shrink-0">
                <div className="text-4xl font-bold text-slate-900 mb-0.5">
                  {score ?? '—'}
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">
                  GEO Score
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QUERY TABLE - Queries run in scan and how they ranked (shown by default) */}
      <Card className="border border-slate-200" data-section="queries">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Queries Tested & Rankings</h3>
              <p className="text-sm text-slate-600">{queries.length} AI search queries run in this scan</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowQueries(!showQueries)}
            >
              {showQueries ? 'Hide' : 'Show'} Details
              {showQueries ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </Button>
          </div>

          {showQueries && (
            <>
              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'top3', label: 'Top 3' },
                  { id: 'weak_missing', label: 'Weak + Missing' },
                  { id: 'weak', label: 'Weak' },
                  { id: 'missing', label: 'Missing' }
                ].map(f => (
                  <Button
                    key={f.id}
                    size="sm"
                    variant={filter === f.id ? "default" : "outline"}
                    onClick={() => setFilter(f.id)}
                    className="text-xs"
                  >
                    {f.label}
                  </Button>
                ))}
              </div>

              {/* Query list with query text and rank */}
              <div className="space-y-2">
                {filteredQueries.map((q, idx) => (
                  <div 
                    key={idx}
                    className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                    onClick={() => toggleRow(idx)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-medium text-slate-900">{q.query}</span>
                          {q.mentioned && q.rank != null && (
                            <Badge variant={q.rank <= 3 ? "default" : "secondary"} className="text-xs">
                              Rank #{q.rank}
                            </Badge>
                          )}
                          {!q.mentioned && (
                            <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                              Not mentioned
                            </Badge>
                          )}
                        </div>
                        {expandedRows.has(idx) && q.reason && (
                          <p className="text-xs text-slate-600 mt-2">{q.reason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyQuery(q.query);
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        {expandedRows.has(idx) ? 
                          <ChevronUp className="w-4 h-4 text-slate-400" /> : 
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* TWO-COLUMN LAYOUT: Strengths + Weakness */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* LEFT: Where You're Winning */}
        <Card className="border border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Where You're Winning</h3>
            </div>
            
            <div className="space-y-3">
              {Object.entries(drivers)
                .filter(([_, pts]) => pts > 30) // Only show strong categories
                .map(([label, pts]) => {
                  const driverStats = getDriverStats(queries, label);
                  const businessLabel = {
                    'NEAR ME': 'Near Me',
                    'BEST/TOP': 'Best / Top',
                    'SERVICE': 'Service',
                    'TRUST': 'Trust'
                  }[label] || label;
                  
                  const isStrong = driverStats.mentions === driverStats.total;
                  const isPerfect = isStrong && driverStats.avgRank === 1;
                  
                  // Verdict line
                  let verdict = '';
                  if (isPerfect) {
                    verdict = 'Dominant presence — customers see you first.';
                  } else if (isStrong) {
                    verdict = 'Appearing consistently in these searches.';
                  } else if (driverStats.mentions > driverStats.total / 2) {
                    verdict = 'Strong presence, room to improve rankings.';
                  } else {
                    verdict = 'Moderate visibility — opportunity to climb.';
                  }
                  
                  return (
                    <div key={label} className="p-3 rounded-lg bg-green-50/50 border border-green-100">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                        <span className="text-sm font-semibold text-slate-900">{businessLabel}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed pl-5">
                        {verdict}
                      </p>
                    </div>
                  );
                })}
            </div>
            
            {Object.entries(drivers).filter(([_, pts]) => pts > 30).length === 0 && (
              <p className="text-sm text-slate-600 italic">
                Building presence across all categories...
              </p>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-4 text-slate-600 hover:text-slate-900"
              onClick={() => setShowInsights(!showInsights)}
            >
              {showInsights ? 'Hide' : 'View'} Full Breakdown
              {showInsights ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </Button>
          </CardContent>
        </Card>

        {/* RIGHT: Primary Growth Opportunity */}
        {weakest && (
          <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Target className="w-4 h-4 text-amber-700" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Primary Growth Lever</h3>
              </div>
              
              <div className="mb-4">
                <div className="mb-3">
                  <Badge className="bg-amber-600 text-white mb-2">
                    {formatIntent(weakest.key)}
                  </Badge>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {weakest.data.mentions === 0 ? (
                      <>Competitors dominate these searches — you're not appearing at all.</>
                    ) : weakest.data.top3 < weakest.data.tested ? (
                      <>Competitors appear before you in {weakest.data.tested - weakest.data.top3} of {weakest.data.tested} searches.</>
                    ) : (
                      <>Solid presence, but competitors still rank higher on average.</>
                    )}
                  </p>
                </div>
                
                {/* Impact - softer language */}
                <div className="p-3 bg-white/70 rounded-lg mb-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {weakest.data.mentions === 0 ? (
                      <>This is likely your biggest source of lost customers.</>
                    ) : weakest.data.top3 < weakest.data.tested ? (
                      <>These searches represent significant missed exposure.</>
                    ) : (
                      <>Small improvements here could make a meaningful difference.</>
                    )}
                  </p>
                </div>
              </div>
              
              {/* Lift potential - more narrative */}
              {lift.max > 0 && (
                <div className="p-3 bg-white/90 rounded-lg border border-amber-200 mb-4">
                  <div className="text-sm text-slate-700">
                    <span className="text-slate-600">Improving this area could add </span>
                    <span className="font-semibold text-green-700">+{lift.min}–{lift.max} points</span>
                    <span className="text-slate-600"> to your score.</span>
                  </div>
                </div>
              )}
              
              <Button 
                onClick={() => handleIntentClick(weakest.key)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                size="sm"
              >
                Fix {formatIntent(weakest.key)} Visibility
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed breakdown - Collapsed by default */}
      {showInsights && stats.buckets && Object.keys(stats.buckets).length > 0 && (
        <Card className="border border-slate-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Category Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(stats.buckets).map(([key, data]) => {
                const isWeakest = weakest?.key === key;
                const missedTop3 = data.tested - data.top3;
                const avgRank = data.avgRankMentioned ? Math.round(data.avgRankMentioned) : null;
                
                // Verdict line for each category
                let verdict = '';
                if (data.mentions === 0) {
                  verdict = 'Not appearing — primary growth opportunity.';
                } else if (data.mentions === data.tested && data.top3 === data.tested) {
                  verdict = 'Strong and stable — maintain this position.';
                } else if (missedTop3 > data.tested / 2) {
                  verdict = 'Solid, but room to push into Top 3.';
                } else if (data.mentions < data.tested / 2) {
                  verdict = 'Inconsistent presence — needs attention.';
                } else {
                  verdict = 'Good foundation — optimize for higher rankings.';
                }
                
                return (
                  <div 
                    key={key} 
                    className={`p-4 rounded-lg border ${
                      isWeakest 
                        ? 'border-amber-300 bg-amber-50/50' 
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-900">{formatIntent(key)}</span>
                      {isWeakest && (
                        <Badge className="text-xs bg-amber-600 text-white">Focus</Badge>
                      )}
                    </div>
                    
                    <div className="text-xl font-semibold text-slate-900 mb-2">
                      {avgRank ? `Position #${avgRank}` : 'Not ranking'}
                    </div>
                    
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {verdict}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* COMPETITORS - Lead with closest threat */}
      {processedCompetitors.length > 0 && (
        <Card className="border border-slate-200">
          <CardContent className="p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-slate-700" />
                <h3 className="text-lg font-semibold text-slate-900">Local Competition</h3>
              </div>
              
              {mainCompetitor && (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 mb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 mb-2">{mainCompetitor.name}</div>
                      <p className="text-sm text-slate-600 mb-2">
                        Located {formatDistanceMiles(mainCompetitor.distanceMeters)} away
                        {mainCompetitor.rating && (
                          <>
                            {' • '}
                            {mainCompetitor.rating.toFixed(1)} <Star className="w-3 h-3 inline" /> rating
                            {mainCompetitor.userRatingsTotal && (
                              <> ({formatReviewCount(mainCompetitor.userRatingsTotal)} reviews)</>
                            )}
                          </>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {mainCompetitor.rating && mainCompetitor.rating > 4.5 ? (
                          <>Highly rated competitor appearing in local searches.</>
                        ) : mainCompetitor.distanceMeters < 805 ? (
                          <>Very close proximity — likely competing for same customers.</>
                        ) : (
                          <>Most relevant nearby competitor in your category.</>
                        )}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(`https://www.google.com/maps/place/?q=place_id:${mainCompetitor.placeId}`, '_blank')}
                    >
                      View
                    </Button>
                  </div>
                </div>
              )}
              
              {processedCompetitors.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowCompetitors(!showCompetitors)}
                  className="text-slate-600"
                >
                  {showCompetitors ? 'Hide' : 'View'} {processedCompetitors.length - 1} More Competitors
                  {showCompetitors ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                </Button>
              )}
            </div>

            {showCompetitors && processedCompetitors.length > 1 && (
              <div className="space-y-2 pt-3 border-t border-slate-200">
                {processedCompetitors.slice(1, 10).map((comp, idx) => (
                  <div 
                    key={comp.placeId || idx} 
                    className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 text-sm mb-1">{comp.name}</div>
                      <div className="flex items-center gap-3 text-xs text-slate-600">
                        <span>{formatDistanceMiles(comp.distanceMeters)}</span>
                        {comp.rating && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            {comp.rating.toFixed(1)}
                          </span>
                        )}
                        {comp.userRatingsTotal && (
                          <span>({formatReviewCount(comp.userRatingsTotal)})</span>
                        )}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => window.open(`https://www.google.com/maps/place/?q=place_id:${comp.placeId}`, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Button
        onClick={() => { window.location.href = createPageUrl('GetSupport') + '?book=1'; }}
        className="w-full mt-4 h-14 bg-theme-gradient text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
      >
        <Phone className="w-6 h-6" />
        Book a Call
      </Button>

      {/* ACTION-DRIVEN ENDING - Single Strong CTA */}
      {weakest && plan && plan.tasks && plan.tasks.length > 0 && (
        <Card className="border-0 bg-theme-gradient text-white shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold mb-2">
                Ready to Improve {formatIntent(weakest.key)} Visibility?
              </h3>
              <p className="text-indigo-100 text-sm">
                We've identified specific actions that can help you rank higher in these searches.
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-3">
              <Button 
                size="lg"
                variant="secondary"
                onClick={() => handleIntentClick(weakest.key)}
                className="bg-white text-slate-900 hover:bg-slate-50 font-semibold"
              >
                Generate Improvement Plan
              </Button>
              <Button 
                size="lg"
                variant="ghost"
                onClick={() => setShowPlan(!showPlan)}
                className="text-white border-white/30 hover:bg-white/10"
              >
                {showPlan ? 'Hide' : 'View'} Quick Wins
              </Button>
            </div>

            {showPlan && (
              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="space-y-2">
                  {plan.tasks.slice(0, 3).map((task, idx) => (
                    <div key={idx} className="p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 text-white font-semibold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-white">{task.task}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs text-indigo-200 bg-white/10 px-2 py-0.5 rounded">{task.priority}</span>
                            <span className="text-xs text-indigo-200">{task.impact}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dev debug panel */}
      {import.meta.env.DEV && showDebug && (
        <Card className="border border-slate-300 bg-slate-50">
          <CardContent className="p-4 text-xs font-mono text-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold">DEV DEBUG</span>
              <Button size="sm" variant="ghost" onClick={() => setShowDebug(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-1">
              <p><strong>PlaceId:</strong> {debugInfo.placeId || 'N/A'}</p>
              <p><strong>Request:</strong> {debugInfo.requestUrl || 'N/A'}</p>
              <p><strong>Status:</strong> {debugInfo.responseStatus || 'N/A'}</p>
              <p><strong>Competitors:</strong> {debugInfo.rawCount} raw → {debugInfo.filteredCount} filtered</p>
              <p><strong>Category:</strong> {debugInfo.category || 'N/A'}</p>
              {debugInfo.error && <p className="text-red-600"><strong>Error:</strong> {debugInfo.error}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {import.meta.env.DEV && !showDebug && (
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={() => setShowDebug(true)} className="text-xs text-slate-400">
            Show Debug
          </Button>
        </div>
      )}
    </div>
  );
}
