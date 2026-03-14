import React, { useState, useEffect, useRef } from 'react';
import { getActiveGradient } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ScanResult } from '@/api/entities';
import {
  RotateCcw,
  Lightbulb,
  Star,
  Globe,
  MapPin,
  Loader2,
  Target,
  Settings,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Zap,
  Calendar,
  Image,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Users,
  Building,
  Check,
  Search,
  Brain,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Phone,
  Link2,
  HelpCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import AGSLogo from '../components/AGSLogo';
import CircularProgress from '../components/CircularProgress';
import ShareButton from '../components/ShareButton';
import MEOScoreWhyPanel from '../components/MEOScoreWhyPanel';
import GEOWhyPanel from '../components/GEOWhyPanel';
import GEOStatusCard from '../components/GEOStatusCard';
import GEOGeneratingPlaceholder from '../components/GEOGeneratingPlaceholder';
import GEOLimitedPresencePanel from '../components/GEOLimitedPresencePanel';
import { useGEOExplainPolling } from '../hooks/useGEOExplainPolling';
import { diagnosePollState, DiagnosisCodes } from '../utils/geoPollDiagnostics';
import { buildApiUrl, getGeoCommandCenterUrl } from '../config/api';
import { pollForGEOExplain } from '../utils/pollForGEOExplain';
import { SendEmail } from '@/api/integrations';

const SCAN_PENDING_KEY = 'scanPending';

const AnimatedCounter = ({ value, duration = 2000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      setCount(Math.floor(value * percentage));
      if (percentage < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{count}</span>;
};

/** Premium locked section — centered overlay card, blurred content visible behind. When isAdminView, shows content unblurred. */
const BlurredUnlockSection = ({ children, title, onUnlock, isAdminView }) => {
  if (isAdminView) {
    return (
      <div className="space-y-3">
        {title && (
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        )}
        <div className="rounded-xl overflow-hidden border border-slate-200">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      )}
      <div
        className="relative rounded-xl overflow-hidden border border-slate-200 cursor-pointer group min-h-[280px]"
        onClick={onUnlock}
      >
        <div className="blur-[5px] pointer-events-none select-none [&_*]:pointer-events-none min-h-[280px] opacity-90">
          {children}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 group-hover:bg-slate-900/50 transition-colors px-6 py-8">
          <div className="bg-white rounded-xl shadow-xl p-5 max-w-xs text-center border border-slate-100">
            <h4 className="font-bold text-slate-900 text-base mb-2">Unlock Your Full Visibility Strategy</h4>
            <p className="text-slate-600 text-sm mb-4">
              See competitor gaps, AI search optimization opportunities, and revenue insights.
            </p>
            <Button
              size="sm"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              onClick={(e) => { e.stopPropagation(); onUnlock?.(); }}
            >
              Book a 20-Minute Visibility Audit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ScoreGaugeCard = ({ score, label, sublabel, color, description, showBeta, delay = 0, debugText, onClick, isClickable = false, status, category }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const isNull = score === null || score === undefined;

  // Determine what to show based on status
  const getDisplayContent = () => {
    if (status === 'category_unresolved') {
      return {
        icon: AlertTriangle,
        iconColor: 'text-amber-500',
        text: 'Needs category',
        textColor: 'text-amber-700'
      };
    }
    if (status === 'limited_presence') {
      // Show score but with amber badge to indicate capped/limited
      return null; // Still show score, but will have special treatment
    }
    if (status === 'generating') {
      return {
        icon: RefreshCw,
        iconColor: 'text-blue-600',
        text: 'Analyzing',
        textColor: 'text-blue-700',
        animate: true
      };
    }
    if (status === 'error') {
      return {
        icon: AlertCircle,
        iconColor: 'text-red-500',
        text: 'Failed',
        textColor: 'text-red-700'
      };
    }
    if (isNull) {
      return {
        icon: null,
        text: '—',
        textColor: 'text-slate-400'
      };
    }
    return null; // Show score
  };

  const displayContent = getDisplayContent();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay, ease: [0.34, 1.56, 0.64, 1] }}
      className={`flex flex-col items-center ${isClickable ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
      onClick={onClick}
    >
      <div
        className="relative cursor-help group"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Perfect circle: equal w/h, aspect-square, rounded-full, no padding that breaks shape */}
        <div className="relative w-40 h-40 aspect-square rounded-full bg-white shadow-lg shadow-indigo-100/50 flex items-center justify-center">
          {displayContent ? (
            <div className="flex flex-col items-center justify-center text-center">
              {displayContent.icon && (
                <displayContent.icon
                  className={cn("w-8 h-8 mb-1", displayContent.iconColor, {
                    "animate-spin": displayContent.animate
                  })}
                />
              )}
              <span className={cn("text-sm font-semibold", displayContent.textColor)}>
                {displayContent.text}
              </span>
            </div>
          ) : (
            <CircularProgress value={score} color={color} size={120} thickness={8} />
          )}
        </div>

        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 p-3 bg-slate-900 text-white text-xs rounded-xl shadow-2xl z-50"
          >
            {description}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
          </motion.div>
        )}
      </div>

      <p className="font-bold text-slate-900 mt-3 text-base">{label}</p>
      <p className="text-slate-500 text-xs font-medium">{sublabel}</p>
      {debugText && (
        <p className="mt-2 text-[10px] font-mono text-slate-400">
          {debugText}
        </p>
      )}
      
      {showBeta && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.3 }}
          className="mt-3"
        >
          <Badge className="bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 border border-slate-200 px-3 py-1 text-[10px] font-bold rounded-full shadow-sm hover:shadow-md hover:scale-105 transition-all">
            BETA
          </Badge>
        </motion.div>
      )}
    </motion.div>
  );
};

const EnrichedStatCard = ({ icon: Icon, title, value, subtitle, delay = 0, gradient }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className={cn(
        "border-2 rounded-xl shadow-md hover:shadow-lg transition-all",
        gradient
      )}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-white/80 backdrop-blur flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                {title}
              </p>
              <p className="text-2xl font-black text-slate-900 mb-1">
                {value}
              </p>
              {subtitle && (
                <p className="text-xs text-slate-600">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const InsightCard = ({ icon: Icon, title, content, delay = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card 
        className="border border-slate-200 bg-white hover:shadow-lg hover:border-slate-300 transition-all duration-300 cursor-pointer group rounded-xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center shrink-0 group-hover:from-slate-100 group-hover:to-slate-200 transition-colors">
              <Icon className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 text-sm mb-1">{title}</h3>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-2"
                  >
                    <p className="text-xs text-slate-600 leading-relaxed">{content}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0"
            >
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const IntegrationSimulationModal = ({ isOpen, onClose, onComplete }) => {
  const [stage, setStage] = useState('simulating');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const steps = [
    { label: 'Analyzing business data', progress: 25 },
    { label: 'Generating schema markup', progress: 50 },
    { label: 'Optimizing FAQs', progress: 75 },
    { label: 'Enhancing reviews', progress: 100 }
  ];

  useEffect(() => {
    if (!isOpen) {
      setStage('simulating');
      setProgress(0);
      setCurrentStep('');
      return;
    }

    let stepIndex = 0;
    const duration = 4000;
    const stepDuration = duration / steps.length;

    const intervalId = setInterval(() => {
      if (stepIndex < steps.length) {
        setCurrentStep(steps[stepIndex].label);
        setProgress(steps[stepIndex].progress);
        stepIndex++;
      } else {
        clearInterval(intervalId);
        setTimeout(() => setStage('complete'), 300);
      }
    }, stepDuration);

    return () => clearInterval(intervalId);
  }, [isOpen]);

  const integrationCards = [
    { title: "Added Schema Data", description: "LocalBusiness structured data added", Icon: Link2 },
    { title: "Optimized FAQs", description: "5 AI-optimized FAQ entries created", Icon: HelpCircle },
    { title: "AI-Enhanced Reviews", description: "Testimonials optimized for AI discovery", Icon: Star }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-8 max-h-[90vh] overflow-y-auto"
        >
          {stage === 'simulating' && (
            <div className="text-center space-y-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mx-auto rounded-full bg-theme-gradient flex items-center justify-center"
              >
                <Settings className="w-8 h-8 text-white" />
              </motion.div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Running Integration...
                </h2>
                <p className="text-slate-600 text-sm">
                  Optimizing your visibility for AI search engines
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span>{currentStep || 'Processing'}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ width: `${progress}%`, background: getActiveGradient() }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>
          )}

          {stage === 'complete' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center"
                >
                  <Check className="w-8 h-8 text-green-600" />
                </motion.div>

                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Integration Complete
                </h2>
                <p className="text-slate-600 text-sm">
                  Your profile is now AI-optimized
                </p>
              </div>

              <div className="space-y-3">
                {integrationCards.map((card, index) => {
                  const Icon = card.Icon;
                  return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <div className="text-2xl text-green-600"><Icon className="w-6 h-6" /></div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-sm mb-0.5">{card.title}</h3>
                      <p className="text-xs text-slate-600">{card.description}</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  </motion.div>
                );
                })}
              </div>

              <div className="space-y-2">
                <Button
                  onClick={onComplete}
                  className="w-full bg-theme-gradient h-11 text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                >
                  View Updated Results
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="w-full h-11 text-sm rounded-xl hover:bg-slate-50"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Normalize and validate GEO explain data
 * Returns strict v2 explain object or null
 */
function normalizeExplain(explainData) {
  if (!explainData) return null;
  
  // v3: GEO component scoring (authority, content, reviews, etc.)
  if (explainData.version === 'v3' && typeof explainData.geoScore === 'number') {
    return explainData;
  }
  
  // v2: Query-based evaluation
  const isValidV2 = 
    explainData.version === 'v2' && 
    Array.isArray(explainData.queries) && 
    explainData.queries.length > 0;
  
  if (!isValidV2) return null;
  
  return explainData;
}

/**
 * Check if scanData has valid GEO explain (v2 or v3)
 */
function hasValidExplainV2(explain) {
  return normalizeExplain(explain) !== null;
}

/** Convert Geo/MGO scanReport payload to AGS scanData format */
function scanReportToScanData(scanReport, leadMeta = {}) {
  const scores = scanReport.scores || {};
  const geo = scanReport.geo || {};
  const body = scanReport.body || {};
  const place = scanReport.place || {};
  const innerBody = body.body || body;
  const meoExplain = body.meoExplain || innerBody?.meoExplain || innerBody;
  const marketContext = meoExplain?.marketContext || body.marketContext || innerBody?.marketContext || {};

  const business = {
    name: place.name || leadMeta.business_name,
    address: place.formatted_address,
    formattedAddress: place.formatted_address,
    formatted_address: place.formatted_address,
    place_id: place.place_id,
    placeId: place.place_id,
    rating: place.rating ?? meoExplain?.rating,
    user_ratings_total: place.user_ratings_total ?? meoExplain?.totalReviews,
    reviewCount: place.user_ratings_total ?? meoExplain?.totalReviews,
    website: place.website,
    websiteUri: place.website,
    international_phone_number: place.international_phone_number,
    formatted_phone_number: place.formatted_phone_number,
    opening_hours: place.opening_hours,
    types: place.types,
  };

  const meoScore = scores.meo ?? body.meoScore ?? innerBody?.meoScore;
  const geoScore = geo.score ?? scores.geo;
  const overall = scores.overall ?? scores.final;

  const percentile = marketContext.reviewsPercentile ?? (geoScore != null && meoScore != null ? Math.round((meoScore + geoScore) / 2) : 50);

  return {
    type: 'local',
    business,
    scores: {
      meo: meoScore,
      seo: scores.seo ?? null,
      geo: geoScore,
      overall,
      final: overall,
    },
    geo: {
      score: geoScore,
      status: geo.status || 'ok',
      category: geo.category,
      explain: geo.explain,
      explainJobId: null,
      algoVersion: geo.algoVersion,
    },
    meoBackendData: {
      meoExplain: meoExplain || {
        rating: business.rating,
        totalReviews: business.user_ratings_total,
        photoCount: meoExplain?.photoCount ?? place.photoCount ?? (place.photos?.length || 0),
        hasWebsite: !!business.website,
        hasPhone: !!(business.international_phone_number || business.formatted_phone_number),
        hasHours: !!business.opening_hours,
        marketContext,
        optimizationTips: geo.explain?.optimizationRecommendations || [],
      },
      scoringBreakdown: body.scoringBreakdown || innerBody?.scoringBreakdown,
    },
    percentile,
    percentileText: `Top ${100 - percentile}%`,
    metadata: leadMeta,
  };
}

export default function ScanResults() {
  const [scanData, setScanData] = useState(null);
  const [planRecommendation, setPlanRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [scanId, setScanId] = useState(null);
  const [expandedPanel, setExpandedPanel] = useState(null); // 'meo' | 'geo' | null
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const recoveryJobRequestedRef = useRef(false);
  const [lastHttpStatus, setLastHttpStatus] = useState(null);
  const [lastErrorMessage, setLastErrorMessage] = useState(null);
  const [lastResponseKeys, setLastResponseKeys] = useState(null);
  const [scanResponseKeys, setScanResponseKeys] = useState(null);
  const [geoResponseKeys, setGeoResponseKeys] = useState(null);
  const navigate = useNavigate();

  const isEmbedMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embed') === '1';
  const containerClass = isEmbedMode ? 'max-w-full w-full min-w-0' : 'max-w-[1040px]';

  // ============================================================================
  // SINGLE SOURCE OF TRUTH: Compute scan readiness phase
  // NOTE: This is computed early, before polling state is known
  // We refine it later based on timeout_fallback
  // ============================================================================
  const scanPhaseEarly = (() => {
    if (!scanData) return 'loading';
    
    const hasMEO = scanData.scores?.meo != null;
    const hasGEOScore = scanData.geo?.score != null;
    const hasGEOExplain = hasValidExplainV2(scanData.geo?.explain);
    
    // Error states
    if (scanData.geo?.status === 'failed') return 'error';
    
    // Ready = MEO + GEO score (explain is optional)
    // User can see results even if explain is unavailable/expired
    if (hasMEO && hasGEOScore) return 'ready';
    
    // If we have MEO, allow rendering (GEO might timeout/fallback)
    if (hasMEO) return 'partial';
    
    // Loading = initial state
    return 'loading';
  })();

  // Derive GEO status from actual data presence (single source of truth)
  const getDerivedGEOStatus = (geo) => {
    if (!geo) return 'failed'; // STRICT: no data = failed, not unknown
    
    // Priority 1: v2 or v3 explain = ready
    if ((geo.explain?.version === 'v2' && Array.isArray(geo.explain.queries) && geo.explain.queries.length > 0) ||
        (geo.explain?.version === 'v3' && typeof geo.explain.geoScore === 'number')) {
      return 'ready';
    }
    
    // Priority 2: numeric score = scored (ready enough)
    if (typeof geo.score === 'number' && geo.score > 0) {
      return 'scored';
    }
    
    // Priority 3: explicit failure
    if (geo.status === 'failed') {
      return 'failed';
    }
    
    // Priority 4: generating if explainJobId exists or status says so
    if (geo.explainJobId || 
        ['generating', 'queued', 'running'].includes(geo.status)) {
      return 'generating';
    }
    
    // STRICT: If we reach here, something is wrong - treat as failed
    return 'failed';
  };

  const derivedGEOStatus = getDerivedGEOStatus(scanData?.geo);
  
  // ============================================================================
  // POLLING CONTROL: Only poll when explainJobId exists AND explain is NOT ready
  // Stop polling on 404 (job expired/not found)
  // ============================================================================
  const explainJobId = scanData?.geo?.explainJobId;
  const hasValidExplain = hasValidExplainV2(scanData?.geo?.explain);
  const shouldPollGEO = !!explainJobId && !hasValidExplain;

  // GEO polling hook
  const {
    data: polledExplainData,
    isLoading: isPollingLoading,
    error: pollingError,
    isTimeout: isPollingTimeout,
    retry: retryPolling,
    debug: pollDebug,
    status: pollStatus
  } = useGEOExplainPolling(explainJobId, shouldPollGEO);

  // ============================================================================
  // GEO READINESS: Show GEO score when explain is complete OR backend returned a sync score
  // geoReady = has explain, OR backend returned a numeric score with status 'ok' (no explain needed)
  // ============================================================================
  const geoSyncScore = typeof scanData?.geo?.score === 'number' && scanData?.geo?.status === 'ok' && !scanData?.geo?.explainJobId;
  const geoReady = hasValidExplain || geoSyncScore;
  // Only block when actively polling (jobId exists) — Geo sync response has no jobId, show results immediately
  const geoGenerating = !!explainJobId && !geoReady && (isPollingLoading || pollStatus === 'polling');
  const geoFailed = !geoReady && (pollingError || pollStatus === 'error' || pollStatus === 'timeout');
  
  // ============================================================================
  // GEO LIMITED PRESENCE: Detect when business has minimal web footprint
  // OR when GEO analysis times out / stalls
  // ============================================================================
  const hasWebsite = !!scanData?.business?.website;
  const hasWebsiteContent = scanData?.geo?.explain?.queries?.length > 0;
  const hasMentions = (scanData?.geo?.explain?.queries || []).some(q => q.mentioned);
  const totalQueries = scanData?.geo?.explain?.queries?.length || 0;
  const mentionedCount = (scanData?.geo?.explain?.queries || []).filter(q => q.mentioned).length;
  
  // Limited presence if:
  // 1. Explicit timeout_fallback status (stalled/timed out), OR
  // 2. Polling complete + (no website OR sparse mentions)
  const isTimeoutFallback = pollStatus === 'timeout_fallback';
  const pollingComplete = pollStatus === 'done' || pollStatus === 'error' || pollStatus === 'timeout' || isTimeoutFallback;
  const isLimitedPresence = !geoReady && (
    isTimeoutFallback ||
    (pollingComplete && (
      !hasWebsite || 
      (hasWebsite && hasWebsiteContent && totalQueries >= 15 && mentionedCount < 3)
    ))
  );
  
  // Calculate fallback score for limited presence (conservative 38-45 range)
  const limitedPresenceFallbackScore = (() => {
    if (!isLimitedPresence) return null;
    let base = 38; // Slightly higher baseline (was 35)
    
    // Add points for available GBP signals
    if (scanData?.business?.description) base += 2; // +2-4 if description exists
    if ((scanData?.business?.description?.length || 0) > 100) base += 2; // Detailed description
    
    // Reviews with sentiment
    const reviewCount = scanData?.business?.user_ratings_total || 0;
    const rating = scanData?.business?.rating || 0;
    if (reviewCount > 10 && rating >= 4.0) base += 2; // Positive reviews
    
    // Category clarity
    if (scanData?.business?.types?.[0]) base += 2;
    
    // Website exists (even if low content)
    if (hasWebsite) base += 1;
    
    return Math.min(45, base); // Hard cap at 45
  })();

  // ============================================================================
  // FINAL SCAN PHASE: Promote to ready if timeout_fallback or limited_presence
  // This ensures the page renders even when GEO times out
  // ============================================================================
  const scanPhase = (() => {
    // If timeout_fallback or limited_presence and we have MEO, promote to ready
    if (scanPhaseEarly === 'partial' && (isTimeoutFallback || isLimitedPresence)) {
      return 'ready';
    }
    return scanPhaseEarly;
  })();

  useEffect(() => {
    const processStoredResults = (data) => {
      setScanResponseKeys(data?._debugScanResponseKeys || (data ? Object.keys(data) : []));
      setGeoResponseKeys(data?.geo ? Object.keys(data.geo) : (data?._debugGeoResponseKeys || null));
      if (!data.geo) {
        const legacyGeoScore =
          typeof data?.scores?.geo === 'number' ? data.scores.geo :
          (typeof data?.geoBackendData?.geoScore === 'number' ? data.geoBackendData.geoScore : null);
        data.geo = {
          score: legacyGeoScore,
          status: legacyGeoScore === null ? 'category_unresolved' : 'generating',
          category: data?.geoBackendData?.category || null,
          explain: null,
          explainStatus: 'pending',
          algoVersion: 'geo-v4',
        };
      }
      if (data.geo?.explain) {
        const normalized = normalizeExplain(data.geo.explain);
        if (!normalized) data.geo.explain = null;
      }
      setScanData(data);
      const storedPlan = sessionStorage.getItem('planRecommendation');
      if (storedPlan) {
        try {
          setPlanRecommendation(JSON.parse(storedPlan));
        } catch (_) {}
      }
      if (data.business?.name) {
        document.title = `${data.business.name} — Visibility Report | AGS`;
      }
    };

    const runScanFromPending = async (pending) => {
      try {
        const { scanner } = await import('@/api/functions');
        const scannerData = await scanner({
          place_id: pending.placeId,
          place_data: pending.placeData,
          business_name: pending.businessName,
          city: pending.city,
          state: pending.state,
          country: pending.country,
          email: pending.email,
          phone: pending.phone,
          zipCode: pending.postalCode,
        });

        if (!scannerData.success) {
          throw new Error(scannerData.error || 'Failed to fetch business details');
        }

        const { result, leadForwardStatus: topLevelStatus } = scannerData;
        const scanResult = {
          type: 'local',
          email: pending.email,
          leadForwardStatus: result?.leadForwardStatus ?? topLevelStatus,
          business: { ...result.place, address: result.place.formattedAddress },
          scores: {
            meo: result.scores.meo,
            seo: result.scores.seo ?? null,
            geo: result.scores.geo,
            final: result.scores.overall ?? result.scores.final,
          },
          percentile: result.percentile,
          percentileText: result.percentileText,
          optimizationBar: result.optimizationBar,
          geoDetails: result.geoDetails,
          meoBackendData: result.meoBackendData,
          geo: result.geo,
          _debugScanResponseKeys: result._debugScanResponseKeys,
          _debugGeoResponseKeys: result._debugGeoResponseKeys,
          metadata: {
            address: pending.streetAddress,
            city: pending.city,
            state: pending.state,
            country: pending.country,
            postal: pending.postalCode,
            scanned_at: new Date().toISOString(),
          },
        };

        // Optional AI insights (non-blocking)
        try {
          const { callOpenAI } = await import('@/api/openaiClient');
          const analysisPrompt = `Analyze this business scan result and provide actionable insights:
Business: ${scanResult.business.name}
Location: ${pending.city}${pending.state ? `, ${pending.state}` : ''}, ${pending.country}
MEO Score: ${scanResult.scores.meo}/100
GEO Score: ${scanResult.scores.geo !== null ? scanResult.scores.geo + '/100' : 'N/A'}
Overall Score: ${scanResult.scores.final !== null ? scanResult.scores.final + '/100' : 'N/A'}
Percentile: ${scanResult.percentileText}
Provide: 1. Key strengths 2. Critical weaknesses 3. Top 3 recommendations 4. Expected impact
Format as JSON with: strengths (array), weaknesses (array), recommendations (array of {action, impact, priority}), expectedImpact (string).`;
          const aiAnalysis = await callOpenAI({
            prompt: analysisPrompt,
            system_role: 'You are an expert SEO and local business visibility consultant.',
            max_tokens: 1500,
            temperature: 0.7,
            response_format: { type: 'json_object' },
          });
          try {
            scanResult.aiInsights = JSON.parse(aiAnalysis.content);
          } catch {
            scanResult.aiInsights = { raw: aiAnalysis.content };
          }
        } catch (_) {}

        // GEO polling if needed
        const geo = scanResult.geo;
        const needsGeoPoll = geo?.explainJobId && !hasValidExplainV2(geo?.explain);
        if (needsGeoPoll) {
          try {
            const geoResult = await pollForGEOExplain(geo.explainJobId);
            if (geoResult?.explain) {
              const finalGeoScore = geoResult.geoScore ?? scanResult.geo?.score ?? null;
              const meoScore = scanResult.scores?.meo;
              const overallScore = (meoScore != null && finalGeoScore != null)
                ? Math.round((meoScore + finalGeoScore) / 2)
                : (scanResult.scores?.final ?? scanResult.scores?.overall);
              scanResult.geo = {
                ...scanResult.geo,
                status: 'ok',
                score: finalGeoScore,
                explain: geoResult.explain,
                explainJobId: geo.explainJobId,
              };
              scanResult.scores = {
                ...scanResult.scores,
                geo: finalGeoScore,
                final: overallScore,
                overall: overallScore,
              };
            }
          } catch (_) {}
        }

        sessionStorage.removeItem(SCAN_PENDING_KEY);
        sessionStorage.setItem('scanResults', JSON.stringify(scanResult));

        try {
          await fetch('/functions/scanCounter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (_) {}

        SendEmail({
          to: 'info@atlasgrowths.com',
          subject: `New Local Scan: ${scanResult.business?.name}`,
          body: `<h2>New Local Business Scan Completed</h2>
            <p><strong>Business:</strong> ${scanResult.business?.name}</p>
            <p><strong>Location:</strong> ${scanResult.business?.address || scanResult.business?.formattedAddress || 'N/A'}</p>
            <p><strong>Email:</strong> ${scanResult.email || 'N/A'}</p>
            <p><strong>MEO:</strong> ${scanResult.scores?.meo} | <strong>GEO:</strong> ${scanResult.scores?.geo} | <strong>Final:</strong> ${scanResult.scores?.final}</p>
            <p><em>Scan completed at ${new Date().toLocaleString()}</em></p>`,
        }).catch(() => {});

        processStoredResults(scanResult);

        if (!scanResult.scanId) {
          try {
            const newScanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await ScanResult.create({
              scanId: newScanId,
              email: scanResult.email,
              business: scanResult.business,
              scores: scanResult.scores,
              geo: scanResult.geo,
              enrichedData: scanResult.enrichedData,
              insightSummary: scanResult.insightSummary,
              percentile: scanResult.percentile,
              meoBackendData: scanResult.meoBackendData,
              metadata: scanResult.metadata,
              createdAt: new Date().toISOString(),
            });
            setScanId(newScanId);
            scanResult.scanId = newScanId;
            sessionStorage.setItem('scanResults', JSON.stringify(scanResult));
          } catch (_) {}
        } else {
          setScanId(scanResult.scanId);
        }

        toast.success('Scan complete!');
      } catch (error) {
        console.error('Scan error:', error);
        toast.error(error.message || 'Scan failed. Please try again.');
        sessionStorage.removeItem(SCAN_PENDING_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    const loadAndSaveScan = async () => {
      const pendingRaw = sessionStorage.getItem(SCAN_PENDING_KEY);
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw);
          await runScanFromPending(pending);
          return;
        } catch (e) {
          console.error('Invalid scanPending:', e);
          sessionStorage.removeItem(SCAN_PENDING_KEY);
        }
      }

      const stored = sessionStorage.getItem('scanResults');
      const storedPlan = sessionStorage.getItem('planRecommendation');
      const isDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1';
      const isEmbed = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embed') === '1';

      // If stored result has no GEO score, it's stale — drop it so we re-scan with the latest backend
      if (stored && !isDemo) {
        try {
          const parsed = JSON.parse(stored);
          const hasGeoScore = typeof parsed?.geo?.score === 'number' || typeof parsed?.scores?.geo === 'number';
          if (!hasGeoScore) {
            sessionStorage.removeItem('scanResults');
            sessionStorage.removeItem('planRecommendation');
            setIsLoading(false);
            return;
          }
        } catch (_) {
          sessionStorage.removeItem('scanResults');
          setIsLoading(false);
          return;
        }
      }

      if (!stored && !isDemo) {
        if (isEmbed) {
          return;
        }
        setIsLoading(false);
        return;
      }

      if (isDemo && !stored) {
        const demoData = {
          type: 'local',
          business: {
            name: 'Demo Business',
            address: '123 Main St, Cincinnati, OH 45202, USA',
            formattedAddress: '123 Main St, Cincinnati, OH 45202, USA',
            place_id: 'demo_place_1',
            placeId: 'demo_place_1',
            rating: 4.2,
            reviewCount: 186,
            user_ratings_total: 186,
            website: 'https://example.com',
            websiteUri: 'https://example.com',
            international_phone_number: '+1 513-555-0100',
            formatted_phone_number: '(513) 555-0100',
            opening_hours: { open_now: true },
            types: ['restaurant'],
          },
          scores: { meo: 72, seo: 65, geo: 68, overall: 68, final: 68 },
          geo: {
            score: 68,
            status: 'ok',
            explain: { version: 'v3', geoScore: 68, grade: 'C', components: [] },
            explainJobId: null,
          },
          meoBackendData: {
            meoExplain: {
              rating: 4.2,
              totalReviews: 186,
              photoCount: 42,
              hasWebsite: true,
              hasPhone: true,
              hasHours: true,
              marketContext: {
                localAvgRating: 4.3,
                localAvgReviews: 312,
                localAvgPhotos: 64,
                competitorCount: 8,
                reviewsPercentile: 65,
                photosPercentile: 55,
              },
              optimizationTips: [
                'Add more photos to match competitor averages (64 vs your 42).',
                'Respond to recent reviews to improve engagement signals.',
                'Ensure your business description is complete and keyword-rich.',
              ],
            },
          },
        };
        processStoredResults(demoData);
        sessionStorage.setItem('scanResults', JSON.stringify(demoData));
        setIsLoading(false);
        return;
      }

      try {
        const data = JSON.parse(stored);
        const finalScoreKey = data.scores?.overall !== undefined ? 'overall' : 'final';
        const geoScoreValid = data?.scores?.geo == null || typeof data?.scores?.geo === 'number';
        const overallValid = data?.scores?.[finalScoreKey] == null || typeof data?.scores?.[finalScoreKey] === 'number';
        if (!data.scores || typeof data.scores.meo !== 'number' || !geoScoreValid || !overallValid) {
          console.error('Invalid or missing scores in scan data');
          setIsLoading(false);
          return;
        }

        processStoredResults(data);

        if (!data.scanId) {
          try {
            const newScanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await ScanResult.create({
              scanId: newScanId,
              email: data.email,
              business: data.business,
              scores: data.scores,
              geo: data.geo,
              enrichedData: data.enrichedData,
              insightSummary: data.insightSummary,
              percentile: data.percentile,
              meoBackendData: data.meoBackendData,
              metadata: data.metadata,
              createdAt: new Date().toISOString(),
            });
            setScanId(newScanId);
            data.scanId = newScanId;
            sessionStorage.setItem('scanResults', JSON.stringify(data));
          } catch (_) {}
        } else {
          setScanId(data.scanId);
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Failed to parse scan results:", error);
        setIsLoading(false);
      }
    };

    loadAndSaveScan();
  }, []);

  // ============================================================================
  // EMBED MODE: Admin view from Geo Command Center — request & receive scan data via postMessage
  // Request on mount (parent sends data when ready); avoids race where load fires before listener exists
  // ============================================================================
  useEffect(() => {
    if (!isEmbedMode || typeof window === 'undefined') return;

    // Signal to parent that we're ready to receive the stored scan report (avoids load-event race)
    window.parent.postMessage({ type: 'embed-ready' }, '*');

    const handler = (event) => {
      const data = event?.data;
      if (data?.type === 'scan-report-data' && data.scanReport) {
        try {
          const scanDataConverted = scanReportToScanData(data.scanReport, data.leadMeta || {});
          setScanData(scanDataConverted);
          setIsAdminView(true);
          setIsLoading(false);
          if (scanDataConverted.business?.name) {
            document.title = `${scanDataConverted.business.name} — Visibility Report (Admin) | AGS`;
          }
        } catch (err) {
          console.error('[ScanResults embed] Failed to process scan report:', err);
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isEmbedMode]);

  // ============================================================================
  // RECOVERY: If we have placeId but no explainJobId, create job via API
  // Backend now accepts placeId only (category optional) - fetches place + resolves category
  // ============================================================================
  useEffect(() => {
    if (!scanData || recoveryJobRequestedRef.current) return;
    const placeId = scanData.business?.place_id || scanData.business?.placeId;
    const category = scanData.geo?.category;
    const hasExplain = hasValidExplainV2(scanData.geo?.explain);
    if (!placeId || scanData.geo?.explainJobId || hasExplain) return;

    recoveryJobRequestedRef.current = true;
    const url = buildApiUrl('/api/geo/regenerate-explain');
    const body = {
      placeId,
      locationLabel: scanData.business?.address || scanData.business?.formattedAddress || 'Unknown'
    };
    if (category) {
      body.categoryOverride = typeof category === 'object' ? category : { key: category, label: category };
    }
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((result) => {
        const syncGeo = result?.geo;
        if (syncGeo?.explain && hasValidExplainV2(syncGeo.explain)) {
          const updated = {
            ...scanData,
            geo: { ...scanData.geo, ...syncGeo, explainJobId: null },
            scores: {
              ...scanData.scores,
              geo: syncGeo.score,
              final: scanData.scores?.meo != null && syncGeo.score != null
                ? Math.round((scanData.scores.meo + syncGeo.score) / 2)
                : scanData.scores?.final,
            },
          };
          setScanData(updated);
          sessionStorage.setItem('scanResults', JSON.stringify(updated));
          return;
        }
        const newJobId = result?.explainJobId ?? result?.jobId;
        if (!newJobId) return;
        setScanData((prev) => ({
          ...prev,
          geo: { ...prev.geo, explainJobId: newJobId, explain: null }
        }));
        const updated = {
          ...scanData,
          geo: { ...scanData.geo, explainJobId: newJobId, explain: null }
        };
        sessionStorage.setItem('scanResults', JSON.stringify(updated));
      })
      .catch(() => { recoveryJobRequestedRef.current = false; });
  }, [scanData]);

  // ============================================================================
  // MERGE POLLED GEO EXPLAIN: Only merge when valid v2 with queries
  // ============================================================================
  useEffect(() => {
    if (!polledExplainData) return;
    
    // Normalize and validate
    const normalizedExplain = normalizeExplain(polledExplainData);
    if (!normalizedExplain) {
      return;
    }

    setScanData(prev => {
      if (!prev) return prev;
      
      // Skip merge if already have valid v2 explain (prevent duplicate merge)
      if (hasValidExplainV2(prev.geo?.explain)) {
        return prev;
      }
      
      // Use the final GEO score from the explain payload (most accurate)
      const finalGeoScore = normalizedExplain.geoScore ?? normalizedExplain.score ?? prev.geo?.score ?? null;
      
      // Recompute overall score with final GEO
      const finalOverallScore = typeof prev.scores?.meo === 'number' && typeof finalGeoScore === 'number'
        ? Math.round((prev.scores.meo + finalGeoScore) / 2)
        : prev.scores?.overall ?? prev.scores?.final ?? null;
      
      const updated = {
        ...prev,
        geo: {
          ...(prev.geo ?? {}),
          status: 'ok',
          score: finalGeoScore,
          explain: normalizedExplain,
          explainJobId: prev.geo?.explainJobId
        },
        scores: {
          ...prev.scores,
          geo: finalGeoScore,
          overall: finalOverallScore
        }
      };
      
      // Persist to sessionStorage (ONLY when valid)
      sessionStorage.setItem('scanResults', JSON.stringify(updated));
      
      // CRITICAL: Persist to localStorage (permanent storage)
      // This ensures explain is available on page refresh and revisits
      if (prev.scanId) {
        ScanResult.update(prev.scanId, {
          geo: updated.geo,
          scores: updated.scores
        }).catch(err => {
          console.error('Failed to persist GEO explain to localStorage:', err);
        });
      }
      
      return updated;
    });
  }, [polledExplainData]);

  const handleNewScan = () => {
    // Save email for pre-fill on next scan
    const emailToSave = scanData?.email;
    if (emailToSave && typeof emailToSave === 'string' && emailToSave.trim()) {
      try {
        localStorage.setItem('scan_saved_email', emailToSave.trim());
      } catch (_) {}
    }
    sessionStorage.removeItem('scanResults');
    sessionStorage.removeItem('planRecommendation');
    navigate(createPageUrl('Landing') + '#scan-section');
  };

  const handleBookACall = () => {
    window.location.href = createPageUrl('GetSupport') + '?book=1';
  };

  const handleIntegrationDemo = () => {
    setShowIntegrationModal(true);
  };

  const handleIntegrationComplete = () => {
    setShowIntegrationModal(false);
    navigate(createPageUrl('IntegrationResults'));
  };

  const handleRegenerateExplain = async () => {
    const placeId = scanData?.business?.place_id || scanData?.business?.placeId;
    if (!placeId) {
      toast.error('Missing place ID to regenerate explain');
      return;
    }

    setIsRegenerating(true);

    try {
      const url = buildApiUrl('/api/geo/regenerate-explain');
      const body = {
        placeId,
        locationLabel: scanData?.business?.address || scanData?.business?.formattedAddress || 'Unknown'
      };
      if (scanData?.geo?.category) {
        body.categoryOverride = typeof scanData.geo.category === 'object'
          ? scanData.geo.category
          : { key: scanData.geo.category, label: scanData.geo.category };
      }
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const result = await response.json().catch(() => ({}));

      // Geo Command Center returns sync geo with explain (no jobId)
      const syncGeo = result?.geo;
      if (response.ok && syncGeo?.explain && hasValidExplainV2(syncGeo.explain)) {
        const updated = {
          ...scanData,
          geo: { ...scanData.geo, ...syncGeo, explainJobId: null },
          scores: {
            ...scanData.scores,
            geo: syncGeo.score,
            final: scanData.scores?.meo != null && syncGeo.score != null
              ? Math.round((scanData.scores.meo + syncGeo.score) / 2)
              : scanData.scores?.final,
          },
        };
        setScanData(updated);
        sessionStorage.setItem('scanResults', JSON.stringify(updated));
        toast.success('GEO analysis complete.');
        setIsRegenerating(false);
        return;
      }

      // MGO backend returns jobId for polling
      const newJobId = result?.explainJobId ?? result?.jobId;
      if (!response.ok || !newJobId) {
        const errMsg = result?.error?.message || result?.message || `HTTP ${response.status}`;
        throw new Error(errMsg);
      }

      toast.success('Regenerating GEO analysis...');

      setScanData(prev => ({
        ...prev,
        geo: { ...prev.geo, explainJobId: newJobId, explain: null }
      }));

      const updated = {
        ...scanData,
        geo: { ...scanData.geo, explainJobId: newJobId, explain: null }
      };
      sessionStorage.setItem('scanResults', JSON.stringify(updated));

      setIsRegenerating(false);
    } catch (error) {
      console.error('Failed to regenerate explain:', error);
      toast.error(`Failed to regenerate: ${error.message}`);
      setIsRegenerating(false);
    }
  };

  const isDebugMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';
  const isDemoMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1';

  const meoExplainPlaceId =
    scanData?.meoBackendData?.place_id ||
    scanData?.meoBackendData?.gbpFacts?.place_id ||
    scanData?.business?.place_id ||
    null;

  // Unified loading screen: same UI for initial load AND GEO analysis
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen bg-slate-50"
      >
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
          <div className={`${containerClass} mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between`}>
            <AGSLogo size="md" linkTo="/" />
          </div>
        </div>
        <div className="flex items-center justify-center flex-1 py-24">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="text-slate-600 text-sm font-medium">AI visibility analysis in progress</p>
            <p className="text-slate-500 text-xs mt-1">Results will appear when the scan is complete</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!scanData) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen bg-slate-50"
      >
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
          <div className={`${containerClass} mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between`}>
            <AGSLogo size="md" linkTo="/" />
          </div>
        </div>
        <div className="flex items-center justify-center flex-1 p-4">
        <Card className="p-8 text-center max-w-md shadow-lg rounded-2xl">
          <CardContent>
            <MapPin className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">No Results Found</h2>
            <p className="text-slate-600 text-sm mb-6">
              We couldn't find your scan results. Please run a new scan.
            </p>
            <Button
              onClick={handleNewScan}
              className="bg-theme-gradient rounded-xl shadow-lg hover:scale-105 transition-all"
            >
              Run New Scan
            </Button>
            <p className="text-xs text-slate-500 mt-4">
              <button
                type="button"
                onClick={() => window.location.href = createPageUrl('ScanResults') + '?demo=1'}
                className="underline hover:text-slate-700"
              >
                View demo report
              </button>
            </p>
          </CardContent>
        </Card>
        </div>
      </motion.div>
    );
  }

  // ============================================================================
  // FULL-GATE RENDERING: Only block when actively polling for GEO (explainJobId exists)
  // Do not show partial results (MEO/GEO/Overall) until GEO analysis finishes
  // ============================================================================
  if (geoGenerating) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen bg-slate-50"
      >
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
          <div className={`${containerClass} mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between`}>
            <AGSLogo size="md" linkTo="/" />
          </div>
        </div>
        <div className="flex items-center justify-center flex-1 py-24">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="text-slate-600 text-sm font-medium">AI visibility analysis in progress</p>
            <p className="text-slate-500 text-xs mt-1">Results will appear when the scan is complete</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // ============================================================================
  // DIAGNOSTICS: Poll state for error handling
  // ============================================================================
  const pollDiagnosis = diagnosePollState(
    pollDebug,
    scanData,
    pollDebug?.elapsedMs ? Math.floor(pollDebug.elapsedMs / 1000) : 0
  );
  // Don't show error when we have valid GEO data (score or explain) — Geo returns sync explain, no jobId needed
  // hasValidGeoScore: any numeric score from backend means GEO ran successfully (with or without explain)
  const hasValidGeoScore = typeof scanData?.geo?.score === 'number';
  const hasValidExplainForError = hasValidExplainV2(scanData?.geo?.explain);
  const jobIdMissingError = pollDiagnosis.code === DiagnosisCodes.GEO_JOBID_MISSING && !hasValidGeoScore && !hasValidExplainForError
    ? 'GEO analysis could not start — backend did not return a job ID. This usually means the business category could not be resolved. Use Retry to create a GEO job.'
    : pollDiagnosis.code === DiagnosisCodes.GEO_RESPONSE_INCOMPLETE
      ? 'Backend response incomplete — geo object missing. Verify API_BASE_URL and proxy. Use Retry to attempt recovery.'
      : null;

  // Retry when GEO_JOBID_MISSING: call regenerate-explain with placeId (backend fetches place + resolves category)
  const handleRetryGEO = async () => {
    if (explainJobId && retryPolling) {
      retryPolling();
      return;
    }
    if (!explainJobId) {
      const placeId = scanData?.business?.place_id || scanData?.business?.placeId;
      if (!placeId) {
        toast.error('Missing place ID. Reload page to retry scan.');
        window.location.reload();
        return;
      }
      setLastHttpStatus(null);
      setLastErrorMessage(null);
      setLastResponseKeys(null);
      try {
        const url = buildApiUrl('/api/geo/regenerate-explain');
        const body = {
          placeId,
          locationLabel: scanData?.business?.address || scanData?.business?.formattedAddress || 'Unknown'
        };
        if (scanData?.geo?.category) {
          body.categoryOverride = typeof scanData.geo.category === 'object'
            ? scanData.geo.category
            : { key: scanData.geo.category, label: scanData.geo.category };
        }
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(body)
        });
        setLastHttpStatus(res.status);
        let result = null;
        try {
          result = await res.json();
        } catch (_) {
          result = {};
        }
        const responseKeys = result ? Object.keys(result) : [];
        setLastResponseKeys(responseKeys);

        // Geo Command Center returns sync geo with explain (no jobId)
        const syncGeo = result?.geo;
        if (res.ok && syncGeo?.explain && hasValidExplainV2(syncGeo.explain)) {
          setLastErrorMessage(null);
          const updated = {
            ...scanData,
            geo: { ...scanData.geo, ...syncGeo, explainJobId: null },
            scores: {
              ...scanData.scores,
              geo: syncGeo.score,
              final: scanData.scores?.meo != null && syncGeo.score != null
                ? Math.round((scanData.scores.meo + syncGeo.score) / 2)
                : scanData.scores?.final,
            },
          };
          setScanData(updated);
          sessionStorage.setItem('scanResults', JSON.stringify(updated));
          toast.success('GEO analysis complete.');
          return;
        }

        // MGO backend returns jobId for polling
        const newJobId = result?.explainJobId ?? result?.jobId;
        if (res.ok && newJobId) {
          setLastErrorMessage(null);
          setScanData((prev) => ({
            ...prev,
            geo: { ...prev.geo, explainJobId: newJobId, explain: null }
          }));
          sessionStorage.setItem('scanResults', JSON.stringify({
            ...scanData,
            geo: { ...scanData.geo, explainJobId: newJobId, explain: null }
          }));
          toast.success('GEO analysis started. Polling...');
        } else {
          const errMsg = result?.error?.message || result?.message || `HTTP ${res.status}`;
          setLastErrorMessage(errMsg);
          toast.error(errMsg || 'Could not start GEO analysis. Try a new scan.');
        }
      } catch (err) {
        const errMsg = err?.message || 'Network error';
        setLastErrorMessage(errMsg);
        setLastHttpStatus(null);
        setLastResponseKeys(null);
        toast.error('Retry failed: ' + errMsg);
      }
    }
  };

  // Show results progressively - MEO, GEO, and AI analysis all visible at once
  // (No gate: we display whatever is ready, with placeholders for loading sections)

  // Check mode
  if (scanData.type === 'online') {
    const { url, scores, percentileInNiche, recommendedActions, niche } = scanData;
    
    const finalScore = Math.round(scores.overall || 0);
    const optimizationPercentage = finalScore;
    
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100"
      >
        {/* Header */}
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
          <div className={`${containerClass} mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between`}>
            <AGSLogo size="md" linkTo="/" />
            <div className="flex items-center gap-2">
              {scanId && <ShareButton scanId={scanId} />}
              <Button onClick={handleNewScan} variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-1.5" /> New Scan
              </Button>
            </div>
          </div>
        </div>

        <div className={`${containerClass} mx-auto px-4 sm:px-6 py-16`}>
          <div className="space-y-16">
            {/* Hero Info */}
            <motion.div className="text-center space-y-5">
               <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 truncate max-w-3xl mx-auto">
                  {url}
               </h1>
               <p className="text-slate-500 flex items-center justify-center gap-2">
                  <Globe className="w-4 h-4" /> Online Business Scan
                  {niche && <span className="bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">{niche}</span>}
               </p>
               <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-full shadow-sm">
                  <Sparkles className="w-4 h-4 text-slate-600" />
                  <span className="text-sm text-slate-900 font-medium">
                    Top <span className="font-bold">{percentileInNiche || 50}%</span> in your niche
                  </span>
               </div>
            </motion.div>

            {/* Scores Grid */}
            <Card className="bg-white border border-slate-200 rounded-2xl shadow-lg">
               <CardContent className="p-10">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8 text-center">
                     <div>
                        <div className="text-sm font-semibold text-slate-500 mb-1">SEO</div>
                        <div className="text-2xl font-bold text-slate-900">{scores.seo || 0}</div>
                     </div>
                     <div>
                        <div className="text-sm font-semibold text-slate-500 mb-1">AI Presence</div>
                        <div className="text-2xl font-bold text-slate-700">{scores.aiPresence || 0}</div>
                     </div>
                     <div>
                        <div className="text-sm font-semibold text-slate-500 mb-1">Social</div>
                        <div className="text-2xl font-bold text-pink-600">{scores.social || 0}</div>
                     </div>
                     <div>
                        <div className="text-sm font-semibold text-slate-500 mb-1">Conversion</div>
                        <div className="text-2xl font-bold text-green-600">{scores.conversion || 0}</div>
                     </div>
                     <div>
                        <div className="text-sm font-semibold text-slate-500 mb-1">Technical</div>
                        <div className="text-2xl font-bold text-blue-600">{scores.technical || 0}</div>
                     </div>
                  </div>

                  {/* Overall Gauge */}
                  <div className="flex flex-col items-center justify-center pt-6 border-t border-slate-100">
                     <h3 className="text-lg font-bold text-slate-900 mb-4">Overall Online Visibility</h3>
                     <div className="w-full max-w-md">
                        <div className="flex justify-between text-sm mb-1">
                           <span>Score</span>
                           <span className="font-bold">{finalScore}/100</span>
                        </div>
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                           <div 
                              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                              style={{ width: `${finalScore}%` }}
                           />
                        </div>
                     </div>
                  </div>
               </CardContent>
            </Card>

            {/* Growth Plan - Blurred with unlock CTA */}
            {recommendedActions && recommendedActions.length > 0 && (
              <BlurredUnlockSection onUnlock={handleBookACall} title="AI Visibility Growth Plan" isAdminView={isAdminView}>
                <div className="space-y-6 p-6 bg-white rounded-2xl border border-slate-200 shadow-lg">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Target className="w-6 h-6 text-purple-600" />
                    AI Visibility Growth Plan
                  </h2>
                  <div className="grid gap-4">
                    {recommendedActions.map((action, idx) => (
                      <Card key={idx} className="border-l-4 border-l-slate-500 shadow-sm">
                        <CardContent className="p-5 flex items-start gap-4">
                          <div className="mt-1">
                            {action.category === 'SEO' && <Search className="w-5 h-5 text-blue-500" />}
                            {action.category === 'AI Presence' && <Brain className="w-5 h-5 text-slate-500" />}
                            {action.category === 'Social' && <MessageCircle className="w-5 h-5 text-pink-500" />}
                            {action.category === 'Conversion' && <Zap className="w-5 h-5 text-yellow-500" />}
                            {action.category === 'Technical' && <Settings className="w-5 h-5 text-slate-500" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                              {action.category}
                            </div>
                            <p className="text-slate-900 font-medium">{action.action}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </BlurredUnlockSection>
            )}

            {/* CTA — hidden in admin view */}
            {!isAdminView && (
              <div className="bg-slate-900 rounded-2xl p-8 text-center text-white">
                 <h2 className="text-2xl font-bold mb-4">Unlock Your Full Visibility Strategy</h2>
                 <Button onClick={handleBookACall} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-4 h-auto text-lg rounded-xl flex items-center gap-2 mx-auto">
                    <Calendar className="w-5 h-5" />
                    Schedule a 20-minute visibility audit
                 </Button>
                 <p className="text-slate-400 text-xs mt-3">No obligation. Real data. Actionable recommendations.</p>
              </div>
            )}

          </div>
        </div>
      </motion.div>
    );
  }

  const { business, scores, enrichedData, insightSummary } = scanData;
  
  const meoScore = Math.round(scores.meo || 0);
  // CRITICAL: GEO score is ONLY shown when geoReady (explain completed) OR limited presence
  const geo = scanData?.geo || null;
  let geoScore = isLimitedPresence 
    ? limitedPresenceFallbackScore 
    : (geoReady && typeof geo?.score === 'number' ? Math.round(geo.score) : null);
  // Apply floor for known national brands (e.g. Best Buy) — a 59 GEO for a major brand is unrealistic
  const NATIONAL_BRANDS = ['best buy', 'walmart', 'target', 'home depot', 'costco', 'lowes', "mcdonald's", 'starbucks', 'chipotle', 'dollar general', 'cvs', 'walgreens', 'kroger', 'publix', 'whole foods', 'aldi', 'tesla', 'apple'];
  const bizName = String(business?.name || '').toLowerCase();
  const isNationalBrand = NATIONAL_BRANDS.some(b => bizName.includes(b));
  if (geoScore != null && isNationalBrand && geoScore < 80) geoScore = 80;
  // Overall score — MEO + GEO only (no SEO)
  let finalScore;
  if ((geoReady || isLimitedPresence) && typeof geoScore === 'number' && typeof meoScore === 'number') {
    finalScore = Math.round((meoScore + geoScore) / 2);
  } else if ((geoReady || isLimitedPresence) && (scores.overall != null || scores.final != null)) {
    finalScore = Math.round(scores.overall ?? scores.final);
  } else {
    finalScore = meoScore;
  }
  
  // Check if GEO category is resolved
  const isCategoryResolved = geo?.status === 'ok';
  
  const percentile = scanData.percentile || (() => {
    if (finalScore >= 90) return 95;
    if (finalScore >= 80) return 85;
    if (finalScore >= 70) return 60;
    if (finalScore >= 60) return 40;
    return 25;
  })();
  
  const optimizationPercentage = finalScore;
  const meoExplain = scanData?.meoBackendData?.meoExplain ?? scanData?.meoBackendData;
  const marketContext = meoExplain?.marketContext;
  const address = business?.address || business?.formattedAddress || '';
  const cityState = address.split(',').slice(1, 3).map((s) => s.trim()).filter(Boolean).join(', ') || scanData?.metadata?.city || '';
  const rating = meoExplain?.rating ?? business?.rating ?? null;
  const totalReviews = meoExplain?.totalReviews ?? business?.reviewCount ?? null;
  const photoCount = meoExplain?.photoCount ?? 0;
  const localAvgReviews = marketContext?.localAvgReviews ?? null;
  const localAvgRating = marketContext?.localAvgRating ?? null;
  const localAvgPhotos = marketContext?.localAvgPhotos ?? null;
  const competitorCount = marketContext?.competitorCount ?? 0;
  const reviewsPercentile = marketContext?.reviewsPercentile ?? percentile;
  const photosPercentile = marketContext?.photosPercentile ?? 50;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 ${isEmbedMode ? 'overflow-x-hidden' : ''}`}
    >
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className={`${containerClass} mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between`}>
          <AGSLogo size="md" linkTo="/" />
          <div className="flex items-center gap-2">
            {scanId && <ShareButton scanId={scanId} />}
            <Button
              onClick={handleNewScan}
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:bg-slate-100 rounded-lg h-9 text-sm"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">New Scan</span>
            </Button>
          </div>
        </div>
      </div>

      {isDemoMode && (
        <div className="bg-amber-50 border-b border-amber-200 py-2">
          <p className="text-center text-sm text-amber-800 font-medium">Demo mode — showing sample data. Run a real scan to see your business.</p>
        </div>
      )}
      {(geoGenerating || geoFailed || jobIdMissingError) && !isDemoMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-50 border-b border-slate-200"
        >
          <div className={`${containerClass} mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap`}>
            <div className="flex items-center gap-2">
              {geoGenerating && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                  <span className="text-sm font-medium text-slate-900">AI visibility analysis in progress</span>
                </>
              )}
              {(geoFailed || jobIdMissingError) && (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-900">{jobIdMissingError || pollingError || 'GEO analysis encountered an issue'}</span>
                </>
              )}
            </div>
            {(geoFailed || jobIdMissingError) && (
              <Button onClick={handleRetryGEO} size="sm" variant="outline" className="border-slate-400 text-slate-700">
                <RefreshCw className="w-4 h-4 mr-1.5" /> Retry GEO
              </Button>
            )}
          </div>
        </motion.div>
      )}

      <div className={`${containerClass} mx-auto px-4 sm:px-6 py-12 sm:py-14`}>
        <div className="space-y-12">

          {/* 1. BUSINESS HEADER */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight tracking-tight">
              {business.name}
            </h1>
            <p className="text-slate-600 text-sm mt-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0 text-slate-500" />
              {address}
            </p>
          </motion.div>

          {/* 2. UNIFIED VISIBILITY REPORT — Professional layout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            <Card className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden min-w-0">
              {/* Report header */}
              <div className="px-6 sm:px-10 pt-8 sm:pt-10 pb-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Visibility Score Report</h2>
                <p className="text-sm text-slate-600 mt-1">Your discoverability across Google Maps and AI search</p>
              </div>

              {/* Score gauges — primary focus */}
              <div className="px-6 sm:px-10 py-8 sm:py-10">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10">
                  <div className="flex flex-col items-center">
                    <ScoreGaugeCard
                      score={meoScore}
                      label="MEO"
                      sublabel="Maps visibility"
                      color="url(#meoGradient)"
                      description="Maps strength vs nearby competitors"
                      showBeta={false}
                      delay={0}
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <ScoreGaugeCard
                      score={geoScore}
                      label="GEO"
                      sublabel="AI visibility"
                      color="url(#geoGradient)"
                      description="AI search visibility"
                      showBeta={false}
                      delay={0.1}
                      onClick={() => setExpandedPanel(expandedPanel === 'geo' ? null : 'geo')}
                      isClickable={geoReady || isLimitedPresence}
                      status={isLimitedPresence ? 'limited_presence' : (geoReady ? 'ok' : (geoGenerating ? 'generating' : derivedGEOStatus))}
                      category={scanData?.geo?.category}
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <ScoreGaugeCard
                      score={finalScore}
                      label="Overall"
                      sublabel={geoScore === null ? "Maps-only" : "Combined"}
                      color="url(#finalGradient)"
                      description="Combined market visibility"
                      showBeta={false}
                      delay={0.2}
                    />
                  </div>
                </div>
                {/* Assessment callout */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <p className="text-sm text-slate-600 text-center max-w-2xl mx-auto leading-relaxed">
                    {finalScore >= 80 ? (
                      <>Strong visibility overall. Maps presence is solid; consider AI-specific optimizations.</>
                    ) : finalScore >= 60 ? (
                      <>Solid foundation. Competitors may have stronger review volume and photo coverage.</>
                    ) : (
                      <>Significant opportunity. Prioritize listing completeness, reviews, and website content.</>
                    )}
                  </p>
                </div>
              </div>

              {/* Insights & recommendations — two-column layout */}
              <div className="border-t border-slate-100 bg-slate-50/40">
                <div className="px-6 sm:px-10 py-6 sm:py-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 min-w-0">
                    {/* Left: Key insight + Quick wins */}
                    <div className="space-y-6">
                      <section>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                          Key Visibility Insight
                        </h3>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {photoCount > 0 && localAvgPhotos != null ? (
                            <><strong>{photoCount} photos</strong> vs. local avg <strong>{Math.round(localAvgPhotos)}</strong>. More photos improve Maps and AI discovery.</>
                          ) : totalReviews != null && localAvgReviews != null ? (
                            <><strong>{totalReviews} reviews</strong> vs. local avg <strong>{Math.round(localAvgReviews)}</strong>. Review volume drives visibility.</>
                          ) : meoExplain?.optimizationTips?.[0] ? (
                            meoExplain.optimizationTips[0]
                          ) : (
                            <>Complete your Google Business Profile to improve visibility.</>
                          )}
                        </p>
                      </section>
                      <section>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Visibility Wins</h3>
                        <ul className="space-y-2.5">
                          {(() => {
                            const defaults = ['Add 20+ photos to your listing', 'Respond to reviews regularly', 'Add structured data to your website', 'Improve review volume'];
                            const fromScan = (meoExplain?.optimizationTips?.slice(0, 2) || []).map(t => t.length > 60 ? t.slice(0, 60) + '…' : t);
                            const combined = [...fromScan, ...defaults];
                            const seen = new Set();
                            const items = combined.filter(t => {
                              const key = t.toLowerCase().replace(/\s+/g, ' ').trim();
                              if (seen.has(key)) return false;
                              seen.add(key);
                              return true;
                            }).slice(0, 4);
                            return items.map((text, i) => (
                              <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{text}</span>
                              </li>
                            ));
                          })()}
                        </ul>
                      </section>
                    </div>

                    {/* Right: Data table + Score interpretation */}
                    <div className="space-y-6">
                      <section>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Data Used in This Report</h3>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-4">
                          {[
                            { label: 'Rating', value: rating != null ? rating.toFixed(1) : '—' },
                            { label: 'Reviews', value: totalReviews != null ? totalReviews.toLocaleString() : '—' },
                            { label: 'Photos', value: photoCount ?? '—' },
                            { label: 'Website', value: (meoExplain?.hasWebsite ?? !!(business?.website || business?.websiteUri)) ? 'Yes' : 'No' },
                            { label: 'Phone', value: (meoExplain?.hasPhone ?? !!(business?.international_phone_number || business?.formatted_phone_number || business?.internationalPhoneNumber)) ? 'Yes' : 'No' },
                            { label: 'Hours', value: (meoExplain?.hasHours ?? !!(business?.opening_hours)) ? 'Complete' : 'Missing' }
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex flex-col items-center justify-center text-center min-h-[76px]">
                              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{label}</p>
                              <p className="text-sm font-semibold text-slate-900 mt-1.5 whitespace-nowrap">{String(value)}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                      <section>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">What Your Score Means</h3>
                        <ul className="space-y-2 text-sm text-slate-700">
                          <li className="flex gap-2">
                            <span className="font-semibold text-slate-900 shrink-0">MEO {meoScore}:</span>
                            <span>{competitorCount > 0 && marketContext ? <>Better than ~<AnimatedCounter value={reviewsPercentile} />% of local competitors.</> : 'Based on listing completeness and signals.'}</span>
                          </li>
                          {geoScore != null && (
                            <li className="flex gap-2">
                              <span className="font-semibold text-slate-900 shrink-0">GEO {geoScore}:</span>
                              <span>Likelihood AI search engines reference your business.</span>
                            </li>
                          )}
                          {totalReviews != null && totalReviews < 200 && (
                            <li className="text-slate-600">Market leaders: 400+ reviews, 60+ photos. You: {totalReviews} reviews, {photoCount} photos.</li>
                          )}
                        </ul>
                      </section>
                    </div>
                  </div>
                </div>
              </div>

              {/* GEO breakdown (expandable) */}
              {geoReady && scanData?.geo?.explain && (
                <details className="group border-t border-slate-100">
                  <summary className="flex items-center justify-between cursor-pointer px-6 sm:px-10 py-4 text-sm font-medium text-slate-600 hover:bg-slate-50/50 list-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-indigo-500" />
                      {scanData.geo.explain.version === 'v3' ? `GEO breakdown (${scanData.geo.explain.geoScore} — ${scanData.geo.explain.grade})` : `View ${scanData.geo.explain.queries?.length || 0} AI prompts tested`}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-6 sm:px-10 py-4 bg-slate-50/50 border-t border-slate-100 max-h-60 overflow-y-auto space-y-4">
                    {scanData.geo.explain.version === 'v3' && scanData.geo.explain.components?.length > 0 && (
                      <ul className="space-y-1.5 text-sm">
                        {scanData.geo.explain.components.map((c, i) => (
                          <li key={i} className="flex items-center justify-between gap-2">
                            <span className="text-slate-700">{c.name}</span>
                            <span className="font-medium text-slate-900">{c.score}/{c.max}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {scanData.geo.explain.version !== 'v3' && (scanData.geo.explain.queries || []).map((q, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        {q.mentioned ? <Check className="w-4 h-4 text-green-600 shrink-0" /> : <X className="w-4 h-4 text-slate-400 shrink-0" />}
                        <span className="text-slate-700">"{q.query}"</span>
                        {q.rank != null && <Badge variant="outline" className="text-xs">#{q.rank}</Badge>}
                      </li>
                    ))}
                  </div>
                </details>
              )}
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="space-y-14"
          >

            {/* DEBUG INFO SECTION (optional) - enabled via ?debug=1 */}
            {isDebugMode && scanData.meoBackendData && (
              <Card className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-yellow-900 mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Debug Info (Backend Verification)
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-yellow-900">Debug Stamp:</p>
                      <p className="text-yellow-700 font-mono text-xs break-all">
                        {scanData.meoBackendData.debugStamp}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-yellow-900">Run ID:</p>
                      <p className="text-yellow-700 font-mono text-xs break-all">
                        {scanData.meoBackendData.runId}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-yellow-900">Scoring Version:</p>
                      <p className="text-yellow-700 font-mono text-xs">
                        {scanData.meoBackendData.scoringVersion}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-yellow-600 mt-3 italic flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    This confirms you're seeing LIVE backend data. Run another scan and these values should change.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 7. LOCKED — Competitor Breakdown */}
            <BlurredUnlockSection onUnlock={handleBookACall} title="Competitor Visibility Breakdown" isAdminView={isAdminView}>
              <MEOScoreWhyPanel placeId={meoExplainPlaceId} isAdminView={isAdminView} />
            </BlurredUnlockSection>

            {/* 8. LOCKED — AI Entity Strength */}
            {isLimitedPresence ? (
              <BlurredUnlockSection onUnlock={handleBookACall} title="AI Entity Strength" isAdminView={isAdminView}>
                <GEOLimitedPresencePanel 
                  scanData={scanData}
                  fallbackScore={limitedPresenceFallbackScore}
                  isTimeoutFallback={isTimeoutFallback}
                />
              </BlurredUnlockSection>
            ) : geoGenerating && !geoFailed ? (
              <GEOGeneratingPlaceholder debugInfo={pollDebug} />
            ) : geoReady ? (
<BlurredUnlockSection onUnlock={handleBookACall} title="AI Entity Strength" isAdminView={isAdminView}>
                <GEOWhyPanel
                  explain={scanData?.geo?.explain ?? null}
                  score={scanData?.geo?.score ?? null}
                  category={scanData?.geo?.category ?? null}
                  scanData={scanData}
                  onRegenerate={null}
                  isRegenerating={false}
                />
              </BlurredUnlockSection>
            ) : (
<BlurredUnlockSection onUnlock={handleBookACall} title="AI Entity Strength" isAdminView={isAdminView}>
                <GEOWhyPanel
                  explain={null}
                  score={null}
                  category={scanData?.geo?.category ?? null}
                  scanData={scanData}
                  onRegenerate={handleRegenerateExplain}
                  isRegenerating={isRegenerating}
                />
              </BlurredUnlockSection>
            )}

            {expandedPanel === 'geo' && (
              <GEOStatusCard
                geo={scanData?.geo}
                onRetry={async () => {
                  toast.info('Retrying GEO analysis…');
                  window.location.reload();
                }}
                onFixCategory={async (categoryLabel, categoryKey) => {
                  toast.info(`Setting category to ${categoryLabel}…`);
                  window.location.reload();
                }}
                onOpenWhyPanel={() => {}}
              />
            )}

            {/* 9. LOCKED — Revenue Opportunity */}
            <BlurredUnlockSection onUnlock={handleBookACall} title="Discovery & Revenue Opportunity" isAdminView={isAdminView}>
              <div className="p-6 bg-white rounded-xl border border-slate-200">
                <p className="text-sm text-slate-700 font-medium">Estimated discovery traffic opportunity based on your market and competitor gaps.</p>
              </div>
            </BlurredUnlockSection>

            {/* 10. FINAL CTA — hidden in admin view */}
            {!isAdminView && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <div className="rounded-2xl bg-slate-900 p-8 sm:p-10 text-center">
                  <h3 className="text-xl font-bold text-white mb-2">Unlock Your Full Visibility Plan</h3>
                  <p className="text-slate-300 text-sm mb-6 max-w-md mx-auto">Get a personalized 20-minute visibility audit with actionable recommendations.</p>
                  <Button
                    onClick={handleBookACall}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3 rounded-xl shadow-lg"
                  >
                    Book Your Visibility Audit
                  </Button>
                </div>
              </motion.div>
            )}

          </motion.div>

          <svg width="0" height="0" style={{ position: 'absolute' }}>
            <defs>
              <linearGradient id="meoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
              <linearGradient id="seoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22C55E" />
                <stop offset="100%" stopColor="#16A34A" />
              </linearGradient>
              <linearGradient id="geoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
              <linearGradient id="finalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
          </svg>

          <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

        </div>
      </div>

    </motion.div>
  );
}