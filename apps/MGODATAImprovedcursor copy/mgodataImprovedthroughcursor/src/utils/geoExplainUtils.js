// GEO Explain Utils - Deterministic scoring and analysis

export function computeConfidence(stats) {
  const tested = stats?.queriesTested || 0;
  const mentions = stats?.mentions || 0;
  const rate = tested > 0 ? mentions / tested : 0;
  if (tested >= 20 && rate >= 0.7) return 'High';
  if (tested >= 12 && rate >= 0.4) return 'Medium';
  return 'Low';
}

export function computeDriverPoints(queries) {
  const drivers = { 'Near Me': 0, 'Best/Top': 0, 'Service': 0, 'Trust': 0 };
  const map = { near_me: 'Near Me', best: 'Best/Top', service: 'Service', trust: 'Trust' };
  
  queries.forEach(q => {
    const key = map[q.bucket] || 'Service';
    let pts = 0;
    if (q.mentioned === true) pts += 5;
    else if (q.mentioned === 'weak') pts += 2;
    
    if (q.rank <= 3) pts += 2;
    else if (q.rank <= 6) pts += 1;
    
    drivers[key] += pts;
  });
  
  return drivers;
}

export function getDriverStats(queries, driverName) {
  const map = { 'Near Me': 'near_me', 'Best/Top': 'best', 'Service': 'service', 'Trust': 'trust' };
  const bucket = map[driverName];
  const filtered = queries.filter(q => q.bucket === bucket);
  const mentions = filtered.filter(q => q.mentioned).length;
  const ranks = filtered.filter(q => q.rank).map(q => q.rank);
  const avgRank = ranks.length ? (ranks.reduce((a,b) => a+b, 0) / ranks.length).toFixed(1) : null;
  
  return { mentions, total: filtered.length, avgRank };
}

export function findWeakestIntent(stats) {
  if (!stats?.buckets) return null;
  let weakest = null;
  let lowestScore = 999;
  
  Object.entries(stats.buckets).forEach(([key, data]) => {
    if (data.tested === 0) return;
    const top3Rate = data.top3 / data.tested;
    const mentionRate = data.mentions / data.tested;
    const score = top3Rate * 100 + mentionRate * 10;
    
    if (score < lowestScore) {
      lowestScore = score;
      weakest = { key, data };
    }
  });
  
  return weakest;
}

export function estimateLift(weakest, queries) {
  if (!weakest) return { min: 0, max: 0 };
  const intentQueries = queries.filter(q => q.bucket === weakest.key);
  const weak = intentQueries.filter(q => q.mentioned && q.rank > 5).length;
  const no = intentQueries.filter(q => !q.mentioned).length;
  
  const min = Math.min(25, weak * 1 + no * 2);
  const max = Math.min(25, weak * 2 + no * 4);
  return { min, max };
}

/**
 * Get top competitors from VERIFIED structured data with immutable identifiers ONLY
 * 
 * HARD RULE: A competitor is ONLY valid if it has an immutable identifier (placeId or cid).
 * Names alone are NOT valid. This prevents fake/inferred competitor names.
 * 
 * @param {Array} queries - Query results (NOT used for competitors - AI-generated names are untrusted)
 * @param {Object} explain - Explain payload with top-level competitors array
 * @param {String} businessPlaceId - placeId of scanned business (to exclude from competitors)
 * @returns {Array} Validated list of top competitors with placeId/cid + metadata
 */
