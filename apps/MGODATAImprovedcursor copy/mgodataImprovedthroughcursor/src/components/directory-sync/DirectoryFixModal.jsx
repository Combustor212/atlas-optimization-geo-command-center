import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Copy, Check, AlertTriangle, ExternalLink, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DirectoryFixModal({ directory, isOpen, onClose, onSuccess }) {
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleFix = async () => {
    setIsFixing(true);
    setError(null);
    setFixResult(null);

    try {
      // Mock GBP data - in production, fetch from Business entity
      const mockGBP = {
        place_id: 'places/ChIJExample123',
        name: directory.name,
        address_raw: '123 Main St Ste 201, Mason, OH 45040',
        phone: '(513) 555-1234',
        website: 'https://example.com'
      };

      const suspect_listing = directory.status === 'mismatch' ? {
        name: directory.name,
        address_raw: '123 Main St Ste 200, Mason, OH 45040', // Mock mismatch
        listing_url: `https://www.yelp.com/biz/${directory.name.toLowerCase().replace(/\s+/g, '-')}`
      } : null;

      const response = await fetch('/functions/directoryFixAgent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: 'business_123',
          platform: directory.name.toLowerCase().includes('yelp') ? 'yelp' : 'bing',
          suspect_listing,
          gbp: mockGBP
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process fix');
      }

      setFixResult(data);

      if (data.status === 'SYNCED') {
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      }

    } catch (err) {
      console.error('Fix error:', err);
      setError(err.message || 'Failed to process fix request');
    } finally {
      setIsFixing(false);
    }
  };

  const handleCopy = () => {
    if (fixResult?.manual?.copy) {
      navigator.clipboard.writeText(fixResult.manual.copy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getActionDescription = () => {
    if (!fixResult) return null;

    switch (fixResult.action) {
      case 'api_update':
        return "We'll automatically update the listing using the platform's API.";
      case 'manual_request':
        return "We've prepared the fix instructions. Copy the text below and submit it through the platform's owner dashboard.";
      case 'create_listing':
        return "We'll create a new listing on this platform using your canonical business information.";
      case 'no_action':
        return "This listing already matches your canonical NAP. No changes needed.";
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-3xl">{directory.logo}</span>
            Fix {directory.name} Listing
          </DialogTitle>
          <DialogDescription>
            {directory.status === 'mismatch' 
              ? "We'll align this listing to match your Google Business Profile."
              : "We'll create your business listing on this platform."}
          </DialogDescription>
        </DialogHeader>

        {/* Current Issues */}
        {!fixResult && directory.issues && directory.issues.length > 0 && (
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-900">
                <AlertTriangle className="w-4 h-4" />
                Current Issues
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {directory.issues.map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-amber-800">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5" />
                  <span>{issue}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 text-sm">{error}</p>
                <p className="text-xs text-red-700 mt-1">
                  Please try again or contact us if the issue persists.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fix Result */}
        {fixResult && (
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-center">
              <Badge className={cn(
                "px-4 py-2 text-sm",
                fixResult.action === 'no_action' ? "bg-green-100 text-green-800 border-green-200" :
                fixResult.action === 'api_update' || fixResult.action === 'create_listing' ? "bg-blue-100 text-blue-800 border-blue-200" :
                "bg-amber-100 text-amber-800 border-amber-200"
              )}>
                {fixResult.action === 'no_action' ? 'Already Synced' :
                 fixResult.action === 'api_update' ? 'API Update Ready' :
                 fixResult.action === 'create_listing' ? 'Creation Ready' :
                 'Manual Action Required'}
              </Badge>
            </div>

            {/* Action Description */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <p className="text-sm text-blue-900">
                  {getActionDescription()}
                </p>
              </CardContent>
            </Card>

            {/* Canonical Address */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Canonical Address (from Google)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-sm bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {fixResult.canonical_address}
                </p>
              </CardContent>
            </Card>

            {/* Diff Display */}
            {fixResult.diff && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Changes to Apply</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(fixResult.diff).map(([field, change]) => (
                    change && (
                      <div key={field} className="flex items-center gap-3 text-sm">
                        <Badge variant="outline" className="w-16 justify-center capitalize">
                          {field}
                        </Badge>
                        <span className="text-red-600 line-through">{change.from || 'N/A'}</span>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                        <span className="text-green-600 font-semibold">{change.to}</span>
                      </div>
                    )
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Manual Instructions */}
            {fixResult.manual && (
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                <CardHeader>
                  <CardTitle className="text-sm">Manual Submission Required</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-indigo-200">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
                      {fixResult.manual.copy}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleCopy}
                      className="flex-1"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Text
                        </>
                      )}
                    </Button>
                    <Button
                      asChild
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600"
                    >
                      <a href={fixResult.manual.url} target="_blank" rel="noopener noreferrer">
                        Open Platform
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recheck Schedule */}
            {fixResult.recheck_schedule && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Automated Recheck Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {fixResult.recheck_schedule.map((time, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {time}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {fixResult.notes && fixResult.notes.length > 0 && (
              <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-4 space-y-2">
                  {fixResult.notes.map((note, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                      <div className="w-1 h-1 rounded-full bg-slate-400 mt-1.5" />
                      <span>{note}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {fixResult ? 'Done' : 'Cancel'}
          </Button>
          {!fixResult && (
            <Button
              onClick={handleFix}
              disabled={isFixing}
              className="bg-gradient-to-r from-indigo-600 to-purple-600"
            >
              {isFixing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Fix Now
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}