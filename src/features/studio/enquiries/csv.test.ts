import { describe, expect, it } from 'vitest'

import { buildEnquiriesCsv, csvCell, csvFileName, formatReceived } from './csv'

const format = (iso: string) => iso

describe('csvCell', () => {
  it('quotes cells with commas, quotes and line breaks', () => {
    expect(csvCell('plain')).toBe('plain')
    expect(csvCell('a, b')).toBe('"a, b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('two\nlines')).toBe('"two\nlines"')
  })

  it('defuses text a spreadsheet would run as a formula', () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`)
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
    expect(csvCell('+cmd|calc')).toBe("'+cmd|calc")
    expect(csvCell('-2+3')).toBe("'-2+3")
    expect(csvCell('\tcmd')).toBe("'\tcmd")
  })

  it('leaves phone numbers and negative numbers alone', () => {
    expect(csvCell('+61 400 000 000')).toBe('+61 400 000 000')
    expect(csvCell('-12.5')).toBe('-12.5')
    expect(csvCell('(02) 5550 1234')).toBe('(02) 5550 1234')
  })
})

describe('buildEnquiriesCsv', () => {
  const rows = [
    {
      createdAt: '2026-10-17T01:00:00Z',
      status: 'new',
      formTitle: 'Contact',
      pagePath: '/contact',
      fields: [
        { label: 'Your name', value: 'Ann' },
        { label: 'Message', value: 'Hi,\nthere' },
      ],
      attribution: { referrer: 'https://google.com/search', utmSource: 'news' },
    },
    {
      createdAt: '2026-10-16T01:00:00Z',
      status: 'read',
      formTitle: 'Quote',
      fields: [
        { label: 'Your name', value: 'Bob' },
        { label: 'Budget', value: '$5,000' },
      ],
    },
  ]

  it('has the fixed columns, then one column per answer label across forms', () => {
    const lines = buildEnquiriesCsv(rows, format).replace('﻿', '').split('\r\n')
    expect(lines[0]).toBe(
      'Received,Status,Form,Page,Referrer,UTM source,UTM medium,UTM campaign,UTM term,UTM content,Your name,Message,Budget',
    )
    expect(lines[1]).toBe(
      '2026-10-17T01:00:00Z,new,Contact,/contact,https://google.com/search,news,,,,,Ann,"Hi,\nthere",',
    )
    expect(lines[2]).toBe('2026-10-16T01:00:00Z,read,Quote,,,,,,,,Bob,,"$5,000"')
  })

  it('starts with a byte order mark and ends with a line break', () => {
    const csv = buildEnquiriesCsv(rows, format)
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv.endsWith('\r\n')).toBe(true)
  })

  it('is just the header when there are no enquiries', () => {
    expect(buildEnquiriesCsv([], format)).toBe(
      '﻿Received,Status,Form,Page,Referrer,UTM source,UTM medium,UTM campaign,UTM term,UTM content\r\n',
    )
  })

  it('joins repeated labels within one enquiry', () => {
    const csv = buildEnquiriesCsv(
      [
        {
          fields: [
            { label: 'Tag', value: 'a' },
            { label: 'Tag', value: 'b' },
          ],
        },
      ],
      format,
    )
    expect(csv.split('\r\n')[1]).toBe(',,,,,,,,,,a; b')
  })
})

describe('formatReceived', () => {
  it('formats in Australian English', () => {
    expect(formatReceived('2026-10-17T01:02:00Z', 'Australia/Sydney')).toMatch(
      /^17 Oct 2026,? 12:02 pm$/i,
    )
  })

  it('returns what it cannot read as it is', () => {
    expect(formatReceived('soon')).toBe('soon')
  })
})

describe('csvFileName', () => {
  it('uses the local date', () => {
    expect(csvFileName(new Date(2026, 9, 7, 23, 30))).toBe('enquiries-2026-10-07.csv')
  })
})
