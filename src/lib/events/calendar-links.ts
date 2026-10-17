import { localDateKey } from './time-zone'

/** What the "add to calendar" links need to know about one occurrence. */
export interface CalendarEntry {
  title: string
  /** Plain text: the summary and the page address. */
  details?: string | null
  location?: string | null
  start: number
  /** For all-day entries, midnight after the last day. */
  end: number
  allDay: boolean
  timeZone: string
}

const pad = (value: number) => String(value).padStart(2, '0')

/** `20261105T000000Z`. */
export function utcStamp(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

/** `20261105`: the day an instant falls on in `timeZone`. */
export function dayStamp(ms: number, timeZone: string): string {
  return localDateKey(ms, timeZone).replaceAll('-', '')
}

/** An entry with no end (or none after its start) lasts an hour, which is what calendars assume. */
function endOrHour({ start, end, allDay }: CalendarEntry) {
  return allDay || end > start ? end : start + 3_600_000
}

/**
 * "Add to Google Calendar": the event as a pre-filled "new event" page. Times are UTC, so they are
 * right wherever the visitor is; `ctz` shows the event in its own zone.
 */
export function googleCalendarUrl(entry: CalendarEntry): string {
  const dates = entry.allDay
    ? `${dayStamp(entry.start, entry.timeZone)}/${dayStamp(entry.end, entry.timeZone)}`
    : `${utcStamp(entry.start)}/${utcStamp(endOrHour(entry))}`
  const params = new URLSearchParams({ action: 'TEMPLATE', text: entry.title, dates })
  if (!entry.allDay) params.set('ctz', entry.timeZone)
  if (entry.details) params.set('details', entry.details)
  if (entry.location) params.set('location', entry.location)
  return `https://calendar.google.com/calendar/render?${params}`
}

/** "Add to Outlook": Outlook on the web's "new event" page, pre-filled. */
export function outlookCalendarUrl(entry: CalendarEntry): string {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: entry.title,
  })
  if (entry.allDay) {
    // Outlook wants the first and last day as dates.
    params.set('startdt', localDateKey(entry.start, entry.timeZone))
    params.set('enddt', localDateKey(entry.end - 1, entry.timeZone))
    params.set('allday', 'true')
  } else {
    params.set('startdt', new Date(entry.start).toISOString())
    params.set('enddt', new Date(endOrHour(entry)).toISOString())
  }
  if (entry.details) params.set('body', entry.details)
  if (entry.location) params.set('location', entry.location)
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`
}
