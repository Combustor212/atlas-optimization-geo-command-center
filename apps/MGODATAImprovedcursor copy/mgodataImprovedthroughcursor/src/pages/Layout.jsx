
import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import {
  LineChart,
  Building,
  Sparkles,
  Map as MapIcon,
  Star,
  ClipboardCheck,
  CreditCard,
  X,
  Menu,
  ChevronDown,
  LogOut,
  Target,
  Brain,
  BarChart,
  Globe,
  MessageCircle,
  Loader2
} from "lucide-react";
import { InvokeLLM } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";
import PlanSelection from "./PlanSelection";
import Landing from "./Landing";
import PricingPage from "./pricing";
import SignInPage from "./signin";
import CreateAccountPage from "./CreateAccount";
import SuccessPage from "./success";
import CancelPage from "./cancel";
import WhyUsPage from "./WhyUs";
import HowWorksPage from "./HowWorks";
import AIToolsPage from "./AITools";
import CaseStudiesPage from "./CaseStudies";
import OurTeamPage from "./OurTeam";
import GetSupportPage from "./GetSupport";
import InvisibilityPage from "./Invisibility";
import RandallAIAssistant from "@/components/RandallAIAssistant";
import { Toaster } from "@/components/ui/sonner";
import CompanyLogo from "@/components/CompanyLogo";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import SharedScan from "./SharedScan";
import OnlineReport from "./online-report";

const PUBLIC_ROUTES = [
  '/', 
  '/online-report',
  '/OnlineReport',
  '/pricing',
  '/plans',
  '/why-us',
  '/how-works',
  '/how-it-works',
  '/ai-tools',
  '/case-studies',
  '/our-team',
  '/about',
  '/get-support',
  '/contact',
  '/signin', 
  '/create-account', 
  '/success', 
  '/cancel',
  '/results',
  '/ScanResults',
  '/integration-results',
  '/privacy-policy',
  '/terms-of-service',
  '/invisibility',
  'Landing', 
  'WhyUs',
  'HowWorks',
  'AITools',
  'CaseStudies',
  'OurTeam',
  'GetSupport',
  'pricing',
  'signin', 
  'CreateAccount', 
  'success', 
  'cancel',
  'ScanResults',
  'IntegrationResults',
  'PrivacyPolicy',
  'TermsOfService',
  'SharedScan',
  'Invisibility'
];

const LEGACY_AUTH_ROUTES = ['/login', '/auth', '/signin-old', '/auth/signin', '/signup'];

const navigationItems = [
  { title: "Dashboard", icon: LineChart, url: createPageUrl("Dashboard"), locked: false },
  { title: "GEO/MEO Operator", icon: Target, url: createPageUrl("GeoMeoOperator"), locked: false },
  { title: "Businesses", icon: Building, url: createPageUrl("Businesses"), locked: false },
  { title: "AI Visibility Checks", icon: Sparkles, url: createPageUrl("AIVisibility"), locked: true },
  { title: "Visibility Heatmap", icon: MapIcon, url: createPageUrl("GeoVisibilityHeatmap"), locked: true },
  { title: "Maps Health Audits", icon: MapIcon, url: createPageUrl("MapsHealth"), locked: true },
  { title: "Audit Reports", icon: ClipboardCheck, url: createPageUrl("AuditReports"), locked: true },
  { title: "Business Assistant", icon: Brain, url: createPageUrl("BusinessAssistant"), locked: true },
  { title: "Competitor Watchdog", icon: BarChart, url: createPageUrl("CompetitorWatchdog"), locked: true },
  { title: "Directory Sync Hub", icon: Globe, url: createPageUrl("DirectorySyncHub"), locked: true },
  { title: "Reputation Manager", icon: Star, url: createPageUrl("ReputationManager"), locked: true },
  { title: "Review Sentiment", icon: MessageCircle, url: createPageUrl("ReviewSentiment"), locked: true },
];

const bottomNavItems = [
    { title: "Plans & Pricing", icon: CreditCard, url: createPageUrl("pricing") },
]