export function getTopCompetitors(queries, explain = null, businessPlaceId = '') {
  const map = new Map();
  let discardedCount = 0;
  const isDev = import.meta.env.DEV;
  
  // ONLY accept top-level explain.competitors array
  // This comes from real Google Places API data with placeIds
  if (!explain?.competitors || !Array.isArray(explain.competitors)) {
    if (isDev) {
      console.info('[Competitors] No top-level competitors array found in explain payload');
    }
    return [];
  }
  
  explain.competitors.forEach((c, idx) => {
    // STRICT VALIDATION: Must have immutable identifier
    const identifier = c.placeId || c.place_id || c.cid;
    
    if (!identifier) {
      discardedCount++;
      if (isDev) {
        console.warn('[Competitors] Discarded competitor without placeId/cid:', { 
          name: c.name || 'unknown',
          index: idx,
          keys: Object.keys(c)
        });
      }
      return;
    }
    
    // Must have a name
    const name = c.name || c.businessName || c.title;
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      discardedCount++;
      if (isDev) {
        console.warn('[Competitors] Discarded competitor with invalid name:', { identifier });
      }
      return;
    }
    
    const trimmedName = name.trim();
    
    // Exclude scanned business itself (by placeId)
    if (businessPlaceId && identifier === businessPlaceId) {
      if (isDev) {
        console.info('[Competitors] Excluded scanned business from competitors:', { name: trimmedName });
      }
      return;
    }
    
    // Dedupe by identifier (not name)
    if (map.has(identifier)) {
      // Already have this competitor, aggregate data
      const existing = map.get(identifier);
      existing.count += (c.count || 1);
      if (c.rank) existing.ranks.push(c.rank);
      if (c.avgRank) existing.ranks.push(c.avgRank);
      return;
    }
    
    // Add new competitor
    map.set(identifier, {
      placeId: identifier,
      name: trimmedName,
      count: c.count || 1,
      ranks: [c.rank, c.avgRank].filter(r => r != null),
      source: 'explain.competitors'
    });
  });
  
  if (isDev && discardedCount > 0) {
    console.warn(`[Competitors] Total discarded: ${discardedCount} (missing placeId/cid or invalid name)`);
  }
  
  // NO minimum occurrences needed - these are real competitors from Places API
  // Sort by count (or by rank if count is same)
  const validated = Array.from(map.values())
    .map(c => ({
      placeId: c.placeId,
      name: c.name,
      count: c.count,
      avgRank: c.ranks.length ? (c.ranks.reduce((a, b) => a + b, 0) / c.ranks.length).toFixed(1) : null,
      source: c.source
    }))
    .sort((a, b) => {
      // Sort by count desc, then by avgRank asc (lower rank = better)
      if (b.count !== a.count) return b.count - a.count;
      if (a.avgRank && b.avgRank) return parseFloat(a.avgRank) - parseFloat(b.avgRank);
      return 0;
    })
    .slice(0, 3);
  
  if (isDev) {
    console.info('[Competitors] Validated competitors:', { 
      count: validated.length,
      names: validated.map(c => c.name),
      source: validated[0]?.source
    });
  }
  
  return validated;
}

/**
 * Generate insights about why competitors outrank us
 * Only called when we have validated competitors with placeIds
 * 
 * NOTE: We analyze query.reason for failure keywords, but we do NOT infer
 * competitor names from it. Competitor identity comes only from placeId matching.
 */
export function getCompetitorInsights(competitors, queries) {
  if (!competitors || !competitors.length) return null;
  
  const top = competitors[0];
  const reasons = [];
  
  // For now, we don't try to match competitors to queries (query.competitors are AI-generated, not real)
  // Instead, provide generic insights based on the competitor having higher rank/count
  // This is deterministic and doesn't rely on untrusted data
  
  // Analyze general failure patterns across weak queries (not tied to specific competitor)
  const failureKeywords = new Map();
  queries.forEach(q => {
    if (!q.mentioned || q.rank > 5) {
      const r = q.reason?.toLowerCase() || '';
      ['reviews', 'citations', 'content', 'authority', 'website'].forEach(kw => {
        if (r.includes(kw)) failureKeywords.set(kw, (failureKeywords.get(kw) || 0) + 1);
      });
    }
  });
  
  const sorted = Array.from(failureKeywords.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2);
  sorted.forEach(([kw]) => {
    if (kw === 'reviews') reasons.push('Stronger review signals');
    if (kw === 'citations') reasons.push('More web citations');
    if (kw === 'content') reasons.push('Better content optimization');
    if (kw === 'authority') reasons.push('Higher domain authority');
    if (kw === 'website') reasons.push('More comprehensive website');
  });
  
  // If no specific reasons, provide generic insight
  if (reasons.length === 0) {
    reasons.push('Higher overall visibility');
  }
  
  return { main: top, reasons: reasons.slice(0, 2) };
}

