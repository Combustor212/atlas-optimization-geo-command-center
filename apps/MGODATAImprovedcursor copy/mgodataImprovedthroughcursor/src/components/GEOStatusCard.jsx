import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, Copy, RefreshCw, Zap, Target, Search, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const BUSINESS_CATEGORIES = [
  'Driving school',
  'Medical spa',
  'Barber shop',
  'Dentist',
  'Real estate agency',
  'Restaurant',
  'Gym',
  'Auto repair shop',
  'Plumber',
  'Roofing contractor',
  'Law firm',
  'Accounting firm',
  'Veterinarian',
  'Hotel',
  'Convenience store',
  'Pharmacy',
  'Insurance agency',
  'Marketing agency'
];

const CATEGORY_TO_KEY = {
  'Driving school': 'driving_school',
  'Medical spa': 'med_spa',
  'Barber shop': 'barber_shop',
  'Dentist': 'dentist',
  'Real estate agency': 'real_estate',
  'Restaurant': 'restaurant',
  'Gym': 'gym',
  'Auto repair shop': 'auto_repair',
  'Plumber': 'plumbing',
  'Roofing contractor': 'roofing_contractor',
  'Law firm': 'law_firm',
  'Accounting firm': 'accounting',
  'Veterinarian': 'veterinarian',
  'Hotel': 'hotel',
  'Convenience store': 'convenience_store',
  'Pharmacy': 'pharmacy',
  'Insurance agency': 'insurance',
  'Marketing agency': 'marketing_agency'
};

