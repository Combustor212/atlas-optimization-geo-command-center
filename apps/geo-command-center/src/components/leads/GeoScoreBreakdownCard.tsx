'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ChevronDown, ChevronRight, Brain, Search, Award, CheckCircle2, XCircle, Globe, BarChart3, FileSearch } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GeoQuery {
  query?: string
  bucket?: string
  mentioned?: boolean
  rank?: number | null
  reason?: string | null
}

interface GeoComponent {
  name?: string
  score?: number
  max?: number
  label?: string
}

interface GeoExplain {
  geoScore?: number
  grade?: string
  authorityScore?: number
  contentDepth?: number
  reviewAuthority?: number
  entityConsistency?: number
  answerability?: number
  entityStrengthScore?: number
  aiMentionProbability?: number
  entityCoverageScore?: number
  entityCoverageExplanation?: string
  queriesTested?: number
  mentionsDetected?: number
  averagePosition?: number | null
  aiVisibilityProbability?: number
  topCompetitorsMentioned?: string[]
  components?: GeoComponent[]
  queries?: GeoQuery[]
  explanation?: string
  deficiencies?: string[]
  optimizationRecommendations?: string[]
  /** Competitor AI Visibility Comparison */
  competitorGeoScores?: Array<{ name: string; geoScore: number; aiVisibilityProbability: number }>
  competitorAverageGeoScore?: number
  competitorAverageAiVisibility?: number
  visibilityGap?: number
  competitorNames?: string[]
  competitorComparisonInsight?: string
  /** AI Query Evidence — transparent evidence of simulated AI answers */
  queryEvidence?: Array<{
    query: string
    businessMentioned: boolean
    estimatedPosition: number | null
    competitorsMentioned: string[]
  }>
  queryEvidenceInsight?: string
}

interface GeoScoreBreakdownCardProps {
  explain: GeoExplain | Record<string, unknown>
  businessName?: string
}

const BUCKET_LABELS: Record<string, string> = {
  near_me: 'Near Me',
  best: 'Best/Top',
  service: 'Service',
  trust: 'Trust',
  recommendation: 'Recommendation',
}

