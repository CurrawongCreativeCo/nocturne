export interface EnquiryRow {
  createdAt?: string | null
  status?: string | null
  formTitle?: string | null
  pagePath?: string | null
  fields?: { label?: string | null; value?: string | null }[] | null
  attribution?: {
    landing?: string | null
    referrer?: string | null
    utmSource?: string | null
    utmMedium?: string | null
    utmCampaign?: string | null
    utmTerm?: string | null
    utmContent?: string | null
  } | null
}

/** The enquiry's own columns, then one column per answer label in the order labels first appear. */
const FIXED_COLUMNS: { title: string; read: (row: EnquiryRow, format: DateFormatter) => string }[] =
  [
    { title: 'Received', read: (row, format) => (row.createdAt ? format(row.createdAt) : '') },
    { title: 'Status', read: (row) => row.status ?? '' },
    { title: 'Form', read: (row) => row.formTitle ?? '' },
    { title: 'Page', read: (row) => row.pagePath ?? '' },
    { title: 'Landing page', read: (row) => row.attribution?.landing ?? '' },
    { title: 'Referrer', read: (row) => row.attribution?.referrer ?? '' },
    { title: 'UTM source', read: (row) => row.attribution?.utmSource ?? '' },
    { title: 'UTM medium', read: (row) => row.attribution?.utmMedium ?? '' },
    { title: 'UTM campaign', read: (row) => row.attribution?.utmCampaign ?? '' },
    { title: 'UTM term', read: (row) => row.attribution?.utmTerm ?? '' },
    { title: 'UTM content', read: (row) => row.attribution?.utmContent ?? '' },
  ]

type DateFormatter = (iso: string) => string

/** "17 Oct 2026, 11:02 am" in the viewer's time zone, or `timeZone` when given (tests). */
export function formatReceived(iso: string, timeZone?: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short', timeZone })
}

/**
 * One CSV cell. Quoted when it holds a comma, quote or line break. A spreadsheet runs a cell that
 * starts with `=`, `@` or a tab or carriage return as a formula, and so one starting with `+` or `-`
 * unless it is just a number or phone number (+61 400 000 000), so visitor-supplied text like that
 * gets a leading apostrophe.
 */
export function csvCell(value: string) {
  const risky = /^[=@\t\r]/.test(value) || (/^[+-]/.test(value) && !/^[+-][\d\s().-]*$/.test(value))
  const text = risky ? `'${value}` : value
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/**
 * The enquiries as CSV text (CRLF line breaks, and a byte order mark so Excel reads it as UTF-8).
 * Enquiries from different forms share a column when their answers have the same label.
 */
export function buildEnquiriesCsv(
  rows: readonly EnquiryRow[],
  format: DateFormatter = formatReceived,
) {
  const labels: string[] = []
  for (const row of rows) {
    for (const { label } of row.fields ?? []) {
      if (label && !labels.includes(label)) labels.push(label)
    }
  }

  const header = [...FIXED_COLUMNS.map(({ title }) => title), ...labels]
  const lines = rows.map((row) => {
    const answers = labels.map((label) =>
      (row.fields ?? [])
        .filter((field) => field.label === label)
        .map((field) => field.value ?? '')
        .join('; '),
    )
    return [...FIXED_COLUMNS.map(({ read }) => read(row, format)), ...answers]
  })

  return `﻿${[header, ...lines].map((cells) => cells.map(csvCell).join(',')).join('\r\n')}\r\n`
}

/** `enquiries-2026-10-17.csv`, by the viewer's local date. */
export function csvFileName(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `enquiries-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.csv`
}
