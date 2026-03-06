import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { WhiteLabelReportDocument } from '@/components/reports/WhiteLabelReportDocument'
import type { ReportData, WhiteLabelReportDocumentProps } from '@/components/reports/WhiteLabelReportDocument'
import type { ReportBranding } from './types'

const BUCKET = 'reports'

export interface GenerateReportParams {
  runId: string
  agencyId: string
  clientId: string
  templateId: string
}

export interface GenerateReportResult {
  ok: boolean
  pdfPath?: string
  summary?: Record<string, unknown>
  error?: string
}

export async function generateReport(params: GenerateReportParams): Promise<GenerateReportResult> {
  const { runId, agencyId, clientId, templateId } = params
  const supabase = getSupabaseAdmin()

  try {
    const [clientRes, templateRes, locationsRes] = await Promise.all([
      supabase.from('clients').select('name').eq('id', clientId).eq('agency_id', agencyId).single(),
      supabase.from('report_templates').select('branding, sections').eq('id', templateId).eq('agency_id', agencyId).single(),
      supabase.from('locations').select('id, name').eq('client_id', clientId),
    ])

    const client = clientRes.data
    const template = templateRes.data
    const locations = locationsRes.data ?? []

    if (!client) {
      return { ok: false, error: 'Client not found' }
    }
    if (!template) {
      return { ok: false, error: 'Template not found' }
    }

    const locationIds = locations.map((l: { id: string }) => l.id)

    let rankingsRes: { data: Array<{ location_id: string; map_pack_position?: number; organic_position?: number }> } = { data: [] }
    let trafficRes: { data: Array<{ location_id: string; organic_clicks: number }> } = { data: [] }
    let reviewsRes: { data: Array<{ location_id: string; count: number }> } = { data: [] }
    let callsRes: { data: Array<{ location_id: string; call_count: number }> } = { data: [] }
    let revenueRes: { data: Array<{ location_id: string; estimated_monthly_lift: number }> } = { data: [] }

    if (locationIds.length > 0) {
      const [r1, r2, r3, r4, r5] = await Promise.all([
        supabase.from('rankings').select('location_id, map_pack_position, organic_position').in('location_id', locationIds).order('recorded_at', { ascending: false }),
        supabase.from('traffic_metrics').select('location_id, organic_clicks').in('location_id', locationIds),
        supabase.from('reviews').select('location_id, count').in('location_id', locationIds).order('recorded_at', { ascending: false }),
        supabase.from('calls_tracked').select('location_id, call_count').in('location_id', locationIds),
        supabase.from('revenue_estimates').select('location_id, estimated_monthly_lift').in('location_id', locationIds).order('calculated_at', { ascending: false }),
      ])
      rankingsRes = r1
      trafficRes = r2
      reviewsRes = r3
      callsRes = r4
      revenueRes = r5
    }

    const rankings = rankingsRes.data ?? []
    const traffic = trafficRes.data ?? []
    const reviews = reviewsRes.data ?? []
    const calls = callsRes.data ?? []
    const revenue = revenueRes.data ?? []

    const locationsData = locations.map((loc: { id: string; name: string }) => {
      const latestRank = rankings.find((r: { location_id: string }) => r.location_id === loc.id)
      const prevRank = rankings.filter((r: { location_id: string }) => r.location_id === loc.id)[1]
      const currentRank = latestRank?.map_pack_position ?? latestRank?.organic_position ?? null
      const previousRank = prevRank?.map_pack_position ?? prevRank?.organic_position ?? null
      const rankChange =
        currentRank !== null && previousRank !== null
          ? ((previousRank - currentRank) / previousRank) * 100
          : 0
      const trafficSum = traffic.filter((t: { location_id: string }) => t.location_id === loc.id).reduce((s: number, t: { organic_clicks: number }) => s + t.organic_clicks, 0)
      const latestReviews = reviews.find((r: { location_id: string }) => r.location_id === loc.id)?.count ?? 0
      const callsSum = calls.filter((c: { location_id: string }) => c.location_id === loc.id).reduce((s: number, c: { call_count: number }) => s + c.call_count, 0)
      const rev = revenue.find((r: { location_id: string }) => r.location_id === loc.id)?.estimated_monthly_lift ?? 0

      return {
        name: loc.name,
        rank: currentRank,
        previousRank,
        rankChange,
        organicClicks: trafficSum,
        reviews: latestReviews,
        calls: callsSum,
        estimatedRevenue: rev,
      }
    })

    const ranksWithValue = locationsData.filter((l: { rank: number | null }) => l.rank != null)
    const avgRank =
      ranksWithValue.length > 0
        ? ranksWithValue.reduce((s: number, l: { rank: number | null }) => s + (l.rank ?? 0), 0) / ranksWithValue.length
        : 0

    const topPerformer =
      locationsData.reduce(
        (best: { name: string; rank: number | null }, loc: { name: string; rank: number | null }) =>
          (loc.rank ?? 999) < (best.rank ?? 999) ? loc : best,
        locationsData[0] ?? { name: 'N/A', rank: null }
      )

    const biggestImprovement =
      locationsData.reduce(
        (best: { name: string; rankChange: number }, loc: { name: string; rankChange: number }) =>
          Math.abs(loc.rankChange) > Math.abs(best.rankChange) ? loc : best,
        locationsData[0] ?? { name: 'N/A', rankChange: 0 }
      )

    const totalRevenue = locationsData.reduce((s: number, l: { estimatedRevenue: number }) => s + l.estimatedRevenue, 0)

    const reportData: ReportData = {
      clientName: client.name,
      generatedAt: new Date().toISOString(),
      dateRange: 'Last 30 Days',
      locations: locationsData,
      totals: {
        locations: locationsData.length,
        avgRank,
        organicClicks: traffic.reduce((s: number, t: { organic_clicks: number }) => s + t.organic_clicks, 0),
        reviews: reviews.reduce((s: number, r: { count: number }) => s + r.count, 0),
        calls: calls.reduce((s: number, c: { call_count: number }) => s + c.call_count, 0),
        revenue: totalRevenue,
      },
      highlights: {
        topPerformer: `${topPerformer.name} (Rank #${topPerformer.rank ?? 'N/A'})`,
        biggestImprovement: `${biggestImprovement.name} (${biggestImprovement.rankChange > 0 ? '+' : ''}${biggestImprovement.rankChange.toFixed(0)}%)`,
        totalImprovement: `${totalRevenue > 0 ? '+' : ''}$${totalRevenue.toLocaleString()}/mo revenue lift`,
      },
    }

    const branding = (template.branding ?? {}) as ReportBranding
    const sections = (template.sections ?? []) as string[]

    const docProps: WhiteLabelReportDocumentProps = {
      data: reportData,
      branding,
      sections,
    }

    const doc = React.createElement(WhiteLabelReportDocument, docProps)
    const buffer = await renderToBuffer(doc as Parameters<typeof renderToBuffer>[0])

    const pdfPath = `${agencyId}/${clientId}/${runId}.pdf`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(pdfPath, new Uint8Array(buffer), {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      return { ok: false, error: `Storage upload failed: ${uploadError.message}` }
    }

    const summary = {
      clientName: client.name,
      locations: locationsData.length,
      totalRevenue,
      generatedAt: reportData.generatedAt,
    }

    const { error: updateError } = await supabase
      .from('report_runs')
      .update({ pdf_path: pdfPath, summary, status: 'generated' })
      .eq('id', runId)
      .eq('agency_id', agencyId)

    if (updateError) {
      return { ok: false, error: `DB update failed: ${updateError.message}`, pdfPath }
    }

    return { ok: true, pdfPath, summary }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[generateReport]', err)

    await supabase
      .from('report_runs')
      .update({ status: 'failed', summary: { error: message } })
      .eq('id', runId)
      .eq('agency_id', agencyId)

    return { ok: false, error: message }
  }
}
