import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Mail, Target, Sparkles, Search, Shield, Clock, CreditCard, Brain, BarChart, TrendingUp, ArrowRight, Users, Zap, Star, Globe, ArrowDown, Play, Loader2, CheckCircle2, AlertTriangle, Info, Building, MessageSquare, MessageCircle, X, Phone, Trophy } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getGeoCommandCenterUrl } from '@/config/api';
import MarketingHeader from '../components/MarketingHeader';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import AGSLogo from '../components/AGSLogo';
import AnimatedBackground from '../components/AnimatedBackground';
import { motion } from 'framer-motion';
import ScanCounter from '../components/ScanCounter';
import FAQSection from '../components/cms/FAQSection';
import SEOHead from '../components/cms/SEOHead';
import FrontendOnlyScanner from '../components/scanner/FrontendOnlyScanner';
import { SendEmail } from '@/api/integrations';
import ReportPreviewPopup from '../components/ReportPreviewPopup';

if (typeof document !== 'undefined') {
  document.documentElement.style.scrollBehavior = 'smooth';
}

// Global country list
const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Australia", "Germany", "France",
  "Spain", "Italy", "Netherlands", "Belgium", "Switzerland", "Austria",
  "Sweden", "Norway", "Denmark", "Finland", "Ireland", "Portugal", "Poland",
  "Japan", "South Korea", "Singapore", "Hong Kong", "Taiwan", "China",
  "India", "United Arab Emirates", "Saudi Arabia", "Israel", "Turkey",
  "Brazil", "Mexico", "Argentina", "Chile", "Colombia",
  "South Africa", "Nigeria", "Kenya", "Egypt",
  "New Zealand", "Philippines", "Thailand", "Malaysia", "Indonesia", "Vietnam"
].sort();

// ============================================================================
// PRICING CONFIG
// ============================================================================
// import PricingSection from '../components/PricingSection'; // Replaced by AgencyPackages

