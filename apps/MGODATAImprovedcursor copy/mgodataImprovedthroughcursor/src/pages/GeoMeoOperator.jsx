import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Prospect, AuditResult } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Upload,
  Target,
  Building,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Zap,
  ArrowRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import EnhancedScanner from "../components/scanner/EnhancedScanner";
import { motion } from "framer-motion";

// Scan endpoint
const SCAN_ENDPOINT = "/functions/runDeterministicScan";

// Radar Scan Animation Component
const RadarScanAnimation = () => {
  return (
    <div className="relative w-full h-64 bg-gradient-to-br from-violet-50 via-purple-50 to-white rounded-2xl overflow-hidden mb-8">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-48 h-48">
          {/* Radar circles */}
          <div className="absolute inset-0 rounded-full border-4 border-violet-200 animate-ping opacity-75" />
          <div className="absolute inset-4 rounded-full border-4 border-violet-300 animate-ping opacity-50" style={{ animationDelay: '0.5s' }} />
          <div className="absolute inset-8 rounded-full border-4 border-violet-400 animate-ping opacity-25" style={{ animationDelay: '1s' }} />
          
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <Target className="w-8 h-8 text-white animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-violet-700 font-semibold animate-pulse">Scanning business presence...</p>
      </div>
    </div>
  );
};

// Modern Stat Card - Simplified & Clean
const StatCard = ({ title, value, icon: Icon, color = "violet", trend }) => {
  const colorClasses = {
    violet: "from-violet-500 to-purple-500",
    amber: "from-amber-500 to-orange-500",
    blue: "from-blue-500 to-indigo-500"
  };

  return (
    <Card className="relative overflow-hidden bg-white border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm",
            colorClasses[color]
          )}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend && (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-2 py-1">
              {trend}
            </Badge>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

// Limited Access Card - Premium CTA
const LimitedAccessCard = () => {
  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200 shadow-lg">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>
      
      <CardContent className="relative p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
          <Lock className="w-8 h-8 text-white" />
        </div>
        
        <h3 className="text-2xl font-bold text-slate-900 mb-2">Limited Access</h3>
        <p className="text-slate-600 mb-6 max-w-md mx-auto">
          Unlock full audits, GEO scans, and AI visibility reports with our premium integration.
        </p>
        
        <Button 
          asChild
          className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-semibold px-8 py-6 text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Link to={createPageUrl("pricing")}>
            <Sparkles className="w-5 h-5 mr-2" />
            Integrate Now
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </Button>
        
        <p className="text-xs text-slate-500 mt-4">
          Start at $0.99 • Cancel anytime
        </p>
      </CardContent>
    </Card>
  );
};

// Priority Chip Component
const PriorityChip = ({ status }) => {
  const configs = {
    High: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
    Medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
    Low: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-500" },
    New: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  };

  const config = configs[status] || configs.New;

  return (
    <Badge className={cn(
      "px-3 py-1.5 font-medium border-2",
      config.bg,
      config.text,
      config.border
    )}>
      <span className={cn("w-2 h-2 rounded-full mr-2 inline-block", config.dot)} />
      {status}
    </Badge>
  );
};

// Locked Section Overlay
const LockedOverlay = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 backdrop-blur-sm bg-white/60 z-10 flex items-center justify-center rounded-2xl"
    >
      <div className="text-center p-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h4 className="text-xl font-bold text-slate-900 mb-2">Integrate Now to Unlock</h4>
        <p className="text-slate-600 mb-4">Access full dashboard analytics and insights</p>
        <Button 
          asChild
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md"
        >
          <Link to={createPageUrl("pricing")}>
            <Sparkles className="w-4 h-4 mr-2" />
            Upgrade Now
          </Link>
        </Button>
      </div>
    </motion.div>
  );
};

