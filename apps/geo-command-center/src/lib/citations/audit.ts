import type { NapProfile, Citation, CitationIssue } from '@/types/database'

const POINTS_PER_MISMATCH = 5
const POINTS_PER_MISSING = 10
const POINTS_PER_DUPLICATE = 5

function normalizeForCompare(value: string | null | undefined): string {
  if (value == null || value === '') return ''
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.-]/g, '')
    .trim()
}

function napMatches(canonical: string, snapshot: string | null | undefined): boolean {
  return normalizeForCompare(canonical) === normalizeForCompare(snapshot)
}

/**
 * Compare citation NAP snapshot to canonical NAP profile and build issues.
 */
function compareCitationToProfile(
  citation: Citation,
  profile: NapProfile | null
): CitationIssue[] {
  const issues: CitationIssue[] = []
  const snap = citation.nap_snapshot ?? {}

  if (!profile) {
    issues.push({
      type: 'missing',
      directory_name: citation.directory_name,
      message: 'No NAP profile set for this location; run audit after setting canonical NAP.',
    })
    return issues
  }

  if (citation.status === 'missing') {
    issues.push({
      type: 'missing',
      directory_name: citation.directory_name,
      message: `Citation is missing on ${citation.directory_name}.`,
    })
    return issues
  }

  if (citation.status === 'duplicate') {
    issues.push({
      type: 'duplicate',
      directory_name: citation.directory_name,
      message: `Duplicate listing on ${citation.directory_name}.`,
    })
  }

  if (citation.status === 'incorrect') {
    issues.push({
      type: 'mismatched_name',
      directory_name: citation.directory_name,
      message: `Citation marked incorrect on ${citation.directory_name}.`,
      expected: profile.canonical_name,
      actual: snap.name,
    })
  }

  if (citation.status !== 'present' && citation.status !== 'incorrect') return issues

  if (!napMatches(profile.canonical_name, snap.name)) {
    issues.push({
      type: 'mismatched_name',
      directory_name: citation.directory_name,
      message: `Name mismatch on ${citation.directory_name}.`,
      expected: profile.canonical_name,
      actual: snap.name,
    })
  }
  if (!napMatches(profile.canonical_address, snap.address)) {
    issues.push({
      type: 'mismatched_address',
      directory_name: citation.directory_name,
      message: `Address mismatch on ${citation.directory_name}.`,
      expected: profile.canonical_address,
      actual: snap.address,
    })
  }
  if (!napMatches(profile.canonical_phone, snap.phone)) {
    issues.push({
      type: 'mismatched_phone',
      directory_name: citation.directory_name,
      message: `Phone mismatch on ${citation.directory_name}.`,
      expected: profile.canonical_phone,
      actual: snap.phone,
    })
  }
  if (profile.canonical_website != null && profile.canonical_website !== '') {
    if (!napMatches(profile.canonical_website, snap.website)) {
      issues.push({
        type: 'mismatched_website',
        directory_name: citation.directory_name,
        message: `Website mismatch on ${citation.directory_name}.`,
        expected: profile.canonical_website,
        actual: snap.website,
      })
    }
  }

  return issues
}

/**
 * Compute consistency score (0–100). Start at 100, subtract per mismatch and per missing citation.
 */
export function computeConsistencyScore(issues: CitationIssue[]): number {
  let deduct = 0
  for (const issue of issues) {
    switch (issue.type) {
      case 'mismatched_name':
      case 'mismatched_address':
      case 'mismatched_phone':
      case 'mismatched_website':
        deduct += POINTS_PER_MISMATCH
        break
      case 'duplicate':
        deduct += POINTS_PER_DUPLICATE
        break
      case 'missing':
        deduct += POINTS_PER_MISSING
        break
      default:
        deduct += POINTS_PER_MISMATCH
    }
  }
  return Math.max(0, 100 - deduct)
}

/**
 * Run audit: compare all citations for a location to the NAP profile, build issues, compute score.
 * Returns the audit payload to store (consistency_score + issues).
 */
export function runCitationAudit(
  profile: NapProfile | null,
  citations: Citation[]
): { consistency_score: number; issues: CitationIssue[] } {
  const allIssues: CitationIssue[] = []

  for (const c of citations) {
    const citationIssues = compareCitationToProfile(c, profile)
    allIssues.push(...citationIssues)
  }

  const consistency_score = computeConsistencyScore(allIssues)
  return { consistency_score, issues: allIssues }
}
