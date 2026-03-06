import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  Search,
  XCircle
} from 'lucide-react';

/**
 * GEO Unresolved State Component
 * 
 * Displays when category cannot be resolved and GEO score is null.
 * NEVER shows fake scores or "Establishment".
 */
export default function GEOUnresolvedState({ 
  geo,
  onRetry
}) {
  if (!geo) return null;
  const categoryResolution = geo.category;
  const isUnresolved = geo.status === 'category_unresolved';
  const confidence = categoryResolution?.confidence || 0;
  const source = categoryResolution?.source; // render directly (no "unknown")
  const resolvedName =
    geo?.debug?.name ||
    '';
  
  if (!isUnresolved) {
    // Category is resolved, this component shouldn't render
    return null;
  }
  
  return (
    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 rounded-2xl shadow-lg">
      <CardContent className="p-8 sm:p-10">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-orange-100 rounded-xl">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-orange-900 mb-2">
              Category Unresolved
            </h2>
            <p className="text-orange-700 text-base">
              We couldn't determine a specific business category for <strong>{resolvedName || 'this business'}</strong>. 
              Without a category, we can't compute an accurate GEO score.
            </p>
          </div>
        </div>
        
        {/* Why This Matters */}
        <div className="bg-white/80 rounded-xl p-5 mb-6 border border-orange-200">
          <div className="flex items-start gap-3 mb-3">
            <HelpCircle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900 mb-1">Why does this matter?</h3>
              <p className="text-sm text-orange-800">
                GEO (Generative Engine Optimization) measures how likely AI assistants are to recommend your business 
                for local searches. To compute this accurately, we need to:
              </p>
            </div>
          </div>
          <ul className="ml-8 space-y-1 text-sm text-orange-800">
            <li className="list-disc">Identify your specific niche (e.g., "Medical spa", "Driving school")</li>
            <li className="list-disc">Find similar competitors in your area</li>
            <li className="list-disc">Generate relevant search queries for your category</li>
            <li className="list-disc">Rank you against competitors for those queries</li>
          </ul>
        </div>
        
        {/* What We Found */}
        <div className="bg-white/80 rounded-xl p-5 mb-6 border border-orange-200">
          <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
            <Search className="w-5 h-5" />
            What we found
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-orange-700">Name:</span>
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 max-w-[60%] truncate">
                {resolvedName || 'Place details missing — check Places API fieldMask'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-orange-700">Primary Type:</span>
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                {geo?.debug?.categoryDebug?.placesPrimaryType || 'N/A'}
              </Badge>
            </div>
            {categoryResolution?.debug?.primaryTypeDisplayName && (
              <div className="flex items-center justify-between">
                <span className="text-orange-700">Display Name:</span>
                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                  {geo?.debug?.categoryDebug?.placesDisplayName}
                </Badge>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-orange-700">Detection Method:</span>
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                {categoryResolution?.debug?.finalMethod || source || 'unresolved'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-orange-700">Confidence:</span>
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                {Math.round(confidence * 100)}%
              </Badge>
            </div>
            {categoryResolution?.debug?.methodsTried && categoryResolution.debug.methodsTried.length > 0 && (
              <div className="pt-2 border-t border-orange-200">
                <span className="text-orange-700 block mb-1">Methods Tried:</span>
                <div className="flex flex-wrap gap-1">
                  {(geo?.debug?.categoryDebug?.methodTried || []).map((method, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs bg-orange-50 text-orange-700 border border-orange-200">
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(geo?.debug?.categoryDebug?.typesSample) && geo.debug.categoryDebug.typesSample.length > 0 && (
              <div className="pt-2 border-t border-orange-200">
                <span className="text-orange-700 block mb-1">Google Types (first 10):</span>
                <div className="flex flex-wrap gap-1">
                  {geo.debug.categoryDebug.typesSample.map((type, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs bg-orange-50 text-orange-700 border border-orange-200">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* What You Can Do */}
        <div className="bg-white/80 rounded-xl p-5 mb-6 border border-orange-200">
          <h3 className="font-semibold text-orange-900 mb-3">What you can do</h3>
          <ul className="space-y-2 text-sm text-orange-800">
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold mt-0.5">1.</span>
              <span>
                <strong>Update your Google Business Profile:</strong> Ensure your primary category is specific 
                (e.g., "Medical Spa" not just "Spa", "Driving School" not "School").
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold mt-0.5">2.</span>
              <span>
                <strong>Add a detailed description:</strong> Include specific services, specialties, and keywords 
                that describe what you do.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 font-bold mt-0.5">3.</span>
              <span>
                <strong>Retry detection:</strong> After updating your profile, click the button below to rerun 
                category detection.
              </span>
            </li>
          </ul>
        </div>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={onRetry}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Retry Category Detection
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open('https://business.google.com', '_blank')}
            className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-100 font-semibold py-3 rounded-xl"
          >
            Update Google Profile
          </Button>
        </div>
        
        {/* Footer Note */}
        <div className="mt-6 pt-6 border-t border-orange-200">
          <div className="flex items-start gap-2 text-xs text-orange-600">
            <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              <strong>Note:</strong> We never show fake scores or generic labels like "Establishment". 
              If we can't determine your specific category, we'll tell you honestly so you can fix it.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

