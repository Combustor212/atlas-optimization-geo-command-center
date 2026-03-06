import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Globe, Share2, Search, Sparkles, MessageCircle, Zap, Settings, 
  CheckCircle2, AlertTriangle, BarChart, Clock, TrendingUp, Star, 
  ExternalLink, Rocket, Lock, Check, AlertCircle, Smartphone, Gauge,
  Layout, FileText, ThumbsUp, ArrowRight, XCircle, Target, Info,
  Facebook, Instagram, Linkedin, Youtube, Twitter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MarketingHeader from '@/components/MarketingHeader';
import SEOHead from '@/components/cms/SEOHead';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Helper to get score color class (text)
const getScoreColor = (score) => {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
};

// Helper to get score label
const getScoreLabel = (score) => {
  if (score >= 70) return 'Strong';
  if (score >= 40) return 'Building';
  return 'Needs Work';
};

// Helper to get score background pill
const getScorePillStyle = (score) => {
  if (score >= 70) return 'bg-green-100 text-green-700 border-green-200';
  if (score >= 40) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
};

const PlatformIcon = ({ network }) => {
  if (!network) return <Share2 className="w-4 h-4 text-slate-500" />;
  const n = network.toLowerCase();
  if (n.includes('facebook')) return <Facebook className="w-4 h-4 text-blue-600" />;
  if (n.includes('instagram')) return <Instagram className="w-4 h-4 text-pink-600" />;
  if (n.includes('twitter') || n.includes('x.com')) return <Twitter className="w-4 h-4 text-sky-500" />;
  if (n.includes('linkedin')) return <Linkedin className="w-4 h-4 text-blue-700" />;
  if (n.includes('youtube')) return <Youtube className="w-4 h-4 text-red-600" />;
  if (n.includes('tiktok')) return <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.65-1.58-1.09v10.92c0 2.08-.93 3.97-2.65 5.08-1.72 1.1-3.93 1.37-5.87.72-1.95-.65-3.56-2.36-4.15-4.32-.6-1.97-.2-4.15 1.08-5.7 1.28-1.55 3.25-2.32 5.23-2.05v4.22c-.71-.26-1.54.06-2.03.66-.49.6-.52 1.47-.08 2.11.44.64 1.33.87 2.05.53.72-.34 1.14-1.12 1.07-1.9V4.62c1.37-1.6 2.63-3.31 3.72-5.12z"/></svg>;
  return <Share2 className="w-4 h-4 text-slate-500" />;
};

const badgeClassForTier = (tier) => {
  switch (tier) {
    case 'high': return 'ml-auto text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700 px-2 py-0.5 rounded-full';
    case 'medium': return 'ml-auto text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full';
    case 'low': return 'ml-auto text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full';
    default: return 'ml-auto text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full';
  }
};

