import { stegaClean } from 'next-sanity'

import {
  addDays,
  dateKey,
  daysBetween,
  fromLocal,
  isValidTimeZone,
  parseDateKey,
  toLocal,
  weekdayOf,
  type LocalDateTime,
} from './time-zone'

/** Where the Business info `timeZone` field starts, and the fallback if an event has none. */
export const DEFAULT_EVENT_TIME_ZONE = 'Australia/Sydney'

export const REPEATS = ['none', 'weekly', 'fortnightly', 'monthly'] as const
export type Repeat = (typeof REPEATS)[number]

/** What the Studio shows for each repeat, and the sentence the event page uses. */
export const REPEAT_LABELS: Record<Exclude<Repeat, 'none'>, string> = {
  weekly: 'Every week',
  fortnightly: 'Every fortnight',
  monthly: 'Every month',
}

/** "Every week" for a repeating event; null for one that does not repeat. */
export const repeatLabel = (repeat: Repeat): string | null =>
  repeat === 'none' ? null : REPEAT_LABELS[repeat]

/** The timing fields of an `event`, as a query returns them (strings, possibly stega-encoded). */
export interface EventTimingInput {
  start?: string | null
  end?: string | null
  allDay?: boolean | null
  timeZone?: string | null
  recurrence?: {
    repeat?: string | null
    until?: string | null
    skip?: readonly (string | null)[] | null
  } | null
}

/** An event's timing with everything checked and converted: instants as milliseconds. */
export interface EventTiming {
  /** The first occurrence. For all-day events, midnight of its first day in `timeZone`. */
  start: number
  /** The first occurrence's end, never before `start`. All-day: midnight after its last day. */
  end: number
  allDay: boolean
  timeZone: string
  repeat: Repeat
  /** Last day (`YYYY-MM-DD`, in `timeZone`) a repeat may start on. */
  until: string | null
  /** Days (`YYYY-MM-DD`, in `timeZone`) whose occurrence is cancelled. */
  skip: ReadonlySet<string>
}

/** One date an event happens. */
export interface Occurrence {
  start: number
  end: number
  /** The local day it starts on, `YYYY-MM-DD`: what a skipped date matches. */
  date: string
}

/**
 * Reads an event's timing fields. Null when there is no usable start. Strings are cleaned of stega
 * (draft-mode encoding). A missing or unknown time zone falls back to `fallbackTimeZone`, then to
 * Sydney; an end before the start is treated as no end.
 */
export function resolveTiming(
  input: EventTimingInput,
  fallbackTimeZone?: string | null,
): EventTiming | null {
  const startText = stegaClean(input.start)
  const startMs = startText ? Date.parse(startText) : Number.NaN
  if (!Number.isFinite(startMs)) return null

  const candidates = [stegaClean(input.timeZone), stegaClean(fallbackTimeZone)]
  const timeZone =
    candidates.find((zone): zone is string => !!zone && isValidTimeZone(zone)) ??
    DEFAULT_EVENT_TIME_ZONE

  const endText = stegaClean(input.end)
  const endParsed = endText ? Date.parse(endText) : Number.NaN
  const allDay = input.allDay === true

  let start = startMs
  let end = Number.isFinite(endParsed) && endParsed >= startMs ? endParsed : startMs

  if (allDay) {
    // Whole days: from midnight on the first day to midnight after the last.
    const first = toLocal(startMs, timeZone)
    const last = toLocal(end, timeZone)
    start = fromLocal({ ...first, hour: 0, minute: 0, second: 0 }, timeZone)
    end = fromLocal({ ...addDays(last, 1), hour: 0, minute: 0, second: 0 }, timeZone)
  }

  const repeatText = stegaClean(input.recurrence?.repeat)
  const repeat = REPEATS.find((value) => value === repeatText) ?? 'none'
  const until = stegaClean(input.recurrence?.until)
  const skip = (input.recurrence?.skip ?? [])
    .map((day) => stegaClean(day))
    .filter((day): day is string => !!day && parseDateKey(day) !== null)

  return {
    start,
    end,
    allDay,
    timeZone,
    repeat,
    until: until && parseDateKey(until) ? until : null,
    skip: new Set(skip),
  }
}

/** Most iterations of the occurrence loop: a safety net, since a series may have no end date. */
const MAX_STEPS = 6000

/** `nth` is 1-4, or -1 for "the last one this month". */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number) {
  if (nth === -1) {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const lastWeekday = weekdayOf({ year, month, day: lastDay })
    return lastDay - ((lastWeekday - weekday + 7) % 7)
  }
  const firstWeekday = weekdayOf({ year, month, day: 1 })
  return 1 + ((weekday - firstWeekday + 7) % 7) + 7 * (nth - 1)
}

