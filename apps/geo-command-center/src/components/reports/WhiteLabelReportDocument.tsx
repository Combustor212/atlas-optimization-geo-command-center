import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import type { ReportBranding } from '@/lib/reports/types'

export interface ReportData {
  clientName: string
  generatedAt: string
  dateRange: string
  locations: {
    name: string
    rank: number | null
    previousRank: number | null
    rankChange: number
    organicClicks: number
    reviews: number
    calls: number
    estimatedRevenue: number
  }[]
  totals: {
    locations: number
    avgRank: number
    organicClicks: number
    reviews: number
    calls: number
    revenue: number
  }
  highlights: {
    topPerformer: string
    biggestImprovement: string
    totalImprovement: string
  }
}

interface WhiteLabelReportDocumentProps {
  data: ReportData
  branding?: ReportBranding
  sections?: string[]
}

const accentDefault = '#1e3a5f'
const sectionKeys = [
  'executive_summary',
  'highlights',
  'location_breakdown',
  'roi_analysis',
] as const

export function WhiteLabelReportDocument({
  data,
  branding = {},
  sections = [...sectionKeys],
}: WhiteLabelReportDocumentProps) {
  const accent = branding.accent_color ?? accentDefault
  const companyName = branding.company_name ?? 'GEO Command Center'
  const showSection = (key: string) => sections.includes(key)
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const dynamicStyles = StyleSheet.create({
    headerBorder: { borderBottomColor: accent },
    sectionTitle: { color: accent },
    tableHeader: { backgroundColor: accent },
  })

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <View style={[baseStyles.header, dynamicStyles.headerBorder]}>
          {branding.logo_url && (
            <Image src={branding.logo_url} alt="Company logo" style={baseStyles.logo} />
          )}
          <Text style={baseStyles.title}>
            {companyName} Performance Report
          </Text>
          <Text style={baseStyles.subtitle}>{data.clientName}</Text>
          <Text style={baseStyles.subtitle}>
            Generated {new Date(data.generatedAt).toLocaleDateString()} • {data.dateRange}
          </Text>
        </View>

        {showSection('executive_summary') && (
          <View style={baseStyles.section}>
            <Text style={[baseStyles.sectionTitle, dynamicStyles.sectionTitle]}>
              Executive Summary
            </Text>
            <View style={baseStyles.row}>
              <Text style={baseStyles.label}>Total Locations</Text>
              <Text style={baseStyles.value}>{data.totals.locations}</Text>
            </View>
            <View style={baseStyles.row}>
              <Text style={baseStyles.label}>Average Map Rank</Text>
              <Text style={baseStyles.value}>{data.totals.avgRank.toFixed(1)}</Text>
            </View>
            <View style={baseStyles.row}>
              <Text style={baseStyles.label}>Organic Clicks</Text>
              <Text style={baseStyles.value}>{data.totals.organicClicks.toLocaleString()}</Text>
            </View>
            <View style={baseStyles.row}>
              <Text style={baseStyles.label}>Calls Generated</Text>
              <Text style={baseStyles.value}>{data.totals.calls.toLocaleString()}</Text>
            </View>
            <View style={baseStyles.row}>
              <Text style={baseStyles.label}>Reviews Gained</Text>
              <Text style={baseStyles.value}>{data.totals.reviews.toLocaleString()}</Text>
            </View>
            <View style={baseStyles.row}>
              <Text style={baseStyles.label}>Est. Monthly Revenue Lift</Text>
              <Text style={baseStyles.value}>{formatCurrency(data.totals.revenue)}</Text>
            </View>
          </View>
        )}

        {showSection('highlights') && (
          <View style={baseStyles.section}>
            <Text style={[baseStyles.sectionTitle, dynamicStyles.sectionTitle]}>
              Key Highlights
            </Text>
            <View style={baseStyles.row}>
              <Text style={baseStyles.label}>Top Performer</Text>
              <Text style={baseStyles.value}>{data.highlights.topPerformer}</Text>
            </View>
            <View style={baseStyles.row}>
              <Text style={baseStyles.label}>Biggest Improvement</Text>
              <Text style={baseStyles.value}>{data.highlights.biggestImprovement}</Text>
            </View>
            <View style={baseStyles.row}>
              <Text style={baseStyles.label}>Overall Progress</Text>
              <Text style={baseStyles.value}>{data.highlights.totalImprovement}</Text>
            </View>
          </View>
        )}

        {showSection('location_breakdown') && (
          <View style={baseStyles.section}>
            <Text style={[baseStyles.sectionTitle, dynamicStyles.sectionTitle]}>
              Location Performance Breakdown
            </Text>
            <View style={baseStyles.table}>
              <View style={[baseStyles.tableHeader, dynamicStyles.tableHeader]}>
                <Text style={baseStyles.col1}>Location</Text>
                <Text style={baseStyles.col2}>Rank</Text>
                <Text style={baseStyles.col3}>Rank Δ</Text>
                <Text style={baseStyles.col4}>Clicks</Text>
                <Text style={baseStyles.col5}>Calls</Text>
                <Text style={baseStyles.col6}>Revenue</Text>
              </View>
              {data.locations.map((loc) => (
                <View key={loc.name} style={baseStyles.tableRow}>
                  <Text style={baseStyles.col1}>{loc.name}</Text>
                  <Text style={baseStyles.col2}>{loc.rank ?? '—'}</Text>
                  <Text style={baseStyles.col3}>
                    {loc.rankChange !== 0
                      ? `${loc.rankChange > 0 ? '+' : ''}${loc.rankChange.toFixed(0)}%`
                      : '—'}
                  </Text>
                  <Text style={baseStyles.col4}>{loc.organicClicks.toLocaleString()}</Text>
                  <Text style={baseStyles.col5}>{loc.calls.toLocaleString()}</Text>
                  <Text style={baseStyles.col6}>{formatCurrency(loc.estimatedRevenue)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {showSection('roi_analysis') && (
          <View style={baseStyles.section}>
            <Text style={[baseStyles.sectionTitle, dynamicStyles.sectionTitle]}>
              ROI Analysis
            </Text>
            <View style={baseStyles.row}>
              <Text style={baseStyles.label}>Total Estimated Revenue Impact</Text>
              <Text style={baseStyles.value}>{formatCurrency(data.totals.revenue)}/month</Text>
            </View>
            <View style={baseStyles.row}>
              <Text style={baseStyles.label}>Annual Revenue Projection</Text>
              <Text style={baseStyles.value}>{formatCurrency(data.totals.revenue * 12)}/year</Text>
            </View>
            <View style={[baseStyles.row, { marginTop: 10 }]}>
              <Text style={baseStyles.disclaimer}>
                Revenue estimates based on ranking improvements, average ticket size, and conversion
                rates. Actual results may vary.
              </Text>
            </View>
          </View>
        )}

        <Text style={baseStyles.footer}>
          {companyName} • Professional Performance Report • Confidential & Proprietary
        </Text>
      </Page>
    </Document>
  )
}

const baseStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    paddingBottom: 16,
  },
  logo: {
    width: 80,
    height: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0a0a0f',
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    width: 140,
    fontSize: 10,
    color: '#64748b',
  },
  value: {
    fontSize: 10,
    color: '#0a0a0f',
  },
  disclaimer: {
    fontSize: 9,
    color: '#64748b',
    fontStyle: 'italic',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    color: 'white',
    padding: 8,
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    fontSize: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  col1: { width: '30%' },
  col2: { width: '15%' },
  col3: { width: '15%' },
  col4: { width: '15%' },
  col5: { width: '15%' },
  col6: { width: '10%' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#64748b',
    textAlign: 'center',
  },
})