const signOut = async () => {
  try {
    await User.logout();
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    console.log("Successfully signed out and all sessions cleared.");
  } catch (error) {
    console.error('Sign out error:', error);
  } finally {
    window.location.href = "/pricing";
  }
};

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [needsPlanSelection, setNeedsPlanSelection] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showRandall, setShowRandall] = useState(false);

  const isPublicRoute = PUBLIC_ROUTES.includes(currentPageName) || PUBLIC_ROUTES.includes(location.pathname) || location.pathname.startsWith('/scan/');
  const isAuthPage = ['signin', 'CreateAccount'].includes(currentPageName);
  
  const isMarketingPage = 
    ['WhyUs', 'HowWorks', 'AITools', 'CaseStudies', 'OurTeam', 'GetSupport', 'Pricing', 'Landing', 'pricing', 'Invisibility', 'OnlineReport', 'online-report'].includes(currentPageName) || 
    ['/why-us', '/how-works', '/how-it-works', '/ai-tools', '/case-studies', '/our-team', '/about', '/get-support', '/contact', '/pricing', '/plans', '/', '/invisibility', '/online-report', '/OnlineReport'].includes(location.pathname);

  const isStandalonePage = 
    currentPageName === 'ScanResults' || 
    currentPageName === 'IntegrationResults' ||
    currentPageName === 'SharedScan' ||
    location.pathname === '/results' || 
    location.pathname === '/ScanResults' ||
    location.pathname === '/integration-results' ||
    location.pathname === '/IntegrationResults' ||
    location.pathname.startsWith('/scan/');

  const isBetaPage = currentPageName === 'beta' || location.pathname === '/beta' || location.pathname === '/Beta';
  
  useEffect(() => {
    if (LEGACY_AUTH_ROUTES.includes(location.pathname)) {
      window.location.replace('/signin');
      return;
    }
  }, [location.pathname]);

  useEffect(() => {
    const checkUserStatus = async () => {
      const demoModeLocalStorage = localStorage.getItem('demo_mode');
      if (demoModeLocalStorage === 'true') {
        setIsDemoMode(true);
        setIsAuthenticated(true);
        setUser({ 
          plan: 'PRO', 
          subscriptionStatus: 'active', 
          email: 'demo@atlasgrowths.com',
          full_name: 'Demo User',
          role: 'admin',
          companyLogoUrl: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d742e6c4913147eef6a1ba/735e3133f_ChatGPTImageSep26202509_12_18PM.png",
          companyName: "AGS"
        });
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await User.me();
        if (!currentUser) {
          setIsAuthenticated(false);
          if (!isPublicRoute && !isStandalonePage && !isBetaPage) {
            window.location.href = '/pricing';
          }
          return;
        }
        setUser(currentUser);
        setIsAuthenticated(true);
        setIsDemoMode(false);
        if (!currentUser.plan || currentUser.plan === 'FREE') {
          setNeedsPlanSelection(true);
        } else if (currentUser.subscriptionStatus === 'inactive' || currentUser.subscriptionStatus === 'canceled') {
          setShowUpsell(true);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setIsDemoMode(false);
        if (!isPublicRoute && !isStandalonePage && !isBetaPage) {
          window.location.href = '/pricing';
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    checkUserStatus();
  }, [isPublicRoute, isStandalonePage, isBetaPage]);

  useEffect(() => {
    if (!isLoading && (isAuthenticated || isDemoMode) && !isPublicRoute && !isStandalonePage && !isBetaPage) {
      const timer = setTimeout(() => {
        setShowRandall(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowRandall(false);
    }
  }, [isLoading, isAuthenticated, isDemoMode, isPublicRoute, isStandalonePage, isBetaPage]);

  const handlePlanSelected = async () => {
    const currentUser = await User.me();
    setUser(currentUser);
    setNeedsPlanSelection(false);
  };

  const handleAskServer = async (input) => {
    const system_prompt = `
You are "Randall", Senior Success Engineer for a GEO · MEO · SEO SaaS.
- If the user asks general questions, answer clearly in 5-8 steps or a short paragraph + bullets.
- If the user asks about product tasks, explain briefly and avoid long rambling; the app UI buttons will handle execution.
- Always be concise, actionable, and friendly.
`;
    const full_prompt = `${system_prompt}\n\nUser Question: ${input}`;

    try {
        const answer = await InvokeLLM({ prompt: full_prompt });
        return answer || "I'm sorry, I couldn't process that request.";
    } catch (error) {
        console.error("Error invoking LLM:", error);
        return "There was an error connecting to the AI service.";
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(prevState => !prevState);
  };

  const handleMenuKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleSidebar();
    }
  };
  
  // Skip Layout loading for standalone pages (ScanResults, etc.) so user goes straight to loading screen
  if (isLoading && !isStandalonePage) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
      </div>
    );
  }

  if (isBetaPage) {
    return (
      <>
        {React.cloneElement(children, { user })}
        <Toaster richColors position="top-right" />
      </>
    );
  }

  if (location.pathname.startsWith('/scan/')) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <SharedScan />
        </motion.div>
        <Toaster richColors position="top-right" />
      </>
    );
  }

  if (isStandalonePage) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {React.cloneElement(children, { user })}
        </motion.div>
        <Toaster richColors position="top-right" />
      </>
    );
  }

  if (isMarketingPage) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {currentPageName === 'Landing' || location.pathname === '/' ? (
            <Landing user={user} />
          ) : currentPageName === 'WhyUs' || location.pathname === '/why-us' ? (
            <WhyUsPage user={user} />
          ) : currentPageName === 'HowWorks' || location.pathname === '/how-works' || location.pathname === '/how-it-works' ? (
            <HowWorksPage user={user} />
          ) : currentPageName === 'AITools' || location.pathname === '/ai-tools' ? (
            <AIToolsPage user={user} />
          ) : currentPageName === 'CaseStudies' || location.pathname === '/case-studies' ? (
            <CaseStudiesPage user={user} />
          ) : currentPageName === 'OurTeam' || location.pathname === '/our-team' || location.pathname === '/about' ? (
            <OurTeamPage user={user} />
          ) : currentPageName === 'GetSupport' || location.pathname === '/get-support' || location.pathname === '/contact' ? (
            <GetSupportPage user={user} />
          ) : currentPageName === 'pricing' || currentPageName === 'Pricing' || location.pathname === '/pricing' || location.pathname === '/plans' ? (
            <PricingPage user={user} />
          ) : currentPageName === 'Invisibility' || location.pathname === '/invisibility' ? (
            <InvisibilityPage user={user} />
          ) : currentPageName === 'online-report' || currentPageName === 'OnlineReport' || location.pathname === '/online-report' ? (
            <OnlineReport />
          ) : (
            React.cloneElement(children, { user })
          )}
        </motion.div>
        <Toaster richColors position="top-right" />
      </>
    );
  }

  if (isAuthPage) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {currentPageName === 'signin' ? (
            <SignInPage />
          ) : currentPageName === 'CreateAccount' ? (
            <CreateAccountPage />
          ) : null}
        </motion.div>
        <Toaster richColors position="top-right" />
      </>
    );
  }

  if (currentPageName === 'success') {
    return (
      <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <SuccessPage user={user} />
        </motion.div>
        <Toaster richColors position="top-right" />
      </>
    );
  }
  if (currentPageName === 'cancel') {
    return (
      <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <CancelPage user={user} onAskServer={handleAskServer} />
        </motion.div>
        <Toaster richColors position="top-right" />
      </>
    );
  }

  if (!isAuthenticated && !isDemoMode && !isPublicRoute && !isStandalonePage && !isBetaPage) {
    return (
      <>
        <PricingPage />
        <Toaster richColors position="top-right" />
      </>
    );
  }

  const NavLink = ({ item, isMobile }) => {
    if (item.locked) {
      return (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 text-slate-400 bg-slate-50/50 cursor-not-allowed relative overflow-hidden"
          title="Coming soon - Feature locked"
        >
          <item.icon className="h-5 w-5 shrink-0 opacity-40" />
          <span className="truncate blur-[2px] select-none">{item.title}</span>
          <svg 
            className="h-4 w-4 ml-auto opacity-40" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
            />
          </svg>
        </div>
      );
    }

    return (
      <Link
        to={item.url}
        onClick={() => isMobile && setSidebarOpen(false)}
        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
          location.pathname === item.url
            ? "bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 shadow-sm border border-indigo-200/30"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        <span className="truncate">{item.title}</span>
      </Link>
    );
  };

  const SidebarContent = ({ isMobile }) => (
     <div className="flex h-full flex-col bg-white/80 backdrop-blur-sm">
        <div className="flex h-16 items-center justify-center border-b border-slate-200/60 px-4 lg:px-6 lg:h-[68px]">
          <CompanyLogo 
            companyLogoUrl={user?.companyLogoUrl}
            companyName={user?.companyName || 'AGS'}
            linkTo="/"
            size="sm"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <nav className="space-y-1">
            {navigationItems.map((item) => <NavLink key={item.title} item={item} isMobile={isMobile} />)}
          </nav>
        </div>
        <div className="mt-auto p-3 border-t border-slate-200/60">
            <nav className="space-y-1">
                {bottomNavItems.map((item) => <NavLink key={item.title} item={item} isMobile={isMobile} />)}
                <button
                    onClick={signOut}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                    <LogOut className="h-5 w-5 shrink-0" />
                    <span className="truncate">Sign Out</span>
                </button>
            </nav>
        </div>
      </div>
  );

  const Header = () => (
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm px-4 md:px-6 lg:h-[68px] z-20">
        <Button 
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="lg:hidden hover:bg-slate-100 transition-colors"
          aria-label="Open sidebar"
        >
            <Menu className="h-5 w-5"/>
        </Button>

        <CompanyLogo 
          companyLogoUrl={user?.companyLogoUrl}
          companyName={user?.companyName || 'AGS'}
          linkTo="/"
          size="md"
        />

        <div className="flex-1 min-w-0" />

        {(isAuthenticated || isDemoMode) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 hover:bg-slate-100 transition-colors rounded-full p-1 h-auto">
                <img src={`https://avatar.vercel.sh/${user?.email}.png`} className="h-8 w-8 rounded-full" alt="Avatar" />
                <ChevronDown className="h-4 w-4 text-slate-500 hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-slate-200 z-30">
              <DropdownMenuLabel>
                {user?.full_name || 'My Account'}
                {isDemoMode && <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded-full">Demo</span>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={createPageUrl("Dashboard")}>Account Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert("Opening Stripe Customer Portal...")}>
                Manage Billing
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 overflow-x-hidden">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__ENV = window.__ENV || {};
              window.__ENV.GOOGLE_MAPS_KEY = window.__ENV.GOOGLE_MAPS_KEY || "";
              window.__ENV.NEXT_PUBLIC_GOOGLE_MAPS_KEY = window.__ENV.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
            `,
          }}
        />
        
          {needsPlanSelection && isAuthenticated ? (
              <div className="flex flex-col min-h-screen">
                  <Header />
                  <div className="flex-1">
                      <PlanSelection onPlanSelected={handlePlanSelected} />
                  </div>
              </div>
          ) : (
              <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
                  <div className="hidden border-r border-slate-200/60 lg:block">
                    <SidebarContent isMobile={false} />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <AnimatePresence>
                        {isSidebarOpen && (
                            <>
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-black/50 z-40"
                                    onClick={() => setSidebarOpen(false)}
                                />
                                <motion.div 
                                    initial={{ x: "-100%" }}
                                    animate={{ x: 0 }}
                                    exit={{ x: "-100%" }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] z-50"
                                >
                                    <SidebarContent isMobile={true} />
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                    
                    <Header />

                    <main className="flex-1 p-4 lg:p-6 overflow-auto min-w-0">
                        {showUpsell && isAuthenticated && (
                            <div className="w-full bg-indigo-600 rounded-xl p-3 text-center text-sm text-white flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-6">
                                <span className="text-center sm:text-left">Unlock GEO/MEO automations with Pro or Elite – <Link to={createPageUrl("pricing")} className="font-bold underline">Start for $0.99</Link>.</span>
                                <button onClick={() => setShowUpsell(false)} className="shrink-0"><X className="w-4 h-4"/></button>
                            </div>
                        )}
                      {React.cloneElement(children, { user })}
                    </main>

                    <footer className="border-t border-slate-200/60 bg-white/60 text-center text-xs text-slate-500 py-4 px-4">
                        © {new Date().getFullYear()} AGS
                    </footer>
                  </div>
                </div>
          )}

          {showRandall && (
            <RandallAIAssistant 
              user={user} 
              onAskServer={handleAskServer} 
            />
          )}
          
          <Toaster richColors position="top-right" />
      </div>
    </ErrorBoundary>
  );
}
