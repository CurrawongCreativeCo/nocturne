import { formatTime, isTime } from '@/lib/opening-hours'

/**
 * Pure helpers for the launch date line and its countdown (README, "Launch date"). The date and time
 * are a wall clock in the business's time zone (Business info), so they are turned into an instant
 * with that zone's rules for the day, daylight saving included. Nothing here reads the clock:
 * callers pass `now`, so it is safe under Cache Components.
 */

export const DEFAULT_LAUNCH_LABEL = 'Opening'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
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
]

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** [year, month (1 to 12), day] of a "YYYY-MM-DD" string, or null when it is not a real calendar date. */
function parseDate(date: string | null | undefined): [number, number, number] | null {
  const match = DATE_PATTERN.exec(date ?? '')
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const check = new Date(Date.UTC(year, month - 1, day))
  return check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
    ? [year, month, day]
    : null
}

/** How far the wall clock in `timeZone` is ahead of UTC at `instant`, in milliseconds. */
function zoneOffset(instant: number, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(instant)
      .map(({ type, value }) => [type, Number(value)]),
  ) as Record<string, number>
  const wall = Date.UTC(
    parts.year ?? 0,
    (parts.month ?? 1) - 1,
    parts.day ?? 1,
    parts.hour,
    parts.minute,
    parts.second,
  )
  return wall - Math.floor(instant / 1000) * 1000
}

/**
 * The instant (milliseconds since 1970) at which the wall clock in `timeZone` reads `date` and `time`.
 * Two passes find the right offset on a day the clocks change; a time that does not exist (the hour
 * skipped when daylight saving starts) lands an hour later, and one that happens twice (the hour
 * repeated when it ends) takes the second, in standard time. Null when the date or time is not valid.
 */
export function zonedInstant(date: string, time: string, timeZone: string): number | null {
  const parsed = parseDate(date)
  if (!parsed || !isTime(time)) return null
  const [year, month, day] = parsed
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  const wall = Date.UTC(year, month - 1, day, hours, minutes)
  const first = wall - zoneOffset(wall, timeZone)
  return wall - zoneOffset(first, timeZone)
}

/** The date after `date`, as "YYYY-MM-DD". */
function nextDate(date: string): string | null {
  const parsed = parseDate(date)
  if (!parsed) return null
  const next = new Date(Date.UTC(parsed[0], parsed[1] - 1, parsed[2] + 1))
  return next.toISOString().slice(0, 10)
}

export interface LaunchDate {
  /** "YYYY-MM-DD" */
  date?: string | null
  /** "HH:MM", on the wall clock in `timeZone`. Empty means the whole day. */
  time?: string | null
  /** The IANA zone: the business's. */
  timeZone: string
}

/** When the launch starts: the time given, or the start of the day. Null without a valid date. */
export function launchStart({ date, time, timeZone }: LaunchDate): number | null {
  if (!date) return null
  return zonedInstant(date, isTime(time) ? time : '00:00', timeZone)
}

/**
 * When the line stops showing: the time given, or the end of the day (the line stays all day, so it
 * is still right on the day itself). Null without a valid date.
 */
export function launchEnd({ date, time, timeZone }: LaunchDate): number | null {
  if (!date) return null
  if (isTime(time)) return zonedInstant(date, time, timeZone)
  const next = nextDate(date)
  return next ? zonedInstant(next, '00:00', timeZone) : null
}

/** Whether the line should no longer show at `now` (milliseconds). A date that can't be read is "past": nothing is better than a wrong date. */
export function isLaunchPast(launch: LaunchDate, now: number): boolean {
  const end = launchEnd(launch)
  return end === null || now >= end
}

/** "Opening Monday 3 November", or "Opening Monday 3 November, 9:30 am" with a time. Null without a valid date. */
export function formatLaunchLine(
  { date, time }: Pick<LaunchDate, 'date' | 'time'>,
  label?: string | null,
): string | null {
  const parsed = parseDate(date)
  if (!parsed) return null
  const [year, month, day] = parsed
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? ''
  const prefix = label?.trim() || DEFAULT_LAUNCH_LABEL
  const clock = isTime(time) ? `, ${formatTime(time)}` : ''
  return `${prefix} ${weekday} ${day} ${MONTHS[month - 1] ?? ''}${clock}`
}

/** The last hour counts in seconds; before that, minutes are all anyone needs. */
export function countdownInterval(remaining: number): number {
  return remaining <= HOUR ? 1000 : MINUTE
}

/**
 * "12 days 3 hours 5 minutes", "3 hours 5 minutes" or "42 minutes 10 seconds", or null once the time
 * has come. Seconds only show in the last hour, matching `countdownInterval`, so the text never
 * changes more often than it is redrawn.
 */
export function formatCountdown(remaining: number): string | null {
  if (remaining <= 0) return null
  const plural = (count: number, unit: string) =>
    `${String(count)} ${unit}${count === 1 ? '' : 's'}`
  if (remaining <= HOUR) {
    const minutes = Math.floor(remaining / MINUTE)
    const seconds = Math.floor((remaining % MINUTE) / 1000)
    return [minutes > 0 && plural(minutes, 'minute'), plural(seconds, 'second')]
      .filter(Boolean)
      .join(' ')
  }
  const days = Math.floor(remaining / DAY)
  const hours = Math.floor((remaining % DAY) / HOUR)
  const minutes = Math.floor((remaining % HOUR) / MINUTE)
  return [days > 0 && plural(days, 'day'), plural(hours, 'hour'), plural(minutes, 'minute')]
    .filter(Boolean)
    .join(' ')
}
