'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ChevronLeft, ChevronRight, CalendarDays, Video, Loader2 } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns'
import { createClient } from '@/lib/supabase/client'

export interface Booking {
  id: string
  agency_id: string
  name: string
  email: string
  start_time: string
  end_time: string
  status: string
  google_meet_link: string | null
  created_at: string
}

const POLL_INTERVAL_MS = 30_000 // Refetch every 30s for automatic updates

function getDaysInMonthView(date: Date): Date[] {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const viewStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const viewEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days: Date[] = []
  let d = viewStart
  while (d <= viewEnd) {
    days.push(d)
    d = addDays(d, 1)
  }
  return days
}

export function MeetingsCalendar() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date())

  const fetchBookings = useCallback(async () => {
    const monthStr = format(currentMonth, 'yyyy-MM')
    try {
      const res = await fetch(`/api/bookings?month=${monthStr}`)
      if (res.ok) {
        const data = await res.json()
        setBookings(data.bookings ?? [])
      }
    } catch (e) {
      console.error('Failed to fetch bookings', e)
    } finally {
      setLoading(false)
    }
  }, [currentMonth])

  useEffect(() => {
    setLoading(true)
    fetchBookings()
  }, [fetchBookings])

  // Poll for automatic updates when businesses schedule meetings
  useEffect(() => {
    const interval = setInterval(fetchBookings, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchBookings])

  // Supabase realtime subscription for instant updates
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          fetchBookings()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchBookings])

  const days = getDaysInMonthView(currentMonth)
  const bookingsByDate = bookings.reduce<Record<string, Booking[]>>((acc, b) => {
    const d = format(parseISO(b.start_time), 'yyyy-MM-dd')
    if (!acc[d]) acc[d] = []
    acc[d].push(b)
    return acc
  }, {})

  const selectedBookings = selectedDate
    ? bookingsByDate[format(selectedDate, 'yyyy-MM-dd')] ?? []
    : []

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-[var(--accent)]" />
            Scheduled Meetings
          </CardTitle>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--accent-muted)] hover:text-[var(--foreground)]"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[120px] text-center text-sm font-medium text-[var(--foreground)]">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--accent-muted)] hover:text-[var(--foreground)]"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      <div className="px-6 pb-4">
        {loading && bookings.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" />
          </div>
        ) : (
          <>
            {/* Mini calendar grid */}
            <div className="mb-4">
              <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-[var(--muted)]">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
                {days.map((day) => {
                  const key = format(day, 'yyyy-MM-dd')
                  const dayBookings = bookingsByDate[key] ?? []
                  const hasMeeting = dayBookings.length > 0
                  const isSelected = selectedDate && isSameDay(day, selectedDate)
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDate(day)}
                      className={`
                        relative flex h-8 w-full items-center justify-center rounded text-sm transition-colors
                        ${!isCurrentMonth ? 'text-[var(--muted)]/50' : 'text-[var(--foreground)]'}
                        ${isSelected ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--accent-muted)]'}
                      `}
                    >
                      {format(day, 'd')}
                      {hasMeeting && (
                        <span
                          className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                            isSelected ? 'bg-white' : 'bg-[var(--accent)]'
                          }`}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Meetings list for selected date */}
            <div className="min-h-[80px] rounded-lg border border-[var(--card-border)] bg-[var(--accent-muted)]/30 p-3">
              <p className="mb-2 text-xs font-medium text-[var(--muted)]">
                {selectedDate
                  ? format(selectedDate, 'EEEE, MMM d')
                  : 'Select a date to see meetings'}
              </p>
              {selectedDate && selectedBookings.length === 0 && (
                <p className="text-sm text-[var(--muted)]">No meetings scheduled</p>
              )}
              {selectedBookings.length > 0 && (
                <ul className="space-y-2">
                  {selectedBookings.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-start gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-2 text-sm"
                    >
                      <Video className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[var(--foreground)]">{b.name}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {format(parseISO(b.start_time), 'h:mm a')} –{' '}
                          {format(parseISO(b.end_time), 'h:mm a')}
                        </p>
                        {b.google_meet_link && (
                          <a
                            href={b.google_meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-xs text-[var(--accent)] hover:underline"
                          >
                            Join Google Meet →
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
