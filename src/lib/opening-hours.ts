/**
 * Pure helpers for opening hours: grouping identical days for display ("Mon–Fri 8:00 am – 5:30 pm")
 * and working out whether a business is open at a given moment in its own time zone. No clock reads
 * here: callers pass `now`, so nothing in this file is unsafe under Cache Components.
 */

/** Where the Business info `timeZone` field starts, and the fallback if it is somehow empty. */
export const DEFAULT_TIME_ZONE = 'Australia/Sydney'

/** Monday first, as Australians read a week. `value` is what the Studio stores. */
export const DAYS = [
  { value: 'mon', short: 'Mon', long: 'Monday' },
  { value: 'tue', short: 'Tue', long: 'Tuesday' },
  { value: 'wed', short: 'Wed', long: 'Wednesday' },
  { value: 'thu', short: 'Thu', long: 'Thursday' },
  { value: 'fri', short: 'Fri', long: 'Friday' },
  { value: 'sat', short: 'Sat', long: 'Saturday' },
  { value: 'sun', short: 'Sun', long: 'Sunday' },
] as const

export type DayValue = (typeof DAYS)[number]['value']

const DAY_VALUES: readonly string[] = DAYS.map(({ value }) => value)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** One row of the Studio's opening hours list. Times are 24-hour "HH:MM". */
export interface HoursEntry {
  days?: readonly string[] | null
  opens?: string | null
  closes?: string | null
  closed?: boolean | null
}

/** A one-off day (a public holiday): closed, or custom hours. */
export interface SpecialHoursEntry {
  date?: string | null
  closed?: boolean | null
  opens?: string | null
  closes?: string | null
  note?: string | null
}

interface TimeRange {
  opens: string
  closes: string
}

export interface HoursGroup {
  /** "Mon–Fri", "Mon, Wed–Fri" or "Sun". */
  label: string
  days: DayValue[]
  closed: boolean
  /** "8:00 am – 5:30 pm", or several ranges for split shifts; "Closed" when closed. */
  times: string
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isTime(value: string | null | undefined): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value)
}

/** "17:30" -> "5:30 pm", "00:00" -> "12:00 am", "12:00" -> "12:00 pm". */
export function formatTime(time: string): string {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  const suffix = hours < 12 ? 'am' : 'pm'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

function formatRange({ opens, closes }: TimeRange): string {
  return `${formatTime(opens)} – ${formatTime(closes)}`
}

function isDayValue(value: string): value is DayValue {
  return DAY_VALUES.includes(value)
}

function validRange(entry: { opens?: string | null; closes?: string | null }): TimeRange | null {
  return isTime(entry.opens) && isTime(entry.closes) && entry.closes > entry.opens
    ? { opens: entry.opens, closes: entry.closes }
    : null
}

/** Each weekday's opening ranges, sorted; an empty list means closed. A "closed" row wins over open rows. */
function rangesByDay(entries: readonly HoursEntry[]): Map<DayValue, TimeRange[]> {
  const byDay = new Map<DayValue, TimeRange[]>(DAYS.map(({ value }) => [value, []]))
  const closedDays = new Set<DayValue>()

  for (const entry of entries) {
    const days = (entry.days ?? []).filter(isDayValue)
    if (entry.closed) {
      for (const day of days) closedDays.add(day)
      continue
    }
    const range = validRange(entry)
    if (!range) continue
    for (const day of days) byDay.get(day)?.push(range)
  }
  for (const day of closedDays) byDay.set(day, [])
  for (const ranges of byDay.values()) ranges.sort((a, b) => a.opens.localeCompare(b.opens))
  return byDay
}

/** Consecutive days of three or more become a range: [Mon, Tue, Wed, Fri] -> "Mon–Wed, Fri". */
function dayLabel(days: readonly DayValue[]): string {
  const indexes = days.map((day) => DAY_VALUES.indexOf(day))
  const runs: number[][] = []
  for (const index of indexes) {
    const run = runs[runs.length - 1]
    if (run?.at(-1) === index - 1) run.push(index)
    else runs.push([index])
  }
  const short = (index: number) => DAYS[index]?.short ?? ''
  return runs
    .flatMap((run) =>
      run.length >= 3
        ? [`${short(run[0] ?? 0)}–${short(run[run.length - 1] ?? 0)}`]
        : run.map(short),
    )
    .join(', ')
}

/**
 * Groups days with identical hours, in order of each group's first day, and includes closed days.
 * Returns an empty list when no day has hours at all, so a business that hasn't filled this in
 * shows nothing rather than "Closed" seven times.
 */
export function groupOpeningHours(entries: readonly HoursEntry[] | null | undefined): HoursGroup[] {
  const byDay = rangesByDay(entries ?? [])
  if (![...byDay.values()].some((ranges) => ranges.length > 0)) return []

  const groups = new Map<string, DayValue[]>()
  for (const { value } of DAYS) {
    const signature = (byDay.get(value) ?? []).map(formatRange).join(', ')
    groups.set(signature, [...(groups.get(signature) ?? []), value])
  }
  return [...groups].map(([signature, days]) => ({
    label: dayLabel(days),
    days,
    closed: signature === '',
    times: signature || 'Closed',
  }))
}

export interface WeeklyRange extends TimeRange {
  days: DayValue[]
}

/**
 * The regular week as machine-readable ranges, one per distinct opening range with the days that
 * share it (for structured data). Closed days appear nowhere.
 */
export function weeklyRanges(entries: readonly HoursEntry[] | null | undefined): WeeklyRange[] {
  const shared = new Map<string, WeeklyRange>()
  for (const [day, ranges] of rangesByDay(entries ?? [])) {
    for (const range of ranges) {
      const key = `${range.opens}-${range.closes}`
      const existing = shared.get(key)
      if (existing) existing.days.push(day)
      else shared.set(key, { ...range, days: [day] })
    }
  }
  return [...shared.values()]
}

export interface SpecialHoursRow {
  date: string
  /** "Fri 25 Dec". */
  label: string
  closed: boolean
  times: string
  /** 24-hour "HH:MM", present when the day has custom hours. */
  opens?: string
  closes?: string
  note?: string
}

/** "2026-12-25" -> "Fri 25 Dec". Built by hand: Intl's en-AU punctuation varies between ICU versions. */
export function formatDate(date: string): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  // getUTCDay() counts from Sunday.
  const short = DAYS[(weekday + 6) % 7]?.short ?? ''
  return `${short} ${day} ${MONTHS[month - 1] ?? ''}`
}