// ============================================================================
// HERO SECTION
// ============================================================================
function HeroSection({ scanRef, businessName, url, onlineResult }) {
  const [isHoveringButton, setIsHoveringButton] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [popupPos, setPopupPos] = useState('top');
  const buttonRef = useRef(null);
  const navigate = useNavigate();

  const checkPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      if (rect.top < 420) {
        setPopupPos('bottom');
      } else {
        setPopupPos('top');
      }
    }
  }, []);

  const handleMouseEnterButton = () => {
    checkPosition();
    setIsHoveringButton(true);
  };

  const scrollToScan = useCallback(() => {
    const tryScroll = (attempt = 0) => {
      if (scanRef.current) {
        scanRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (attempt < 5) {
        requestAnimationFrame(() => tryScroll(attempt + 1));
      }
    };
    tryScroll();
  }, []);

  const handleMouseMove = (e) => {
    // Simple parallax effect
    const { clientX, clientY } = e;
    const x = (clientX / window.innerWidth - 0.5) * 20;
    const y = (clientY / window.innerHeight - 0.5) * 20;
    setMousePosition({ x, y });
  };

  return (
    <section 
      className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-visible"
      onMouseMove={handleMouseMove}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50/30" />
      <AnimatedBackground />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ x: mousePosition.x * -0.5, y: mousePosition.y * -0.5 }}
            transition={{ duration: 0.6 }}
            className="mb-6 flex flex-wrap justify-center items-center gap-4 relative z-30"
          >
            <Badge className="relative z-[10000] bg-slate-900 text-white px-6 py-2 text-sm font-bold rounded-full shadow-lg flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              ELITE AI VISIBILITY AGENCY
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ x: mousePosition.x * 1, y: mousePosition.y * 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-tight mb-6 px-4"
          >
            Are You <span className="text-theme-gradient">Invisible to AI?</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ x: mousePosition.x * 0.5, y: mousePosition.y * 0.5 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-xl sm:text-2xl text-slate-600 max-w-3xl mx-auto mb-12 px-4 leading-relaxed font-medium"
          >
            Businesses are losing leads because they’re invisible to AI. We audit your visibility, fix what’s broken, and build an AI-optimized digital footprint that drives real revenue.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12 relative z-[10002]"
          >
            <div 
              className="relative"
              ref={buttonRef}
              onMouseEnter={handleMouseEnterButton}
              onMouseLeave={() => setIsHoveringButton(false)}
              onClick={handleMouseEnterButton} // For mobile tap
            >
              <ReportPreviewPopup 
                isVisible={isHoveringButton} 
                position={popupPos} 
                businessName={businessName} 
                url={url} 
                scanMode="local"
              />
              
              <motion.div
                animate={isHoveringButton ? { scale: 1.05 } : { scale: [1, 1.03, 1] }}
                transition={isHoveringButton ? { duration: 0.2 } : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Button
                  onClick={scrollToScan}
                  className="bg-theme-gradient text-white px-10 py-7 text-lg font-bold rounded-[16px] shadow-2xl hover:shadow-lg transition-all relative overflow-hidden"
                >
                  <Zap className="w-6 h-6 mr-2 relative z-10" />
                  <span className="relative z-10">Run Free AI Visibility Scan</span>
                  <ArrowDown className="w-5 h-5 ml-2 animate-bounce relative z-10" />
                  
                  {/* Shine Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                </Button>
              </motion.div>
            </div>

            <Button
                onClick={() => { window.location.href = createPageUrl('GetSupport'); }}
                variant="outline"
                className="px-10 py-7 text-lg font-bold rounded-[16px] border-2 border-slate-300 hover:border-slate-900 text-slate-700 hover:text-slate-900 transition-all hover:bg-transparent"
              >
                <Users className="w-5 h-5 mr-2" />
                Book a Strategy Call
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
          </motion.div>

          {/* Visibility Comparison */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10 max-w-4xl mx-auto">
             {/* Google Search - You are here */}
             <div className="flex-1 w-full sm:max-w-md">
               <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                 <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2 text-blue-600">
                     <Search className="w-5 h-5" />
                     <span className="font-bold text-sm">Google Search</span>
                   </div>
                   <div className="flex items-center gap-1 text-green-600">
                     <Check className="w-4 h-4" />
                     <span className="text-xs font-semibold">You are here</span>
                   </div>
                 </div>
                 <div className="space-y-3">
                   <div className="flex items-start gap-3">
                     <div className="w-10 h-10 bg-blue-600 rounded flex-shrink-0"></div>
                     <div className="flex-1 space-y-2">
                       <div className="h-3 bg-blue-600 rounded w-3/4"></div>
                       <div className="h-2 bg-slate-200 rounded w-full"></div>
                       <div className="h-2 bg-slate-200 rounded w-5/6"></div>
                     </div>
                   </div>
                   <div className="flex gap-2">
                     <div className="h-2 bg-amber-400 rounded w-16"></div>
                     <div className="h-2 bg-slate-200 rounded w-12"></div>
                     <div className="h-2 bg-slate-200 rounded w-16"></div>
                   </div>
                 </div>
               </div>
             </div>

             {/* ChatGPT Answer - You are missing */}
             <div className="flex-1 w-full sm:max-w-md">
               <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                 <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2 text-purple-600">
                     <MessageCircle className="w-5 h-5" />
                     <span className="font-bold text-sm">ChatGPT Answer</span>
                   </div>
                   <div className="flex items-center gap-1 text-red-600">
                     <X className="w-4 h-4" />
                     <span className="text-xs font-semibold">You are missing</span>
                   </div>
                 </div>
                 <div className="flex flex-col items-center justify-center py-8 text-center">
                   <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                     <MessageCircle className="w-6 h-6 text-slate-400" />
                   </div>
                   <p className="text-sm font-medium text-slate-700 mb-1">Your business doesn't appear</p>
                   <p className="text-xs text-slate-500">AI can't find or recommend you</p>
                 </div>
               </div>
             </div>
          </div>

          </div>
          </div>
    </section>
  );
}

