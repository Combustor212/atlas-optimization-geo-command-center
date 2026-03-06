
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { VisibilityCheck } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Sparkles, Plus, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isValid } from 'date-fns';

const EmptyState = ({ businessName, onRunCheck }) => (
  <div className="text-center py-16 bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg rounded-xl">
    <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
      <Sparkles className="w-8 h-8 text-indigo-600" />
    </div>
    <h3 className="text-xl font-semibold text-slate-900 mb-3">No AI Visibility Checks Yet</h3>
    <p className="text-slate-600 mb-6 max-w-md mx-auto">
      Start tracking how often <strong>{businessName}</strong> appears in AI-powered answers and search results.
    </p>
    <Button onClick={onRunCheck} className="bg-indigo-600 hover:bg-indigo-700">
      <Target className="w-4 h-4 mr-2" />
      Run First GEO Check
    </Button>
  </div>
);

const VisibilityCheckCard = ({ check, isLoading }) => {
  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl p-6">
      <p className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-2">
        {check.occurredAt && isValid(new Date(check.occurredAt)) 
          ? format(new Date(check.occurredAt), 'MMMM d, yyyy') 
          : 'Invalid Date'}
      </p>
      <div className="flex items-center gap-4 mb-4">
        <p className="text-4xl font-bold text-indigo-600">{check.score?.toFixed(1)}</p>
        <div className="flex-1">
          <h3 className="font-bold text-lg text-slate-900 mb-1">{check.question}</h3>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${check.score >= 80 ? 'bg-green-500' : check.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} />
            <span className="text-sm text-slate-500">
              {check.score >= 80 ? 'Excellent visibility' : check.score >= 60 ? 'Good visibility' : 'Needs improvement'}
            </span>
          </div>
        </div>
      </div>
      <p className="text-sm text-slate-600">{check.summary}</p>
    </div>
  );
};

export default function ScopedAIVisibility({ user, businessId, business }) {
  const [checks, setChecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadChecks = useCallback(async () => {
    setIsLoading(true);
    try {
      // Data scoping: only fetch checks for this specific business
      const checksData = await VisibilityCheck.filter({ businessId }, '-occurredAt');
      setChecks(checksData || []);
      
      // Telemetry: detect data scope violations (should never happen with proper filtering)
      const violatingChecks = (checksData || []).filter(check => check.businessId !== businessId);
      if (violatingChecks.length > 0 && window.lgb?.track) {
        window.lgb.track('data_scope_violation_detected', {
          component: 'ScopedAIVisibility',
          business_id: businessId,
          violation_count: violatingChecks.length
        });
      }
    } catch (error) {
      console.error('Error loading visibility checks:', error);
      setChecks([]);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]); // businessId is a dependency for useCallback

  useEffect(() => {
    if (businessId) {
      loadChecks();
    }
  }, [businessId, loadChecks]); // loadChecks is now a dependency

  const handleRunCheck = () => {
    if (window.lgb?.track) {
      window.lgb.track('ai_visibility_cta_clicked', { 
        business_id: businessId,
        source: 'empty_state'
      });
    }
    // In a real implementation, this would open a modal or navigate to run a check
    alert(`Running AI visibility check for ${business?.name}...`);
  };

  const filteredChecks = useMemo(() => {
    return checks.filter(check =>
      (check.question || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [checks, searchTerm]);

  // Show empty state if no checks exist for this business
  if (!isLoading && checks.length === 0) {
    return <EmptyState businessName={business?.name || 'this business'} onRunCheck={handleRunCheck} />;
  }

  return (
    <div>
      {/* Search and Controls */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-200/60 mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search visibility checks..."
            className="pl-10 bg-white/80 border-slate-200"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={handleRunCheck} className="bg-indigo-600 hover:bg-indigo-700 shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          New Check
        </Button>
      </div>

      {/* Checks Grid */}
      <div className="grid grid-cols-1 gap-6">
        {(isLoading ? Array(3).fill({}) : filteredChecks).map((check, i) => (
          <VisibilityCheckCard 
            key={check.id || i}
            check={check}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* No Results State */}
      {!isLoading && filteredChecks.length === 0 && checks.length > 0 && (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg rounded-xl">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No matching checks</h3>
          <p className="text-slate-500">Try adjusting your search terms.</p>
        </div>
      )}
    </div>
  );
}