export default function GeoMeoOperator({ user }) {
  const [prospects, setProspects] = useState([]);
  const [auditResults, setAuditResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [isRunningFullAudit, setIsRunningFullAudit] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prospectsData, auditsData] = await Promise.all([
        Prospect.list('-created_date'),
        AuditResult.list('-created_date')
      ]);
      setProspects(prospectsData || []);
      setAuditResults(auditsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setProspects([]);
      setAuditResults([]);
    }
    setIsLoading(false);
  };

  const handleRunAudit = async (prospect) => {
    setIsRunningAudit(true);
    try {
      const res = await fetch(SCAN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: prospect.businessName,
          city: prospect.city,
          website_domain: prospect.website || prospect.website_domain || ""
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || `HTTP ${res.status}`);
      }

      setAuditResults((prev) => [data, ...prev]);
      alert(`✅ Scan completed for ${prospect.businessName}`);

    } catch (error) {
      alert(`❌ Audit failed: ${error.message}`);
    }
    setIsRunningAudit(false);
  };

  const handleRunFullAudit = async (prospect) => {
    setIsRunningFullAudit(true);
    try {
      const res = await fetch("/functions/runFullAudit", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: prospect.businessName,
          industry: prospect.niche || 'business',
          city: prospect.city,
          state: prospect.state || 'OH',
          rating: prospect.rating || 0,
          review_count: prospect.reviewsCount || 0,
          website: prospect.website || null,
          photo_count: 0
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setAuditData(data);
      setShowAudit(true);
      setActiveTab('audit');

    } catch (error) {
      alert(`❌ Audit failed: ${error.message}`);
    }
    setIsRunningFullAudit(false);
  };

  const totalProspects = prospects.length;
  const highPriorityCount = auditResults.filter(a => a.priority === 'High').length;
  const avgScore = auditResults.length > 0
    ? Math.round(auditResults.reduce((sum, a) => sum + (a.scores?.FINAL || 0), 0) / auditResults.length)
    : 62; // Default realistic score

  const TABS = [
    { id: 'scanner', label: 'Enhanced Scanner', icon: Zap },
    { id: 'prospects', label: 'Prospects', icon: Building },
  ];

  const [activeTab, setActiveTab] = useState('scanner');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-purple-50/10">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header - Clean & Modern */}
        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-md">
                <Target className="w-6 h-6 text-white" />
              </div>
              GEO/MEO Operator
            </h1>
            <p className="text-slate-600 text-base">
              Audit local businesses and optimize visibility
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-sm hover:shadow-md transition-all rounded-xl">
              <Link to={createPageUrl("ProspectUpload")}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Prospects
              </Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-sm hover:shadow-md transition-all rounded-xl">
              <Link to={createPageUrl("AddProspect")}>
                <Plus className="w-4 h-4 mr-2" />
                Add Prospect
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Overview - Clean 3-Column + Limited Access Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Prospects" 
            value={totalProspects} 
            icon={Building} 
            color="violet" 
          />
          <StatCard 
            title="High Priority" 
            value={highPriorityCount} 
            icon={AlertTriangle} 
            color="amber"
            trend="+5"
          />
          <StatCard 
            title="Avg Score" 
            value={`${avgScore}%`} 
            icon={TrendingUp} 
            color="blue"
            trend="+3%"
          />
          <LimitedAccessCard />
        </div>

        {/* Radar Animation when scanning */}
        {isRunningAudit && <RadarScanAnimation />}

        {/* Tabs - Simplified */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md rounded-2xl">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-slate-100/80 p-1 rounded-xl border border-slate-200 mb-6">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger 
                      key={tab.id} 
                      value={tab.id}
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg transition-all"
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {tab.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value="scanner" className="mt-0">
                <EnhancedScanner />
              </TabsContent>

              <TabsContent value="prospects" className="mt-0">
                {/* Locked Section with Blur Overlay */}
                <div className="relative min-h-[400px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 blur-sm pointer-events-none">
                    {prospects.slice(0, 3).map((prospect) => (
                      <Card key={prospect.id} className="bg-white/90 backdrop-blur-sm border-0 shadow-sm">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                {prospect.businessName?.[0] || 'B'}
                              </div>
                              <div>
                                <CardTitle className="text-lg font-bold text-slate-900">
                                  {prospect.businessName}
                                </CardTitle>
                                <p className="text-sm text-slate-500 mt-0.5">
                                  {prospect.niche} • {prospect.city}
                                </p>
                              </div>
                            </div>
                            <PriorityChip status={prospect.status} />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                <span className="text-amber-600 font-bold">{prospect.rating || 'N/A'}</span>
                              </div>
                              <span className="text-slate-600">Rating</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                <span className="text-blue-600 font-bold">{prospect.reviewsCount || 0}</span>
                              </div>
                              <span className="text-slate-600">Reviews</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <LockedOverlay />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}