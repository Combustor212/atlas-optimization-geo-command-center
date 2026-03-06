'use client'

import { FileDown, FileText } from 'lucide-react'

interface Run {
  id: string
  status: string
  summary?: { clientName?: string; generatedAt?: string }
  run_at: string
  created_at: string
}

interface Props {
  runs: Run[]
}

export function ReportHistoryClient({ runs }: Props) {
  function handleDownload(runId: string) {
    window.open(`/api/reports/download?runId=${runId}`, '_blank')
  }

  return (
    <div className="space-y-2">
      {runs.map((r) => (
        <div
          key={r.id}
          className="flex items-center justify-between rounded-lg border border-[var(--card-border)] p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
              <FileText className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div>
              <p className="font-medium">
                Performance Report • {new Date(r.run_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="text-sm text-[var(--muted)]">
                Generated {new Date(r.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleDownload(r.id)}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <FileDown className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      ))}
      {runs.length === 0 && (
        <div className="py-12 text-center text-[var(--muted)]">
          <FileText className="mx-auto mb-3 h-12 w-12 opacity-50" />
          <p>No reports yet.</p>
          <p className="mt-1 text-sm">Scheduled reports will appear here once generated.</p>
        </div>
      )}
    </div>
  )
}
