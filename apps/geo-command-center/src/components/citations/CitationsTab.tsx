'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { Citation, CitationAudit, NapProfile } from '@/types/database'
import { FileText, AlertCircle, CheckCircle, XCircle, Link2, RefreshCw } from 'lucide-react'
import { AddCitationForm } from './AddCitationForm'
import { NapProfileForm } from './NapProfileForm'

interface CitationsTabProps {
  locationId: string
  locationName: string
  isAdmin?: boolean
}

export function CitationsTab({ locationId, locationName, isAdmin = false }: CitationsTabProps) {
  const [citations, setCitations] = useState<Citation[]>([])
  const [audit, setAudit] = useState<CitationAudit | null>(null)
  const [profile, setProfile] = useState<NapProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [auditing, setAuditing] = useState(false)

  const load = async () => {
    try {
      const [citRes, auditRes, profileRes] = await Promise.all([
        fetch(`/api/locations/${locationId}/citations`),
        fetch(`/api/locations/${locationId}/citations/audit`),
        fetch(`/api/locations/${locationId}/nap-profile`),
      ])
      if (citRes.ok) {
        const d = await citRes.json()
        setCitations(d.citations ?? [])
      }
      if (auditRes.ok) {
        const d = await auditRes.json()
        setAudit(d.audit ?? null)
      }
      if (profileRes.ok) {
        const d = await profileRes.json()
        setProfile(d.profile ?? null)
      }
    } catch (e) {
      console.error('Error loading citations:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load depends on locationId only
  }, [locationId])

  const runAudit = async () => {
    setAuditing(true)
    try {
      const res = await fetch(`/api/locations/${locationId}/citations/audit`, { method: 'POST' })
      if (res.ok) {
        const d = await res.json()
        setAudit(d.audit ?? null)
      }
    } finally {
      setAuditing(false)
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-[var(--muted)]">
        Loading citations…
      </div>
    )
  }

  const topIssues = (audit?.issues ?? []).slice(0, 5)
  const score = audit?.consistency_score ?? null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Citation & NAP Consistency</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Directories, status, and consistency score for {locationName}
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <NapProfileForm
              locationId={locationId}
              initialProfile={profile}
              onSuccess={load}
            />
            <button
              type="button"
              onClick={runAudit}
              disabled={auditing}
              className="inline-flex items-center gap-2 rounded border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--accent-muted)] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${auditing ? 'animate-spin' : ''}`} />
              {auditing ? 'Running…' : 'Run audit'}
            </button>
          </div>
        )}
      </div>

      {/* Consistency score + top issues */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              Consistency score
            </CardTitle>
          </CardHeader>
          <div className="px-6 pb-6">
            {score !== null ? (
              <p className={`text-2xl font-bold ${score >= 80 ? 'text-[var(--success)]' : score >= 50 ? 'text-[var(--warning)]' : 'text-[var(--danger)]'}`}>
                {score}/100
              </p>
            ) : (
              <p className="text-[var(--muted)]">Run an audit to see the score.</p>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5" />
              Top issues
            </CardTitle>
          </CardHeader>
          <div className="px-6 pb-6">
            {topIssues.length > 0 ? (
              <ul className="list-inside list-disc space-y-1 text-sm text-[var(--foreground)]">
                {topIssues.map((issue, i) => (
                  <li key={i}>{issue.message}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--muted)]">No issues, or run an audit first.</p>
            )}
          </div>
        </Card>
      </div>

      {/* NAP profile summary (read-only when no form) */}
      {profile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Canonical NAP</CardTitle>
            <p className="text-sm text-[var(--muted)]">
              {profile.canonical_name} · {profile.canonical_address} · {profile.canonical_phone}
              {profile.canonical_website ? ` · ${profile.canonical_website}` : ''}
            </p>
          </CardHeader>
        </Card>
      )}

      {/* Directories list */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-base">Directories</CardTitle>
            {isAdmin && <AddCitationForm locationId={locationId} onSuccess={load} />}
          </div>
        </CardHeader>
        <div className="overflow-x-auto px-6 pb-6">
          {citations.length === 0 ? (
            <p className="py-6 text-center text-[var(--muted)]">No directories yet. Add one to track NAP consistency.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="pb-2 text-left font-medium text-[var(--muted)]">Directory</th>
                  <th className="pb-2 text-left font-medium text-[var(--muted)]">Status</th>
                  <th className="pb-2 text-left font-medium text-[var(--muted)]">URL</th>
                  <th className="pb-2 text-left font-medium text-[var(--muted)]">NAP snapshot</th>
                </tr>
              </thead>
              <tbody>
                {citations.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--card-border)] last:border-0">
                    <td className="py-3 font-medium">{c.directory_name}</td>
                    <td className="py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3">
                      {c.url ? (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                        >
                          <Link2 className="h-4 w-4" />
                          Link
                        </a>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="py-3 text-[var(--muted)]">
                      {c.nap_snapshot && typeof c.nap_snapshot === 'object' && Object.keys(c.nap_snapshot).length > 0
                        ? [c.nap_snapshot.name, c.nap_snapshot.address, c.nap_snapshot.phone].filter(Boolean).join(' · ') || '—'
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: typeof CheckCircle; label: string; className: string }> = {
    present: { icon: CheckCircle, label: 'Present', className: 'text-[var(--success)]' },
    missing: { icon: XCircle, label: 'Missing', className: 'text-[var(--danger)]' },
    duplicate: { icon: AlertCircle, label: 'Duplicate', className: 'text-[var(--warning)]' },
    incorrect: { icon: XCircle, label: 'Incorrect', className: 'text-[var(--danger)]' },
  }
  const s = map[status] ?? { icon: FileText, label: status, className: 'text-[var(--muted)]' }
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1 ${s.className}`}>
      <Icon className="h-4 w-4" />
      {s.label}
    </span>
  )
}
