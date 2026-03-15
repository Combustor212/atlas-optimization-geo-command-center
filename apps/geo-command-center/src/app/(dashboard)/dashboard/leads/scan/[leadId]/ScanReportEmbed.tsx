'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { Lead } from '@/lib/data/leads'

const AGS_APP_URL = process.env.NEXT_PUBLIC_AGS_APP_URL || 'http://localhost:5173'
const AGS_ORIGIN = new URL(AGS_APP_URL).origin

interface ScanReportEmbedProps {
  lead: Lead
  scanReport: Record<string, unknown>
}

export function ScanReportEmbed({ lead, scanReport }: ScanReportEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const dataSentRef = useRef(false)

  const sendData = useCallback(
    (target: Window | null) => {
      if (!target || dataSentRef.current) return
      dataSentRef.current = true
      target.postMessage(
        {
          type: 'scan-report-data',
          scanReport,
          leadMeta: {
            business_name: lead.business_name,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            ...(lead.metadata as Record<string, unknown>),
          },
        },
        AGS_ORIGIN
      )
    },
    [scanReport, lead]
  )

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return

    dataSentRef.current = false

    const onLoad = () => sendData(iframe.contentWindow)
    iframe.addEventListener('load', onLoad)

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== AGS_ORIGIN) return
      if (event.data?.type === 'embed-ready' && event.source) {
        sendData(event.source as Window)
      }
    }
    window.addEventListener('message', onMessage)

    return () => {
      iframe.removeEventListener('load', onLoad)
      window.removeEventListener('message', onMessage)
    }
  }, [scanReport, lead, sendData])

  return (
    <iframe
      ref={iframeRef}
      src={`${AGS_APP_URL}/ScanResults?embed=1`}
      title="Scan Report"
      className="w-full min-h-[1200px] border-0 rounded-lg shadow-lg"
      sandbox="allow-scripts allow-same-origin"
    />
  )
}
