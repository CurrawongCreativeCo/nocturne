/**
 * Wall-clock arithmetic in an IANA time zone, on top of `Intl` (no date library). Events are stored
 * as instants (UTC), but people think of "10 am every Tuesday": a weekly class must stay at 10 am
 * when daylight saving starts, so recurrence moves the *local* date and converts back each time.
 *
 * Pure and clock-free: every function takes the instant or the date it works on.
 */

/** A calendar date and time as a wall clock shows it, with no zone attached. */
export interface LocalDateTime {
  year: number
  /** 1-12. */
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string) {
  let found = formatters.get(timeZone)
  if (!found) {
    found = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
    formatters.set(timeZone, found)
  }
  return found
}

/** Whether `Intl` knows this zone. A bad name makes every other function here throw. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatter(timeZone)
    return true
  } catch {
    return false
  }
}

/** The wall clock in `timeZone` at the instant `ms`. */
export function toLocal(ms: number, timeZone: string): LocalDateTime {
  const values: Record<string, number> = {}
  for (const part of formatter(timeZone).formatToParts(new Date(ms))) {
    if (part.type !== 'literal') values[part.type] = Number(part.value)
  }
  return {
    year: values.year ?? 1970,
    month: values.month ?? 1,
    day: values.day ?? 1,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
  }
}

const DAY = 86_400_000

const utcOf = (local: LocalDateTime) =>
  Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second)

/** The zone's offset from UTC at the instant `ms`, in milliseconds (Sydney in summer: +11 h). */
export function offsetAt(ms: number, timeZone: string): number {
  const whole = ms - (((ms % 1000) + 1000) % 1000)
  return utcOf(toLocal(whole, timeZone)) - whole
}

/**
 * The instant at which `timeZone`'s wall clock reads `local`. A time that doesn't exist (the hour
 * daylight saving skips) lands an hour later; a time that happens twice (the hour it repeats) is
 * the first one.
 */
export function fromLocal(local: LocalDateTime, timeZone: string): number {
  const asUtc = utcOf(local)
  // The offsets in force a day either side: at most one change falls between them.
  const before = offsetAt(asUtc - DAY, timeZone)
  const after = offsetAt(asUtc + DAY, timeZone)
  const matches = [asUtc - before, asUtc - after]
    .filter((ms) => utcOf(toLocal(ms, timeZone)) === asUtc)
    .sort((a, b) => a - b)
  // None match when the time doesn't exist: the offset from before the change puts it an hour later.
  return matches[0] ?? asUtc - before
}

/** `YYYY-MM-DD` for a local date. */
export function dateKey({ year, month, day }: Pick<LocalDateTime, 'year' | 'month' | 'day'>) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** `YYYY-MM-DD` of the day an instant falls on in `timeZone`. */
export function localDateKey(ms: number, timeZone: string): string {
  return dateKey(toLocal(ms, timeZone))
}

/** Parses `YYYY-MM-DD` (what Sanity's date field stores); null for anything else. */
export function parseDateKey(value: string | null | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const check = new Date(Date.UTC(year, month - 1, day))
  return check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
    ? { year, month, day }
    : null
}

/** A local date moved by whole calendar days (not 24-hour blocks, so daylight saving can't shift it). */
export function addDays<T extends Pick<LocalDateTime, 'year' | 'month' | 'day'>>(
  date: T,
  days: number,
): T {
  const moved = new Date(Date.UTC(date.year, date.month - 1, date.day + days))
  return {
    ...date,
    year: moved.getUTCFullYear(),
    month: moved.getUTCMonth() + 1,
    day: moved.getUTCDate(),
  }
}

/** Days from `a` to `b` (negative when `b` is earlier). */
export function daysBetween(
  a: Pick<LocalDateTime, 'year' | 'month' | 'day'>,
  b: Pick<LocalDateTime, 'year' | 'month' | 'day'>,
): number {
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000,
  )
}

/** 0 (Sunday) to 6 (Saturday) for a local date. */
export function weekdayOf(date: Pick<LocalDateTime, 'year' | 'month' | 'day'>): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()
}

export interface ZoneTransition {
  /** The instant the clocks change. */
  at: number
  /** Offsets before and after, in milliseconds. */
  from: number
  to: number
  /** The zone's abbreviation after the change ("AEDT"), when `Intl` has one. */
  name: string
}

/**
 * Every offset change in `timeZone` between two instants, found by sampling weekly and then
 * bisecting to the second. Used to write a calendar file's time zone definition, so an app that
 * doesn't know the zone still shows 10 am as 10 am. A zone with no daylight saving returns [].
 */
export function transitionsBetween(
  fromMs: number,
  toMs: number,
  timeZone: string,
): ZoneTransition[] {
  const step = 7 * DAY
  const found: ZoneTransition[] = []
  let previous = fromMs
  let previousOffset = offsetAt(previous, timeZone)

  for (let t = fromMs + step; ; t += step) {
    const current = Math.min(t, toMs)
    const currentOffset = offsetAt(current, timeZone)
    if (currentOffset !== previousOffset) {
      let low = previous
      let high = current
      while (high - low > 1000) {
        const middle = low + Math.floor((high - low) / 2000) * 1000
        if (offsetAt(middle, timeZone) === previousOffset) low = middle
        else high = middle
      }
      found.push({
        at: high,
        from: previousOffset,
        to: offsetAt(high, timeZone),
        name: zoneAbbreviation(high, timeZone),
      })
    }
    previous = current
    previousOffset = currentOffset
    if (current >= toMs) break
  }
  return found
}

/** "AEDT" for Sydney in summer. Falls back to "GMT+11" where `Intl` has no abbreviation. */
export function zoneAbbreviation(ms: number, timeZone: string): string {
  const part = new Intl.DateTimeFormat('en-AU', { timeZone, timeZoneName: 'short' })
    .formatToParts(new Date(ms))
    .find(({ type }) => type === 'timeZoneName')
  return part?.value ?? timeZone
}

/** `2026-03-14T10:00:00+11:00`: the wall clock in `timeZone` with its offset, which is how structured data wants a time. */
export function isoWithOffset(ms: number, timeZone: string): string {
  const local = toLocal(ms, timeZone)
  const pad = (value: number) => String(value).padStart(2, '0')
  const minutes = Math.round(offsetAt(ms, timeZone) / 60_000)
  const sign = minutes < 0 ? '-' : '+'
  const hours = Math.floor(Math.abs(minutes) / 60)
  return `${dateKey(local)}T${pad(local.hour)}:${pad(local.minute)}:${pad(local.second)}${sign}${pad(hours)}:${pad(Math.abs(minutes) % 60)}`
}
