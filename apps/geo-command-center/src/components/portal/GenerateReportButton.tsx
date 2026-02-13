'use client'

import { useState } from 'react'
import { FileDown } from 'lucide-react'

interface GenerateReportButtonProps {
  clientId: string
  clientName: string
}

export function GenerateReportButton({ clientId, clientName }: GenerateReportButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/generate?clientId=${clientId}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${clientName.replace(/\s+/g, '-')}-report.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
    >
      <FileDown className="h-4 w-4" />
      {loading ? 'Generating...' : 'Generate PDF Report'}
    </button>
  )
}
