/**
 * Client-side utility functions for revenue calculations
 * These are pure functions with no server dependencies
 */

/**
 * Generate month placeholders for revenue entry
 * Returns an array of month strings (YYYY-MM-01) from start to current month
 */
export function generateMonthRange(startDate: Date, endDate: Date = new Date()): string[] {
  const months: string[] = []
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1)

  while (current <= end) {
    const year = current.getFullYear()
    const month = String(current.getMonth() + 1).padStart(2, '0')
    months.push(`${year}-${month}-01`)
    current.setMonth(current.getMonth() + 1)
  }

  return months
}

/**
 * Format a month string for display
 */
export function formatMonthDisplay(monthStr: string): string {
  const date = new Date(monthStr)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/**
 * Check if a month is before the service start date
 */
export function isPreStartMonth(month: string, serviceStartDate: string): boolean {
  return new Date(month) < new Date(serviceStartDate)
}
