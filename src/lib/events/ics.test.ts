import { describe, expect, it } from 'vitest'

import { buildCalendar, escapeText, foldLine, type IcsEvent } from './ics'
import { resolveTiming, type EventTimingInput } from './recurrence'

const SYDNEY = 'Australia/Sydney'
const MODIFIED = Date.parse('2026-03-01T00:00:00Z')

function event(timing: EventTimingInput, extra: Partial<IcsEvent> = {}): IcsEvent {
  const resolved = resolveTiming(timing)
  if (!resolved) throw new Error('timing should resolve')
  return {
    uid: 'pottery@example.com.au',
    title: 'Pottery',
    timing: resolved,
    modified: MODIFIED,
    ...extra,
  }
}

/** Saturday 14 March 2026, 10 am to noon in Sydney (AEDT). */
const saturday: EventTimingInput = {
  start: '2026-03-13T23:00:00Z',
  end: '2026-03-14T01:00:00Z',
  timeZone: SYDNEY,
}

const linesOf = (ics: string) => ics.split('\r\n')

describe('escapeText', () => {
  it('escapes backslashes, semicolons, commas and line breaks', () => {
    expect(escapeText('Glaze, fire; cool \\ repeat')).toBe('Glaze\\, fire\\; cool \\\\ repeat')
    expect(escapeText('one\ntwo\r\nthree\rfour')).toBe('one\\ntwo\\nthree\\nfour')
  })

  it('escapes the backslash first, so it never doubles up the others', () => {
    expect(escapeText('a,b')).toBe('a\\,b')
    expect(escapeText('\\,')).toBe('\\\\\\,')
  })

  it('leaves plain text, colons and quotes alone', () => {
    expect(escapeText('Doors 6:30 pm, "Jazz"')).toBe('Doors 6:30 pm\\, "Jazz"')
  })
})

describe('foldLine', () => {
  it('leaves a short line alone', () => {
    expect(foldLine('SUMMARY:Pottery')).toBe('SUMMARY:Pottery')
  })

  it('folds at 75 octets, continuing with a space', () => {
    const folded = foldLine(`DESCRIPTION:${'a'.repeat(200)}`)
    const parts = folded.split('\r\n')
    expect(parts[0]).toHaveLength(75)
    for (const part of parts.slice(1)) {
      expect(part.startsWith(' ')).toBe(true)
      expect(part.length).toBeLessThanOrEqual(75)
    }
    expect(parts.map((part, i) => (i === 0 ? part : part.slice(1))).join('')).toBe(
      `DESCRIPTION:${'a'.repeat(200)}`,
    )
  })

  it('counts bytes, not characters, and never splits a character', () => {
    const text = `SUMMARY:${'é'.repeat(60)}😀${'日本'.repeat(20)}`
    const folded = foldLine(text)
    const parts = folded.split('\r\n')
    for (const part of parts) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75)
    expect(parts.map((part, i) => (i === 0 ? part : part.slice(1))).join('')).toBe(text)
  })
})

