
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AuditReport, Business } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, CheckCircle2, AlertTriangle, XCircle, Building, Calendar, TrendingUp, Check, Loader2 } from 'lucide-react'; // Added Check icon, Loader2, AlertTriangle
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { format, isValid } from 'date-fns';
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from 'framer-motion';
import { useGoogleMaps, usePlacesAutocomplete } from '@/components/utils/useGoogleMaps';

// Circular Health Score Ring
const HealthScoreRing = ({ score, size = 100 }) => {
  const getColor = (val) => {
    if (val >= 80) return { stroke: "text-green-500", text: "text-green-600" };
    if (val >= 60) return { stroke: "text-amber-500", text: "text-amber-600" };
    return { stroke: "text-red-500", text: "text-red-600" };
  };

  const colors = getColor(score);
  const radius = (size - 12) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={12}
          fill="none"
          className="text-slate-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={12}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-700", colors.stroke)}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center">
        <span className={cn("text-2xl font-bold", colors.text)}>{score}</span>
        <span className="text-xs text-slate-500 block mt-0.5">health</span>
      </div>
    </div>
  );
};

// Business Health Card
const BusinessHealthCard = ({ audit, business, isLoading }) => {
  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  const getScoreColor = (score) => {
    if (score >= 80) return "from-green-50 to-emerald-50";
    if (score >= 60) return "from-amber-50 to-orange-50";
    return "from-red-50 to-pink-50";
  };

  const getStatusIcon = (score) => {
    if (score >= 80) return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (score >= 60) return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  const getInsight = (score, title) => {
    if (score >= 80) return "Strong performance across all metrics";
    if (score >= 60) return "Good foundation, minor improvements needed";
    if (title?.toLowerCase().includes('photo')) return "Needs more photos";
    if (title?.toLowerCase().includes('review')) return "Review velocity is low";
    if (title?.toLowerCase().includes('nap')) return "NAP consistency issue detected";
    return "Requires immediate attention";
  };

  return (
    <Card className={cn(
      "group bg-gradient-to-br border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2",
      getScoreColor(audit.score)
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
              {business?.name?.[0] || 'B'}
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-violet-600 transition-colors">
                {business?.name || 'Unknown Business'}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-500">
                  {audit.occurredAt && isValid(new Date(audit.occurredAt)) 
                    ? format(new Date(audit.occurredAt), 'MMM d, yyyy') 
                    : 'Invalid Date'}
                </span>
              </div>
            </div>
          </div>
          {getStatusIcon(audit.score)}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700 mb-2">{getInsight(audit.score, audit.title)}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-violet-600" />
              <span>{business?.city}, {business?.state}</span>
            </div>
          </div>
          <HealthScoreRing score={audit.score?.toFixed(0) || 0} size={90} />
        </div>
      </CardContent>
    </Card>
  );
};

export default function MapsHealth({ user }) {
  const [audits, setAudits] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState('all');
  
  // Add Google Maps autocomplete state
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState([]);
  const businessNameInputRef = React.useRef(null);

  // Google Maps Integration
  const { isLoaded: googleMapsLoaded, error: googleMapsError, isLoading: googleMapsLoading } = useGoogleMaps();

  const handlePlaceSelected = useCallback((placeData) => {
    setBusinessName(placeData.business_name);
    setCity(placeData.city);
    setState(placeData.state);
    
    const filled = [];
    if (placeData.city) filled.push('city');
    if (placeData.state) filled.push('state');
    setAutoFilledFields(filled);
  }, []);

  usePlacesAutocomplete(businessNameInputRef, handlePlaceSelected);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [auditsData, businessesData] = await Promise.all([
        AuditReport.list('-occurredAt'),
        Business.list()
      ]);
      setAudits(auditsData || []);
      setBusinesses(businessesData || []);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const businessMap = useMemo(() => new Map(businesses.map(b => [b.id, b])), [businesses]);

  const handleNewScan = async (e) => {
    e.preventDefault(); // Prevent default form submission
    if (!businessName || !city || !state) {
      alert('Please fill in all fields');
      return;
    }

    setIsScanning(true);
    
    // Simulate scan
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockAudit = {
      businessId: 'new-scan-' + Date.now(),
      score: Math.floor(60 + Math.random() * 35),
      title: `${businessName} Health Audit`,
      subtitle: 'Automated MEO analysis',
      occurredAt: new Date().toISOString()
    };

    setAudits([mockAudit, ...audits]);
    setBusinessName('');
    setCity('');
    setState('');
    setAutoFilledFields([]);
    setIsScanning(false);
    alert(`✅ Scan complete! ${mockAudit.title} added.`);
  };

  const filteredAudits = useMemo(() => {
    return (audits || []).filter(a => {
      const business = businessMap.get(a.businessId);
      const searchMatch = (a.subtitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (business?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      let scoreMatch = true;
      if (scoreFilter === 'high') scoreMatch = a.score >= 80;
      else if (scoreFilter === 'medium') scoreMatch = a.score >= 60 && a.score < 80;
      else if (scoreFilter === 'low') scoreMatch = a.score < 60;
      
      return searchMatch && scoreMatch;
    });
  }, [audits, searchTerm, scoreFilter, businessMap]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50/30 to-white">
      <div className="max-w-7xl mx-auto p-6 space-y-6" data-onboard="maps">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg mb-4">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Business Health Dashboard
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Monitor MEO performance, track NAP consistency, and uncover optimization opportunities
          </p>
        </div>

        {/* Quick Scanner with Autocomplete */}
        <Card className="bg-gradient-to-br from-violet-50 via-purple-50 to-white border-0 shadow-xl mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <TrendingUp className="w-6 h-6 text-violet-600" />
              Quick MEO Scanner
            </CardTitle>
            <p className="text-sm text-slate-600 mt-2">
              Scan any business to instantly check MEO health, NAP consistency, and visibility metrics
            </p>
          </CardHeader>
          <CardContent>
            {/* Success Banner - ONLY show when autocomplete is working */}
            {googleMapsLoaded && !googleMapsError && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                <p className="text-sm font-semibold text-green-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  ✅ Smart Business Search Active
                </p>
              </div>
            )}

            <form onSubmit={handleNewScan}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  ref={businessNameInputRef}
                  placeholder={googleMapsLoaded && !googleMapsError ? "Start typing business name..." : "Business Name"}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="bg-white border-slate-200 focus:border-violet-400 rounded-xl h-12"
                />
                <div className="space-y-1">
                  <Input
                    placeholder="City"
                    value={city}
                    onChange={(e) => { setCity(e.target.value); setAutoFilledFields(prev => prev.filter(f => f !== 'city')); }}
                    className="bg-white border-slate-200 focus:border-violet-400 rounded-xl h-12"
                  />
                  {autoFilledFields.includes('city') && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Auto-filled
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Input
                    placeholder="State"
                    value={state}
                    onChange={(e) => { setState(e.target.value); setAutoFilledFields(prev => prev.filter(f => f !== 'state')); }}
                    maxLength={2}
                    className="bg-white border-slate-200 focus:border-violet-400 rounded-xl h-12"
                  />
                  {autoFilledFields.includes('state') && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Auto-filled
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={isScanning}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 h-12 rounded-xl shadow-md"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Run Scan
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Search businesses or audits..."
                  className="pl-12 h-12 bg-white border-slate-200 focus:border-violet-400 focus:ring-violet-400 rounded-xl"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={scoreFilter} onValueChange={setScoreFilter}>
                <SelectTrigger className="w-full md:w-[220px] h-12 bg-white border-slate-200 rounded-xl">
                  <SelectValue placeholder="Filter by score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Businesses</SelectItem>
                  <SelectItem value="high">High Score (80%+)</SelectItem>
                  <SelectItem value="medium">Needs Attention (60-79%)</SelectItem>
                  <SelectItem value="low">Critical (&lt;60%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Business Health Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(isLoading ? Array(6).fill({}) : filteredAudits).map((audit, i) => (
            <BusinessHealthCard 
              key={audit.id || `skeleton-${i}`} // Use unique key for skeleton
              audit={audit}
              business={businessMap.get(audit.businessId)}
              isLoading={isLoading}
            />
          ))}
        </div>

        {/* Empty State */}
        {!isLoading && filteredAudits.length === 0 && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center">
                  <Building className="w-10 h-10 text-violet-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">No health audits found</h3>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                  {audits.length === 0 
                    ? "Use the Quick MEO Scanner above to run your first health audit." 
                    : "Try adjusting your search filters."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
