
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Sparkles, ArrowRight, Users, Target, BarChart3, Star } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { handleCheckoutSuccess } from '../components/utils/stripe';
import CompanyLogo from '../components/CompanyLogo';

const OnboardingStep = ({ icon: Icon, title, description, completed = false, onClick }) => (
  <Card className={`transition-all duration-200 cursor-pointer hover:shadow-md ${completed ? 'border-green-200 bg-green-50' : 'border-slate-200 hover:border-indigo-200'}`} onClick={onClick}>
    <CardHeader className="pb-3">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${completed ? 'bg-green-100' : 'bg-indigo-100'}`}>
          {completed ? (
            <Check className="w-5 h-5 text-green-600" />
          ) : (
            <Icon className="w-5 h-5 text-indigo-600" />
          )}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-slate-600">{description}</p>
    </CardContent>
  </Card>
);

export default function SuccessPage({ user }) {
  const [sessionId, setSessionId] = useState('');
  const [planDetails, setPlanDetails] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // Get session ID from URL params
    const urlParams = new URLSearchParams(location.search);
    const sid = urlParams.get('session_id') || urlParams.get('sid');
    
    if (sid) {
      setSessionId(sid);
      // Handle checkout success tracking
      handleCheckoutSuccess(sid);
    }

    // Set plan details
    setPlanDetails({
      plan: 'PRO',
      monthlyPrice: 499,
      nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
    });
  }, [location]);

  const handleStepClick = (stepAction) => {
    // Track onboarding step clicks
    if (window.lgb?.track) {
      window.lgb.track('onboarding_step_clicked', { 
        step: stepAction,
        session_id: sessionId 
      });
    }
    
    // Navigate to appropriate page based on step
    switch (stepAction) {
      case 'connect_gbp':
        window.location.href = createPageUrl("Businesses");
        break;
      case 'connect_apple':
        alert('Apple Business Connect integration coming soon!');
        break;
      case 'start_reviews':
        window.location.href = createPageUrl("ReputationManager");
        break;
      case 'run_geo_scan':
        window.location.href = createPageUrl("AIVisibility");
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Simple Header */}
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm px-4 md:px-6 lg:h-[68px]">
        <CompanyLogo 
          linkTo="/"
          size="md"
        />
        <div className="flex-1" />
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Welcome to AGS!
          </h1>
          <p className="text-xl text-slate-600 mb-6">
            Your PRO subscription is active. Let's get you set up for success.
          </p>

          {planDetails && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/60 p-6 max-w-md mx-auto">
              <h3 className="font-bold text-slate-900 mb-2">Subscription Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Plan:</span>
                  <span className="font-medium">{planDetails.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Monthly:</span>
                  <span className="font-medium">${planDetails.monthlyPrice}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Next Billing:</span>
                  <span className="font-medium">{planDetails.nextBilling}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Onboarding Checklist */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
            Get Started in 4 Steps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <OnboardingStep
              icon={Users}
              title="Connect Google Business Profile"
              description="Link your Google Business Profile to start optimizing your local visibility and rankings."
              onClick={() => handleStepClick('connect_gbp')}
            />
            <OnboardingStep
              icon={Target}
              title="Connect Apple Business Connect"
              description="Add your Apple Business Connect account for comprehensive maps coverage."
              onClick={() => handleStepClick('connect_apple')}
            />
            <OnboardingStep
              icon={Star}
              title="Start Review Campaign"
              description="Set up automated review requests to boost your reputation and rankings."
              onClick={() => handleStepClick('start_reviews')}
            />
            <OnboardingStep
              icon={BarChart3}
              title="Run GEO Scan"
              description="Check your visibility in AI search results and get optimization recommendations."
              onClick={() => handleStepClick('run_geo_scan')}
            />
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <Button 
            asChild
            size="lg"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 text-lg px-8 py-4 h-auto"
          >
            <Link to={createPageUrl("dashboard")}>
              Go to Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
          
          <p className="text-sm text-slate-500 mt-4">
            Questions? We're here to help at every step.
          </p>
        </div>

        {/* Session Info for debugging */}
        {sessionId && (
          <div className="mt-12 text-center">
            <details className="max-w-md mx-auto">
              <summary className="text-sm text-slate-400 cursor-pointer">Session Details</summary>
              <p className="text-xs text-slate-400 mt-2 font-mono">{sessionId}</p>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