// ============================================================================
// HOW IT WORKS SECTION
// ============================================================================
const HowItWorksSection = () => {
  const steps = [
    {
      number: '1',
      icon: Search,
      title: 'Scan & Audit',
      description: 'We scan your listings across Google, Apple Maps, Yelp, and 50+ directories. Check NAP consistency, citation accuracy, and GEO visibility.',
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      number: '2',
      icon: BarChart,
      title: 'Get Insights',
      description: 'Receive detailed reports showing your MEO score, GEO mentions, review velocity, and competitor comparison. Understand where you stand.',
      color: 'theme'
    },
    {
      number: '3',
      icon: Zap,
      title: 'Optimize Automatically',
      description: 'Our AI updates listings, generates optimized content, requests reviews via SMS/email, and tracks your rankings—all on autopilot.',
      color: 'from-green-500 to-green-600'
    },
    {
      number: '4',
      icon: Target,
      title: 'Dominate Locally',
      description: 'Watch your visibility scores climb. Appear in AI answers, rank in map packs, and convert more local searchers into customers.',
      color: 'from-orange-500 to-orange-600'
    }
  ];

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">How AGS Works</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Four simple steps to dominate local search, maps, and AI results.
          </p>
        </div>

        <div className="relative">
          {/* Connecting Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-indigo-200 via-slate-200 to-orange-200 -translate-y-1/2 z-0"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-white border-slate-200 shadow-xl hover:shadow-2xl transition-all relative h-full">
                    <CardContent className="pt-8 pb-8">
                      {/* Step Number Badge */}
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                        <div className={`w-12 h-12 ${step.color === 'theme' ? 'bg-theme-gradient' : `bg-gradient-to-r ${step.color}`} rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                          {step.number}
                        </div>
                      </div>
                      
                      {/* Icon */}
                      <div className="mb-6 mt-4">
                        <div className={`w-16 h-16 mx-auto ${step.color === 'theme' ? 'bg-theme-gradient' : `bg-gradient-to-r ${step.color}`} rounded-2xl flex items-center justify-center`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      
                      {/* Content */}
                      <h3 className="text-xl font-bold text-slate-900 mb-3 text-center">{step.title}</h3>
                      <p className="text-slate-600 text-center">{step.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// METRICS BREAKDOWN SECTION
// ============================================================================
const AgencyCaseStudiesSection = () => {
  const studies = [
    {
      stars: "⭐ ⭐ ⭐ ⭐ ⭐",
      quote: "We went from barely showing on Google Maps to ranking in the top results in our area. The increase in calls was noticeable within a few weeks.",
      name: "Mark D.",
      title: "Construction Company Owner",
      tags: ["MEO", "Google Maps"]
    },
    {
      stars: "⭐ ⭐ ⭐ ⭐ ⭐",
      quote: "Our inbound consultations increased significantly and our schedule started filling weeks in advance. The quality of leads has been great.",
      name: "Emily C.",
      title: "MedSpa Owner",
      tags: ["GEO", "AI Search"]
    },
    {
      stars: "⭐ ⭐ ⭐ ⭐ ⭐",
      quote: "We started appearing in AI search recommendations which brought a surprising amount of new traffic to our store.",
      name: "Daniel K.",
      title: "E-commerce Founder",
      tags: ["Entity Optimization", "Schema"]
    }
  ];

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-6">Real Results for Real Businesses</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">We don't deal in vanity metrics. We optimize for revenue, phone calls, and qualified leads.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {studies.map((study, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full bg-white border-0 shadow-md hover:shadow-xl transition-all rounded-[24px] overflow-hidden p-2">
                <div className="bg-slate-50 rounded-[20px] p-8 h-full flex flex-col">
                   <div className="flex flex-wrap gap-2 mb-6">
                      {study.tags.map((tag, i) => (
                        <span key={i} className="text-xs font-bold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600">{tag}</span>
                      ))}
                   </div>
                   <p className="text-lg mb-4">{study.stars}</p>
                   <p className="text-slate-600 mb-4 leading-relaxed">&ldquo;{study.quote}&rdquo;</p>
                   <div className="mt-auto">
                      <p className="font-bold text-slate-900">{study.name}</p>
                      <p className="text-sm text-slate-500">{study.title}</p>
                   </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const WhyThisMattersSection = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-6 text-center">
         <span className="text-purple-600 font-bold text-sm tracking-widest uppercase mb-4 block">The Problem</span>
         <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-8 tracking-tight">If you’re not showing up, you’re not chosen.</h2>
         <p className="text-lg sm:text-xl text-slate-500 leading-relaxed mb-10 max-w-2xl mx-auto">
            Customers now discover businesses through ChatGPT, Google Maps, AI overviews, and voice search. If AI doesn't trust your brand, you're invisible—no matter how good your service is.
         </p>
         <span className="text-slate-900 font-semibold text-lg">
            We Fix That Completely
         </span>
      </div>
    </section>
  );
};

// (Removed PricingPreviewSection)

// ============================================================================
// INTEGRATIONS SECTION
// ============================================================================
const IntegrationsSection = () => {
  const integrations = [
    { name: "Google My Business", logo: "https://cdn.simpleicons.org/google/4285F4" },
    { name: "Apple Maps", logo: "https://cdn.simpleicons.org/apple/000000" },
    { name: "Yelp", logo: "https://cdn.simpleicons.org/yelp/D32323" },
    { name: "Shopify", logo: "https://cdn.simpleicons.org/shopify/7AB55C" },
    { name: "ChatGPT", logo: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/openai.svg" }
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Seamless Integrations
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            AGS automatically syncs your data across key platforms
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {integrations.map((integration, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 px-6 py-4 bg-white border border-slate-200 rounded-[16px] shadow-md hover:shadow-lg transition-all"
            >
              <img
                src={integration.logo}
                alt={integration.name}
                className="w-8 h-8 object-contain"
              />
              <span className="font-semibold text-slate-700">{integration.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// FINAL CTA SECTION
// ============================================================================
const FinalCTASection = ({ scanRef }) => {
  const [isHovering, setIsHovering] = useState(false);
  const navigate = useNavigate();

  const scrollToScan = useCallback(() => {
    const tryScroll = (attempt = 0) => {
      if (scanRef?.current) {
        scanRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (attempt < 5) {
        requestAnimationFrame(() => tryScroll(attempt + 1));
      }
    };
    tryScroll();
  }, []);

  return (
    <section className="py-24 bg-gradient-to-br from-slate-900 to-slate-800 overflow-visible">
      <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-8">
            Ready To Fix Your AI + Search Visibility?
          </h2>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Stop guessing. Start dominating. Get your free audit or book a strategy call with our elite team today.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
            <div 
              className="relative inline-block"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onClick={() => setIsHovering(true)}
            >
              <ReportPreviewPopup isVisible={isHovering} position="top" />
              
              <motion.div
                animate={isHovering ? { scale: 1.05 } : { scale: [1, 1.03, 1] }}
                transition={isHovering ? { duration: 0.2 } : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Button
                  onClick={scrollToScan}
                  className="bg-white text-slate-900 hover:bg-slate-50 px-10 py-7 text-lg font-bold rounded-[16px] shadow-2xl hover:shadow-white/10 transition-all relative overflow-hidden min-w-[240px]"
                >
                  <Zap className="w-6 h-6 mr-2 text-purple-600" />
                  Run Free Scan
                </Button>
              </motion.div>
            </div>

            <Button
                onClick={() => { window.location.href = createPageUrl('GetSupport'); }}
                variant="outline"
                className="px-10 py-7 text-lg font-bold rounded-[16px] border-2 border-slate-600 text-white hover:bg-slate-800 hover:border-slate-500 bg-transparent min-w-[240px]"
              >
                <Users className="w-5 h-5 mr-2" />
                Book Strategy Call
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const AgencyPackagesSection = () => {
  const navigate = useNavigate();
  
  const packages = [
    {
      name: "AI Visibility Audit",
      description: "A full diagnostic report delivered after your free scan.",
      features: [
        "Full AI Visibility Breakdown",
        "MEO (Maps) Scorecard",
        "Technical SEO Audit",
        "Authority & Review Analysis",
        "Competitor Benchmarking"
      ],
      highlight: false
    },
    {
      name: "Local Domination Program",
      description: "Done-For-You visibility for brick-and-mortar, services, & medical.",
      features: [
        "Google Maps Optimization",
        "Website SEO Overhaul",
        "Review Acquisition Systems",
        "ChatGPT Recognition Setup",
        "Monthly Reporting & Upgrades"
      ],
      highlight: true
    },
    {
      name: "Enterprise AI System",
      description: "For multi-location brands, franchises, and agencies.",
      features: [
        "Multi-location Scaling",
        "API Integrations",
        "White-label AI Reporting",
        "Dedicated Success Manager",
        "Quarterly Strategy Sprints"
      ],
      highlight: false
    }
  ];

  const bookACallUrl = createPageUrl('GetSupport') + '?book=1';

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-purple-100 text-purple-700">HIGH TICKET PACKAGES</Badge>
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Done-For-You AI Visibility</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">Choose the level of dominance you need.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {packages.map((pkg, index) => (
             <motion.div 
               key={index}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: index * 0.1 }}
               className={`relative h-full rounded-[24px] border p-8 flex flex-col ${pkg.highlight ? 'bg-slate-900 text-white border-slate-800 shadow-2xl scale-105 z-10' : 'bg-white border-slate-200 text-slate-900'}`}
             >
                {pkg.highlight && (
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-theme-gradient text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide shadow-lg">
                      Most Popular
                   </div>
                )}
                <h3 className="text-2xl font-bold mb-4">{pkg.name}</h3>
                <p className={`text-sm mb-8 ${pkg.highlight ? 'text-slate-300' : 'text-slate-500'}`}>{pkg.description}</p>
                
                <div className="flex-1 mb-8">
                   <ul className="space-y-4">
                      {pkg.features.map((feat, i) => (
                         <li key={i} className="flex items-start gap-3">
                            <CheckCircle2 className={`w-5 h-5 shrink-0 ${pkg.highlight ? 'text-purple-400' : 'text-purple-600'}`} />
                            <span className={`text-sm ${pkg.highlight ? 'text-slate-200' : 'text-slate-600'}`}>{feat}</span>
                         </li>
                      ))}
                   </ul>
                </div>

                <Button 
                  onClick={() => { window.location.href = bookACallUrl; }}
                  className={`w-full py-6 rounded-xl font-bold text-sm ${pkg.highlight ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                >
                   Book a Strategy Call For a Free Quote
                </Button>
             </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const AgencyFAQSection = () => {
   const faqs = [
      { q: "How long does visibility take?", a: "While our initial audit is instant, full domination typically takes 30-90 days depending on your market competition and current status." },
      { q: "What industries see the biggest ROI?", a: "High-ticket local services (medical, legal, home services) and e-commerce brands seeing traffic drops from AI search changes." },
      { q: "Does this work for multi-location?", a: "Yes, our Enterprise system is built specifically for franchises and multi-location brands to scale visibility centrally." },
      { q: "Can I get a sample audit?", a: "Absolutely. Run a free scan above and you'll see exactly the kind of data we analyze for your business." }
   ];

   return (
      <section className="py-20 bg-slate-50">
         <div className="max-w-3xl mx-auto px-4">
            <div className="text-center mb-12">
               <h2 className="text-3xl font-bold text-slate-900">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-4">
               {faqs.map((faq, i) => (
                  <Card key={i} className="border-none shadow-sm">
                     <CardContent className="p-6">
                        <h3 className="font-bold text-lg text-slate-900 mb-2">{faq.q}</h3>
                        <p className="text-slate-600">{faq.a}</p>
                     </CardContent>
                  </Card>
               ))}
            </div>
         </div>
      </section>
   );
};

// ============================================================================
// FOOTER
// ============================================================================
const Footer = () => {
  return (
    <footer className="bg-slate-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 mb-12">
          <div>
            <h4 className="font-semibold mb-4 text-lg">Product</h4>
            <ul className="space-y-3 text-slate-400">
              <li><Link to={createPageUrl('pricing')} className="hover:text-white transition-colors">Plans</Link></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><Link to={createPageUrl('AITools')} className="hover:text-white transition-colors">AI Tools</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-lg">Contact</h4>
            <ul className="space-y-3 text-slate-400">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <a href="mailto:info@atlasgrowths.com" className="hover:text-white transition-colors">info@atlasgrowths.com</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <a href="tel:513-999-4390" className="hover:text-white transition-colors">513-999-4390</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center">
            <p className="text-slate-400 text-sm">© 2025 AGS. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-slate-400">
              <Link to={createPageUrl('PrivacyPolicy')} className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to={createPageUrl('TermsOfService')} className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

// ============================================================================
// MAIN EXPORT
// ============================================================================
export default function Landing() {
  const scanRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [heroBusinessName, setHeroBusinessName] = useState('');
  const [heroUrl, setHeroUrl] = useState('');
  
  // Scroll to scan form when landing with #scan-section (e.g. from "New Scan" button)
  useEffect(() => {
    if (location.hash !== '#scan-section') return;
    let timeoutId;
    const tryScroll = (attempt = 0) => {
      if (scanRef.current) {
        scanRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (attempt < 10) {
        timeoutId = setTimeout(() => tryScroll(attempt + 1), 50);
      }
    };
    tryScroll();
    return () => timeoutId && clearTimeout(timeoutId);
  }, [location.hash]);

  // ========================================
  // Handle scan completion with REAL SCORES
  // ========================================
  const handleScanComplete = async (scanResult) => {
    console.log('✅ Scan completed with dynamic scores:', scanResult);
    
    // LOCAL SCAN LOGIC - Map scanner result to expected format
    const scanData = {
        type: 'local',
        email: scanResult.email,
        business: scanResult.business, // ✅ FrontendOnlyScanner passes flattened structure
        scores: scanResult.scores,
        meoBackendData: scanResult.meoBackendData,
        geo: scanResult.geo || null, // ✅ canonical GEO object
        percentile: scanResult.percentile,
        percentileText: scanResult.percentileText,
        optimizationBar: scanResult.optimizationBar
    };
      
    // Store results in session storage for local scans
    sessionStorage.setItem('scanResults', JSON.stringify(scanData));
    
    console.log('✅ Storing scan data with dynamic scores:', scanData);
    console.log('🔍 [LANDING] GEO OBJECT:', JSON.stringify(scanData.geo, null, 2));
    console.log('🔍 [LANDING] GEO STATUS:', scanData.geo?.status);
    console.log('🔍 [LANDING] GEO CATEGORY:', scanData.geo?.category);
    
    // Store results in session storage
    sessionStorage.setItem('scanResults', JSON.stringify(scanData));
    
    // Send scan data to info@atlasgrowths.com (admin notification) - fire and forget, don't block redirect
    const emailSubject = `New Local Scan: ${scanResult.business.name}`;
    const emailBody = `
      <h2>New Local Business Scan Completed</h2>
      <p><strong>Business:</strong> ${scanResult.business.name}</p>
      <p><strong>Location:</strong> ${scanResult.business.address || scanResult.business.formattedAddress || 'N/A'}</p>
      <p><strong>City:</strong> ${scanResult.business.city || 'N/A'}</p>
      <p><strong>State:</strong> ${scanResult.business.state || 'N/A'}</p>
      <p><strong>Country:</strong> ${scanResult.business.country || 'N/A'}</p>
      <p><strong>Email:</strong> ${scanResult.email || 'N/A'}</p>
      <hr/>
      <h3>Scores</h3>
      <p><strong>MEO Score:</strong> ${scanResult.scores.meo}</p>
      <p><strong>SEO Score:</strong> ${scanResult.scores.seo ?? 'N/A'}</p>
      <p><strong>GEO Score:</strong> ${scanResult.scores.geo}</p>
      <p><strong>Final Score:</strong> ${scanResult.scores.final}</p>
      <p><strong>Percentile:</strong> ${scanResult.percentile || 'N/A'}</p>
      <hr/>
      <p><em>Scan completed at ${new Date().toLocaleString()}</em></p>
    `;
    SendEmail({ to: 'info@atlasgrowths.com', subject: emailSubject, body: emailBody })
      .then(() => console.log('✅ Scan data sent to info@atlasgrowths.com'))
      .catch((err) => console.error('❌ Failed to send scan email:', err));

    toast.success('✅ Business found! Redirecting to results...');

    // Use hard redirect for reliability - React Router navigate can fail in some cases
    window.location.replace(createPageUrl('ScanResults'));
  };

  return (
    <div className="min-h-screen bg-white">
      <SEOHead pageName="landing" />

      <MarketingHeader />
      <HeroSection 
        scanRef={scanRef} 
        businessName={heroBusinessName} 
        url={heroUrl} 
      />

      {/* Scan Form Section */}
      <section id="scan-section" ref={scanRef} className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Start Your Free Scan
            </h2>
            <p className="text-xl text-slate-600 mb-8">
              Enter your business details and get instant AI-powered insights
            </p>
          </div>

          <FrontendOnlyScanner 
            onScanComplete={handleScanComplete} 
            scanMode="local"
            onBusinessNameChange={setHeroBusinessName}
            onUrlChange={setHeroUrl}
          />
        </div>
      </section>

      <AgencyPackagesSection />
      <WhyThisMattersSection />
      <HowItWorksSection />
      <AgencyCaseStudiesSection />
      <IntegrationsSection />
      <AgencyFAQSection />
      <FinalCTASection scanRef={scanRef} />
      <Footer />
    </div>
  );
}