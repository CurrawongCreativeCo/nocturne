import { toLocal, localDateKey, type LocalDateTime } from './time-zone'

/**
 * Event dates and times as Australians write them ("Sat 14 Mar, 10:00 am"). Built from fixed word
 * lists rather than `Intl`, so the text is the same on every server, build and browser (newer
 * `Intl` data writes "Sept" and a narrow no-break space before "am"). Always in the event's time
 * zone: a visitor in Perth sees Sydney's 10:00 am, with the zone named where it matters.
 */
const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const short = (word: string) => word.slice(0, 3)

/** "10:00 am", "12:30 pm", "12:00 am". */
export function formatClock({ hour, minute }: Pick<LocalDateTime, 'hour' | 'minute'>): string {
  const twelve = hour % 12 === 0 ? 12 : hour % 12
  return `${twelve}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'am' : 'pm'}`
}

function weekdayName(local: LocalDateTime) {
  return WEEKDAYS[new Date(Date.UTC(local.year, local.month - 1, local.day)).getUTCDay()] ?? ''
}

/** "Sat 14 Mar", or "Saturday 14 March 2026" when `long`. */
export function formatDay(local: LocalDateTime, long = false): string {
  const weekday = weekdayName(local)
  const month = MONTHS[local.month - 1] ?? ''
  return long
    ? `${weekday} ${local.day} ${month} ${local.year}`
    : `${short(weekday)} ${local.day} ${short(month)}`
}

/** The day an instant falls on in `timeZone`: "Sat 14 Mar", or "Saturday 14 March 2026" when `long`. */
export function formatDayOf(ms: number, timeZone: string, long = false): string {
  return formatDay(toLocal(ms, timeZone), long)
}

/** The parts a date badge shows: "SAT" / "14" / "MAR". */
export function dayBadge(ms: number, timeZone: string) {
  const local = toLocal(ms, timeZone)
  const weekday = weekdayName(local)
  const month = MONTHS[local.month - 1] ?? ''
  return { weekday: short(weekday), day: String(local.day), month: short(month), year: local.year }
}

export interface FormattableOccurrence {
  start: number
  /** For all-day events, midnight after the last day (see `EventTiming`). */
  end: number
  allDay: boolean
  timeZone: string
}

/** The last day an all-day occurrence covers. */
const lastLocalDay = ({ end, timeZone }: FormattableOccurrence) => toLocal(end - 1, timeZone)

/**
 * When an occurrence happens, in words:
 *  - "Sat 14 Mar, 10:00 am – 12:00 pm", "Sat 14 Mar, 10:00 am" (no end),
 *  - "Fri 13 Mar, 6:00 pm – Sat 14 Mar, 11:00 am" (over midnight),
 *  - "Sat 14 Mar" and "Sat 14 Mar – Mon 16 Mar" (all day).
 * `long` writes the weekday, month and year out in full.
 */
export function formatWhen(occurrence: FormattableOccurrence, long = false): string {
  const { start, end, allDay, timeZone } = occurrence
  const first = toLocal(start, timeZone)

  if (allDay) {
    const last = lastLocalDay(occurrence)
    return localDateKey(start, timeZone) === localDateKey(end - 1, timeZone)
      ? formatDay(first, long)
      : `${formatDay(first, long)} – ${formatDay(last, long)}`
  }

  const startText = `${formatDay(first, long)}, ${formatClock(first)}`
  if (end <= start) return startText

  const last = toLocal(end, timeZone)
  const sameDay = localDateKey(start, timeZone) === localDateKey(end, timeZone)
  return sameDay
    ? `${startText} – ${formatClock(last)}`
    : `${startText} – ${formatDay(last, long)}, ${formatClock(last)}`
}

/** Just the time range, "10:00 am – 12:00 pm"; "All day" for whole days. */
export function formatTimeRange(occurrence: FormattableOccurrence): string {
  const { start, end, allDay, timeZone } = occurrence
  if (allDay) return 'All day'
  const first = toLocal(start, timeZone)
  if (end <= start) return formatClock(first)
  return `${formatClock(first)} – ${formatClock(toLocal(end, timeZone))}`
}

/** The Studio list subtitle: "Sat 14 Mar, 10:00 am · Workshop" (the category is left out when unset). */
export function formatEventSubtitle(
  occurrence: Pick<FormattableOccurrence, 'start' | 'allDay' | 'timeZone'>,
  category?: string | null,
): string {
  const local = toLocal(occurrence.start, occurrence.timeZone)
  const when = occurrence.allDay ? formatDay(local) : `${formatDay(local)}, ${formatClock(local)}`
  return category ? `${when} · ${category}` : when
}

/** The `datetime` attribute for a `<time>`: a date for whole days, else the exact instant. */
export function timeAttribute(ms: number, allDay: boolean, timeZone: string): string {
  return allDay ? localDateKey(ms, timeZone) : new Date(ms).toISOString()
}
