'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'

// CTR by position (approximate for local pack)
const CTR_BY_RANK: Record<number, number> = {
  1: 28,
  2: 15,
  3: 11,
  4: 8,
  5: 6,
  6: 5,
  7: 4,
  8: 3,
  9: 2.5,
  10: 2,
}

export default function CalculatorPage() {
  const [avgTicket, setAvgTicket] = useState(150)
  const [avgDailyJobs, setAvgDailyJobs] = useState(5)
  const [currentRank, setCurrentRank] = useState(5)
  const [targetRank, setTargetRank] = useState(2)
  const [trafficIncreasePct, setTrafficIncreasePct] = useState(25)
  const [conversionRate, setConversionRate] = useState(20)

  const currentCTR = CTR_BY_RANK[currentRank] ?? 2
  const targetCTR = CTR_BY_RANK[targetRank] ?? 2
  const ctrLift = targetCTR - currentCTR
  const ctrLiftPct = currentCTR > 0 ? (ctrLift / currentCTR) * 100 : 0

  const assumedMonthlyClicks = 1000
  const additionalClicks = assumedMonthlyClicks * (trafficIncreasePct / 100)
  const additionalConversions = additionalClicks * (conversionRate / 100)
  const additionalJobs = additionalConversions * 30
  const estimatedMonthlyLift = additionalJobs * avgTicket

  const beforeRevenue = avgDailyJobs * 30 * avgTicket
  const afterRevenue = beforeRevenue + estimatedMonthlyLift
  const pctIncrease = beforeRevenue > 0 ? (estimatedMonthlyLift / beforeRevenue) * 100 : 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Revenue Impact Calculator
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Estimate revenue lift from GEO ranking improvements
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inputs</CardTitle>
            </CardHeader>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  Avg Repair Ticket ($)
                </label>
                <input
                  type="number"
                  value={avgTicket}
                  onChange={(e) => setAvgTicket(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  Avg Daily Jobs
                </label>
                <input
                  type="number"
                  value={avgDailyJobs}
                  onChange={(e) => setAvgDailyJobs(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  Current Rank
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={currentRank}
                  onChange={(e) => setCurrentRank(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  Target Rank
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={targetRank}
                  onChange={(e) => setTargetRank(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  Est. Traffic Increase (%)
                </label>
                <input
                  type="number"
                  value={trafficIncreasePct}
                  onChange={(e) => setTrafficIncreasePct(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  Conversion Rate (%)
                </label>
                <input
                  type="number"
                  value={conversionRate}
                  onChange={(e) => setConversionRate(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)]"
                />
              </div>
            </div>
          </Card>
        </div>

        <div>
          <Card className="sticky top-8 border-[var(--success)]/30 bg-[var(--success-muted)]/10">
            <CardHeader>
              <CardTitle className="text-[var(--success)]">Estimated Impact</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[var(--muted)]">Additional Monthly Revenue</p>
                <p className="text-3xl font-bold text-[var(--success)]">
                  {formatCurrency(estimatedMonthlyLift)}
                </p>
              </div>
              <div className="border-t border-[var(--card-border)] pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Before</span>
                  <span>{formatCurrency(beforeRevenue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">After</span>
                  <span>{formatCurrency(afterRevenue)}</span>
                </div>
                <div className="mt-2 flex justify-between font-medium">
                  <span>% Increase</span>
                  <span className="text-[var(--success)]">+{pctIncrease.toFixed(1)}%</span>
                </div>
              </div>
              <div className="border-t border-[var(--card-border)] pt-4 text-sm text-[var(--muted)]">
                <p>CTR lift: {ctrLiftPct.toFixed(0)}%</p>
                <p>Additional clicks: ~{Math.round(additionalClicks)}/mo</p>
                <p>Additional jobs: ~{Math.round(additionalJobs)}/mo</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