export default function GEOStatusCard({ geo, onRetry, onFixCategory, onOpenWhyPanel }) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showDeveloperDetails, setShowDeveloperDetails] = useState(false);

  // OK state - show score and "Why this score" button
  if (geo?.status === 'ok') {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl shadow-lg">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">GEO Analysis Complete</h3>
                <p className="text-sm text-green-700">Your AI visibility score is ready</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700 border-green-200">
              {geo.algoVersion}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-green-900">{geo.score}/100</div>
              <div className="text-sm text-green-600">
                {geo.category?.label} • {geo.confidence} confidence
              </div>
            </div>
            <Button onClick={onOpenWhyPanel} className="bg-green-600 hover:bg-green-700">
              Why this score?
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // CATEGORY_UNRESOLVED state - detailed guidance
  if (geo?.status === 'category_unresolved') {
    return (
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-lg">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
              <div>
                <h3 className="text-lg font-semibold text-amber-900">GEO Score Unavailable</h3>
                <p className="text-sm text-amber-700">We couldn't identify your business type yet</p>
              </div>
            </div>
            <Badge variant="outline" className="border-amber-300 text-amber-700">
              BETA
            </Badge>
          </div>

          {/* What we detected */}
          {geo.categoryDebug && (
            <div className="bg-white/80 rounded-lg p-4 mb-6 border border-amber-200">
              <h4 className="font-medium text-amber-900 mb-2">What we detected:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-amber-700">Business name:</span>
                  <div className="font-medium">{geo.categoryDebug.placesDisplayName || 'Not found'}</div>
                </div>
                <div>
                  <span className="text-amber-700">Google type:</span>
                  <div className="font-medium">{geo.categoryDebug.placesPrimaryTypeDisplayName || 'Generic'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Fix actions */}
          <div className="space-y-3 mb-6">
            <h4 className="font-medium text-amber-900">To enable GEO scoring:</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="category" />
                <label htmlFor="category" className="text-sm text-amber-800">
                  Confirm your business category
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="description" />
                <label htmlFor="description" className="text-sm text-amber-800">
                  Add a detailed service description to your Google profile
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="sync" />
                <label htmlFor="sync" className="text-sm text-amber-800">
                  Sync your Google Business Profile data
                </label>
              </div>
            </div>
          </div>

          {/* Manual category select */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-amber-900 mb-2">
              Or select your category manually:
            </label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose your business type..." />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => selectedCategory && onFixCategory(selectedCategory, CATEGORY_TO_KEY[selectedCategory])}
              disabled={!selectedCategory}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              Set Category & Run GEO
            </Button>
            <Button variant="outline" onClick={onRetry} className="border-amber-300 text-amber-700 hover:bg-amber-50">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Detection
            </Button>
          </div>

          {/* Developer details */}
          <div className="mt-6 pt-4 border-t border-amber-200">
            <button
              onClick={() => setShowDeveloperDetails(!showDeveloperDetails)}
              className="flex items-center gap-2 text-xs text-amber-600 hover:text-amber-800"
            >
              {showDeveloperDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Developer details
            </button>

            {showDeveloperDetails && (
              <div className="mt-3 bg-white/60 rounded p-3 text-xs font-mono">
                <div className="grid grid-cols-2 gap-2">
                  <div>Trace ID:</div>
                  <div className="font-bold">{geo.traceId || 'N/A'}</div>
                  <div>Confidence:</div>
                  <div className="font-bold">{geo.categoryDebug?.confidence || 'N/A'}</div>
                  <div>Methods tried:</div>
                  <div className="font-bold">{geo.categoryDebug?.methodsTried?.join(', ') || 'N/A'}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 h-6 text-xs"
                  onClick={() => navigator.clipboard.writeText(geo.traceId || '')}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Trace ID
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // GENERATING state - progress with steps
  if (geo?.status === 'generating') {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl shadow-lg">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Analyzing GEO Score</h3>
                <p className="text-sm text-blue-700">This usually takes 10-15 seconds</p>
              </div>
            </div>
            <Badge variant="outline" className="border-blue-300 text-blue-700">
              BETA
            </Badge>
          </div>

          {/* Progress steps */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Search className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900">Finding similar businesses</div>
                <div className="text-xs text-blue-600">Searching {geo.category?.label || 'your area'}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Skeleton className="w-4 h-4 bg-blue-200 rounded" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900">Generating real search prompts</div>
                <div className="text-xs text-blue-600">Creating queries like "best {geo.category?.label || 'service'} near me"</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Skeleton className="w-4 h-4 bg-blue-200 rounded" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900">Checking AI recommendations</div>
                <div className="text-xs text-blue-600">Running {geo.category?.label || 'business'} through AI ranking models</div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onRetry} className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Analysis
            </Button>
            <Button variant="ghost" onClick={() => window.location.reload()} className="text-blue-600 hover:bg-blue-50">
              Run in Background
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ERROR state
  if (geo?.status === 'error') {
    return (
      <Card className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-2xl shadow-lg">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">GEO Analysis Failed</h3>
                <p className="text-sm text-red-700">We hit an issue, but your MEO score is still accurate</p>
              </div>
            </div>
            <Badge variant="outline" className="border-red-300 text-red-700">
              BETA
            </Badge>
          </div>

          <p className="text-red-800 mb-6">
            {geo.error || "Something went wrong while analyzing your AI visibility. Your Maps (MEO) score is unaffected."}
          </p>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button onClick={onRetry} className="flex-1 bg-red-600 hover:bg-red-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry GEO
            </Button>
            <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
              Contact Us
            </Button>
          </div>

          {/* Developer details */}
          <div className="mt-6 pt-4 border-t border-red-200">
            <button
              onClick={() => setShowDeveloperDetails(!showDeveloperDetails)}
              className="flex items-center gap-2 text-xs text-red-600 hover:text-red-800"
            >
              {showDeveloperDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Developer details
            </button>

            {showDeveloperDetails && (
              <div className="mt-3 bg-white/60 rounded p-3 text-xs font-mono">
                <div className="grid grid-cols-2 gap-2">
                  <div>Trace ID:</div>
                  <div className="font-bold">{geo.traceId || 'N/A'}</div>
                  <div>Algo Version:</div>
                  <div className="font-bold">{geo.algoVersion || 'N/A'}</div>
                  <div>Error:</div>
                  <div className="font-bold">{geo.error || 'N/A'}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 h-6 text-xs"
                  onClick={() => navigator.clipboard.writeText(geo.traceId || '')}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Trace ID
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback - should not happen
  return (
    <Card className="bg-gray-50 border border-gray-200 rounded-2xl shadow-lg">
      <CardContent className="p-8">
        <div className="text-center text-gray-600">
          <AlertCircle className="w-6 h-6 mx-auto mb-2" />
          <p>GEO status unknown</p>
        </div>
      </CardContent>
    </Card>
  );
}