describe('buildCalendar', () => {
  const ics = buildCalendar({ name: 'Currawong events', events: [event(saturday)] })
  const lines = linesOf(ics)

  it('is a VCALENDAR with CRLF line endings and a trailing break', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR')
    expect(lines.at(-2)).toBe('END:VCALENDAR')
    expect(lines.at(-1)).toBe('')
    expect(ics.replaceAll('\r\n', '')).not.toMatch(/[\r\n]/)
    expect(lines).toContain('VERSION:2.0')
    expect(lines).toContain('PRODID:-//Currawong Creative//Events//EN')
    expect(lines).toContain('X-WR-CALNAME:Currawong events')
  })

  it('keeps every line to 75 octets', () => {
    const long = buildCalendar({
      name: 'Events',
      events: [
        event(saturday, {
          description: 'A long description, with commas; and more. '.repeat(10),
          location: 'The Studio, 12 Rose Street, Newtown NSW 2042',
        }),
      ],
    })
    for (const line of linesOf(long)) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
  })

  it('writes a timed event as local time with its TZID', () => {
    expect(lines).toContain('BEGIN:VEVENT')
    expect(lines).toContain('UID:pottery@example.com.au')
    expect(lines).toContain('DTSTAMP:20260301T000000Z')
    expect(lines).toContain('DTSTART;TZID=Australia/Sydney:20260314T100000')
    expect(lines).toContain('DTEND;TZID=Australia/Sydney:20260314T120000')
    expect(lines).toContain('STATUS:CONFIRMED')
    expect(lines).toContain('SUMMARY:Pottery')
  })

  it('defines the zone it uses, with Sydney’s daylight saving changes', () => {
    expect(lines).toContain('BEGIN:VTIMEZONE')
    expect(lines).toContain('TZID:Australia/Sydney')
    // Clocks go back at 3:00 am AEDT on 5 April 2026 and forward at 2:00 am AEST on 4 October.
    const block = lines.slice(lines.indexOf('BEGIN:VTIMEZONE'), lines.indexOf('END:VTIMEZONE'))
    const text = block.join('\n')
    expect(text).toContain(
      'BEGIN:STANDARD\nDTSTART:20260405T030000\nTZOFFSETFROM:+1100\nTZOFFSETTO:+1000\nTZNAME:AEST\nEND:STANDARD',
    )
    expect(text).toContain(
      'BEGIN:DAYLIGHT\nDTSTART:20261004T020000\nTZOFFSETFROM:+1000\nTZOFFSETTO:+1100\nTZNAME:AEDT\nEND:DAYLIGHT',
    )
  })

  it('puts the zone definition before the events that use it', () => {
    expect(lines.indexOf('BEGIN:VTIMEZONE')).toBeLessThan(lines.indexOf('BEGIN:VEVENT'))
  })

  it('defines no zone for all-day events', () => {
    const allDay = buildCalendar({
      name: 'Events',
      events: [event({ start: '2026-03-13T13:00:00Z', end: '2026-03-15T01:00:00Z', allDay: true })],
    })
    expect(allDay).not.toContain('VTIMEZONE')
  })

  it('defines each zone once, however many events use it', () => {
    const two = buildCalendar({
      name: 'Events',
      events: [event(saturday), event(saturday, { uid: 'two@example.com.au' })],
    })
    expect(two.match(/BEGIN:VTIMEZONE/g)).toHaveLength(1)
  })

  it('defines a zone with no daylight saving without any changes', () => {
    const brisbane = buildCalendar({
      name: 'Events',
      events: [event({ ...saturday, timeZone: 'Australia/Brisbane' })],
    })
    expect(brisbane).toContain('TZID:Australia/Brisbane')
    expect(brisbane).not.toContain('BEGIN:DAYLIGHT')
    expect(brisbane).toContain('DTSTART;TZID=Australia/Brisbane:20260314T090000')
  })
})

describe('event details', () => {
  const build = (extra: Partial<IcsEvent>, timing: EventTimingInput = saturday) =>
    linesOf(buildCalendar({ name: 'Events', events: [event(timing, extra)] }))

  it('escapes the title, location and description', () => {
    const lines = build({
      title: 'Glaze, fire; cool',
      location: 'The Studio, 12 Rose St',
      description: 'Bring an apron.\nDoors at 6;30',
    })
    expect(lines).toContain('SUMMARY:Glaze\\, fire\\; cool')
    expect(lines).toContain('LOCATION:The Studio\\, 12 Rose St')
    expect(lines).toContain('DESCRIPTION:Bring an apron.\\nDoors at 6\\;30')
  })

  it('writes the URL as is', () => {
    expect(build({ url: 'https://example.com.au/events/pottery' })).toContain(
      'URL:https://example.com.au/events/pottery',
    )
  })

  it('marks a cancelled event cancelled, so subscribers see it go', () => {
    expect(build({ status: 'cancelled' })).toContain('STATUS:CANCELLED')
  })

  it('says so in the description when sold out', () => {
    expect(build({ status: 'soldOut', description: 'Learn to glaze.' })).toContain(
      'DESCRIPTION:Sold out.\\n\\nLearn to glaze.',
    )
  })

  it('omits what is missing, and the end of an event with none', () => {
    const lines = build({}, { start: saturday.start, timeZone: SYDNEY })
    expect(lines.some((line) => line.startsWith('DTEND'))).toBe(false)
    expect(lines.some((line) => line.startsWith('LOCATION'))).toBe(false)
    expect(lines.some((line) => line.startsWith('DESCRIPTION'))).toBe(false)
    expect(lines.some((line) => line.startsWith('URL'))).toBe(false)
  })

  it('writes an all-day event as dates, with an exclusive end', () => {
    const lines = build(
      {},
      {
        start: '2026-03-13T13:00:00Z',
        end: '2026-03-15T01:00:00Z',
        allDay: true,
        timeZone: SYDNEY,
      },
    )
    expect(lines).toContain('DTSTART;VALUE=DATE:20260314')
    expect(lines).toContain('DTEND;VALUE=DATE:20260316')
  })

  it('keeps the same bytes for the same event', () => {
    const a = buildCalendar({ name: 'Events', events: [event(saturday)] })
    const b = buildCalendar({ name: 'Events', events: [event(saturday)] })
    expect(a).toBe(b)
  })
})

