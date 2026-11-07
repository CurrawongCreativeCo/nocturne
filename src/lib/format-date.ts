/**
 * "2026-10-01T09:30:00Z" -> "1 October 2026" (or the locale's equivalent). Always UTC, so the
 * server, the build and the visitor agree on the day.
 */
export function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(iso),
  )
}
