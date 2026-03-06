import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ScanResult } from '@/api/entities';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';

export default function SharedScan() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const [scanData, setScanData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchScanResult = async () => {
      try {
        setIsLoading(true);
        const results = await ScanResult.filter({ scanId });
        
        if (results && results.length > 0) {
          const scan = results[0];
          // Store in sessionStorage so ScanResults page can display it
          sessionStorage.setItem('scanResults', JSON.stringify({
            business: scan.business,
            scores: scan.scores,
            geo: scan.geo || null, // ✅ canonical GEO object
            enrichedData: scan.enrichedData,
            insightSummary: scan.insightSummary,
            percentile: scan.percentile,
            meoBackendData: scan.meoBackendData, // include full backend MEO body when available
            email: scan.email,
            metadata: scan.metadata
          }));
          
          // Redirect to ScanResults page
          navigate(createPageUrl('ScanResults'), { replace: true });
        } else {
          setError('Scan not found');
        }
      } catch (err) {
        console.error('Error fetching scan:', err);
        setError('Failed to load scan results');
      } finally {
        setIsLoading(false);
      }
    };

    if (scanId) {
      fetchScanResult();
    } else {
      setError('Invalid scan ID');
      setIsLoading(false);
    }
  }, [scanId, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-slate-600 text-sm font-medium">Loading scan results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md shadow-lg">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Scan Not Found</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <Button
              onClick={() => navigate(createPageUrl('Landing') + '#scan-section')}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              Run a New Scan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}