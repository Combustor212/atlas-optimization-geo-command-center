import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Lightbulb, 
  Lock,
  ChevronDown,
  ChevronUp,
  Bug
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ScoreWhyPanel - Clean SaaS component showing why a score is what it is
 * 
 * @param {Object} props
 * @param {Object} props.meo - Backend scan body (preferred). Ex: { meoScore, gbpFacts, scoringBreakdown, meoWhy, ... }
 * @param {boolean} props.showDebug - Show debug panel (from ?debug=1)
 */
export default function ScoreWhyPanel({ 
  meo,
  showDebug = false
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const scoreType = 'MEO';

  // Normalize facts from gbpFacts OR legacy top-level fields.
  const facts = useMemo(() => {
    const gbp = meo?.gbpFacts || {};
    return {
      rating: gbp.rating ?? meo?.rating,
      totalReviews: gbp.totalReviews ?? meo?.totalReviews,
      photoCount: gbp.photoCount ?? meo?.photoCount,
      hasWebsite: gbp.hasWebsite ?? meo?.hasWebsite,
      hasPhone: gbp.hasPhone ?? meo?.hasPhone,
      hasHours: gbp.hasHours ?? meo?.hasHours,
      hasDescription: gbp.hasDescription ?? meo?.hasDescription,
      reviewResponseRate: gbp.reviewResponseRate ?? meo?.reviewResponseRate,
      hasOwnerResponses: gbp.hasOwnerResponses ?? meo?.hasOwnerResponses,
      completenessScore: gbp.completenessScore ?? meo?.completenessScore,
      dominanceType: gbp.dominanceType ?? meo?.dominanceType,
      categoryCanonical: gbp.categoryCanonical ?? meo?.categoryCanonical,
      isFranchise: gbp.isFranchise ?? meo?.isFranchise,
    };
  }, [meo]);

  // Normalize breakdown (must work even if backend omitted some fields).
  const breakdown = useMemo(() => {
    const sb = meo?.scoringBreakdown || {};
    return {
      rawScore: sb.rawScore ?? meo?.meoScore,
      finalScore: sb.finalScore ?? meo?.meoScore,
      wasCapped: sb.wasCapped ?? false,
      reviewReliabilityCap: sb.reviewReliabilityCap ?? null,
      reviewReliabilityCapApplied: sb.reviewReliabilityCapApplied ?? false,
      rawScoreBeforeCap: sb.rawScoreBeforeCap ?? null,
      capReason: sb.capReason ?? null,
      components: sb.components || {},
    };
  }, [meo]);

  const finalScore = Number(meo?.meoScore ?? breakdown.finalScore ?? 0);

  const { reasons, dataSource } = useMemo(() => {
    const backendWhy = meo?.meoWhy;
    if (Array.isArray(backendWhy) && backendWhy.length > 0) {
      return { reasons: forceCapFirst(backendWhy, facts, breakdown), dataSource: 'backend' };
    }
    const fallback = generateFallbackWhy(facts, breakdown);
    return { reasons: forceCapFirst(fallback, facts, breakdown), dataSource: 'fallback' };
  }, [meo, facts, breakdown]);

  const executiveModel = useMemo(() => {
    return buildExecutiveModel({ facts, breakdown, reasons, finalScore });
  }, [facts, breakdown, reasons, finalScore]);
  
  return (
    <Card className="bg-white border border-slate-200 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
      <CardContent className="p-8 sm:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-purple-600" />
            Why this {scoreType} score is {finalScore}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-500 hover:text-slate-700"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </Button>
        </div>

        {isExpanded && (
          <div className="space-y-8">
            {/* Debug Panel (if ?debug=1) */}
            {showDebug && (
              <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl text-xs font-mono">
                <div className="flex items-center gap-2 mb-2">
                  <Bug className="w-4 h-4 text-yellow-700" />
                  <span className="font-bold text-yellow-900">Debug Info</span>
                </div>
                <div className="space-y-1 text-yellow-800">
                  <div>gbpFacts: {meo?.gbpFacts ? '✅' : '❌'}</div>
                  <div>scoringBreakdown: {meo?.scoringBreakdown ? '✅' : '❌'}</div>
                  <div>meoWhy: {Array.isArray(meo?.meoWhy) && meo.meoWhy.length > 0 ? `✅ (${meo.meoWhy.length} items)` : '❌'}</div>
                  <div>wasCapped: {(breakdown.wasCapped || breakdown.reviewReliabilityCapApplied) ? 'true' : 'false'}</div>
                  <div>dataSource: {dataSource}</div>
                </div>
              </div>
            )}

            {/* 1) Primary Explanation Block (dominant) */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-7 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <div className="text-slate-500 text-sm font-semibold tracking-wide uppercase">MEO Score</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <div className="text-5xl font-extrabold text-slate-900">{finalScore}</div>
                    <div className="text-slate-400 font-semibold">/ 100</div>
                    {(breakdown.wasCapped || breakdown.reviewReliabilityCapApplied) && (
                      <Badge className="ml-2 bg-orange-100 text-orange-800 border border-orange-300">
                        Reliability cap applied
                      </Badge>
                    )}
                  </div>
                  <p className="mt-3 text-slate-700 text-base leading-relaxed max-w-2xl">
                    {executiveModel.oneLiner}
                  </p>
                </div>

                {/* 4) Potential Score Preview */}
                <div className="sm:w-[320px]">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-semibold">Current</span>
                    <span className="text-slate-900 font-bold">{finalScore}</span>
                  </div>
                  <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-600"
                      style={{ width: `${Math.max(0, Math.min(100, finalScore))}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-semibold">Optimized</span>
                    <span className="text-slate-900 font-bold">~{executiveModel.optimizedScore}</span>
                  </div>
                  <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${Math.max(0, Math.min(100, executiveModel.optimizedScore))}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    If the top issues below are fixed.
                  </div>
                </div>
              </div>

              {/* Top Impact Drivers (ranked) */}
              <div className="mt-7">
                <div className="text-sm font-semibold text-slate-900">Top impact drivers</div>
                <div className="mt-3 grid gap-3">
                  {executiveModel.topDrivers.map((d) => (
                    <div key={d.key} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{d.title}</div>
                        <div className="text-sm text-slate-600 leading-snug mt-0.5">{d.detail}</div>
                      </div>
                      <div className={cn(
                        "flex-shrink-0 font-bold text-sm rounded-lg px-2.5 py-1",
                        d.impact < 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                      )}>
                        {formatImpact(d.impact)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2) What Helped vs What Hurt */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-sm font-semibold text-slate-900">Helped your score</div>
                <div className="mt-3 space-y-2">
                  {executiveModel.helped.map((t, i) => (
                    <ConclusiveRow key={i} tone="good" text={t} />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-sm font-semibold text-slate-900">Held you back</div>
                <div className="mt-3 space-y-2">
                  {executiveModel.hurt.map((t, i) => (
                    <ConclusiveRow key={i} tone="bad" text={t} />
                  ))}
                </div>
              </div>
            </div>

            {/* 3) Fastest Wins */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Fix these first</div>
                  <div className="text-sm text-slate-600 mt-1">
                    The fastest path to a higher Maps score.
                  </div>
                </div>
                <Badge className="bg-slate-100 text-slate-700 border border-slate-200">
                  Top 3
                </Badge>
              </div>
              <div className="mt-4 grid md:grid-cols-3 gap-3">
                {executiveModel.fastestWins.map((w) => (
                  <div key={w.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="font-semibold text-slate-900">{w.action}</div>
                    <div className="text-sm text-slate-600 mt-1">{w.detail}</div>
                    <div className="mt-3 inline-flex items-center rounded-lg bg-purple-50 text-purple-700 px-2.5 py-1 text-sm font-bold">
                      {formatLift(w.lift)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Optional: show backend reasons (kept, but executive-style) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm font-semibold text-slate-900">Key reasons (summary)</div>
              <div className="mt-3 grid gap-2">
                {reasons.slice(0, 8).map((r, i) => (
                  <div key={i} className="text-sm text-slate-700 leading-relaxed">
                    {renderReasonInline(r)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * ReasonBullet - Single reason in the list
 */
function ReasonBullet({ reason }) {
  // Handle both string and object formats
  let icon = '•';
  let text = reason;
  let impact = null;
  
  if (typeof reason === 'object') {
    // Object format: { icon, label, detail, impact }
    if (reason.icon === 'lock') icon = '🔒';
    else if (reason.icon === 'check') icon = '✅';
    else if (reason.icon === 'warn') icon = '⚠️';
    
    text = reason.label;
    if (reason.detail) text += `: ${reason.detail}`;
    impact = reason.impact;
  } else {
    // String format: detect emoji
    if (reason.includes('🔒')) icon = '🔒';
    else if (reason.includes('✅')) icon = '✅';
    else if (reason.includes('⚠️')) icon = '⚠️';
    else if (reason.includes('❌')) icon = '❌';
    
    // Extract impact if present (e.g., "→ +21 points")
    const impactMatch = reason.match(/→\s*([+\-]\d+\s*points?|capped)/i);
    if (impactMatch) {
      impact = impactMatch[1];
      text = reason.replace(impactMatch[0], '').trim();
    }
  }
  
  // Remove emoji from text if present
  text = text.replace(/^[🔒✅⚠️❌]\s*/, '');
  
  return (
    <li className="flex items-start gap-3 text-sm">
      <span className="text-lg leading-none mt-0.5 flex-shrink-0">{icon}</span>
      <span className="flex-1 text-slate-700 leading-relaxed">{text}</span>
      {impact && (
        <span className="flex-shrink-0 text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded">
          {impact}
        </span>
      )}
    </li>
  );
}

/**
 * generateFallbackWhy - Create meoWhy from gbpFacts + scoringBreakdown
 * This ensures the panel is NEVER empty
 */
function generateFallbackWhy(facts, breakdown) {
  const why = [];
  
  // 1. Cap message (if applicable)
  const reviews = Number(facts.totalReviews ?? 0);
  const cap = breakdown.reviewReliabilityCap ?? capForReviews(reviews);
  const capApplied =
    breakdown.wasCapped ||
    breakdown.reviewReliabilityCapApplied ||
    (Number.isFinite(reviews) && reviews < 150 && cap < 100);

  if (capApplied && reviews < 10) {
    // MUST be first bullet when reviews < 10
    why.push(
      `🔒 Reliability cap: score limited because only ${reviews} reviews (cap ${cap}%)`
    );
  }
  
  // 2. Rating
  if (facts.rating !== undefined) {
    if (facts.rating >= 4.8) {
      why.push(`✅ Excellent rating (${facts.rating.toFixed(1)}★) - strong customer satisfaction`);
    } else if (facts.rating >= 4.0) {
      why.push(`Rating: ${facts.rating.toFixed(1)}★ - good, but room for improvement`);
    } else if (facts.rating >= 3.0) {
      why.push(`⚠️ Rating: ${facts.rating.toFixed(1)}★ - below average, needs attention`);
    } else {
      why.push(`❌ Rating: ${facts.rating.toFixed(1)}★ - poor rating significantly impacts score`);
    }
  }
  
  // 3. Reviews
  if (facts.totalReviews !== undefined) {
    if (facts.totalReviews >= 200) {
      why.push(`✅ Strong review volume (${facts.totalReviews} reviews) - high reliability`);
    } else if (facts.totalReviews >= 50) {
      why.push(`${facts.totalReviews} reviews - moderate volume, good for credibility`);
    } else if (facts.totalReviews >= 10) {
      why.push(`⚠️ ${facts.totalReviews} reviews - low volume limits score potential`);
    } else {
      why.push(`❌ Very low review count (${facts.totalReviews}) - major score limitation`);
    }
  }
  
  // 4. Photos
  if (facts.photoCount !== undefined) {
    if (facts.photoCount >= 20) {
      why.push(`✅ Rich visual content (${facts.photoCount} photos) - enhances listing`);
    } else if (facts.photoCount >= 10) {
      why.push(`${facts.photoCount} photos - good visual presence`);
    } else if (facts.photoCount >= 5) {
      why.push(`⚠️ Limited photos (${facts.photoCount}) - add more for better engagement`);
    } else {
      why.push(`❌ Very low photo count (${facts.photoCount}) - hurts visibility`);
    }
  }
  
  // 5. Missing fields
  const missing = [];
  if (facts.hasWebsite === false) missing.push('website');
  if (facts.hasPhone === false) missing.push('phone');
  if (facts.hasHours === false) missing.push('hours');
  if (facts.hasDescription === false) missing.push('description');
  
  if (missing.length > 0) {
    why.push(`⚠️ Missing key information: ${missing.join(', ')} - complete your profile`);
  }
  
  // 6. Engagement
  if (facts.hasOwnerResponses === false && facts.totalReviews > 10) {
    why.push(`⚠️ No owner responses to reviews - engage with customers for better score`);
  } else if (facts.hasOwnerResponses === true) {
    why.push(`✅ Active owner engagement with reviews - positive signal`);
  }
  
  // 7. Response rate
  if (facts.reviewResponseRate !== undefined) {
    if (facts.reviewResponseRate >= 80) {
      why.push(`✅ High response rate (${facts.reviewResponseRate}%) - excellent engagement`);
    } else if (facts.reviewResponseRate >= 50) {
      why.push(`Response rate: ${facts.reviewResponseRate}% - good, aim for 80%+`);
    } else if (facts.reviewResponseRate > 0) {
      why.push(`⚠️ Low response rate (${facts.reviewResponseRate}%) - respond to more reviews`);
    }
  }
  
  // Ensure at least one reason
  while (why.length < 5) {
    why.push('Score calculated from available Google Business Profile signals');
  }
  
  return why;
}

function capForReviews(totalReviews) {
  if (totalReviews < 10) return 50;
  if (totalReviews < 25) return 60;
  if (totalReviews < 60) return 70;
  if (totalReviews < 150) return 80;
  return 100;
}

function forceCapFirst(whyList, facts, breakdown) {
  const list = Array.isArray(whyList) ? [...whyList] : [];
  const reviews = Number(facts.totalReviews ?? 0);
  const cap = breakdown.reviewReliabilityCap ?? capForReviews(reviews);
  const capApplied =
    breakdown.wasCapped ||
    breakdown.reviewReliabilityCapApplied ||
    (Number.isFinite(reviews) && reviews < 150 && cap < 100);

  if (!capApplied) return list;

  const capLine = `🔒 Reliability cap: score limited because only ${Number.isFinite(reviews) ? reviews : 0} reviews (cap ${cap || 50}%)`;
  const idx = list.findIndex((r) => typeof r === 'string' && r.includes('Reliability cap'));
  if (idx === 0) return list;
  if (idx > 0) {
    const [found] = list.splice(idx, 1);
    list.unshift(found);
    return list;
  }
  list.unshift(capLine);
  return list;
}

function ConclusiveRow({ tone, text }) {
  return (
    <div className="flex items-start gap-2">
      <span className={cn(
        "mt-0.5 text-sm font-bold",
        tone === 'good' ? "text-green-700" : "text-red-700"
      )}>
        {tone === 'good' ? '✅' : '❌'}
      </span>
      <div className="text-sm text-slate-700 leading-relaxed">{text}</div>
    </div>
  );
}

function formatImpact(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  if (n === 0) return '0 pts';
  return `${n > 0 ? '+' : '–'}${Math.abs(Math.round(n))} pts`;
}

function formatLift(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '+0 pts';
  return `+${Math.max(0, Math.round(n))} pts`;
}

function renderReasonInline(reason) {
  if (typeof reason === 'object') {
    const icon = reason.icon === 'lock' ? '🔒' : reason.icon === 'warn' ? '⚠️' : '✅';
    const label = reason.label || '';
    const detail = reason.detail ? ` — ${reason.detail}` : '';
    const impact = reason.impact ? ` (${reason.impact})` : '';
    return `${icon} ${label}${detail}${impact}`.trim();
  }
  return reason;
}

function getGap(component) {
  const pts = typeof component?.points === 'number' ? component.points : null;
  const max = typeof component?.maxPoints === 'number' ? component.maxPoints : null;
  if (pts === null || max === null) return null;
  return Math.max(0, max - pts);
}

function buildExecutiveModel({ facts, breakdown, reasons, finalScore }) {
  const c = breakdown.components || {};

  const photosGap = getGap(c.photos);
  const engagementGap = getGap(c.engagement);
  const profileGap = getGap(c.profile);

  const capApplied = !!(breakdown.wasCapped || breakdown.reviewReliabilityCapApplied);
  const capLoss = capApplied && typeof breakdown.reviewReliabilityCap === 'number'
    ? Math.max(0, Math.round((breakdown.rawScoreBeforeCap ?? breakdown.rawScore ?? finalScore) - finalScore))
    : 0;

  const drivers = [];

  if (capApplied) {
    drivers.push({
      key: 'cap',
      title: 'Reliability cap (low reviews)',
      detail: `With only ${Number(facts.totalReviews ?? 0)} reviews, your score is temporarily capped for reliability.`,
      impact: -capLoss || -Math.max(0, Math.round((breakdown.rawScoreBeforeCap ?? breakdown.rawScore ?? finalScore) - finalScore)),
    });
  }

  if (typeof photosGap === 'number' && photosGap > 0.5) {
    drivers.push({
      key: 'photos',
      title: 'Low photo activity',
      detail: `Photos drive clicks. Adding fresh, high-quality photos is one of the fastest ways to lift visibility.`,
      impact: -photosGap,
    });
  }

  if (typeof engagementGap === 'number' && engagementGap > 0.5) {
    drivers.push({
      key: 'engagement',
      title: 'Missing profile engagement',
      detail: `Replying to reviews signals active management and can improve ranking confidence.`,
      impact: -engagementGap,
    });
  } else if (facts.hasOwnerResponses === false && Number(facts.totalReviews ?? 0) > 10) {
    drivers.push({
      key: 'engagement',
      title: 'No owner replies to reviews',
      detail: `Customers (and Google) read responses. Start replying consistently to build trust.`,
      impact: -Math.max(3, Math.round(getGap(c.engagement) ?? 5)),
    });
  }

  if (typeof profileGap === 'number' && profileGap > 0.5) {
    const missing = [];
    if (facts.hasHours === false) missing.push('hours');
    if (facts.hasDescription === false) missing.push('description');
    if (facts.hasWebsite === false) missing.push('website');
    if (facts.hasPhone === false) missing.push('phone');
    drivers.push({
      key: 'profile',
      title: 'Incomplete profile details',
      detail: missing.length > 0
        ? `Missing ${missing.join(', ')} reduces trust and relevance. Completing these fields increases conversion.`
        : `Completing key profile fields increases trust and relevance signals.`,
      impact: -profileGap,
    });
  }

  // Sort by absolute negative impact desc, show top 3
  const topDrivers = drivers
    .sort((a, b) => Math.abs(a.impact) - Math.abs(b.impact))
    .reverse()
    .slice(0, 3);

  const driverNames = topDrivers.map((d) => d.title.toLowerCase());
  const oneLiner = (() => {
    const a = driverNames[0];
    const b = driverNames[1];
    if (a && b) return `Your MEO score is ${finalScore} mainly due to ${a} and ${b}.`;
    if (a) return `Your MEO score is ${finalScore} mainly due to ${a}.`;
    return `Your MEO score is ${finalScore} based on your current Google Business Profile signals.`;
  })();

  const helped = [];
  const hurt = [];

  const rating = Number(facts.rating ?? 0);
  const reviews = Number(facts.totalReviews ?? 0);
  const photos = Number(facts.photoCount ?? 0);

  if (rating >= 4.5) helped.push(`High rating (${rating.toFixed(1)}★) builds trust fast`);
  else if (rating >= 4.0) helped.push(`Good rating (${rating.toFixed(1)}★) supports conversions`);
  else if (rating > 0) hurt.push(`Below-average rating (${rating.toFixed(1)}★) reduces clicks and calls`);

  if (reviews >= 200) helped.push(`Strong review volume (${reviews}) improves ranking confidence`);
  else if (reviews >= 50) helped.push(`Solid review base (${reviews}) supports credibility`);
  else if (reviews >= 10) hurt.push(`Low review volume (${reviews}) limits score potential`);
  else hurt.push(`Very low reviews (${reviews}) limits reliability and ranking confidence`);

  if (facts.hasWebsite) helped.push(`Website connected increases authority signals`);
  else hurt.push(`No website connected reduces authority signals`);

  if (facts.hasPhone) helped.push(`Phone visible makes it easier to convert searchers`);
  else hurt.push(`Missing phone reduces trust and conversions`);

  if (facts.hasHours) helped.push(`Business hours set improves trust and click-through`);
  else hurt.push(`Missing business hours reduces trust and can hurt rankings`);

  if (facts.hasDescription) helped.push(`Description helps relevance for what you do`);
  else hurt.push(`Missing description reduces relevance for services`);

  if (photos >= 10) helped.push(`Healthy photo activity (${photos}) improves clicks`);
  else if (photos < 5) hurt.push(`Very low photos (${photos}) reduces profile attractiveness`);
  else hurt.push(`Low photos (${photos}) leaves clicks on the table`);

  if (facts.hasOwnerResponses && Number(facts.reviewResponseRate ?? 0) >= 50) {
    helped.push(`Owner replies build trust (${facts.reviewResponseRate}% response rate)`);
  } else if (!facts.hasOwnerResponses && reviews > 10) {
    hurt.push(`No owner replies hurts engagement signals`);
  }

  // Fastest wins: choose up to 3 based on gaps
  const wins = [];
  if (photos < 10) {
    wins.push({
      key: 'win-photos',
      action: 'Upload 10 photos',
      detail: 'Add exterior, interior, team, and work examples.',
      lift: Math.max(3, Math.round(photosGap ?? 8)),
    });
  }
  if (!facts.hasOwnerResponses || Number(facts.reviewResponseRate ?? 0) < 50) {
    wins.push({
      key: 'win-replies',
      action: 'Reply to your latest reviews',
      detail: 'Start with the most recent 20 reviews (positive + negative).',
      lift: Math.max(2, Math.round(engagementGap ?? 6)),
    });
  }
  if (!facts.hasHours || !facts.hasDescription || !facts.hasWebsite) {
    wins.push({
      key: 'win-profile',
      action: 'Complete profile essentials',
      detail: 'Add hours, tighten description, and confirm website/phone.',
      lift: Math.max(2, Math.round(profileGap ?? 5)),
    });
  }
  const fastestWins = wins.slice(0, 3);

  const optimizedScore = Math.min(100, Math.round(finalScore + fastestWins.reduce((s, w) => s + (w.lift || 0), 0)));

  return {
    oneLiner,
    topDrivers: topDrivers.length > 0 ? topDrivers : [
      {
        key: 'default',
        title: 'No major blockers detected',
        detail: 'Your profile signals are solid. Focus on adding photos and consistent engagement to keep improving.',
        impact: 0,
      }
    ],
    helped: helped.slice(0, 6),
    hurt: hurt.slice(0, 6),
    fastestWins: fastestWins.length > 0 ? fastestWins : [
      { key: 'win-default-1', action: 'Add fresh photos monthly', detail: 'Aim for 10–20 photos per month.', lift: 5 },
      { key: 'win-default-2', action: 'Reply to new reviews weekly', detail: 'Build trust and consistency.', lift: 4 },
      { key: 'win-default-3', action: 'Update key profile details', detail: 'Keep hours, services, and description current.', lift: 3 },
    ],
    optimizedScore,
  };
}