/**
 * The "second Tuesday" a monthly event repeats on, from its first date: 1-4, or -1 when it falls
 * in the fifth week (then it means "the last Tuesday", so every month has one).
 */
export function monthlyPosition(day: number): number {
  const nth = Math.ceil(day / 7)
  return nth === 5 ? -1 : nth
}

/** The local date of the `index`th repeat (0 is the first occurrence). */
function dateOfRepeat(timing: EventTiming, base: LocalDateTime, index: number) {
  switch (timing.repeat) {
    case 'weekly':
      return addDays(base, 7 * index)
    case 'fortnightly':
      return addDays(base, 14 * index)
    case 'monthly': {
      const months = base.year * 12 + (base.month - 1) + index
      const year = Math.floor(months / 12)
      const month = (months % 12) + 1
      const day = nthWeekdayOfMonth(year, month, weekdayOf(base), monthlyPosition(base.day))
      return { ...base, year, month, day }
    }
    default:
      return base
  }
}

/** A step to start the loop from, so a weekly class begun years ago doesn't cost years of steps. */
function firstIndexToTry(timing: EventTiming, base: LocalDateTime, from: number) {
  if (from <= timing.start) return 0
  const target = toLocal(from, timing.timeZone)
  switch (timing.repeat) {
    case 'weekly':
      return Math.max(0, Math.floor(daysBetween(base, target) / 7) - 1)
    case 'fortnightly':
      return Math.max(0, Math.floor(daysBetween(base, target) / 14) - 1)
    case 'monthly':
      return Math.max(0, (target.year - base.year) * 12 + (target.month - base.month) - 1)
    default:
      return 0
  }
}

/**
 * The occurrences of an event that are still to happen at `from`, soonest first: those that have
 * not ended (an event under way still counts), and start no later than `to` when given. Repeats
 * keep the same wall-clock time across daylight saving changes, skip the listed days, and stop
 * after `until`. An event that never repeats has one occurrence. Expanded here, on demand: nothing
 * is stored per occurrence.
 */
export function expandOccurrences(
  timing: EventTiming,
  { from, to, limit = Infinity }: { from: number; to?: number; limit?: number },
): Occurrence[] {
  const base = toLocal(timing.start, timing.timeZone)
  const clock = timing.allDay
    ? { hour: 0, minute: 0, second: 0 }
    : { hour: base.hour, minute: base.minute, second: base.second }
  // Timed events keep their length in elapsed time; whole days keep their length in days.
  const lastDay = timing.allDay ? toLocal(timing.end - 1, timing.timeZone) : null
  const spanDays = lastDay ? daysBetween(base, lastDay) : 0

  const found: Occurrence[] = []
  const repeats = timing.repeat !== 'none'
  const firstIndex = repeats ? firstIndexToTry(timing, base, from) : 0
  const lastIndex = repeats ? firstIndex + MAX_STEPS : 0

  for (let index = firstIndex; index <= lastIndex && found.length < limit; index += 1) {
    const date = dateOfRepeat(timing, base, index)
    const key = dateKey(date)
    if (repeats && timing.until && key > timing.until) break

    const start = fromLocal({ ...date, ...clock }, timing.timeZone)
    if (to !== undefined && start > to) break
    if (timing.skip.has(key)) continue

    const end = lastDay
      ? fromLocal({ ...addDays(date, spanDays + 1), ...clock }, timing.timeZone)
      : start + (timing.end - timing.start)
    if (end > from || start >= from) found.push({ start, end, date: key })
  }
  return found
}

/** The next occurrence at or after `from` (or under way), or null once the event is over. */
export function nextOccurrence(timing: EventTiming, from: number): Occurrence | null {
  return expandOccurrences(timing, { from, limit: 1 })[0] ?? null
}

/** Whether anything is still to happen at `from`: the test behind "past events are hidden". */
export function hasUpcoming(timing: EventTiming, from: number): boolean {
  return nextOccurrence(timing, from) !== null
}

/** The last occurrence of a series with an end date; the single one otherwise. Null if unbounded. */
export function lastOccurrence(timing: EventTiming): Occurrence | null {
  if (timing.repeat === 'none') return expandOccurrences(timing, { from: -Infinity })[0] ?? null
  if (!timing.until) return null
  const all = expandOccurrences(timing, { from: -Infinity })
  return all[all.length - 1] ?? null
}
