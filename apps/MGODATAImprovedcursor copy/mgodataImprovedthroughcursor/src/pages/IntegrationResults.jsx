
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  TrendingUp,
  Star,
  MessageSquare,
  Code,
  Copy,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Target,
  Home,
  Download,
  Share2,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import CircularProgress from '../components/CircularProgress';
import AGSLogo from '../components/AGSLogo';

// ============================================================================
// LOADING STATE COMPONENT
// ============================================================================
const LoadingState = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const steps = [
    { label: 'Analyzing business data', progress: 25 },
    { label: 'Generating schema markup', progress: 50 },
    { label: 'Optimizing FAQs', progress: 75 },
    { label: 'Enhancing reviews', progress: 100 }
  ];

  useEffect(() => {
    let stepIndex = 0;
    const duration = 2000; // 2 seconds total
    const stepDuration = duration / steps.length;

    const intervalId = setInterval(() => {
      if (stepIndex < steps.length) {
        setCurrentStep(steps[stepIndex].label);
        setProgress(steps[stepIndex].progress);
        stepIndex++;
      } else {
        clearInterval(intervalId);
        setTimeout(onComplete, 300);
      }
    }, stepDuration);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/20 flex items-center justify-center">
      <div className="text-center space-y-8 max-w-md px-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-20 h-20 mx-auto"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-2xl">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
        </motion.div>

        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Running AI Optimization...
          </h2>
          <p className="text-slate-600">
            Analyzing and rewriting your business data for maximum visibility
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm font-medium text-slate-700">
            <span>{currentStep || 'Processing'}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CALCULATE REALISTIC IMPROVEMENT POTENTIAL
// ============================================================================
const calculateImprovementPotential = (scanData) => {
  const { business, scores } = scanData;
  const currentScore = Math.round(scores.final);

  // Initialize improvement areas
  let potentialGains = 0;
  let improvementReasons = [];

  // MEO Improvement Potential (max 15 points)
  const meoScore = scores.meo || 0;
  if (meoScore < 100) {
    // Missing or incomplete business information
    if (!business.internationalPhoneNumber || business.internationalPhoneNumber === 'Not available') {
      potentialGains += 3;
      improvementReasons.push('Add phone number (+3pts)');
    }

    if (!business.websiteUri || business.websiteUri === 'Not available') {
      potentialGains += 3;
      improvementReasons.push('Add website (+3pts)');
    }

    // Review optimization
    if (business.userRatingCount < 50) {
      const reviewGain = Math.min(4, Math.floor((50 - business.userRatingCount) / 10));
      if (reviewGain > 0) {
        potentialGains += reviewGain;
        improvementReasons.push(`Increase reviews to 50+ (+${reviewGain}pts)`);
      }
    }

    if (business.rating < 4.5) {
      const ratingGain = Math.min(3, Math.floor((4.5 - business.rating) * 2));
      if (ratingGain > 0) {
        potentialGains += ratingGain;
        improvementReasons.push(`Improve rating to 4.5+ (+${ratingGain}pts)`);
      }
    }

    // Hours/operational info
    if (meoScore < 85 && meoScore > 50) { // Only add if there's significant room for improvement but not too low
      potentialGains += 2;
      improvementReasons.push('Complete business hours (+2pts)');
    }
  }

  // GEO Improvement Potential (max 15 points)
  const geoScore = typeof scanData?.geo?.score === 'number' ? scanData.geo.score : 0;
  const geoDetails = scanData.geoDetails;

  if (geoScore < 100) {
    // Check AI visibility gaps
    if (geoDetails?.method === 'real-ai-check' && geoDetails.aiResults) {
      const avgVisibility = geoDetails.details?.aiVisibility || 0;

      // Low AI visibility = high improvement potential
      if (avgVisibility < 50) {
        potentialGains += 8;
        improvementReasons.push('Optimize for AI search engines (+8pts)');
      } else if (avgVisibility < 75) {
        potentialGains += 5;
        improvementReasons.push('Improve AI visibility (+5pts)');
      } else if (avgVisibility < 90) {
        potentialGains += 3;
        improvementReasons.push('Fine-tune AI presence (+3pts)');
      }
    } else {
      // Fallback if no AI check data, or if it's the demo fallback
      // Base on geoScore for general AI/online presence
      if (geoScore < 60) {
        potentialGains += 7;
        improvementReasons.push('Optimize for AI search (+7pts)');
      } else if (geoScore < 80) {
        potentialGains += 4;
        improvementReasons.push('Improve AI visibility (+4pts)');
      }
    }

    // Content completeness
    const dataCompleteness = geoDetails?.details?.dataCompleteness || 0;
    if (dataCompleteness < 40) {
      potentialGains += 4;
      improvementReasons.push('Add structured data (+4pts)');
    } else if (dataCompleteness < 50) {
      potentialGains += 2;
      improvementReasons.push('Enhance structured data (+2pts)');
    }
  }

  // Additional factors (max 5 points)
  // Business category optimization
  if (business.types?.length < 3) {
    potentialGains += 2;
    improvementReasons.push('Optimize business categories (+2pts)');
  }

  // Description/content optimization
  if (geoScore < 75 || meoScore < 75) {
    potentialGains += 3;
    improvementReasons.push('Enhance business description (+3pts)');
  }

  // Cap maximum improvement (realistic expectations)
  // Can't go from low to perfect overnight
  let maxRealisticGain;
  if (currentScore >= 80) {
    maxRealisticGain = 8; // Already strong, limited gains
  } else if (currentScore >= 65) {
    maxRealisticGain = 15; // Good foundation, moderate gains
  } else if (currentScore >= 50) {
    maxRealisticGain = 22; // Needs work, significant gains possible
  } else {
    maxRealisticGain = 28; // Poor state, major gains possible
  }

  potentialGains = Math.min(potentialGains, maxRealisticGain);

  // Calculate new score (can't exceed 100)
  const newScore = Math.min(100, currentScore + potentialGains);

  // Ensure reasons are unique and reasonable given the actual gain
  const finalReasons = [];
  let currentGain = 0;
  for(const reason of improvementReasons) {
      const pointsMatch = reason.match(/\+(\d+)pts/);
      const points = pointsMatch ? parseInt(pointsMatch[1]) : 0;
      if (currentGain + points <= potentialGains) {
          finalReasons.push(reason);
          currentGain += points;
      } else if (currentGain < potentialGains && points > 0) {
          // If we can add a partial point reason
          const remainingPoints = potentialGains - currentGain;
          if (remainingPoints > 0) {
              finalReasons.push(reason.replace(`+${points}pts`, `+${remainingPoints}pts`));
              currentGain += remainingPoints;
          }
          break; // Max gain reached
      }
      if (finalReasons.length >= 5) break; // Limit to top 5
  }


  // Return top 3-5 improvement reasons
  const topReasons = finalReasons.slice(0, 5);

  return {
    currentScore,
    newScore,
    improvement: newScore - currentScore,
    improvementReasons: topReasons,
    percentageGain: ((newScore - currentScore) / currentScore * 100).toFixed(1)
  };
};

// ============================================================================
// ANIMATED COUNTER
// ============================================================================
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function IntegrationResults() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState(null);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [scanData, setScanData] = useState(null);
  const [useFallback, setUseFallback] = useState(false);

  // Fallback demo data
  const fallbackData = {
    business: {
      name: "Demo Business",
      address: "123 Main St, Demo City, ST 12345",
      internationalPhoneNumber: 'Not available',
      websiteUri: 'Not available',
      rating: 4.2,
      userRatingCount: 23,
      types: ['Retail', 'Services']
    },
    scores: {
      meo: 72,
      geo: 68,
      final: 70
    },
    geoDetails: {
      method: 'fallback',
      details: {
        aiVisibility: 45,
        dataCompleteness: 35
      }
    }
  };

  useEffect(() => {
    // Show loading state first
    const timer = setTimeout(() => {
      const stored = sessionStorage.getItem('scanResults');
      if (!stored) {
        console.warn('No scan results found, using fallback data');
        setScanData(fallbackData);
        setUseFallback(true);
      } else {
        try {
          const data = JSON.parse(stored);
          setScanData(data);
          setUseFallback(false);
        } catch (error) {
          console.error('Error parsing scan data:', error);
          setScanData(fallbackData);
          setUseFallback(true);
        }
      }
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingState onComplete={() => setIsLoading(false)} />;
  }

  if (!scanData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
      </div>
    );
  }

  const { business, scores } = scanData;

  // ⚠️ CRITICAL FIX: Calculate realistic improvement based on actual data
  const improvementData = calculateImprovementPotential(scanData);
  const originalScore = improvementData.currentScore;
  const newScore = improvementData.newScore;
  const improvement = improvementData.improvement;

  console.log('📊 Calculated improvement:', improvementData);

  const demoMetrics = [
    {
      label: "AI Search Impressions",
      value: `+${Math.round(15 + (improvement * 0.8))}%`,
      icon: Target,
      color: "text-purple-600",
      bg: "bg-purple-50"
    },
    {
      label: "Map Clicks",
      value: `+${Math.round(10 + (improvement * 0.5))}%`,
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      label: "Local Calls",
      value: `+${Math.round(6 + (improvement * 0.3))}%`,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50"
    }
  ];

  const schemaExample = `{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "${business.name || 'AGS Demo Client'}",
  "address": "${business.address || '8300 Arbor Square Dr, Mason, OH 45040'}",
  "openingHours": "Mo-Fr 09:00-17:00",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "146"
  }
}`;

  const optimizedFAQs = [
    {
      question: "How does AGS improve my business visibility?",
      answer: "We optimize your online presence across Google Maps, Apple Maps, and AI-powered search engines like ChatGPT and Perplexity. By adding structured data, refining your content, and ensuring consistency across platforms, your business appears more frequently when customers search for services like yours."
    },
    {
      question: "When will I start seeing results?",
      answer: "Most businesses notice increased visibility within 2-4 weeks. You'll see more profile views, map clicks, and customer inquiries as search engines recognize your optimized content. Our dashboard tracks these improvements in real-time."
    },
    {
      question: "Does this work with my current Google Business Profile?",
      answer: "Yes. AGS integrates seamlessly with Google Business Profile, Apple Maps, Bing Places, and major directories. We enhance what you already have—no migration or complicated setup required."
    }
  ];

  const enhancedReviews = [
    {
      text: "We saw new customers daily after optimizing with AGS. Our Google profile now ranks first in our area, and calls have doubled.",
      author: "Sarah Mitchell",
      business: "Mitchell's HVAC Services",
      rating: 5
    },
    {
      text: "Finally showing up in AI search results transformed our restaurant. Reservations increased by 60% in just 6 weeks.",
      author: "Michael Rodriguez",
      business: "Casa Rodriguez",
      rating: 5
    },
    {
      text: "The team made optimization easy. We went from page 3 to the top of local maps, and our phone hasn't stopped ringing since.",
      author: "Jennifer Taylor",
      business: "Taylor Legal Group",
      rating: 5
    }
  ];

  const handleCopySchema = () => {
    navigator.clipboard.writeText(schemaExample);
    setCopiedSchema(true);
    toast.success('Schema code copied to clipboard!');
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  const handleExportReport = () => {
    toast.success('Demo report export coming soon!');
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const handleBackToResults = () => {
    if (useFallback) {
      navigate(createPageUrl('Landing'));
    } else {
      navigate(createPageUrl('ScanResults'));
    }
  };

  const CollapsibleSection = ({ id, icon: Icon, title, subtitle, children, iconColor, iconBg, delay = 0 }) => {
    const isExpanded = expandedSection === id;

    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay }}
      >
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setExpandedSection(isExpanded ? null : id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  className={cn("w-14 h-14 rounded-xl flex items-center justify-center shadow-md", iconBg)}
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Icon className={cn("w-7 h-7", iconColor)} />
                </motion.div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900">{title}</CardTitle>
                  <CardDescription className="text-sm mt-1">{subtitle}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                </motion.div>
              </div>
            </div>
          </CardHeader>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <CardContent className="pt-0 pb-6">
                  {children}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/20"
    >
      {/* Lightweight Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm"
      >
        <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AGSLogo size="sm" linkTo="/" />
            <div className="hidden sm:block h-6 w-px bg-slate-200" />
            <Button
              variant="ghost"
              onClick={handleBackToResults}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {useFallback ? 'Back to Home' : 'Back to Initial Scan'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShareLink}
              className="hidden sm:flex"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportReport}
              className="hidden sm:flex"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Badge className="bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border-purple-200 px-4 py-1.5">
              Demo Environment
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-12">
        {/* Live Improvement Wheel Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-12 p-8 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-3xl border-2 border-green-200 shadow-2xl relative overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }} />
          </div>

          <div className="relative z-10">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-slate-900 mb-2">
                Integration Results (Demo)
              </h1>
              <p className="text-slate-600 text-lg">
                Projected improvements based on your current {originalScore}% visibility score
              </p>
            </div>

            {/* Improvement Wheel & Before/After */}
            <div className="flex flex-col lg:flex-row items-center justify-center gap-12 mb-8">
              {/* Circular Progress Wheel */}
              <div className="text-center">
                <p className="text-sm font-semibold text-green-700 mb-4 uppercase tracking-wide">
                  Projected Visibility
                </p>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                >
                  <CircularProgress
                    value={newScore}
                    color="url(#improvementGradient)"
                    size={160}
                    thickness={12}
                  />
                </motion.div>
                <svg width="0" height="0" style={{ position: 'absolute' }}>
                  <defs>
                    <linearGradient id="improvementGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Before/After Comparison */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Current</p>
                  <div className="text-5xl font-bold text-slate-600">{originalScore}%</div>
                </div>
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-green-600"
                >
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </motion.div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-green-700 mb-2 uppercase">After Optimization</p>
                  <div className="text-5xl font-bold text-green-600">{newScore}%</div>
                </div>
                <Badge className="ml-4 bg-green-600 text-white border-0 text-lg px-4 py-2 shadow-lg">
                  +{improvement}%
                </Badge>
              </div>
            </div>

            {/* Improvement Breakdown - New Section */}
            {improvementData.improvementReasons.length > 0 && (
              <div className="mb-8 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-green-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-600" />
                  Projected Improvements Based on Your Data
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {improvementData.improvementReasons.map((reason, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + idx * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-green-50 rounded-xl border border-green-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-700 font-medium">{reason}</span>
                    </motion.div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-4 text-center">
                  * Projected gains based on current visibility gaps in your Google Business Profile and AI search presence
                </p>
              </div>
            )}

            {/* Sub-Metrics with Staggered Animation */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-green-200">
              {demoMetrics.map((metric, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className={cn("p-4 rounded-xl text-center", metric.bg)}
                >
                  <metric.icon className={cn("w-6 h-6 mx-auto mb-2", metric.color)} />
                  <p className={cn("text-2xl font-bold mb-1", metric.color)}>
                    {metric.value}
                  </p>
                  <p className="text-sm font-medium text-slate-600">{metric.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Section Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-12" />

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-10 text-center"
        >
          <div className="inline-flex items-center gap-3 mb-4 px-6 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full border-2 border-purple-200">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-bold text-purple-700 uppercase tracking-wide">Optimization Details</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            AI Optimization Results
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Explore the specific improvements our AI made to boost your visibility
          </p>
        </motion.div>

        {/* Collapsible Sections with Staggered Fade-In */}
        <div className="space-y-6">
          {/* Customer Success Stories */}
          <CollapsibleSection
            id="reviews"
            icon={Star}
            title="Customer Success Stories"
            subtitle="Real testimonials optimized for AI search engines"
            iconColor="text-amber-600"
            iconBg="bg-gradient-to-br from-amber-100 to-orange-100"
            delay={0.1}
          >
            <div className="space-y-4">
              {enhancedReviews.map((review, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200"
                >
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 leading-relaxed mb-4 font-medium">
                    "{review.text}"
                  </p>
                  <div className="flex items-center gap-3 pt-3 border-t border-amber-200">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-md">
                      {review.author.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{review.author}</p>
                      <p className="text-sm text-slate-500">{review.business}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Optimized FAQs */}
          <CollapsibleSection
            id="faqs"
            icon={MessageSquare}
            title="AI-Optimized FAQs"
            subtitle="Questions rewritten to rank in voice and AI search"
            iconColor="text-purple-600"
            iconBg="bg-gradient-to-br from-purple-100 to-indigo-100"
            delay={0.2}
          >
            <div className="space-y-4">
              {optimizedFAQs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-5 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200"
                >
                  <h4 className="font-bold text-slate-900 mb-2">{faq.question}</h4>
                  <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                </motion.div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Structured Data Added */}
          <CollapsibleSection
            id="schema"
            icon={Code}
            title="Structured Data Added"
            subtitle="Schema markup for enhanced search visibility"
            iconColor="text-blue-600"
            iconBg="bg-gradient-to-br from-blue-100 to-indigo-100"
            delay={0.3}
          >
            <div>
              <div className="bg-slate-900 rounded-xl p-5 overflow-x-auto shadow-inner mb-4">
                <pre className="text-sm text-green-400 font-mono leading-relaxed">
                  {schemaExample}
                </pre>
              </div>
              <Button
                onClick={handleCopySchema}
                variant="outline"
                className="w-full sm:w-auto border-2 hover:bg-blue-50 hover:border-blue-300 transition-all"
              >
                {copiedSchema ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                    <span className="text-green-700 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    <span className="font-semibold">Copy Schema Snippet</span>
                  </>
                )}
              </Button>
            </div>
          </CollapsibleSection>
        </div>

        {/* Section Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-16" />

        {/* Bottom Call-to-Action (Conversion Section) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="p-10 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-3xl border-2 border-purple-200 text-center shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle, #8b5cf6 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }} />
          </div>

          <div className="relative z-10">
            <h3 className="text-3xl font-bold text-slate-900 mb-4">
              Ready to Activate Real Optimization?
            </h3>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              These results are part of our demo environment. Connect your real profile to activate live optimization across Google, Apple Maps, and AI search engines.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-10 py-7 text-lg shadow-lg hover:shadow-2xl transition-all rounded-2xl">
                  Connect Real Account →
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="border-2 border-purple-300 hover:bg-purple-50 font-bold px-10 py-7 text-lg rounded-2xl"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Re-run Demo
                </Button>
              </motion.div>
            </div>
            <p className="text-sm text-slate-500 mt-6">
              Start for $0.99 • No commitment • Cancel anytime
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
