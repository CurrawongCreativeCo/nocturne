const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

const relative = new Intl.RelativeTimeFormat('en-AU', { numeric: 'auto' })
const absolute = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/**
 * "just now", "5 minutes ago", "yesterday", "2 days ago", "3 weeks ago", then a date ("5 Sept 2026")
 * from about two months. A time in the future (a skewed clock) reads as "just now".
 */
export function formatRelativeTime(from: string | number | Date, now: number = Date.now()): string {
  const time = new Date(from).getTime()
  if (Number.isNaN(time)) return ''
  const elapsed = now - time
  if (elapsed < MINUTE) return 'just now'
  if (elapsed < HOUR) return relative.format(-Math.floor(elapsed / MINUTE), 'minute')
  if (elapsed < DAY) return relative.format(-Math.floor(elapsed / HOUR), 'hour')
  if (elapsed < WEEK) return relative.format(-Math.floor(elapsed / DAY), 'day')
  if (elapsed < 9 * WEEK) return relative.format(-Math.floor(elapsed / WEEK), 'week')
  return absolute.format(time)
}

/** Whole days between two times, rounded down. */
export function daysBetween(from: string | number | Date, now: number = Date.now()): number {
  return Math.floor((now - new Date(from).getTime()) / DAY)
}

export const STALE_DRAFT_DAYS = 7

/** Whether a draft was last edited more than `STALE_DRAFT_DAYS` days ago. */
export function isStaleDraft(updatedAt: string, now: number = Date.now()): boolean {
  return now - new Date(updatedAt).getTime() > STALE_DRAFT_DAYS * DAY
}
