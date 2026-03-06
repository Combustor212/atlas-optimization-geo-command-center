/**
 * Timezone and due-logic helpers for the cron scheduler.
 * Deterministic and idempotent.
 */

export interface LocalParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  dayOfWeek: number // 0=Sunday, 6=Saturday
  dayOfMonth: number
}

/**
 * Get local date/time parts in the given timezone.
 */
export function getLocalParts(now: Date, timezone: string): LocalParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'long',
  })
  const parts = formatter.formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'
  const weekdayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  }
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
    dayOfWeek: weekdayMap[get('weekday')] ?? 0,
    dayOfMonth: parseInt(get('day'), 10),
  }
}

/**
 * Format local parts as YYYY-MM-DDTHH:mm for idempotency keys.
 */
export function formatIdempotencyTime(parts: LocalParts): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`
}

/**
 * Check if a report schedule is due now (same minute, correct day).
 */
export function isReportScheduleDue(
  sched: {
    time_of_day: string
    timezone: string
    frequency: string
    day_of_week: number | null
    day_of_month: number | null
  },
  now: Date
): boolean {
  try {
    const [h, m] = sched.time_of_day.split(':').map(Number)
    const tz = sched.timezone || 'America/New_York'
    const { hour, minute, dayOfWeek, dayOfMonth } = getLocalParts(now, tz)

    if (hour !== h || minute !== m) return false

    if (sched.frequency === 'weekly') {
      return sched.day_of_week === dayOfWeek
    }
    if (sched.frequency === 'monthly') {
      return sched.day_of_month === dayOfMonth
    }
    return false
  } catch {
    return false
  }
}

/**
 * Get run_at as start of current minute (UTC) for consistency.
 * When we're due at 9:00 AM Eastern, "now" rounded to minute is correct.
 */
export function getRunAtBucket(now: Date): string {
  const bucket = new Date(now)
  bucket.setUTCSeconds(0, 0)
  return bucket.toISOString()
}
