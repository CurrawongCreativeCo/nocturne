import { expandOccurrences, monthlyPosition, type EventTiming } from './recurrence'
import {
  addDays,
  fromLocal,
  offsetAt,
  parseDateKey,
  toLocal,
  transitionsBetween,
  weekdayOf,
  zoneAbbreviation,
  type LocalDateTime,
} from './time-zone'

/**
 * iCalendar (RFC 5545) files for events: one event for "add to calendar", or every upcoming event
 * for a subscribable feed. Pure and clock-free: the caller passes what to include, and `DTSTAMP` is
 * the document's last change, so the same event always produces the same bytes.
 *
 * Times are written the way calendars want them: a timed event as local time with its `TZID`, with
 * a `VTIMEZONE` that spells out the zone's daylight saving changes, so an app that doesn't know
 * "Australia/Sydney" still shows 10 am as 10 am; an all-day event as dates. A repeat is one
 * `VEVENT` with an `RRULE` (and `EXDATE` for skipped days), so subscribers keep the series whole.
 */

export type IcsStatus = 'scheduled' | 'cancelled' | 'soldOut'

export interface IcsEvent {
  /** A stable id: calendars match an updated event to the one they already have by this. */
  uid: string
  title: string
  timing: EventTiming
  /** Plain text. Line breaks are kept. */
  description?: string | null
  location?: string | null
  /** The event's page. */
  url?: string | null
  status?: IcsStatus
  /** When the event last changed (`DTSTAMP`). */
  modified: number
  category?: string | null
}

export interface IcsCalendar {
  /** Shown as the calendar's name when someone subscribes. */
  name: string
  events: readonly IcsEvent[]
  /** `PRODID` company and product. */
  producer?: string
}

const CRLF = '\r\n'
const DAY = 86_400_000
/** How far past its start an event with no end date is assumed to run, for time zone data only. */
const OPEN_ENDED_YEARS = 10

/** TEXT values: backslash, semicolon, comma and line breaks are escaped (RFC 5545, 3.3.11). */
export function escapeText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

const encoder = new TextEncoder()

/**
 * Folds a line to 75 octets, continuing on lines that start with a space (RFC 5545, 3.1). Counts
 * UTF-8 bytes and never splits a character.
 */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line
  const lines: string[] = []
  let current = ''
  let size = 0
  for (const character of line) {
    const width = encoder.encode(character).length
    // A continuation line begins with a space, which counts toward its 75.
    const limit = lines.length === 0 ? 75 : 74
    if (size + width > limit) {
      lines.push(current)
      current = ''
      size = 0
    }
    current += character
    size += width
  }
  lines.push(current)
  return lines.map((part, index) => (index === 0 ? part : ` ${part}`)).join(CRLF)
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0')

const dateStamp = ({ year, month, day }: Pick<LocalDateTime, 'year' | 'month' | 'day'>) =>
  `${pad(year, 4)}${pad(month)}${pad(day)}`

const localStamp = (local: LocalDateTime) =>
  `${dateStamp(local)}T${pad(local.hour)}${pad(local.minute)}${pad(local.second)}`

/** `20261105T000000Z`. */
const utcStamp = (ms: number) => {
  const d = new Date(ms)
  return `${localStamp({
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
  })}Z`
}

/** `+1100` for an offset in milliseconds. */
function formatOffset(offset: number): string {
  const minutes = Math.round(Math.abs(offset) / 60_000)
  return `${offset < 0 ? '-' : '+'}${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}`
}

const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const

/** The span of time a zone's definition has to cover for these events. */
function zoneSpan({ timing }: IcsEvent): [number, number] {
  const last =
    timing.repeat === 'none'
      ? timing.end
      : timing.until
        ? (() => {
            const parsed = parseDateKey(timing.until)
            return parsed
              ? fromLocal({ ...addDays(parsed, 1), hour: 0, minute: 0, second: 0 }, timing.timeZone)
              : timing.end
          })()
        : timing.start + OPEN_ENDED_YEARS * 366 * DAY
  return [timing.start - 366 * DAY, last + 366 * DAY]
}

/** A `VTIMEZONE` for `timeZone` covering [from, to]: its offset at the start, then every change. */
function timeZoneLines(timeZone: string, from: number, to: number): string[] {
  const changes = transitionsBetween(from, to, timeZone)
  const initialOffset = changes[0]?.from ?? offsetAt(from, timeZone)
  const offsets = [initialOffset, ...changes.map((change) => change.to)]
  const standard = Math.min(...offsets)

  const observance = (
    kind: 'STANDARD' | 'DAYLIGHT',
    start: string,
    offsetFrom: number,
    offsetTo: number,
    name: string,
  ) => [
    `BEGIN:${kind}`,
    `DTSTART:${start}`,
    `TZOFFSETFROM:${formatOffset(offsetFrom)}`,
    `TZOFFSETTO:${formatOffset(offsetTo)}`,
    `TZNAME:${escapeText(name)}`,
    `END:${kind}`,
  ]

  return [
    'BEGIN:VTIMEZONE',
    `TZID:${timeZone}`,
    ...observance(
      initialOffset > standard ? 'DAYLIGHT' : 'STANDARD',
      '19700101T000000',
      initialOffset,
      initialOffset,
      zoneAbbreviation(from, timeZone),
    ),
    ...changes.flatMap((change) =>
      observance(
        change.to > standard ? 'DAYLIGHT' : 'STANDARD',
        // The local time, on the old clock, at which the change happens.
        localStamp(toLocal(change.at + change.from, 'UTC')),
        change.from,
        change.to,
        change.name,
      ),
    ),
    'END:VTIMEZONE',
  ]
}