export function getSummaryLine(stats) {
  const tested = stats?.queriesTested || 0;
  const mentions = stats?.mentions || 0;
  const avgRank = stats?.avgRankMentioned ? Math.round(stats.avgRankMentioned) : null;
  
  return `${mentions}/${tested} queries • ${avgRank ? `Avg rank #${avgRank}` : 'No ranks'} • Biggest gap: ${findBiggestGap(stats)}`;
}

function findBiggestGap(stats) {
  if (!stats?.buckets) return 'Unknown';
  
  const weakest = findWeakestIntent(stats);
  return weakest ? formatIntent(weakest.key) : 'Unknown';
}

export function generateActionPlan(weakest, queries) {
  const tasks = [];
  const keywords = new Map();
  
  queries.filter(q => !q.mentioned || q.rank > 5).forEach(q => {
    if (!q.reason) return;
    const r = q.reason.toLowerCase();
    ['location', 'category', 'reviews', 'website', 'citations', 'photos', 'competitors'].forEach(kw => {
      if (r.includes(kw)) keywords.set(kw, (keywords.get(kw) || 0) + 1);
    });
  });
  
  const templates = {
    location: { task: 'Add service-area + city mentions across GBP + site', effort: '15-30m', base: 2 },
    category: { task: 'Refine primary/secondary categories', effort: '15-30m', base: 2 },
    reviews: { task: 'Run review push (10-20 reviews) + reply to last 20', effort: '1-2h', base: 3 },
    website: { task: 'Create/upgrade service pages + internal links', effort: '1-2h', base: 3 },
    citations: { task: 'Build 10 citations + local mentions', effort: '1 day', base: 2 },
    photos: { task: 'Add 15-25 new photos with keyword filenames', effort: '15-30m', base: 1 },
    competitors: { task: 'Add comparison copy + differentiate offerings', effort: '1-2h', base: 2 }
  };
  
  const sorted = Array.from(keywords.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  
  sorted.forEach(([kw, count]) => {
    const t = templates[kw];
    if (!t) return;
    const impact = count * t.base;
    tasks.push({
      task: t.task,
      priority: count >= 5 ? 'High' : count >= 3 ? 'Medium' : 'Low',
      effort: t.effort,
      impact: `+${Math.round(impact * 0.7)}-${Math.round(impact * 1.3)} pts`
    });
  });
  
  if (weakest && tasks.length < 8) {
    tasks.unshift({
      task: `Optimize ${formatIntent(weakest.key)} queries: add top weak keywords to GBP`,
      priority: 'High',
      effort: '30-60m',
      impact: `+${Math.round(weakest.data.tested * 1.5)}-${Math.round(weakest.data.tested * 3)} pts`
    });
  }
  
  return tasks.slice(0, 8);
}

export function formatIntent(key) {
  const map = {
    near_me: 'Near Me',
    best: 'Best/Top',
    service: 'Service',
    trust: 'Trust',
    specific_need: 'Specific Need',
    high_intent: 'High Intent',
    open_now: 'Open Now',
    cheap: 'Affordable',
    comparison: 'Comparison',
  };
  return map[key] || (key ? String(key).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Unknown');
}

export function getMentionLabel(mentioned, rank) {
  if (!mentioned) return 'Missing';
  if (rank <= 3) return 'Strong';
  if (rank > 5) return 'Partial';
  return 'Strong';
}

export function getRankColor(rank) {
  if (!rank) return 'slate';
  if (rank <= 3) return 'green';
  if (rank <= 6) return 'amber';
  if (rank <= 10) return 'red';
  return 'slate';
}

export function copyPlan(tasks) {
  let text = 'GEO Action Plan\n\n';
  tasks.forEach((t, i) => {
    text += `${i + 1}. [${t.priority}] ${t.task}\n   Effort: ${t.effort} | Impact: ${t.impact}\n\n`;
  });
  
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  return Promise.resolve();
}

export function copyText(text) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  return Promise.resolve();
}