/**
 * Special days from `today` (a "YYYY-MM-DD" date in the business's time zone) onwards, soonest
 * first. Past days drop out, so the list doesn't need tidying by hand.
 */
export function upcomingSpecialHours(
  special: readonly SpecialHoursEntry[] | null | undefined,
  today: string,
  limit = 3,
): SpecialHoursRow[] {
  const rows: SpecialHoursRow[] = []
  for (const entry of special ?? []) {
    const { date } = entry
    if (!date || date < today) continue
    const range = entry.closed ? null : validRange(entry)
    // Neither closed nor a valid custom range: half-filled, so it says nothing.
    if (!entry.closed && !range) continue
    rows.push({
      date,
      label: formatDate(date),
      closed: !range,
      times: range ? formatRange(range) : 'Closed',
      ...(range && { opens: range.opens, closes: range.closes }),
      ...(entry.note && { note: entry.note }),
    })
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit)
}

export interface LocalMoment {
  day: DayValue
  /** "YYYY-MM-DD" */
  date: string
  /** "HH:MM" */
  time: string
}

/** The weekday, date and time on a wall clock in `timeZone` (an IANA name) at the instant `now`. */
export function localMoment(now: Date, timeZone: string): LocalMoment {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  ) as Record<string, string>
  const day = DAYS.find(({ short }) => short === parts.weekday)?.value ?? 'mon'
  return {
    day,
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  }
}

export interface OpenStatus {
  open: boolean
  /** When open: the time the current opening range ends, e.g. "5:30 pm". */
  until?: string
}

/**
 * Whether the business is open at `now`. A special day replaces that date's regular hours (closed,
 * or its custom hours). Returns null when no hours are set, because "closed" would be a guess.
 */
export function openStatusAt(
  entries: readonly HoursEntry[] | null | undefined,
  special: readonly SpecialHoursEntry[] | null | undefined,
  timeZone: string,
  now: Date,
): OpenStatus | null {
  const regular = rangesByDay(entries ?? [])
  if (![...regular.values()].some((ranges) => ranges.length > 0)) return null

  const moment = localMoment(now, timeZone)
  const todays = (special ?? []).filter((entry) => entry.date === moment.date)
  const ranges =
    todays.length > 0
      ? todays.flatMap((entry) => {
          const range = entry.closed ? null : validRange(entry)
          return range ? [range] : []
        })
      : (regular.get(moment.day) ?? [])

  const current = ranges.find(({ opens, closes }) => moment.time >= opens && moment.time < closes)
  return current ? { open: true, until: formatTime(current.closes) } : { open: false }
}
