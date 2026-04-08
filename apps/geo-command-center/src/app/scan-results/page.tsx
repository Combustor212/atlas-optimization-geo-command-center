'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { MapPin, Brain, BarChart3, Calendar, Sparkles, ArrowRight, CheckCircle, Clock } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanData = {
  meo: number
  geo: number
  overall: number
  insight: string
  businessName: string
  address: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BOOKING_URL =
  process.env.NEXT_PUBLIC_BOOKING_URL || 'https://atlasgrowths.com/get-support?book=1'

// ─── Animated counter ─────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1600, delay = 0) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let raf: number
    let start: number | null = null
    const timeout = setTimeout(() => {
      const tick = (ts: number) => {
        if (!start) start = ts
        const pct = Math.min((ts - start) / duration, 1)
        // ease-out-cubic
        const ease = 1 - Math.pow(1 - pct, 3)
        setValue(Math.round(target * ease))
        if (pct < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, delay)
    return () => {
      clearTimeout(timeout)
      cancelAnimationFrame(raf)
    }
  }, [target, duration, delay])
  return value
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({
  score,
  label,
  subtitle,
  icon: Icon,
  delay = 0,
}: {
  score: number
  label: string
  subtitle: string
  icon: React.ElementType
  delay?: number
}) {
  const displayed = useCountUp(score, 1400, delay)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay + 100)
    return () => clearTimeout(t)
  }, [delay])

  const r = 52
  const circ = 2 * Math.PI * r
  const fill = animated ? (score / 100) * circ : 0

  const color =
    score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  const trackColor =
    score >= 75 ? '#d1fae5' : score >= 50 ? '#fef3c7' : '#fee2e2'
  const grade =
    score >= 75 ? 'Strong' : score >= 50 ? 'Moderate' : 'Needs Work'

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-36 h-36">
        <svg width="144" height="144" className="-rotate-90">
          {/* Track */}
          <circle cx="72" cy="72" r={r} fill="none" stroke={trackColor} strokeWidth="10" />
          {/* Fill */}
          <circle
            cx="72"
            cy="72"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ - fill}
            style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        {/* Center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="w-4 h-4 mb-0.5" style={{ color }} />
          <span className="text-3xl font-black" style={{ color }}>{displayed}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
            {grade}
          </span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-base font-bold text-slate-900">{label}</div>
        <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>
      </div>
    </div>
  )
}

// ─── Insight item ─────────────────────────────────────────────────────────────

function InsightItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
      <span className="text-sm text-slate-600 leading-relaxed">{text}</span>
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-100 ${className ?? ''}`}
    />
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScanResultsPage() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<ScanData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const parsed = useRef(false)

  useEffect(() => {
    if (parsed.current) return
    parsed.current = true

    const raw = searchParams.get('data')
    if (!raw) {
      setError('No scan data found. Please run a scan first.')
      setReady(true)
      return
    }
    try {
      const obj = JSON.parse(decodeURIComponent(raw)) as ScanData
      if (typeof obj.meo !== 'number') throw new Error('Invalid data')
      setData(obj)
    } catch {
      setError('Could not read scan results. Please try again.')
    }
    setReady(true)
  }, [searchParams])

  const handleBook = () => {
    window.location.href = BOOKING_URL
  }

  // Split insight into sentences for bullet points
  const insightBullets: string[] = data?.insight
    ? data.insight
        .replace(/([.!?])\s+/g, '$1|')
        .split('|')
        .map((s) => s.trim())
        .filter((s) => s.length > 10)
        .slice(0, 3)
    : []

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">Atlas Growths</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">Business Visibility Report</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-12">

        {/* ── Error state ──────────────────────────────────────────────── */}
        {error && (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-slate-600 mb-6">{error}</p>
            <a href="https://atlasgrowths.com" className="text-indigo-600 font-semibold text-sm">
              ← Run a free scan
            </a>
          </div>
        )}

        {/* ── Loading skeleton ─────────────────────────────────────────── */}
        {!ready && (
          <div className="space-y-8">
            <div className="space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="grid grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
            </div>
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────── */}
        {ready && data && (
          <div className="space-y-8">

            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full mb-4 tracking-wide uppercase">
                <CheckCircle className="w-3.5 h-3.5" />
                Scan Complete
              </div>
              <h1 className="text-3xl font-black text-slate-900 leading-tight">
                {data.businessName}
              </h1>
              {data.address && (
                <div className="flex items-center gap-1.5 mt-2 text-slate-400 text-sm">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{data.address}</span>
                </div>
              )}
            </div>

            {/* Score cards */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                <ScoreRing
                  score={data.meo}
                  label="Maps Visibility"
                  subtitle="MEO Score"
                  icon={MapPin}
                  delay={0}
                />
                <div className="pt-8 sm:pt-0 sm:pl-8">
                  <ScoreRing
                    score={data.geo}
                    label="AI Visibility"
                    subtitle="GEO Score"
                    icon={Brain}
                    delay={200}
                  />
                </div>
                <div className="pt-8 sm:pt-0 sm:pl-8">
                  <ScoreRing
                    score={data.overall}
                    label="Overall Score"
                    subtitle="Combined"
                    icon={BarChart3}
                    delay={400}
                  />
                </div>
              </div>
            </div>

            {/* Insight box */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Brain className="w-4 h-4 text-indigo-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">AI Insight</h2>
              </div>
              <div className="space-y-3">
                {insightBullets.length > 0
                  ? insightBullets.map((b, i) => <InsightItem key={i} text={b} />)
                  : <p className="text-sm text-slate-600 leading-relaxed">{data.insight}</p>}
              </div>
            </div>

            {/* What's locked teaser */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                Full Report Includes
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  'Competitor visibility breakdown',
                  'AI entity strength analysis',
                  'Maps ranking position estimate',
                  'Revenue opportunity estimate',
                  'Step-by-step action plan',
                  'Priority quick-wins list',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-sm text-slate-500">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* ── PRIMARY CTA ───────────────────────────────────────────── */}
            <div className="bg-slate-900 rounded-2xl p-10 text-center relative overflow-hidden">
              {/* Subtle gradient blob */}
              <div
                aria-hidden
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse 80% 60% at 50% 0%, #6366f1 0%, transparent 70%)',
                }}
              />
              <div className="relative">
                <div className="inline-flex items-center gap-2 bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-full mb-5 tracking-wide uppercase">
                  <Clock className="w-3.5 h-3.5" />
                  Limited spots this week
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 leading-tight">
                  Book a Strategy Call
                </h2>
                <p className="text-slate-300 text-sm sm:text-base max-w-md mx-auto mb-8 leading-relaxed">
                  Get a personalized 20-minute audit with your full report, competitor gaps, and a
                  clear action plan — free, no obligation.
                </p>
                <button
                  onClick={handleBook}
                  className="group inline-flex items-center gap-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg shadow-indigo-900/40 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <Calendar className="w-5 h-5" />
                  Book Your Free Strategy Call
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="mt-5 text-xs text-slate-500">
                  No credit card · 20 min · Instant calendar access
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
