import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Business, VisibilityCheck, AuditReport, Review } from '@/api/entities';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building, 
  MapPin, 
  Sparkles, 
  Star, 
  Target,
  Calendar,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';
import { format, isValid } from 'date-fns';

// Import scoped versions of the pages
import ScopedAIVisibility from '../components/business-detail/ScopedAIVisibility';
import ScopedMapsHealth from '../components/business-detail/ScopedMapsHealth';

const BusinessHeader = ({ business, isLoading, onQuickAction }) => {
  if (isLoading) {
    return (
      <div className="mb-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48 mb-4" />
        <div className="flex gap-2 mb-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
    );
  }

  if (!business) {
    return null;
  }

  const handleTrack = (action) => {
    if (window.lgb?.track) {
      window.lgb.track('business_quick_action', { 
        business_id: business.id, 
        action,
        business_name: business.name 
      });
    }
    onQuickAction(action);
  };

  return (
    <div className="mb-8">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 mb-2">
            <Building className="w-8 h-8 text-indigo-600"/>
            {business.name}
          </h1>
          <div className="flex items-center gap-2 text-slate-600 mb-3">
            <MapPin className="w-4 h-4" />
            <span>{business.city}, {business.state}</span>
          </div>
          <div className="flex gap-2 mb-4">
            <Badge variant="outline" className="border-slate-200">
              {business.category || 'Business'}
            </Badge>
            <Badge variant="outline" className="border-slate-200 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Added {format(new Date(business.created_date), 'MMM d, yyyy')}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button 
          onClick={() => handleTrack('geo_scan')}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Target className="w-4 h-4 mr-2" />
          Run GEO Scan
        </Button>
        <Button 
          variant="outline" 
          onClick={() => handleTrack('audit_gbp')}
          className="border-slate-200"
        >
          <Building className="w-4 h-4 mr-2" />
          Audit GBP
        </Button>
        <Button 
          variant="outline" 
          onClick={() => handleTrack('request_reviews')}
          className="border-slate-200"
        >
          <Star className="w-4 h-4 mr-2" />
          Request Reviews
        </Button>
        <Button 
          variant="outline" 
          onClick={() => handleTrack('open_billing')}
          className="border-slate-200"
        >
          Open Billing
        </Button>
      </div>
    </div>
  );
};

const NotFoundState = ({ onBackToBusiness }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center p-4">
    <div className="text-center max-w-md">
      <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-slate-400" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Business Not Found</h1>
      <p className="text-slate-600 mb-6">
        The business you're looking for doesn't exist or may have been removed.
      </p>
      <Button onClick={onBackToBusiness} className="bg-indigo-600 hover:bg-indigo-700">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Businesses
      </Button>
    </div>
  </div>
);

export default function BusinessDetail({ user }) {
  const [business, setBusiness] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ai_visibility'); // Default to AI Visibility
  const location = useLocation();
  const navigate = useNavigate();
  
  const businessId = new URLSearchParams(location.search).get('id');

  const loadBusiness = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await Business.get(businessId);
      if (!data) {
        setError('Business not found');
      } else {
        setBusiness(data);
      }
    } catch (err) {
      console.error('Error loading business:', err);
      setError('Failed to load business');
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      loadBusiness();
      // Track business view
      if (window.lgb?.track) {
        window.lgb.track('business_viewed', { business_id: businessId });
      }
    } else {
      setError('No business ID provided');
      setIsLoading(false);
    }
  }, [businessId, loadBusiness]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (window.lgb?.track) {
      window.lgb.track('business_tab_changed', { 
        business_id: businessId, 
        from_tab: activeTab, 
        to_tab: newTab 
      });
    }
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'geo_scan':
        navigate(createPageUrl('GeoMeoOperator'));
        break;
      case 'audit_gbp':
        navigate(createPageUrl('MapsHealth'));
        break;
      case 'request_reviews':
        navigate(createPageUrl('Reviews'));
        break;
      case 'open_billing':
        navigate(createPageUrl('pricing'));
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const handleBackToBusiness = () => {
    navigate(createPageUrl('Businesses'));
  };

  // Show not found state for missing business or invalid ID
  if (error || (!isLoading && !business)) {
    return <NotFoundState onBackToBusiness={handleBackToBusiness} />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <BusinessHeader 
        business={business} 
        isLoading={isLoading}
        onQuickAction={handleQuickAction}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-100/80 mb-6">
          <TabsTrigger value="ai_visibility">
            <Sparkles className="w-4 h-4 mr-2"/>
            AI Visibility
          </TabsTrigger>
          <TabsTrigger value="maps_audits">
            <Building className="w-4 h-4 mr-2"/>
            Maps Audits
          </TabsTrigger>
          {/* Removed reviews tab */}
        </TabsList>

        <TabsContent value="ai_visibility" className="mt-0">
          <ScopedAIVisibility user={user} businessId={businessId} business={business} />
        </TabsContent>
        
        <TabsContent value="maps_audits" className="mt-0">
          <ScopedMapsHealth user={user} businessId={businessId} business={business} />
        </TabsContent>
        
        {/* Removed reviews tab content */}
      </Tabs>
    </div>
  );
}