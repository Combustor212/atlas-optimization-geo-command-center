/**
 * SEO Completeness Score (legacy/fallback)
 * Static profile-based score: base + website/description/hours/phone + profile completeness.
 * Used as fallback when SEO visibility has low confidence.
 */

import type { PlaceDetails } from '../types';

export interface GbpFacts {
  completenessScore?: number;
  hasDescription?: boolean;
  hasHours?: boolean;
  hasPhone?: boolean;
}

/**
 * Compute static SEO completeness score (0-100).
 * Original formula: base 35 + website 25 + description 15 + hours 8 + phone 7 + completeness (0-25).
 */
export function computeSeoCompletenessScore(
  place: PlaceDetails,
  gbpFacts: GbpFacts | null
): number {
  const hasWebsite = !!(place.website || place.websiteUri);
  const hasDescription = !!(
    place.editorialSummary?.text ||
    place.editorial_summary?.overview ||
    gbpFacts?.hasDescription
  );
  const hasHours = !!(place.opening_hours || gbpFacts?.hasHours);
  const hasPhone = !!(
    place.formatted_phone_number ||
    place.international_phone_number ||
    gbpFacts?.hasPhone
  );
  const completenessScore = gbpFacts?.completenessScore ?? 0;

  let seoScore = 35;
  if (hasWebsite) seoScore += 25;
  if (hasDescription) seoScore += 15;
  if (hasHours) seoScore += 8;
  if (hasPhone) seoScore += 7;
  seoScore += Math.min(25, Math.round((completenessScore / 100) * 25));

  return Math.min(100, Math.round(seoScore));
}
