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

const BlurredUnlockSection = ({ children, onUnlock, title }) => (
  <div>
    {title && (
      <h3 className="text-lg font-bold text-slate-900 mb-3">{title}</h3>
    )}
    <div className="relative rounded-xl overflow-hidden">
      <div className="blur-md pointer-events-none select-none [&_*]:pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm">
      <p className="text-slate-700 font-semibold mb-3 text-center px-4">
        Book a Strategy Session to unlock
      </p>
      <Button
        onClick={onUnlock}
        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"
      >
        <Phone className="w-4 h-4" />
        Book a Strategy Session
      </Button>
    </div>
    </div>
  </div>
);

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
  
  // Check if it's valid v2 with queries
  const isValidV2 = 
    explainData.version === 'v2' && 
    Array.isArray(explainData.queries) && 
    explainData.queries.length > 0;
  
  if (!isValidV2) return null;
  
  return explainData;
}

/**
 * Check if scanData has valid v2 GEO explain
 */
function hasValidExplainV2(explain) {
  return normalizeExplain(explain) !== null;
}

export default function ScanResults() {
  const [scanData, setScanData] = useState(null);
  const [planRecommendation, setPlanRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [scanId, setScanId] = useState(null);
  const [expandedPanel, setExpandedPanel] = useState(null); // 'meo' | 'geo' | null
  const [isRegenerating, setIsRegenerating] = useState(false);
  const recoveryJobRequestedRef = useRef(false);
  const [lastHttpStatus, setLastHttpStatus] = useState(null);
  const [lastErrorMessage, setLastErrorMessage] = useState(null);
  const [lastResponseKeys, setLastResponseKeys] = useState(null);
  const [scanResponseKeys, setScanResponseKeys] = useState(null);
  const [geoResponseKeys, setGeoResponseKeys] = useState(null);
  const navigate = useNavigate();

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
    
    // Priority 1: v2 explain with queries = ready
    if (geo.explain?.version === 'v2' && 
        Array.isArray(geo.explain.queries) && 
        geo.explain.queries.length > 0) {
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
  // GEO READINESS: Only show GEO score when explain is complete
  // ============================================================================
  const geoReady = hasValidExplain && typeof scanData?.geo?.score === 'number';
  const geoGenerating = !geoReady && (isPollingLoading || pollStatus === 'polling');
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

      if (!stored) {
        setIsLoading(false);
        return;
      }

      try {
        const data = JSON.parse(stored);
        const finalScoreKey = data.scores?.overall !== undefined ? 'overall' : 'final';
        const geoScoreValid = data?.scores?.geo === null || typeof data?.scores?.geo === 'number';
        const overallValid = data?.scores?.[finalScoreKey] === null || typeof data?.scores?.[finalScoreKey] === 'number';
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
      const newJobId = result?.explainJobId ?? result?.jobId;

      if (!response.ok || !newJobId) {
        const errMsg = result?.error?.message || result?.message || `HTTP ${response.status}`;
        throw new Error(errMsg);
      }

      toast.success('Regenerating GEO analysis...');

      // Update scanData with new jobId and clear old explain
      setScanData(prev => ({
        ...prev,
        geo: {
          ...prev.geo,
          explainJobId: newJobId,
          explain: null // Clear old explain so polling starts
        }
      }));

      // Persist to sessionStorage
      const updated = {
        ...scanData,
        geo: {
          ...scanData.geo,
          explainJobId: newJobId,
          explain: null
        }
      };
      sessionStorage.setItem('scanResults', JSON.stringify(updated));

      setIsRegenerating(false);

      // Polling will automatically start due to new jobId and missing explain
    } catch (error) {
      console.error('Failed to regenerate explain:', error);
      toast.error(`Failed to regenerate: ${error.message}`);
      setIsRegenerating(false);
    }
  };

  const isDebugMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';

  const meoExplainPlaceId =
    scanData?.meoBackendData?.place_id ||
    scanData?.meoBackendData?.gbpFacts?.place_id ||
    scanData?.business?.place_id ||
    null;

  // Unified loading screen: same UI for initial load AND GEO analysis
  // Ensures only "AI visibility analysis in progress" shows from scan start until complete
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen bg-slate-50 flex items-center justify-center"
      >
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-medium">AI visibility analysis in progress</p>
          <p className="text-slate-500 text-xs mt-1">Results will appear when the scan is complete</p>
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
        className="min-h-screen bg-slate-50 flex items-center justify-center p-4"
      >
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
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ============================================================================
  // FULL-GATE RENDERING: Stay on loading screen until ALL scans complete
  // Do not show partial results (MEO/GEO/Overall) until GEO analysis finishes
  // ============================================================================
  if (geoGenerating) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen bg-slate-50 flex items-center justify-center"
      >
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-medium">AI visibility analysis in progress</p>
          <p className="text-slate-500 text-xs mt-1">Results will appear when the scan is complete</p>
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
  const jobIdMissingError = pollDiagnosis.code === DiagnosisCodes.GEO_JOBID_MISSING
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

        // Backend returns explainJobId (or jobId for backward compat)
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
          // Polling starts automatically via useGEOExplainPolling when explainJobId is set
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
          <div className="max-w-[1040px] mx-auto px-6 py-3.5 flex items-center justify-between">
            <AGSLogo size="md" linkTo="/" />
            <div className="flex items-center gap-2">
              {scanId && <ShareButton scanId={scanId} />}
              <Button onClick={handleNewScan} variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-1.5" /> New Scan
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-[1040px] mx-auto px-6 py-16">
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
              <BlurredUnlockSection onUnlock={handleBookACall}>
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

            {/* CTA */}
            <div className="bg-slate-900 rounded-2xl p-8 text-center text-white">
               <h2 className="text-2xl font-bold mb-4">Ready to discuss your ranking?</h2>
               <Button onClick={handleBookACall} className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-8 py-4 h-auto text-lg rounded-xl">
                  Book a Strategy Session
               </Button>
            </div>

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100"
    >
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-[1040px] mx-auto px-6 py-3.5 flex items-center justify-between">
          <AGSLogo size="md" linkTo="/" />

          <div className="flex items-center gap-2">
            <Button
              onClick={handleBookACall}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-5 py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Book a Strategy Session
            </Button>
            {scanId && <ShareButton scanId={scanId} />}
            <Button
              onClick={handleNewScan}
              variant="outline"
              size="sm"
              className="text-slate-700 border-slate-300 hover:bg-slate-100 rounded-lg h-9 text-sm transition-all"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">New Scan</span>
            </Button>
          </div>
        </div>
      </div>

      {/* GEO loading/error banner - shown when GEO is still analyzing or failed */}
      {(geoGenerating || geoFailed || jobIdMissingError) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-50 border-b border-slate-200"
        >
          <div className="max-w-[1040px] mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              {geoGenerating && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                  <span className="text-sm font-medium text-slate-900">
                    AI visibility analysis in progress — results will update automatically
                  </span>
                </>
              )}
              {(geoFailed || jobIdMissingError) && (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-900">
                    {jobIdMissingError || pollingError || 'GEO analysis encountered an issue'}
                  </span>
                </>
              )}
            </div>
            {(geoFailed || jobIdMissingError) && (
              <Button
                onClick={handleRetryGEO}
                size="sm"
                variant="outline"
                className="border-slate-400 text-slate-700 hover:bg-slate-100"
              >
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Retry GEO
              </Button>
            )}
          </div>
        </motion.div>
      )}

      <div className="max-w-[1040px] mx-auto px-6 py-16">
        <div className="space-y-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-5"
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight">
              {business.name}
            </h1>
            
            <p className="text-slate-500 text-base flex items-center justify-center gap-2">
              <MapPin className="w-4 h-4" />
              {business.address || business.formattedAddress}
            </p>

            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-full shadow-sm">
              <Sparkles className="w-4 h-4 text-slate-600" />
              <span className="text-sm text-slate-900 font-medium">
                Ranks higher than <span className="font-bold"><AnimatedCounter value={percentile} />%</span> of competitors
              </span>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Button
                onClick={handleBookACall}
                className="w-full max-w-md mx-auto h-16 text-xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:via-teal-700 hover:to-emerald-700 text-white rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
              >
                <Phone className="w-7 h-7" />
                Book a Strategy Session
              </Button>
            </motion.div>
          </motion.div>

          <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-12"
          >
            <Card className="bg-white border border-slate-200 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 sm:p-8 lg:p-10">
                
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-8">
                  <ScoreGaugeCard
                    score={meoScore}
                    label="MEO"
                    sublabel="Maps"
                    color="url(#meoGradient)"
                    description="Google Business Profile optimization score"
                    showBeta={false}
                    delay={0}
                  />
                  <ScoreGaugeCard
                    score={geoScore}
                    label="GEO"
                    sublabel="AI Visibility"
                    color="url(#geoGradient)"
                    description="AI search engine presence score"
                    showBeta={false}
                    delay={0.1}
                    onClick={() => setExpandedPanel(expandedPanel === 'geo' ? null : 'geo')}
                    isClickable={geoReady || isLimitedPresence}
                    status={isLimitedPresence ? 'limited_presence' : (geoReady ? 'ok' : (geoGenerating ? 'generating' : derivedGEOStatus))}
                    category={scanData?.geo?.category}
                  />
                  <ScoreGaugeCard
                    score={finalScore}
                    label="Overall"
                    sublabel={geoScore === null ? "Maps-only" : "Combined"}
                    color="url(#finalGradient)"
                    description={geoScore === null
                      ? "Overall combines Maps (MEO) + AI Visibility (GEO). Finish GEO setup to unlock combined score."
                      : "Combined MEO + GEO visibility score"
                    }
                    showBeta={false}
                    delay={0.2}
                  />
                </div>


                {/* Simplified progress indicator */}
                <div className="pt-6 border-t border-slate-100">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: getActiveGradient() }}
                      initial={{ width: 0 }}
                      animate={{ width: `${optimizationPercentage}%` }}
                      transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

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

            {/* WHY THIS SCORE SECTIONS - Blurred with unlock CTA */}
            <BlurredUnlockSection onUnlock={handleBookACall} title="MEO Score Breakdown">
              <MEOScoreWhyPanel placeId={meoExplainPlaceId} />
            </BlurredUnlockSection>

            {isLimitedPresence ? (
              <BlurredUnlockSection onUnlock={handleBookACall} title="GEO Score Breakdown">
                <GEOLimitedPresencePanel 
                  scanData={scanData}
                  fallbackScore={limitedPresenceFallbackScore}
                  isTimeoutFallback={isTimeoutFallback}
                />
              </BlurredUnlockSection>
            ) : geoGenerating && !geoFailed ? (
              <GEOGeneratingPlaceholder debugInfo={pollDebug} />
            ) : geoReady ? (
              <BlurredUnlockSection onUnlock={handleBookACall} title="GEO Score Breakdown">
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
              <BlurredUnlockSection onUnlock={handleBookACall} title="GEO Score Breakdown">
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

            {/* Insights & Tips - Blurred with unlock CTA */}
            <BlurredUnlockSection onUnlock={handleBookACall} title="Insights & Tips for Better Scores">
              <div className="space-y-6 p-6 bg-white rounded-2xl border border-slate-200 shadow-lg">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-slate-600" />
                  Insights & Tips for Better Scores
                </h2>
                <div className="space-y-3">
                  <Card className="border border-slate-200">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-slate-900 text-sm mb-1">What This Means</h3>
                          <p className="text-xs text-slate-600">
                            Your visibility score reflects how well AI and local search can find and recommend your business.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border border-slate-200">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <Globe className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-slate-900 text-sm mb-1">Boost AI Visibility</h3>
                          <p className="text-xs text-slate-600">
                            Add structured data and FAQ pages to help AI engines recommend your business.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border border-slate-200">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <MapPin className="w-5 h-5 text-emerald-500 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-slate-900 text-sm mb-1">Optimize Google Business Profile</h3>
                          <p className="text-xs text-slate-600">
                            Complete all GBP sections, add photos, respond to reviews, and post weekly updates.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border border-slate-200">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <Star className="w-5 h-5 text-slate-500 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-slate-900 text-sm mb-1">Build Review Authority</h3>
                          <p className="text-xs text-slate-600">
                            Request more reviews and respond professionally to all feedback.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </BlurredUnlockSection>

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
                <stop offset="0%" stopColor="var(--theme-gradient-start)" />
                <stop offset="100%" stopColor="var(--theme-gradient-end)" />
              </linearGradient>
              <linearGradient id="finalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
          </svg>

          <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

        </div>
      </div>

      <motion.div
        className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-t border-slate-700"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <div className="max-w-[1040px] mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
            <p className="text-base font-bold mb-0.5">
              Ready to discuss your ranking?
            </p>
            <Button
              onClick={handleBookACall}
              className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-10 py-4 h-auto text-lg rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Book a Strategy Session →
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}