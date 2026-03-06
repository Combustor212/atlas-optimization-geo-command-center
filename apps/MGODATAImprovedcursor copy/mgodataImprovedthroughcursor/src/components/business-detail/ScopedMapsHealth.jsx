
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AuditReport } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Plus, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isValid } from 'date-fns';

const EmptyState = ({ businessName, onRunAudit }) => (
  <div className="text-center py-16 bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg rounded-xl">
    <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
      <MapPin className="w-8 h-8 text-blue-600" />
    </div>
    <h3 className="text-xl font-semibold text-slate-900 mb-3">No Maps Audits Yet</h3>
    <p className="text-slate-600 mb-6 max-w-md mx-auto">
      Start monitoring <strong>{businessName}</strong>'s Google Business Profile health, NAP consistency, and local search performance.
    </p>
    <Button onClick={onRunAudit} className="bg-blue-600 hover:bg-blue-700">
      <FileText className="w-4 h-4 mr-2" />
      Run First Audit
    </Button>
  </div>
);

const MapsAuditCard = ({ audit, isLoading }) => {
  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }
  
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-slate-900 mb-2">{audit.title}</h3>
          <p className="text-sm text-slate-500">{audit.subtitle}</p>
        </div>
        <div className={`px-3 py-1 rounded-full border ${getScoreColor(audit.score)}`}>
          <span className="text-sm font-bold">{audit.score?.toFixed(0)}%</span>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-sm text-slate-600">
        <span>
          {audit.occurredAt && isValid(new Date(audit.occurredAt)) 
            ? format(new Date(audit.occurredAt), 'MMM d, yyyy') 
            : 'Invalid Date'}
        </span>
        <span className={audit.score >= 80 ? 'text-green-600' : audit.score >= 60 ? 'text-yellow-600' : 'text-red-600'}>
          {audit.score >= 80 ? 'Excellent' : audit.score >= 60 ? 'Good' : 'Needs Work'}
        </span>
      </div>
    </div>
  );
};

export default function ScopedMapsHealth({ user, businessId, business }) {
  const [audits, setAudits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadAudits = useCallback(async () => {
    setIsLoading(true);
    try {
      // Data scoping: only fetch audits for this specific business
      const auditsData = await AuditReport.filter({ businessId }, '-occurredAt');
      setAudits(auditsData || []);
      
      // Telemetry: detect data scope violations
      const violatingAudits = (auditsData || []).filter(audit => audit.businessId !== businessId);
      if (violatingAudits.length > 0 && window.lgb?.track) {
        window.lgb.track('data_scope_violation_detected', {
          component: 'ScopedMapsHealth',
          business_id: businessId,
          violation_count: violatingAudits.length
        });
      }
    } catch (error) {
      console.error('Error loading audit reports:', error);
      setAudits([]);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]); // businessId is a dependency because it's used inside loadAudits

  useEffect(() => {
    if (businessId) {
      loadAudits();
    }
  }, [businessId, loadAudits]); // loadAudits is now a stable function reference thanks to useCallback

  const handleRunAudit = () => {
    if (window.lgb?.track) {
      window.lgb.track('maps_audit_cta_clicked', { 
        business_id: businessId,
        source: 'empty_state'
      });
    }
    alert(`Running maps health audit for ${business?.name}...`);
  };

  const filteredAudits = useMemo(() => {
    return audits.filter(audit =>
      (audit.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (audit.subtitle || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [audits, searchTerm]);

  // Show empty state if no audits exist for this business
  if (!isLoading && audits.length === 0) {
    return <EmptyState businessName={business?.name || 'this business'} onRunAudit={handleRunAudit} />;
  }

  return (
    <div>
      {/* Search and Controls */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-200/60 mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search audit reports..."
            className="pl-10 bg-white/80 border-slate-200"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={handleRunAudit} className="bg-blue-600 hover:bg-blue-700 shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          New Audit
        </Button>
      </div>

      {/* Audits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(isLoading ? Array(4).fill({}) : filteredAudits).map((audit, i) => (
          <MapsAuditCard 
            key={audit.id || i}
            audit={audit}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* No Results State */}
      {!isLoading && filteredAudits.length === 0 && audits.length > 0 && (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg rounded-xl">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No matching audits</h3>
          <p className="text-slate-500">Try adjusting your search terms.</p>
        </div>
      )}
    </div>
  );
}