export function GeoScoreBreakdownCard({ explain, businessName }: GeoScoreBreakdownCardProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    components: true,
    queries: true,
    queryEvidence: true,
    v4: true,
    entityCoverage: true,
    competitorComparison: true,
    recommendations: false,
  })

  const toggle = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))

  const exp = explain as GeoExplain
  const geoScore = exp.geoScore ?? 0
  const grade = exp.grade ?? '—'
  const components = (Array.isArray(exp.components) ? exp.components : []) as GeoComponent[]
  const queries = (Array.isArray(exp.queries) ? exp.queries : []) as GeoQuery[]
  const topCompetitors = (Array.isArray(exp.topCompetitorsMentioned) ? exp.topCompetitorsMentioned : []) as string[]
  const deficiencies = (Array.isArray(exp.deficiencies) ? exp.deficiencies : []) as string[]
  const recommendations = (Array.isArray(exp.optimizationRecommendations) ? exp.optimizationRecommendations : []) as string[]
  const queryEvidence = Array.isArray(exp.queryEvidence) ? exp.queryEvidence : []

  return (
    <Card className="border-[var(--accent)]/30 bg-[var(--card)]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
              <Brain className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <div>
              <CardTitle className="text-xl">
                AI Entity Strength
              </CardTitle>
              <p className="text-sm text-[var(--muted)] mt-0.5">
                GEO visibility for {businessName || 'this business'} — ChatGPT, SGE, Perplexity
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[var(--foreground)]">{geoScore}</div>
            <div className="text-sm font-medium text-[var(--muted)]">Grade {grade}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {exp.explanation && (
          <p className="text-sm text-[var(--muted)] leading-relaxed">{exp.explanation}</p>
        )}

        {/* v3 Structural Components */}
        {components.length > 0 && (
          <section>
            <button
              type="button"
              onClick={() => toggle('components')}
              className="flex w-full items-center gap-2 text-left font-medium text-[var(--foreground)]"
            >
              {expandedSections.components ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Award className="h-4 w-4 text-[var(--accent)]" />
              Structural Scoring (v3)
            </button>
            {expandedSections.components && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {components.map((c, i) => (
                  <div
                    key={c.name ?? i}
                    className="flex items-center justify-between rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-4 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{c.name ?? '—'}</p>
                      <p className="text-xs text-[var(--muted)]">{c.label ?? ''}</p>
                    </div>
                    <span className="text-sm font-semibold">
                      {c.score ?? 0}/{c.max ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* AI Query Evidence — transparent evidence of simulated AI answers */}
        {(queryEvidence.length > 0 || queries.length > 0) && (
          <section>
            <button
              type="button"
              onClick={() => toggle('queryEvidence')}
              className="flex w-full items-center gap-2 text-left font-medium text-[var(--foreground)]"
            >
              {expandedSections.queryEvidence ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <FileSearch className="h-4 w-4 text-[var(--accent)]" />
              AI Query Evidence (v8) — {(queryEvidence.length || queries.length)} queries tested
            </button>
            {expandedSections.queryEvidence && (
              <div className="mt-3 space-y-3">
                {exp.queryEvidenceInsight && (
                  <p className="text-sm text-[var(--muted)] leading-relaxed">
                    {exp.queryEvidenceInsight}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="rounded bg-[var(--accent-muted)] px-2 py-1">
                    Tested: {exp.queriesTested ?? (queryEvidence.length || queries.length)}
                  </span>
                  <span className="rounded bg-[var(--accent-muted)] px-2 py-1">
                    Mentioned: {exp.mentionsDetected ?? (queryEvidence.filter((e) => e.businessMentioned).length || queries.filter((q) => q.mentioned).length)}
                  </span>
                  {exp.averagePosition != null && (
                    <span className="rounded bg-[var(--accent-muted)] px-2 py-1">
                      Avg position: {exp.averagePosition.toFixed(1)}
                    </span>
                  )}
                  {exp.aiVisibilityProbability != null && (
                    <span className="rounded bg-[var(--accent-muted)] px-2 py-1">
                      Visibility: {Math.round(exp.aiVisibilityProbability)}%
                    </span>
                  )}
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(queryEvidence.length > 0 ? queryEvidence : queries.map((q) => ({
                    query: q.query ?? '',
                    businessMentioned: q.mentioned ?? false,
                    estimatedPosition: q.rank ?? null,
                    competitorsMentioned: [],
                  }))).map((item, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border px-3 py-2 text-sm',
                        item.businessMentioned
                          ? 'border-[var(--success)]/30 bg-[var(--success)]/5'
                          : 'border-[var(--card-border)] bg-[var(--background)]/30'
                      )}
                    >
                      {item.businessMentioned ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)] mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-[var(--muted)] mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[var(--foreground)]">&ldquo;{item.query || '(no query)'}&rdquo;</p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                          {item.estimatedPosition != null && (
                            <span>Position #{item.estimatedPosition}</span>
                          )}
                          {item.competitorsMentioned?.length > 0 && (
                            <span>
                              Competitors: {item.competitorsMentioned.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* v4 Entity Authority */}
        {(exp.entityStrengthScore != null || exp.aiMentionProbability != null) && (
          <section>
            <button
              type="button"
              onClick={() => toggle('v4')}
              className="flex w-full items-center gap-2 text-left font-medium text-[var(--foreground)]"
            >
              {expandedSections.v4 ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Brain className="h-4 w-4 text-[var(--accent)]" />
              Entity Authority (v4)
            </button>
            {expandedSections.v4 && (
              <div className="mt-3 flex flex-wrap gap-4">
                {exp.entityStrengthScore != null && (
                  <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-4 py-2">
                    <p className="text-xs text-[var(--muted)]">Entity strength</p>
                    <p className="text-lg font-semibold">{exp.entityStrengthScore}/20</p>
                  </div>
                )}
                {exp.aiMentionProbability != null && (
                  <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-4 py-2">
                    <p className="text-xs text-[var(--muted)]">AI mention probability</p>
                    <p className="text-lg font-semibold">{exp.aiMentionProbability}%</p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Entity Coverage Analysis */}
        {(exp.entityCoverageScore != null || exp.entityCoverageExplanation) && (
          <section>
            <button
              type="button"
              onClick={() => toggle('entityCoverage')}
              className="flex w-full items-center gap-2 text-left font-medium text-[var(--foreground)]"
            >
              {expandedSections.entityCoverage ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Globe className="h-4 w-4 text-[var(--accent)]" />
              Entity Coverage (v6)
            </button>
            {expandedSections.entityCoverage && (
              <div className="mt-3 space-y-3">
                {exp.entityCoverageScore != null && (
                  <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-4 py-2">
                    <p className="text-xs text-[var(--muted)]">Entity coverage score</p>
                    <p className="text-lg font-semibold">{exp.entityCoverageScore}/25</p>
                  </div>
                )}
                {exp.entityCoverageExplanation && (
                  <p className="text-sm text-[var(--muted)] leading-relaxed">{exp.entityCoverageExplanation}</p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Competitor AI Visibility Comparison */}
        {(exp.competitorComparisonInsight || (exp.competitorGeoScores?.length ?? 0) > 0) && (
          <section>
            <button
              type="button"
              onClick={() => toggle('competitorComparison')}
              className="flex w-full items-center gap-2 text-left font-medium text-[var(--foreground)]"
            >
              {expandedSections.competitorComparison ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <BarChart3 className="h-4 w-4 text-[var(--accent)]" />
              Competitor Comparison (v7)
            </button>
            {expandedSections.competitorComparison && (
              <div className="mt-3 space-y-3">
                {exp.competitorComparisonInsight && (
                  <p className="text-sm text-[var(--muted)] leading-relaxed">
                    {exp.competitorComparisonInsight}
                  </p>
                )}
                {(exp.competitorAverageGeoScore != null || exp.competitorAverageAiVisibility != null || exp.visibilityGap != null) && (
                  <div className="flex flex-wrap gap-4">
                    {exp.competitorAverageGeoScore != null && (
                      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-4 py-2">
                        <p className="text-xs text-[var(--muted)]">Competitor avg GEO score</p>
                        <p className="text-lg font-semibold">{exp.competitorAverageGeoScore}</p>
                      </div>
                    )}
                    {exp.competitorAverageAiVisibility != null && (
                      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-4 py-2">
                        <p className="text-xs text-[var(--muted)]">Competitor avg AI visibility</p>
                        <p className="text-lg font-semibold">{exp.competitorAverageAiVisibility}%</p>
                      </div>
                    )}
                    {exp.visibilityGap != null && (
                      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-4 py-2">
                        <p className="text-xs text-[var(--muted)]">Visibility gap</p>
                        <p className={cn(
                          'text-lg font-semibold',
                          exp.visibilityGap > 0 ? 'text-[var(--warning)]' : exp.visibilityGap < 0 ? 'text-[var(--success)]' : ''
                        )}>
                          {exp.visibilityGap > 0 ? '+' : ''}{exp.visibilityGap}%
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {exp.visibilityGap > 0 ? 'Competitors appear more often' : exp.visibilityGap < 0 ? 'You appear more often' : 'Even'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {(exp.competitorGeoScores?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--muted)] uppercase mb-2">Competitors analyzed</p>
                    <div className="space-y-2">
                      {exp.competitorGeoScores!.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg border border-[var(--card-border)] bg-[var(--background)]/30 px-3 py-2 text-sm"
                        >
                          <span className="font-medium text-[var(--foreground)]">{c.name}</span>
                          <div className="flex gap-4 text-[var(--muted)]">
                            <span>GEO {c.geoScore}</span>
                            <span>{c.aiVisibilityProbability}% visibility</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Top competitors (from v2 query simulation, when no full comparison) */}
        {topCompetitors.length > 0 && !exp.competitorGeoScores?.length && (
          <section>
            <p className="text-sm font-medium text-[var(--foreground)] mb-2">Likely competitors mentioned</p>
            <div className="flex flex-wrap gap-2">
              {topCompetitors.map((c, i) => (
                <span
                  key={i}
                  className="rounded bg-[var(--card-border)] px-2 py-1 text-xs text-[var(--muted)]"
                >
                  {c}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Deficiencies & Recommendations */}
        {(deficiencies.length > 0 || recommendations.length > 0) && (
          <section>
            <button
              type="button"
              onClick={() => toggle('recommendations')}
              className="flex w-full items-center gap-2 text-left font-medium text-[var(--foreground)]"
            >
              {expandedSections.recommendations ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Gaps & recommendations
            </button>
            {expandedSections.recommendations && (
              <div className="mt-3 space-y-4">
                {deficiencies.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--muted)] uppercase mb-2">Deficiencies</p>
                    <ul className="list-disc space-y-1 pl-4 text-sm text-[var(--foreground)]">
                      {deficiencies.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--muted)] uppercase mb-2">Optimization recommendations</p>
                    <ul className="list-disc space-y-1 pl-4 text-sm text-[var(--foreground)]">
                      {recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </CardContent>
    </Card>
  )
}