// New Score Card Component with uniform height and gradients
const ScoreCard = ({ title, score, icon: Icon, colorTheme, items, delay }) => {
  const [displayScore, setDisplayScore] = useState(0);
  
  useEffect(() => {
    let startTime;
    const duration = 900;
    
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // cubic-bezier(0.16, 1, 0.3, 1) approx
      const ease = 1 - Math.pow(1 - progress, 4);
      
      setDisplayScore(Math.floor(score * ease));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [score]);

  const themeStyles = {
    blue: { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-600', gradient: 'from-blue-500 to-cyan-500' },
    purple: { border: 'border-slate-200', bg: 'bg-slate-50', text: 'text-slate-600', gradient: 'theme' },
    pink: { border: 'border-pink-200', bg: 'bg-pink-50', text: 'text-pink-600', gradient: 'from-pink-500 to-rose-500' },
    orange: { border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-600', gradient: 'from-orange-500 to-amber-500' },
    teal: { border: 'border-teal-200', bg: 'bg-teal-50', text: 'text-teal-600', gradient: 'from-teal-500 to-emerald-500' }
  };

  const theme = themeStyles[colorTheme] || themeStyles.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="h-full"
    >
      <Card 
        className="h-full border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col relative group"
        style={{ transition: 'transform 180ms ease-out, box-shadow 180ms ease-out' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '';
        }}
      >
        {/* Top Gradient Strip */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${theme.gradient === 'theme' ? 'bg-theme-gradient' : `bg-gradient-to-r ${theme.gradient}`}`} />
        
        <CardContent className="p-6 flex-1 flex flex-col pt-8">
          <div className="flex justify-between items-start mb-6">
            <div className={`p-3 rounded-xl ${theme.bg} ${theme.text} group-hover:scale-110 transition-transform duration-300`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className={`text-3xl font-black ${theme.text}`}>{displayScore}</div>
              <Badge variant="outline" className={`mt-1 ${getScorePillStyle(score)}`}>
                {getScoreLabel(score)}
              </Badge>
            </div>
          </div>
          
          <h3 className="font-bold text-slate-900 mb-4 text-lg">{title}</h3>
          
          <ul className="space-y-3 mt-auto">
            {items && items.slice(0, 3).map((item, i) => (
              <li key={i} className="text-sm text-slate-600 flex items-start gap-2.5 leading-relaxed">
                <div className={`mt-1.5 w-1.5 h-1.5 rounded-full ${theme.bg.replace('bg-', 'bg-slate-')} shrink-0`} />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function OnlineReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const [result, setResult] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const params = new URLSearchParams(location.search);
    const data = params.get('data');
    if (data) {
      try {
        setResult(JSON.parse(decodeURIComponent(data)));
      } catch (e) {
        console.error('Failed to parse report data', e);
      }
    }
  }, [location.search]);

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center shadow-xl rounded-2xl">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Report Not Found</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            We couldn't retrieve the analysis data. Please try running a new scan from the homepage.
          </p>
          <Button onClick={() => navigate('/Landing#scan-section')} className="w-full bg-slate-900 hover:bg-slate-800 h-12 rounded-xl">
            Run New Scan
          </Button>
        </Card>
      </div>
    );
  }

  // Destructure data
  const {
    brandName, url, niche, overallScore, percentileInNiche,
    seoScore, aiPresenceScore, socialScore, conversionScore, technicalScore,
    pagesIndexed, blogCount, mainKeywords,
    socialProfiles, missingNetworks, reviewSummary, tech,
    recommendedActions7d, recommendedActions30d, recommendedActions90d,
    aiAnswerPreview
  } = result;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50/20 to-blue-50/20">
      <SEOHead pageName={`Report: ${brandName}`} />
      <MarketingHeader />

      <div className="pt-28 pb-20 px-4 sm:px-6">
        <div className="max-w-[1120px] mx-auto space-y-12">
          
          {/* 1. Report Header (Cover Style) */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-8">
              <div className="space-y-4 max-w-2xl">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <Badge variant="secondary" className="bg-slate-100 text-slate-800 hover:bg-slate-100 px-3 py-1 text-xs font-semibold tracking-wide uppercase rounded-full border-slate-200">
                    AI Visibility Report
                  </Badge>
                  <span className="text-xs font-medium text-slate-500">
                    Last scanned: {new Date().toLocaleDateString()}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                    {brandName}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-slate-600">
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                      <Globe className="w-4 h-4 text-blue-500" />
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-blue-600 transition-colors flex items-center gap-1">
                        {new URL(url).hostname}
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                      <Target className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">{niche}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Premium Score Card */}
              <div className="w-full lg:w-auto flex justify-start lg:justify-end">
                <Card className="bg-slate-900 text-white border-0 shadow-2xl overflow-hidden relative rounded-2xl min-w-[280px] hover:scale-[1.02] transition-transform duration-300">
                  {/* Background Glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-400/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -ml-10 -mb-10"></div>
                  
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between gap-6">
                      <div>
                        <div className="text-sm font-medium text-slate-400 mb-1">Online Visibility Score</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                            {overallScore}
                          </span>
                          <span className="text-lg text-slate-500">/100</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline" className="border-slate-700 text-slate-300 bg-slate-800/50">
                            Top {percentileInNiche}% in niche
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Circular Progress Ring (Simplified visual) */}
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90">
                          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-slate-800" />
                          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" 
                            className={overallScore >= 70 ? "text-green-500" : overallScore >= 40 ? "text-amber-500" : "text-red-500"}
                            strokeDasharray={`${overallScore * 1.75} 175`} 
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-white/80" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 w-full mb-12" />
          </motion.div>

          {/* 2. Score Breakdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <ScoreCard 
              title="SEO" 
              score={seoScore} 
              icon={Search} 
              colorTheme="blue"
              items={["Indexing status", "Meta tags health", "Keyword foundation"]}
              delay={0.1}
            />
            <ScoreCard 
              title="AI Presence" 
              score={aiPresenceScore} 
              icon={Sparkles} 
              colorTheme="purple"
              items={["LLM citations", "Brand entity strength", "Knowledge graph"]}
              delay={0.2}
            />
            <ScoreCard 
              title="Social" 
              score={socialScore} 
              icon={Share2} 
              colorTheme="pink"
              items={["Platform coverage", "Audience reach", "Brand consistency"]}
              delay={0.3}
            />
            <ScoreCard 
              title="Conversion" 
              score={conversionScore} 
              icon={Zap} 
              colorTheme="orange"
              items={["Trust signals", "Call-to-action clarity", "User flow friction"]}
              delay={0.4}
            />
            <ScoreCard 
              title="Technical" 
              score={technicalScore} 
              icon={Settings} 
              colorTheme="teal"
              items={["Core Web Vitals", "Mobile responsiveness", "Schema markup"]}
              delay={0.5}
            />
          </div>

          {/* 3. Previews Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Search Preview */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}>
              <Card className="h-full border-slate-200 shadow-sm rounded-2xl">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                      <Search className="w-5 h-5 text-blue-600" />
                      Search & SEO Preview
                    </CardTitle>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                      SEO Score: {seoScore}/100
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Google Result Simulation */}
                  <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs text-slate-500 font-bold">
                        {brandName.charAt(0)}
                      </div>
                      <div className="text-xs text-slate-500 flex flex-col">
                        <span className="font-medium text-slate-700">{brandName}</span>
                        <span className="truncate max-w-[200px]">{url}</span>
                      </div>
                      <div className="ml-auto text-slate-400">
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </div>
                    <h3 className="text-xl text-[#1a0dab] font-medium hover:underline cursor-pointer mb-1 truncate">
                      {brandName} - {niche} Services & Solutions
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                      {result.metaDescription || `${brandName} offers premium ${niche} services with top-rated customer support. Discover our latest offers and learn why customers trust us.`}
                    </p>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      {pagesIndexed > 0 ? (
                        <><div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm animate-pulse" /> Indexed & Visible</>
                      ) : (
                        <><div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" /> Not clearly indexed</>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="text-xs h-8" asChild>
                      <a href={url} target="_blank" rel="noopener noreferrer">View Live Site</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* AI Answer Preview */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }}>
              <Card className="h-full border-slate-200 shadow-sm rounded-2xl relative overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                    <MessageCircle className="w-5 h-5 text-slate-600" />
                    AI Answer Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex flex-col h-full">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                    How AI models should answer about your brand
                  </p>
                  
                  {/* Chat Bubble Style */}
                  <div className="flex gap-4 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-theme-gradient flex items-center justify-center shrink-0 shadow-md">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none p-5 relative shadow-sm flex-1">
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {aiAnswerPreview || `${brandName} is recognized as a provider in the ${niche} space. While specific details are limited in my current knowledge base, they appear to offer services focused on customer satisfaction and quality.`}
                      </p>
                    </div>
                  </div>

                  {/* Context Bar */}
                  {aiPresenceScore < 50 && (
                    <div className="mt-auto bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 leading-snug">
                        <strong>Note:</strong> AI rarely mentions your brand yet. Increasing your <strong>AI Presence Score</strong> will help models learn this description.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* 4. Deep Dive Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Content & Keyword Coverage */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }} className="lg:col-span-2">
              <Card className="h-full rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-500" />
                    Content & Keyword Coverage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <Layout className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900">{pagesIndexed || '-'}</div>
                        <div className="text-xs text-slate-500 font-medium uppercase">Pages Indexed</div>
                      </div>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex items-center gap-4">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900">{blogCount || 0}</div>
                        <div className="text-xs text-slate-500 font-medium uppercase">Blog Articles</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-700">Keyword Profile</h4>
                        <span className="text-xs text-slate-500">{mainKeywords?.length || 0} detected</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {mainKeywords?.length > 0 ? mainKeywords.slice(0, 8).map((kw, i) => (
                          <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 font-normal px-3 py-1">
                            {kw}
                          </Badge>
                        )) : (
                          <span className="text-sm text-slate-500 italic">No significant keywords detected yet.</span>
                        )}
                        {mainKeywords?.length > 8 && (
                          <Badge variant="outline" className="text-slate-400 border-dashed border-slate-300">+{mainKeywords.length - 8} more</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 flex gap-2 items-start">
                      <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <p>
                        {blogCount > 5 
                          ? "Your content depth is solid, creating good entry points for search engines." 
                          : "Content depth is thin. Publishing comparison guides and 'how-to' articles will significantly boost your AI visibility."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Technical Health */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.9 }}>
              <Card className="h-full rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-slate-500" />
                    Technical Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {/* Speed */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm">
                          <Gauge className="w-4 h-4 text-teal-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">Page Speed</span>
                      </div>
                      <Badge className={cn("px-2.5", tech?.speedBand === 'fast' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                        {tech?.speedBand === 'fast' ? 'Fast' : 'Average'}
                      </Badge>
                    </div>

                    {/* Mobile */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm">
                          <Smartphone className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">Mobile Friendly</span>
                      </div>
                      {tech?.mobileFriendly ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>

                    {/* Schema */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm">
                          <FileText className="w-4 h-4 text-slate-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">Schema Markup</span>
                      </div>
                      <Badge className={cn("px-2.5", tech?.schemaPresent ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                        {tech?.schemaPresent ? 'Detected' : 'Missing'}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {!tech?.schemaPresent 
                        ? "CRITICAL: Missing Schema markup makes it harder for AI to understand your products and pricing."
                        : "Technical foundation looks stable. Focus on content velocity."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* 5. Social & Conversion Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Social Footprint - DYNAMIC */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.0 }}>
              <Card className="h-full rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-pink-500" />
                    Social & Brand Footprint
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3 mb-6">
                    {socialProfiles && socialProfiles.length > 0 ? socialProfiles.map((profile, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5"
                      >
                        <PlatformIcon network={profile.network} />
                        <span className="text-sm font-medium capitalize text-slate-700">
                          {profile.network}
                        </span>
                        <span className={badgeClassForTier(profile.tier)}>
                          {profile.tier === 'unknown' ? 'Detected' : `${profile.tier} reach`}
                        </span>
                      </div>
                    )) : (
                      <div className="w-full text-sm text-slate-500 italic text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No major social profiles detected on your homepage.
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {missingNetworks && missingNetworks.length > 0 && (
                      <p className="text-sm text-slate-500">
                        Missing profiles on key networks for your niche:{' '}
                        <span className="font-medium capitalize text-slate-700">
                          {missingNetworks.join(', ')}
                        </span>. Launching or linking these can increase your AI authority.
                      </p>
                    )}
                    
                    <ul className="mt-2 list-disc pl-4 text-sm text-slate-500">
                      <li>{socialProfiles && socialProfiles.length > 0 ? 'Social signals help validate your entity to search engines.' : 'No linked profiles found. Add links to your footer.'}</li>
                      <li>{missingNetworks && missingNetworks.length > 0 ? `Expanding to ${missingNetworks[0]} could boost your brand signal.` : 'Good coverage across major platforms.'}</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Conversion & Trust */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.1 }}>
              <Card className="h-full rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-orange-500" />
                    Conversion & Trust
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-6 mb-6">
                    <div className="flex flex-col items-center justify-center bg-orange-50 border border-orange-100 rounded-xl p-4 min-w-[100px]">
                      <span className="text-3xl font-bold text-orange-600">{conversionScore}</span>
                      <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Score</span>
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3 text-sm text-slate-700">
                        {conversionScore > 50 ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-slate-300" />}
                        <span>Primary CTA visible</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-700">
                        {conversionScore > 40 ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-slate-300" />}
                        <span>Lead magnet present</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-700">
                        {conversionScore > 60 ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-slate-300" />}
                        <span>Trust badges / Reviews</span>
                      </div>
                    </div>
                  </div>

                  {reviewSummary && (
                    <div className="bg-yellow-50/80 border border-yellow-100 rounded-xl p-4 flex items-start gap-3">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-slate-900 mb-0.5">
                          {reviewSummary.avgRating || 'N/A'} Rating ({reviewSummary.totalReviews || 0}+ Reviews)
                        </div>
                        <p className="text-xs text-slate-600">
                          Consistent reviews across platforms help validate your business to AI models as a trusted entity.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* 6. Growth Plan */}
          <div className="pt-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-slate-900 rounded-lg">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900">AI Visibility Growth Plan</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <Card className="bg-gradient-to-b from-blue-50 to-white border-blue-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-blue-900 text-lg">Next 7 Days</CardTitle>
                  <p className="text-sm text-blue-600 font-medium">Quick Wins</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {recommendedActions7d?.map((action, i) => (
                      <li key={i} className="text-sm text-slate-700 flex items-start gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-[10px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="leading-snug">{action}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-b from-slate-50 to-white border-slate-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                    <BarChart className="w-5 h-5 text-slate-600" />
                  </div>
                  <CardTitle className="text-slate-900 text-lg">Next 30 Days</CardTitle>
                  <p className="text-sm text-slate-600 font-medium">Build Authority</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {recommendedActions30d?.map((action, i) => (
                      <li key={i} className="text-sm text-slate-700 flex items-start gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="leading-snug">{action}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-b from-emerald-50 to-white border-emerald-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                    <Rocket className="w-5 h-5 text-emerald-600" />
                  </div>
                  <CardTitle className="text-emerald-900 text-lg">Next 90 Days</CardTitle>
                  <p className="text-sm text-emerald-600 font-medium">Scale & Dominate</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {recommendedActions90d?.map((action, i) => (
                      <li key={i} className="text-sm text-slate-700 flex items-start gap-3">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 text-[10px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="leading-snug">{action}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 7. Final CTA Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-slate-900 rounded-3xl p-8 md:p-12 text-center text-white shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
            <div className="relative z-10 max-w-2xl mx-auto">
              <div className="inline-flex items-center justify-center p-3 bg-slate-800 rounded-full mb-6">
                <Lock className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Unlock Full Report Details</h2>
              <p className="text-slate-300 text-lg mb-8">
                This is a limited preview. Upgrade to track these metrics weekly, monitor competitors, and get detailed implementation guides.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  <span>Weekly Score Tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  <span>Competitor Spying</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  <span>Implementation Guides</span>
                </div>
              </div>

              <Button 
                onClick={() => navigate('/pricing')} 
                className="bg-white text-slate-900 hover:bg-slate-100 hover:scale-105 hover:shadow-white/20 transition-all duration-300 font-bold px-8 py-6 h-auto text-lg rounded-xl shadow-xl"
              >
                View Plans & Pricing <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}