describe('repeats', () => {
  const build = (recurrence: NonNullable<EventTimingInput['recurrence']>, timing = saturday) =>
    linesOf(buildCalendar({ name: 'Events', events: [event({ ...timing, recurrence })] }))

  it('writes a weekly repeat as one event with an RRULE', () => {
    const lines = build({ repeat: 'weekly' })
    expect(lines).toContain('RRULE:FREQ=WEEKLY;BYDAY=SA')
    expect(lines.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(1)
  })

  it('writes a fortnightly repeat as every second week', () => {
    expect(build({ repeat: 'fortnightly' })).toContain('RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=SA')
  })

  it('writes a monthly repeat on the same weekday of the month', () => {
    // 14 March is the second Saturday.
    expect(build({ repeat: 'monthly' })).toContain('RRULE:FREQ=MONTHLY;BYDAY=2SA')
  })

  it('writes a fifth weekday as the last one', () => {
    // 31 Oct 2026 is the fifth Saturday of October.
    const lines = build(
      { repeat: 'monthly' },
      { start: '2026-10-30T23:00:00Z', end: '2026-10-31T01:00:00Z', timeZone: SYDNEY },
    )
    expect(lines).toContain('RRULE:FREQ=MONTHLY;BYDAY=-1SA')
  })

  it('ends the series in UTC at the end of the last day', () => {
    // 21 March is the end of the day, 11:59:59 pm AEDT = 12:59:59 UTC.
    expect(build({ repeat: 'weekly', until: '2026-03-21' })).toContain(
      'RRULE:FREQ=WEEKLY;BYDAY=SA;UNTIL=20260321T125959Z',
    )
  })

  it('ends an all-day series on a date', () => {
    const lines = build(
      { repeat: 'weekly', until: '2026-03-28' },
      { start: '2026-03-13T13:00:00Z', allDay: true, timeZone: SYDNEY },
    )
    expect(lines).toContain('RRULE:FREQ=WEEKLY;BYDAY=SA;UNTIL=20260328')
  })

  it('writes skipped days as EXDATEs at the occurrence’s start', () => {
    const lines = build({ repeat: 'weekly', skip: ['2026-03-28', '2026-04-11'] })
    // 28 March is still AEDT; 11 April is AEST, so 10 am is the same on the clock.
    expect(lines).toContain('EXDATE;TZID=Australia/Sydney:20260328T100000')
    expect(lines).toContain('EXDATE;TZID=Australia/Sydney:20260411T100000')
  })

  it('leaves out skipped days the series would never have used', () => {
    const lines = build({ repeat: 'weekly', skip: ['2026-03-25'] }) // a Wednesday
    expect(lines.some((line) => line.startsWith('EXDATE'))).toBe(false)
  })

  it('writes all-day exceptions as dates', () => {
    const lines = build(
      { repeat: 'weekly', skip: ['2026-03-28'] },
      { start: '2026-03-13T13:00:00Z', allDay: true, timeZone: SYDNEY },
    )
    expect(lines).toContain('EXDATE;VALUE=DATE:20260328')
  })

  it('covers the repeat’s whole run with daylight saving changes', () => {
    const text = buildCalendar({
      name: 'Events',
      events: [event({ ...saturday, recurrence: { repeat: 'weekly', until: '2028-12-31' } })],
    })
    // Changes in 2026, 2027 and 2028 (and the year either side of the run's end).
    expect((text.match(/BEGIN:DAYLIGHT/g) ?? []).length).toBeGreaterThanOrEqual(3)
    expect(text).toContain('DTSTART:20271003T020000')
  })
})
