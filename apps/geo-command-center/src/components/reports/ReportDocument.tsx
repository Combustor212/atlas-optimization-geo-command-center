import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a5f',
    paddingBottom: 16,
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
    color: '#1e3a5f',
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
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e3a5f',
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

interface ReportData {
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

interface ReportDocumentProps {
  data: ReportData
}

export function ReportDocument({ data }: ReportDocumentProps) {
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>GEO Performance Report</Text>
          <Text style={styles.subtitle}>{data.clientName}</Text>
          <Text style={styles.subtitle}>
            Generated {new Date(data.generatedAt).toLocaleDateString()} • {data.dateRange}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Locations</Text>
            <Text style={styles.value}>{data.totals.locations}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Average Map Rank</Text>
            <Text style={styles.value}>{data.totals.avgRank.toFixed(1)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Organic Clicks</Text>
            <Text style={styles.value}>{data.totals.organicClicks.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Calls Generated</Text>
            <Text style={styles.value}>{data.totals.calls.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Reviews Gained</Text>
            <Text style={styles.value}>{data.totals.reviews.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Est. Monthly Revenue Lift</Text>
            <Text style={styles.value}>{formatCurrency(data.totals.revenue)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Highlights</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Top Performer</Text>
            <Text style={styles.value}>{data.highlights.topPerformer}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Biggest Improvement</Text>
            <Text style={styles.value}>{data.highlights.biggestImprovement}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Overall Progress</Text>
            <Text style={styles.value}>{data.highlights.totalImprovement}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Performance Breakdown</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Location</Text>
              <Text style={styles.col2}>Rank</Text>
              <Text style={styles.col3}>Rank Δ</Text>
              <Text style={styles.col4}>Clicks</Text>
              <Text style={styles.col5}>Calls</Text>
              <Text style={styles.col6}>Revenue</Text>
            </View>
            {data.locations.map((loc) => (
              <View key={loc.name} style={styles.tableRow}>
                <Text style={styles.col1}>{loc.name}</Text>
                <Text style={styles.col2}>{loc.rank ?? '—'}</Text>
                <Text style={styles.col3}>
                  {loc.rankChange !== 0 ? `${loc.rankChange > 0 ? '+' : ''}${loc.rankChange.toFixed(0)}%` : '—'}
                </Text>
                <Text style={styles.col4}>{loc.organicClicks.toLocaleString()}</Text>
                <Text style={styles.col5}>{loc.calls.toLocaleString()}</Text>
                <Text style={styles.col6}>{formatCurrency(loc.estimatedRevenue)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ROI Analysis</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Estimated Revenue Impact</Text>
            <Text style={styles.value}>{formatCurrency(data.totals.revenue)}/month</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Annual Revenue Projection</Text>
            <Text style={styles.value}>{formatCurrency(data.totals.revenue * 12)}/year</Text>
          </View>
          <View style={{...styles.row, marginTop: 10}}>
            <Text style={{fontSize: 9, color: '#64748b', fontStyle: 'italic'}}>
              Revenue estimates based on ranking improvements, average ticket size, and conversion rates.
              Actual results may vary based on seasonality and market conditions.
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          GEO Command Center • Professional Performance Report • Confidential & Proprietary
        </Text>
      </Page>
    </Document>
  )
}
