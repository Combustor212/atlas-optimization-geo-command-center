
import React, { useState, useEffect, useRef } from 'react';
import { VisibilityCheck } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Search, Building, Check, Info, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// Removed: CircularProgress, CategoryScoreCard, InsightCard, RecommendedActions components
// as their functionality is now integrated directly into this component.

export default function AIVisibility() {
  const [businessName, setBusinessName] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [checks, setChecks] = useState([]);

  const debounceTimer = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadChecks();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadChecks = async () => {
    try {
      const fetchedChecks = await VisibilityCheck.list('-occurredAt', 20);
      setChecks(fetchedChecks || []);
    } catch (error) {
      console.error('Error loading checks:', error);
      setChecks([]);
    }
  };

  const fetchSuggestions = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      setError(null);

      try {
        const response = await fetch('/functions/placesAutocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: query })
        });

        const data = await response.json();

        if (data.error) {
          setError('⚠️ ' + data.error);
          setSuggestions([]);
          setShowDropdown(false);
        } else {
          const predictions = data.predictions || [];
          setSuggestions(predictions);
          setShowDropdown(predictions.length > 0);
        }
      } catch (err) {
        console.error('Autocomplete error:', err);
        setSuggestions([]);
        setShowDropdown(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 400);
  };

  const handleBusinessNameChange = (value) => {
    setBusinessName(value);
    setSelectedPlaceId(null);
    setSelectedBusiness(null);
    setError(null);
    fetchSuggestions(value);
  };

  const handleSelectPrediction = async (prediction) => {
    const placeId = prediction.place_id;
    const displayName = prediction.displayName ?? prediction.structured_formatting?.main_text ?? prediction.description ?? '';

    if (!placeId) return;

    if (selectedPlaceId === placeId) return;

    setBusinessName(displayName);
    setSelectedPlaceId(placeId);
    setShowDropdown(false);
    setSuggestions([]);
    setError(null);
    setIsLoadingDetails(true);

    try {
      const response = await fetch('/functions/placesDetails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: placeId })
      });

      const data = await response.json();

      if (data.status !== 'OK' || !data.result) {
        throw new Error(data.error || 'Could not fetch place details');
      }

      const result = data.result;
      const formattedAddress = prediction.formattedAddress ?? prediction.structured_formatting?.secondary_text ?? '';

      const businessData = {
        name: result.name || displayName,
        address: result.address || formattedAddress,
        city: result.components?.city || '',
        state: result.components?.state || '',
        country: result.components?.country || '',
        website: result.website || '',
        category: result.category || 'business',
        place_id: placeId
      };

      setSelectedBusiness(businessData);
    } catch (err) {
      console.error('Error fetching place details:', err);
      setError('⚠️ Could not fetch place details. Please select again from Google dropdown.');
      setSelectedPlaceId(null);
      setSelectedBusiness(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleRunScan = async () => {
    if (!selectedPlaceId || !selectedBusiness) {
      setError('❌ Please select a business from the Google Places dropdown to continue.');
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      console.log("🚀 Starting scan with business data:", selectedBusiness);

      const { geoProfileScan } = await import('@/api/functions');
      const data = await geoProfileScan({
        place_id: selectedBusiness.place_id,
        business_name: selectedBusiness.name,
        city: selectedBusiness.city,
        state: selectedBusiness.state
      });
      console.log("📊 Scan result:", data);

      // Always set structured result
      setScanResult({
        business: data.business || selectedBusiness.name,
        city: data.city || selectedBusiness.city,
        state: data.state || selectedBusiness.state,
        geo_score: data.geo_score || 0,
        subscores: data.subscores || {
          coverage: 0,
          authority: 0,
          relevance: 0,
          consistency: 0,
          ai_content: 0
        },
        ai_mentions: data.ai_mentions || [],
        total_mentions: data.total_mentions || 0,
        highest_rank: data.highest_rank || null,
        insights: (data.insights || []).map(insight => {
          if (typeof insight === 'object') return insight;

          let type = 'info';
          if (insight.includes('✅')) type = 'success';
          else if (insight.includes('❌')) type = 'urgent';
          else if (insight.includes('⚠️')) type = 'warning';

          return {
            type: type,
            headline: insight.replace(/[✅⚠️❌]/g, '').trim(),
            description: ''
          };
        }),
        actions: (data.actions || []).map(action => {
          if (typeof action === 'string') {
            return { task: action, impact: 'medium', effort: 'medium' };
          }
          return action;
        })
      });

      // Save to database
      try {
        await VisibilityCheck.create({
          businessId: selectedBusiness.place_id,
          question: `AI Visibility Scan for ${selectedBusiness.name}`,
          summary: `Score: ${data.geo_score || 0}/100`,
          score: data.geo_score || 0,
          occurredAt: new Date().toISOString()
        });
        loadChecks();
      } catch (dbError) {
        console.error('Failed to save scan:', dbError);
      }

    } catch (err) {
      console.error('Scan error:', err);

      // Even on error, show structured data
      setScanResult({
        business: selectedBusiness.name,
        city: selectedBusiness.city,
        state: selectedBusiness.state,
        geo_score: 0,
        subscores: {
          coverage: 0,
          authority: 0,
          relevance: 0,
          consistency: 0,
          ai_content: 0
        },
        ai_mentions: [],
        total_mentions: 0,
        highest_rank: null,
        insights: [{
          type: 'urgent',
          headline: 'Network error occurred. Please check your connection and try again.',
          description: ''
        }],
        actions: []
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    setBusinessName('');
    setSuggestions([]);
    setShowDropdown(false);
    setSelectedPlaceId(null);
    setSelectedBusiness(null);
    setScanResult(null);
    setError(null);
  };

  // RESULT VIEW - REDESIGNED AS MODERN SAAS DASHBOARD
  if (scanResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-purple-50/20">
        <div className="max-w-7xl mx-auto p-6 space-y-6">

          {/* HEADER SECTION - Modern Stats Overview */}
          <Card className="border-0 shadow-xl bg-white overflow-hidden">
            <CardContent className="p-8">
              {/* Business Info Row */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900">{scanResult.business}</h1>
                      {scanResult.city && scanResult.state && (
                        <p className="text-slate-500 text-sm mt-0.5">📍 {scanResult.city}, {scanResult.state}</p>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="border-slate-300 hover:bg-slate-50"
                >
                  <Search className="w-4 h-4 mr-2" />
                  New Scan
                </Button>
              </div>

              {/* Score Bar - Horizontal with gradient */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700">AI Visibility Score</h3>
                  <span className="text-2xl font-bold text-slate-900">{scanResult.geo_score}<span className="text-base text-slate-500">/100</span></span>
                </div>
                <div className="relative h-8 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 flex items-center justify-end pr-4",
                      scanResult.geo_score >= 80 ? "bg-gradient-to-r from-green-500 to-emerald-500" :
                      scanResult.geo_score >= 60 ? "bg-gradient-to-r from-amber-500 to-orange-500" :
                      "bg-gradient-to-r from-red-500 to-pink-500"
                    )}
                    style={{ width: `${scanResult.geo_score}%` }}
                  >
                    {scanResult.geo_score > 15 && (
                      <span className="text-white text-xs font-bold">{scanResult.geo_score}%</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium">AI Mentions</p>
                      <p className="text-2xl font-bold text-slate-900">{scanResult.total_mentions}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">#{scanResult.highest_rank || 'N/A'}</span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium">Best Rank</p>
                      <p className="text-2xl font-bold text-slate-900">{scanResult.highest_rank ? `#${scanResult.highest_rank}` : 'Not Ranked'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium">Status</p>
                      <p className="text-lg font-bold text-slate-900">
                        {scanResult.geo_score >= 80 ? 'Excellent' :
                         scanResult.geo_score >= 60 ? 'Good' : 'Needs Work'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SCORE BREAKDOWN - Moved above query results */}
          {scanResult.subscores && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Performance Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-blue-50 hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
                          <span className="text-xl">📊</span>
                        </div>
                        <h3 className="font-bold text-slate-900">Coverage</h3>
                      </div>
                      <span className="text-2xl font-bold text-indigo-600">{scanResult.subscores.coverage}</span>
                    </div>
                    <div className="relative h-2 bg-white/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-700"
                        style={{ width: `${scanResult.subscores.coverage}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-2">How often you appear in AI results</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                          <span className="text-xl">🏆</span>
                        </div>
                        <h3 className="font-bold text-slate-900">Authority</h3>
                      </div>
                      <span className="text-2xl font-bold text-purple-600">{scanResult.subscores.authority}</span>
                    </div>
                    <div className="relative h-2 bg-white/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-700"
                        style={{ width: `${scanResult.subscores.authority}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-2">Your ranking position when you appear</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50 hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                          <span className="text-xl">🎯</span>
                        </div>
                        <h3 className="font-bold text-slate-900">Relevance</h3>
                      </div>
                      <span className="text-2xl font-bold text-blue-600">{scanResult.subscores.relevance}</span>
                    </div>
                    <div className="relative h-2 bg-white/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700"
                        style={{ width: `${scanResult.subscores.relevance}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-2">AI confidence in recommending you</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                          <span className="text-xl">✅</span>
                        </div>
                        <h3 className="font-bold text-slate-900">Consistency</h3>
                      </div>
                      <span className="text-2xl font-bold text-amber-600">{scanResult.subscores.consistency}</span>
                    </div>
                    <div className="relative h-2 bg-white/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-700"
                        style={{ width: `${scanResult.subscores.consistency}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-2">How consistently you appear</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                          <span className="text-xl">📝</span>
                        </div>
                        <h3 className="font-bold text-slate-900">AI Content</h3>
                      </div>
                      <span className="text-2xl font-bold text-green-600">{scanResult.subscores.ai_content}</span>
                    </div>
                    <div className="relative h-2 bg-white/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-700"
                        style={{ width: `${scanResult.subscores.ai_content}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-2">Quality of AI-found information</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* KEY INSIGHTS - Colored alert cards */}
          {scanResult.insights && scanResult.insights.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Key Insights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scanResult.insights.map((insight, idx) => {
                  const config = {
                    success: {
                      bg: "bg-gradient-to-r from-green-50 to-emerald-50",
                      border: "border-green-200",
                      Icon: CheckCircle2,
                      iconBg: "bg-green-500",
                      textColor: "text-green-900"
                    },
                    warning: {
                      bg: "bg-gradient-to-r from-amber-50 to-orange-50",
                      border: "border-amber-200",
                      Icon: AlertTriangle,
                      iconBg: "bg-amber-500",
                      textColor: "text-amber-900"
                    },
                    urgent: {
                      bg: "bg-gradient-to-r from-red-50 to-pink-50",
                      border: "border-red-200",
                      Icon: AlertTriangle,
                      iconBg: "bg-red-500",
                      textColor: "text-red-900"
                    },
                    info: {
                      bg: "bg-gradient-to-r from-blue-50 to-indigo-50",
                      border: "border-blue-200",
                      Icon: TrendingUp,
                      iconBg: "bg-blue-500",
                      textColor: "text-blue-900"
                    }
                  };

                  const insightConfig = config[insight.type] || config.info;
                  const InsightIcon = insightConfig.Icon;

                  return (
                    <Card key={idx} className={cn("border-2 shadow-lg", insightConfig.bg, insightConfig.border)}>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", insightConfig.iconBg)}>
                            <InsightIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className={cn("font-bold mb-1", insightConfig.textColor)}>
                              {insight.headline}
                            </h4>
                            {insight.description && (
                              <p className="text-sm text-slate-600">{insight.description}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* RECOMMENDED ACTIONS - Card grid with impact badges */}
          {scanResult.actions && scanResult.actions.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Recommended Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scanResult.actions.map((action, idx) => {
                  const impactConfig = {
                    high: { badge: "bg-red-100 text-red-700 border-red-200", label: "High Impact" },
                    medium: { badge: "bg-amber-100 text-amber-700 border-amber-200", label: "Medium Impact" },
                    low: { badge: "bg-green-100 text-green-700 border-green-200", label: "Low Impact" }
                  };

                  const config = impactConfig[action.impact] || impactConfig.medium;

                  return (
                    <Card key={idx} className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <Badge className={cn("text-xs font-semibold", config.badge)}>
                            {config.label}
                          </Badge>
                          <span className="text-xs text-slate-500">{action.effort} effort</span>
                        </div>
                        <p className="text-sm text-slate-700 font-medium">{action.task || action}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI SEARCH QUERY RESULTS - Collapsible dropdown */}
          {scanResult.ai_mentions && scanResult.ai_mentions.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer list-none">
                <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white">
                  <CardHeader className="flex flex-row items-center justify-between py-5 px-6"> {/* Added padding */}
                    <div>
                      <CardTitle className="text-xl text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        AI Search Query Results
                      </CardTitle>
                      <p className="text-sm text-slate-600 mt-1">
                        View detailed results for each AI search query ({scanResult.total_mentions} mentions found)
                      </p>
                    </div>
                    <div className="text-slate-400 group-open:rotate-180 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </CardHeader>
                </Card>
              </summary>

              <div className="mt-4 space-y-3">
                {scanResult.ai_mentions.map((mention, idx) => (
                  <Card key={idx} className="border-0 shadow-md hover:shadow-lg transition-shadow bg-white">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {mention.rank ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Appears
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 border-red-200 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Not Found
                              </Badge>
                            )}
                            {mention.rank && (
                              <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
                                Rank #{mention.rank}
                              </Badge>
                            )}
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                              {mention.confidence}% confidence
                            </Badge>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mb-2">{mention.query}</h4>
                          <p className="text-sm text-slate-600">{mention.snippet}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }

  // INPUT VIEW
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          AI Visibility Scanner
        </h1>
        <p className="text-slate-600 mt-2 text-lg">
          Analyze your business presence and visibility in AI-powered search engines
        </p>
      </div>

      {/* Scanner Form */}
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
            <Search className="w-6 h-6 text-indigo-600" />
            Search Business
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">Start typing to search Google Places</p>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          {/* Business Name with Autocomplete */}
          <div className="relative">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Building className="w-4 h-4 inline mr-1" />
              Business Name *
            </label>
            <Input
              ref={inputRef}
              value={businessName}
              onChange={(e) => handleBusinessNameChange(e.target.value)}
              placeholder="Enter business name..."
              className="w-full h-12 text-base border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
            />
            <p className="text-xs text-slate-500 mt-1">
              {selectedPlaceId ? (
                <span className="flex items-center gap-1 text-green-600">
                  <Check className="w-3 h-3" />
                  Business selected from Google Places
                </span>
              ) : 'Required - Select from dropdown'}
            </p>

            {(isLoadingSuggestions || isLoadingDetails) && (
              <div className="absolute right-3 top-[46px]">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              </div>
            )}
            {isLoadingDetails && (
              <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading details…
              </p>
            )}

            {showDropdown && suggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-[99999] w-full mt-2 bg-white border-2 border-indigo-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto"
              >
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleSelectPrediction(item);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-indigo-50 active:bg-indigo-100 transition-colors border-b border-slate-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl"
                  >
                    <div className="font-semibold text-sm text-slate-900">
                      {item.displayName ?? item.structured_formatting?.main_text ?? item.description}
                    </div>
                    {(item.formattedAddress ?? item.structured_formatting?.secondary_text) && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {item.formattedAddress ?? item.structured_formatting?.secondary_text}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          {!selectedPlaceId && businessName && !error && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-blue-900">Select from Dropdown</p>
                <p className="text-sm text-blue-700 mt-1">
                  Please select your business from the Google Places dropdown that appears as you type.
                </p>
              </div>
            </div>
          )}

          {/* Success Box */}
          {selectedBusiness && (
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 flex items-start gap-3">
              <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-green-900">Business Confirmed</p>
                <p className="text-sm text-green-700 mt-1">
                  Ready to analyze AI visibility for: {selectedBusiness.name}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {selectedBusiness.city}, {selectedBusiness.state}
                </p>
              </div>
            </div>
          )}

          {/* Error Box */}
          {error && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-900">{error}</p>
              </div>
            </div>
          )}

          <Button
            onClick={handleRunScan}
            disabled={isScanning || isLoadingDetails || !selectedPlaceId || !selectedBusiness}
            className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold py-4 text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing AI visibility...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Run AI Visibility Scan
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Checks */}
      {checks.length > 0 && (
        <Card className="bg-white shadow-lg border-slate-200">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg font-bold text-slate-900">Recent Scans</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {checks.slice(0, 5).map((check) => (
                <div key={check.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{check.question}</p>
                    <p className="text-xs text-slate-500 mt-1">{check.summary}</p>
                  </div>
                  <Badge className={
                    check.score >= 80 ? "bg-green-100 text-green-700 border-green-200" :
                    check.score >= 60 ? "bg-amber-100 text-amber-700 border-amber-200" :
                    "bg-red-100 text-red-700 border-red-200"
                  }>
                    {check.score}/100
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