/** `FREQ=...` for a repeat, from the first occurrence's date; `UNTIL` for its end date. */
function recurrenceRule(timing: EventTiming): string | null {
  const first = toLocal(timing.start, timing.timeZone)
  const parts: string[] = []
  switch (timing.repeat) {
    case 'weekly':
      parts.push('FREQ=WEEKLY', `BYDAY=${WEEKDAY_CODES[weekdayOf(first)]}`)
      break
    case 'fortnightly':
      parts.push('FREQ=WEEKLY', 'INTERVAL=2', `BYDAY=${WEEKDAY_CODES[weekdayOf(first)]}`)
      break
    case 'monthly':
      // "2TU" is the second Tuesday; "-1TU" the last, which is what a fifth Tuesday means here.
      parts.push(
        'FREQ=MONTHLY',
        `BYDAY=${monthlyPosition(first.day)}${WEEKDAY_CODES[weekdayOf(first)]}`,
      )
      break
    default:
      return null
  }
  const until = timing.until ? parseDateKey(timing.until) : null
  if (until) {
    // With a TZID start, UNTIL must be in UTC: the last instant of the end date.
    parts.push(
      `UNTIL=${
        timing.allDay
          ? dateStamp(until)
          : utcStamp(
              fromLocal({ ...addDays(until, 1), hour: 0, minute: 0, second: 0 }, timing.timeZone) -
                1000,
            )
      }`,
    )
  }
  return `RRULE:${parts.join(';')}`
}

/** `EXDATE` lines for skipped days that the series would otherwise have used. */
function exceptionLines(timing: EventTiming): string[] {
  if (timing.repeat === 'none' || timing.skip.size === 0) return []
  const lastSkip = [...timing.skip].sort().at(-1)
  const parsed = lastSkip ? parseDateKey(lastSkip) : null
  if (!parsed) return []
  const horizon = fromLocal(
    { ...addDays(parsed, 1), hour: 0, minute: 0, second: 0 },
    timing.timeZone,
  )
  const occurrences = expandOccurrences(
    { ...timing, skip: new Set() },
    { from: -Infinity, to: horizon },
  ).filter(({ date }) => timing.skip.has(date))

  return occurrences.map(({ start, date }) =>
    timing.allDay
      ? `EXDATE;VALUE=DATE:${date.replaceAll('-', '')}`
      : `EXDATE;TZID=${timing.timeZone}:${localStamp(toLocal(start, timing.timeZone))}`,
  )
}

function eventLines(event: IcsEvent): string[] {
  const { timing } = event
  const lines = ['BEGIN:VEVENT', `UID:${event.uid}`, `DTSTAMP:${utcStamp(event.modified)}`]

  lines.push(`SUMMARY:${escapeText(event.title)}`)

  if (timing.allDay) {
    lines.push(
      `DTSTART;VALUE=DATE:${dateStamp(toLocal(timing.start, timing.timeZone))}`,
      // DTEND is exclusive: `timing.end` is already midnight after the last day.
      `DTEND;VALUE=DATE:${dateStamp(toLocal(timing.end, timing.timeZone))}`,
    )
  } else {
    lines.push(
      `DTSTART;TZID=${timing.timeZone}:${localStamp(toLocal(timing.start, timing.timeZone))}`,
    )
    if (timing.end > timing.start) {
      lines.push(
        `DTEND;TZID=${timing.timeZone}:${localStamp(toLocal(timing.end, timing.timeZone))}`,
      )
    }
  }

  const rule = recurrenceRule(timing)
  if (rule) lines.push(rule)
  lines.push(...exceptionLines(timing))

  lines.push(`STATUS:${event.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`)
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`)

  const description = [event.status === 'soldOut' ? 'Sold out.' : null, event.description]
    .filter((part): part is string => !!part)
    .join('\n\n')
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`)
  if (event.url) lines.push(`URL:${event.url}`)
  if (event.category) lines.push(`CATEGORIES:${escapeText(event.category)}`)

  lines.push('END:VEVENT')
  return lines
}

/** The whole `.ics` document, with CRLF line endings and folded lines. */
export function buildCalendar({
  name,
  events,
  producer = 'Currawong Creative',
}: IcsCalendar): string {
  const spans = new Map<string, [number, number]>()
  for (const event of events) {
    if (event.timing.allDay) continue
    const [from, to] = zoneSpan(event)
    const known = spans.get(event.timing.timeZone)
    spans.set(
      event.timing.timeZone,
      known ? [Math.min(known[0], from), Math.max(known[1], to)] : [from, to],
    )
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${producer}//Events//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    // How often subscribed calendars are asked to refresh: twice a day is plenty for events.
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
    ...[...spans].flatMap(([timeZone, [from, to]]) => timeZoneLines(timeZone, from, to)),
    ...events.flatMap(eventLines),
    'END:VCALENDAR',
  ]
  return lines.map(foldLine).join(CRLF) + CRLF
}
