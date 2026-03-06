import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Business, VisibilityCheck, AuditReport } from '@/api/entities';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Building,
  Target,
  Sparkles,
  Star,
  ArrowRight,
  Zap,
  Plus,
  BarChart3,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import OnboardingModal from '../components/OnboardingModal';
import DemoWalkthrough from '../components/DemoWalkthrough';

// Enhanced Stat Card (without sparkline)
const StatCard = ({ title, value, icon: Icon, trend, color = "indigo" }) => {
  const colorClasses = {
    indigo: "from-indigo-500 to-purple-500",
    green: "from-green-500 to-emerald-500",
    amber: "from-amber-500 to-orange-500",
    blue: "from-blue-500 to-cyan-500"
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md",
            colorClasses[color]
          )}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend && (
            <Badge className="bg-green-50 text-green-700 border-green-200 px-2 py-1 text-xs">
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

// Needs Attention Card - More Prominent
const NeedsAttentionCard = ({ issues }) => {
  if (!issues || issues.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/60 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-green-900">All Clear!</h3>
              <p className="text-sm text-green-700">No urgent items need your attention</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/60 shadow-lg hover:shadow-xl transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Needs Your Attention ({issues.length})
          </CardTitle>
          <Badge className="bg-amber-100 text-amber-800 border-amber-300">
            Action Required
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {issues.slice(0, 3).map((issue, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 bg-white/80 rounded-lg border border-amber-200/60">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <issue.icon className="w-4 h-4 text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm mb-1">{issue.title}</p>
              <p className="text-xs text-slate-600 mb-2">{issue.description}</p>
              <Button size="sm" className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 h-7 text-xs" asChild>
                <Link to={issue.actionUrl}>
                  {issue.actionText}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// Quick Actions Row
const QuickActionsRow = () => {
  const actions = [
    {
      icon: Plus,
      title: "Add Business",
      description: "Connect a new location",
      url: createPageUrl("Businesses"),
      color: "from-indigo-600 to-purple-600"
    },
    {
      icon: Target,
      title: "Run GEO Scan",
      description: "Check AI visibility",
      url: createPageUrl("GeoMeoOperator"),
      color: "from-green-600 to-emerald-600"
    },
    {
      icon: Star,
      title: "Request Reviews",
      description: "Boost reputation",
      url: createPageUrl("ReputationManager"),
      color: "from-amber-600 to-orange-600"
    },
    {
      icon: BarChart3,
      title: "View Reports",
      description: "Check performance",
      url: createPageUrl("AuditReports"),
      color: "from-blue-600 to-cyan-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action, idx) => {
        const Icon = action.icon;
        return (
          <Link key={idx} to={action.url}>
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform",
                    action.color
                  )}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{action.title}</p>
                    <p className="text-xs text-slate-500">{action.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};

// Pro Tips Section
const ProTipsSection = ({ user }) => {
  const tips = [
    {
      title: "Weekly GBP Posts",
      description: "Post at least once per week on your Google Business Profile to boost visibility",
      icon: Sparkles
    },
    {
      title: "Respond to Reviews",
      description: "Reply to every review within 24 hours to show customers you care",
      icon: Star
    },
    {
      title: "Track AI Mentions",
      description: "Monitor how often your business appears in AI search results",
      icon: Target
    }
  ];

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200/60 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-indigo-900">
          <Zap className="w-5 h-5 text-indigo-600" />
          Pro Tips
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tips.map((tip, idx) => {
          const Icon = tip.icon;
          return (
            <div key={idx} className="flex items-start gap-3 p-3 bg-white/80 rounded-lg border border-indigo-200/60">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-indigo-700" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm mb-1">{tip.title}</p>
                <p className="text-xs text-slate-600">{tip.description}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default function Dashboard({ user }) {
  const [businesses, setBusinesses] = useState([]);
  const [recentChecks, setRecentChecks] = useState([]);
  const [recentAudits, setRecentAudits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Auto-start walkthrough on first visit
    const hasCompletedWalkthrough = localStorage.getItem('walkthrough_completed');
    const hasSeenOnboarding = localStorage.getItem('onboarding_completed');
    
    // Trigger walkthrough after onboarding is complete
    if (!hasCompletedWalkthrough && hasSeenOnboarding) {
      setTimeout(() => {
        setShowWalkthrough(true);
      }, 2000); // 2-second delay
    }
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [businessesData, checksData, auditsData] = await Promise.all([
        Business.list('-created_date', 10),
        VisibilityCheck.list('-occurredAt', 5),
        AuditReport.list('-occurredAt', 5)
      ]);
      setBusinesses(businessesData || []);
      setRecentChecks(checksData || []);
      setRecentAudits(auditsData || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
    setIsLoading(false);
  };

  // Calculate metrics
  const totalBusinesses = businesses.length;
  const avgScore = recentAudits.length > 0
    ? Math.round(recentAudits.reduce((sum, a) => sum + (a.score || 0), 0) / recentAudits.length)
    : 0;
  const checksThisWeek = recentChecks.filter(c => {
    const checkDate = new Date(c.occurredAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return checkDate >= weekAgo;
  }).length;

  // Generate needs attention items
  const needsAttention = [];
  
  if (totalBusinesses === 0) {
    needsAttention.push({
      icon: Building,
      title: "Add Your First Business",
      description: "Get started by connecting your first business location",
      actionText: "Add Now",
      actionUrl: createPageUrl("Businesses")
    });
  }
  
  if (avgScore < 70 && recentAudits.length > 0) {
    needsAttention.push({
      icon: Target,
      title: "Low Average Score",
      description: "Your businesses need optimization to improve visibility",
      actionText: "View Audits",
      actionUrl: createPageUrl("AuditReports")
    });
  }
  
  if (checksThisWeek === 0 && totalBusinesses > 0) {
    needsAttention.push({
      icon: Sparkles,
      title: "Run AI Visibility Check",
      description: "Check how your businesses appear in AI search results",
      actionText: "Check Now",
      actionUrl: createPageUrl("AIVisibility")
    });
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <OnboardingModal user={user} onComplete={() => {
        loadDashboardData();
      }} />

      <DemoWalkthrough 
        show={showWalkthrough} 
        onExit={() => setShowWalkthrough(false)} 
      />

      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-slate-600 text-lg">Here's what's happening with your local visibility</p>
      </div>

      {/* Needs Attention - More Prominent */}
      <NeedsAttentionCard issues={needsAttention} />

      {/* Quick Actions */}
      <div data-onboard="quick-actions">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>
        <QuickActionsRow />
      </div>

      {/* Stats Overview (without sparklines) */}
      <div data-onboard="dashboard-stats">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Businesses"
            value={totalBusinesses}
            icon={Building}
            trend="+12%"
            color="indigo"
          />
          <StatCard
            title="Avg Score"
            value={`${avgScore}%`}
            icon={TrendingUp}
            trend="+8%"
            color="green"
          />
          <StatCard
            title="Checks This Week"
            value={checksThisWeek}
            icon={Sparkles}
            color="blue"
          />
          <StatCard
            title="Active Audits"
            value={recentAudits.length}
            icon={CheckCircle2}
            color="amber"
          />
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2" data-onboard="reports">
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentAudits.length === 0 && recentChecks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 mb-4">No recent activity yet</p>
                  <Button asChild className="bg-gradient-to-r from-indigo-600 to-purple-600">
                    <Link to={createPageUrl("GeoMeoOperator")}>
                      <Target className="w-4 h-4 mr-2" />
                      Run Your First Scan
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...recentAudits.slice(0, 3), ...recentChecks.slice(0, 2)].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                          {item.score !== undefined ? (
                            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <Sparkles className="w-5 h-5 text-indigo-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {item.title || item.question || 'Activity'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(item.occurredAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {item.score !== undefined && (
                        <Badge className={cn(
                          "px-3 py-1",
                          item.score >= 80 ? "bg-green-100 text-green-700 border-green-200" :
                          item.score >= 60 ? "bg-amber-100 text-amber-700 border-amber-200" :
                          "bg-red-100 text-red-700 border-red-200"
                        )}>
                          {item.score}%
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pro Tips */}
        <div data-onboard="dashboard-trends">
          <ProTipsSection user={user} />
        </div>
      </div>

      {/* Recent Businesses */}
      {businesses.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                Your Businesses
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to={createPageUrl("Businesses")}>
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {businesses.slice(0, 6).map((business) => (
                <Link
                  key={business.id}
                  to={createPageUrl(`BusinessDetail?id=${business.id}`)}
                  className="block"
                >
                  <div className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 hover:shadow-md transition-all border border-slate-200 group">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {business.name?.[0] || 'B'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate group-hover:text-indigo-600 transition-colors">
                          {business.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {business.city}, {business.state}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {business.category || 'Business'}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}