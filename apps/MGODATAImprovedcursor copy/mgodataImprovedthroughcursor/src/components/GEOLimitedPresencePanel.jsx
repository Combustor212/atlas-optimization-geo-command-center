import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Lock, ExternalLink, Globe } from 'lucide-react';

export default function GEOLimitedPresencePanel({ scanData, fallbackScore = 40, isTimeoutFallback = false }) {
  const businessName = scanData?.business?.name || 'This business';
  const hasWebsite = !!scanData?.business?.website;
  const hasDescription = !!scanData?.business?.description;
  const hasReviews = (scanData?.business?.user_ratings_total || 0) > 0;
  const hasCategory = !!scanData?.business?.types?.[0];
  const hasLocation = !!(scanData?.business?.formatted_address || scanData?.business?.vicinity);
  
  // Different messaging for timeout vs low web presence
  const title = isTimeoutFallback 
    ? "Limited AI Visibility (Not Enough Web Data)"
    : "Limited AI Visibility Detected";
  
  const subtitle = isTimeoutFallback
    ? "We couldn't find enough online content for AI systems to reference this business."
    : `${businessName} has minimal online content, which limits how often AI systems can reference it.`;
  
  const whyLimited = isTimeoutFallback
    ? "Without a website or strong third-party mentions, GEO analysis cannot gather sufficient data."
    : hasWebsite
    ? "Your website exists but has limited crawlable content for AI to reference."
    : "Without a website, your visibility is capped.";
  
  // Calculate visible signals count
  const visibleSignals = [
    hasDescription && 'Business description is available',
    hasReviews && 'Customer reviews describe your services',
    hasCategory && 'Business category is clearly defined',
    hasLocation && 'Location and contact info are reliable',
  ].filter(Boolean);

  const maxPotential = 45;
  const progressPercent = (fallbackScore / maxPotential) * 100;

  return (
    <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {subtitle}
            </p>
          </div>
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 flex items-center gap-1 shrink-0">
            <Lock className="w-3 h-3" />
            {isTimeoutFallback ? 'Limited Data' : 'Capped'}
          </Badge>
        </div>

        {/* Score Display */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
          <div className="flex items-baseline gap-3 mb-3">
            <div className="text-5xl font-black text-slate-900">{fallbackScore}</div>
            <div className="text-slate-500 font-semibold text-lg">/ 100</div>
          </div>
          
          <div className="text-sm text-slate-700 mb-3">
            Conservative baseline score based on limited available signals.
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Current</span>
              <span>Max without website: ~{maxPotential}</span>
            </div>
            <div className="h-2 rounded-full bg-white/60 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500" 
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
            <div className="text-xs text-slate-600 pt-1">
              ⚠️ This ceiling cannot be exceeded without structured web content.
            </div>
          </div>
        </div>

        {/* What AI Can Still See */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-bold text-slate-900">What AI Can Still See</h4>
          </div>
          
          {visibleSignals.length > 0 ? (
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <ul className="space-y-2">
                {visibleSignals.map((signal, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-emerald-600 mt-0.5">✓</span>
                    <span>{signal}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-sm text-slate-600">
                No structured online signals detected.
              </p>
            </div>
          )}
        </div>

        {/* Why You Can't Rank Higher Yet */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-600" />
            <h4 className="text-sm font-bold text-slate-900">Why You Can't Rank Higher Yet</h4>
          </div>
          
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              {isTimeoutFallback ? (
                <>
                  We couldn't find enough online content for AI systems to reference this business. 
                  Without a website or strong third-party mentions, GEO is capped.
                </>
              ) : (
                <>
                  AI systems rely on websites and structured content to understand and recommend businesses. {whyLimited}
                </>
              )}
            </p>
            <div className="text-xs text-slate-600 space-y-1">
              <div>• AI cannot find detailed service descriptions</div>
              <div>• No structured data for AI to parse</div>
              <div>• Limited context for query matching</div>
              <div>• No authority signals from web mentions</div>
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-300">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-indigo-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold text-slate-900 mb-2">
                Create a Simple Website to Unlock AI Visibility
              </h4>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Even a 1-page site allows AI systems to understand, reference, and recommend your business. 
                This is the single most impactful action you can take.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
                  onClick={() => window.open('https://www.google.com/business/', '_blank')}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Get Website Setup Help
                </Button>
                {hasDescription === false && (
                  <Button 
                    variant="outline"
                    className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 rounded-lg"
                    onClick={() => window.open('https://www.google.com/business/', '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Add Services to Google Profile
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Context */}
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-700">
              <span className="font-semibold text-blue-900">Why this matters:</span> AI search engines like 
              ChatGPT, Perplexity, and Google's AI Overview need structured web content to recommend businesses. 
              Without it, you're invisible to millions of potential customers using AI to find services.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

