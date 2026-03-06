import type { PlaceDetails } from '../types';
import type { MEOScanResponse } from './meoSchema';
import type { MEOExplainAction, MEOExplainData, MEOExplainDriver } from './meoExplainSchema';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function formatPts(n: number): string {
  const v = Math.round(n);
  return `${v >= 0 ? '+' : '–'}${Math.abs(v)} pts`;
}

function safeNum(n: unknown): number | null {
  if (typeof n !== 'number' || Number.isNaN(n)) return null;
  return n;
}

function gapFromComponent(comp: any): number | null {
  const points = safeNum(comp?.points);
  const maxPoints = safeNum(comp?.maxPoints);
  if (points === null || maxPoints === null) return null;
  return clamp(maxPoints - points, 0, 999);
}

function statusFromGap(gap: number | null): 'good' | 'warn' | 'bad' {
  if (gap === null) return 'warn';
  if (gap >= 8) return 'bad';
  if (gap >= 3) return 'warn';
  return 'good';
}

export function buildMEOExplainData(args: {
  place: PlaceDetails;
  meo: MEOScanResponse['body'];
  nowIso?: string;
  ownerReplyRate?: number | null;
  ownerReplyRateSource?: 'places' | 'gbp' | 'unavailable';
}): MEOExplainData {
  const nowIso = args.nowIso ?? new Date().toISOString();
  const place = args.place;
  const meo = args.meo;

  const facts = (meo as any).gbpFacts || (meo as any).meoInputsUsed || {};
  // Use scoringBreakdown as the source of truth for raw/final + component points
  const breakdown: any = (meo as any).scoringBreakdown || {};
  const components: any = breakdown.components || {};

  const photoArrayLen = Array.isArray(place.photos) ? place.photos.length : null;
  const photoCount =
    photoArrayLen !== null
      ? Math.max(0, photoArrayLen)
      : typeof facts.photoCount === 'number'
        ? Math.max(0, facts.photoCount)
        : null;

  // IMPORTANT: never output incorrect "0 photos" when photos exist
  const photoCountSafe = photoArrayLen !== null ? (photoArrayLen > 0 ? Math.max(1, photoArrayLen) : 0) : photoCount;
  const photoCountMayBeLimited = photoArrayLen !== null; // Places returns a limited array

  const rating = safeNum(place.rating ?? facts.rating) ?? null;
  const reviewCount = safeNum(place.user_ratings_total ?? facts.totalReviews) ?? null;

  const capEnabled = !!(breakdown.wasCapped || breakdown.reviewReliabilityCapApplied);
  const capValue = capEnabled ? safeNum(breakdown.reviewReliabilityCap) : null;
  const capReason = capEnabled ? (breakdown.capReason || null) : null;

  const currentScore = Math.round(safeNum((meo as any).meoScore ?? breakdown.finalScore) ?? 0);
  const rawScore = safeNum(breakdown.rawScore);
  const rawBeforeCap = safeNum(breakdown.rawScoreBeforeCap);

  const photosGap = gapFromComponent(components.photos);
  const engagementGap = gapFromComponent(components.engagement) ?? gapFromComponent(components.responses);
  const profileGap = gapFromComponent(components.profile);
  // Some component keys are not guaranteed in the scoring contract; keep robust fallbacks.
  const hoursGap = gapFromComponent(components.hours) ?? (profileGap !== null ? Math.round(profileGap / 4) : null);
  const descriptionGap = gapFromComponent(components.description) ?? (profileGap !== null ? Math.round(profileGap / 4) : null);
  const websiteGap = gapFromComponent(components.website) ?? (profileGap !== null ? Math.round(profileGap / 5) : null);

  // Owner replies: not available via legacy Places; keep deterministic + honest
  const ownerReplyRateSource = args.ownerReplyRateSource ?? 'unavailable';
  const ownerReplyRate = args.ownerReplyRate ?? null;
  const ownerRepliesAvailable = ownerReplyRateSource !== 'unavailable';

  const drivers: MEOExplainDriver[] = [];

  if (capEnabled) {
    const capLabel = capValue ? `max ${capValue}` : 'cap';
    drivers.push({
      id: 'reliability_cap',
      title: 'Reliability cap',
      status: 'warn',
      observedValue: `${reviewCount ?? 0} reviews`,
      why: capReason || 'This score is temporarily capped until you have more review volume.',
      impactPoints: null,
      impactLabel: `cap: ${capLabel}`,
      cta: { label: 'Get more', action: 'get_more_reviews' },
    });
  }

  // Photos driver
  if (photoCountSafe === null) {
    drivers.push({
      id: 'photos',
      title: 'Photos',
      status: 'disabled',
      observedValue: 'Unavailable',
      why: `We couldn’t fetch photos for this profile right now.`,
      impactPoints: null,
      impactLabel: '—',
      cta: { label: 'Refresh', action: 'refresh' },
    });
  } else {
    const potential = photosGap !== null ? Math.round(photosGap) : null;
    drivers.push({
      id: 'photos',
      title: 'Photos',
      status: statusFromGap(photosGap),
      observedValue: `${photoCountSafe} photos${photoCountMayBeLimited ? ' (API sample)' : ''}`,
      why: photoCountSafe < 10 ? 'Low photo coverage reduces clicks and trust in Maps.' : 'Strong photo coverage improves clicks and confidence.',
      impactPoints: potential,
      impactLabel: potential !== null ? `${formatPts(potential)} potential` : '—',
      cta: { label: 'Upload', action: 'upload_photos' },
    });
  }

  // Owner replies / engagement driver
  if (!ownerRepliesAvailable) {
    drivers.push({
      id: 'owner_replies',
      title: 'Owner replies',
      status: 'disabled',
      observedValue: 'Requires GBP connection',
      why: 'Owner replies aren’t available from Places. Connect Google Business Profile to enable this.',
      impactPoints: null,
      impactLabel: '—',
      cta: { label: 'Connect', action: 'connect_gbp' },
    });
  } else {
    const potential = engagementGap !== null ? Math.round(engagementGap) : null;
    drivers.push({
      id: 'owner_replies',
      title: 'Owner replies',
      status: statusFromGap(engagementGap),
      observedValue: `${Math.round((ownerReplyRate ?? 0) * 100)}% reply rate`,
      why: 'Consistent replies signal active management and can lift ranking confidence.',
      impactPoints: potential,
      impactLabel: potential !== null ? `${formatPts(potential)} potential` : '—',
      cta: { label: 'Reply', action: 'reply_reviews' },
    });
  }

  // Profile fields (hours, description, website)
  if (facts.hasHours === false) {
    const potential = hoursGap !== null ? Math.round(hoursGap) : null;
    drivers.push({
      id: 'hours',
      title: 'Business hours',
      status: potential !== null && potential >= 3 ? 'bad' : 'warn',
      observedValue: 'Missing',
      why: 'Missing hours reduces trust and can suppress visibility.',
      impactPoints: potential,
      impactLabel: potential !== null ? `${formatPts(potential)} potential` : '—',
      cta: { label: 'Fix now', action: 'complete_profile' },
    });
  }

  if (facts.hasDescription === false) {
    const potential = descriptionGap !== null ? Math.round(descriptionGap) : null;
    drivers.push({
      id: 'description',
      title: 'Business description',
      status: potential !== null && potential >= 3 ? 'bad' : 'warn',
      observedValue: 'Missing',
      why: 'A clear description improves relevance for what you do.',
      impactPoints: potential,
      impactLabel: potential !== null ? `${formatPts(potential)} potential` : '—',
      cta: { label: 'Fix now', action: 'complete_profile' },
    });
  }

  if (facts.hasWebsite === false) {
    const potential = websiteGap !== null ? Math.round(websiteGap) : null;
    drivers.push({
      id: 'website',
      title: 'Website',
      status: potential !== null && potential >= 3 ? 'warn' : 'warn',
      observedValue: 'Not connected',
      why: 'A connected website increases authority and conversion.',
      impactPoints: potential,
      impactLabel: potential !== null ? `${formatPts(potential)} potential` : '—',
      cta: { label: 'Fix now', action: 'complete_profile' },
    });
  }

  // Rank: cap first (already inserted), then by potential desc
  const rankedDrivers = [...drivers].sort((a, b) => {
    if (a.id === 'reliability_cap') return -1;
    if (b.id === 'reliability_cap') return 1;
    const ap = typeof a.impactPoints === 'number' ? a.impactPoints : -1;
    const bp = typeof b.impactPoints === 'number' ? b.impactPoints : -1;
    return bp - ap;
  });

  const topRanked = rankedDrivers.filter((d) => d.status !== 'good').slice(0, 2);
  const callout = topRanked.length > 0
    ? `Your score is held back by ${topRanked.map((d) => d.title.toLowerCase()).join(' and ')}.`
    : `Your profile signals are solid — keep photos and engagement consistent to keep climbing.`;

  const helped: string[] = [];
  const heldBack: string[] = [];

  if (rating !== null) {
    if (rating >= 4.5) helped.push(`Rating: ${rating.toFixed(1)}★`);
    else heldBack.push(`Rating: ${rating.toFixed(1)}★`);
  } else {
    heldBack.push('Rating: unavailable');
  }

  if (reviewCount !== null) {
    if (reviewCount >= 100) helped.push(`Reviews: ${reviewCount}`);
    else heldBack.push(`Reviews: ${reviewCount}`);
  } else {
    heldBack.push('Reviews: unavailable');
  }

  if (photoCountSafe === null) heldBack.push('Photos: unavailable');
  else if (photoCountSafe >= 10) helped.push(`Photos: ${photoCountSafe}`);
  else heldBack.push(`Photos: ${photoCountSafe}`);

  helped.push(`Website: ${facts.hasWebsite ? 'connected' : 'missing'}`);
  helped.push(`Phone: ${facts.hasPhone ? 'shown' : 'missing'}`);
  helped.push(`Hours: ${facts.hasHours ? 'set' : 'missing'}`);
  helped.push(`Description: ${facts.hasDescription ? 'set' : 'missing'}`);

  // Actions: pick top 3 potential from ranked drivers with numeric impact
  const actionTemplates: Record<string, { title: string; description: string; time: string; cta: MEOExplainAction['cta'] }> = {
    photos: {
      title: 'Upload 10 photos',
      description: 'Add exterior, interior, team, and work examples.',
      time: '~15 min',
      cta: { label: 'Upload', action: 'upload_photos' },
    },
    owner_replies: {
      title: 'Reply to your latest reviews',
      description: 'Start with the most recent 20 (positive + negative).',
      time: '~20 min',
      cta: { label: 'Reply', action: 'reply_reviews' },
    },
    hours: {
      title: 'Add business hours',
      description: 'Set accurate hours (including holidays).',
      time: '~5 min',
      cta: { label: 'Fix now', action: 'complete_profile' },
    },
    description: {
      title: 'Add a clear description',
      description: 'Explain what you do and who you serve in 1–2 sentences.',
      time: '~10 min',
      cta: { label: 'Fix now', action: 'complete_profile' },
    },
    website: {
      title: 'Connect your website',
      description: 'Add your primary domain to the profile.',
      time: '~5 min',
      cta: { label: 'Fix now', action: 'complete_profile' },
    },
    reliability_cap: {
      title: 'Get more reviews',
      description: 'Raise review volume to lift the reliability cap.',
      time: '1–2 weeks',
      cta: { label: 'Get more', action: 'get_more_reviews' },
    },
  };

  const actions: MEOExplainAction[] = rankedDrivers
    .filter((d) => d.status !== 'good')
    .filter((d) => d.id in actionTemplates)
    .map((d) => {
      const tpl = actionTemplates[d.id];
      return {
        id: d.id,
        title: tpl.title,
        description: tpl.description,
        pointGain: typeof d.impactPoints === 'number' ? Math.max(0, Math.round(d.impactPoints)) : null,
        timeEstimate: tpl.time,
        cta: tpl.cta,
      };
    })
    .slice(0, 3);

  const totalPotential = actions.reduce((sum, a) => sum + (typeof a.pointGain === 'number' ? a.pointGain : 0), 0);
  const capMax = capEnabled && typeof capValue === 'number' ? capValue : 100;
  const potentialScore = totalPotential > 0 ? clamp(currentScore + totalPotential, 0, capMax) : null;

  const potentialEnabled = potentialScore !== null && potentialScore > currentScore;

  return {
    placeId: place.place_id,
    businessName: place.name || meo.businessName,
    address: place.formatted_address || facts.address || '',
    rating,
    reviewCount,
    photoCount: photoCountSafe === null ? null : photoCountSafe,
    photoCountMayBeLimited,
    ownerReplyRate,
    ownerReplyRateSource,
    fieldsPresent: {
      website: typeof facts.hasWebsite === 'boolean' ? facts.hasWebsite : null,
      phone: typeof facts.hasPhone === 'boolean' ? facts.hasPhone : null,
      hours: typeof facts.hasHours === 'boolean' ? facts.hasHours : null,
      description: typeof facts.hasDescription === 'boolean' ? facts.hasDescription : null,
      categories: Array.isArray(place.types) ? place.types.length > 0 : null,
      attributes: null,
    },
    reliabilityCap: {
      enabled: capEnabled,
      capValue: capValue ?? null,
      reason: capReason,
    },
    score: {
      current: currentScore,
      raw: rawScore,
      rawBeforeCap: rawBeforeCap,
    },
    potential: {
      enabled: potentialEnabled,
      potentialScore: potentialEnabled ? potentialScore : null,
      basis: potentialEnabled ? 'Top action drivers from scoring breakdown' : 'Insufficient driver data',
    },
    callout,
    drivers: rankedDrivers,
    helped: helped.slice(0, 6),
    heldBack: heldBack.slice(0, 6),
    actions,
    lastRefreshedAt: nowIso,
  };
}


