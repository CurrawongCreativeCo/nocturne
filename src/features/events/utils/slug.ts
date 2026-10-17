/** One path segment: lowercase letters, numbers and single hyphens. An event lives at /events/<slug>. */
export const EVENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * "Open day & BBQ!" -> "open-day-bbq". A slug can't contain "/" and can't end in ".ics" (the
 * calendar file of an event is `<slug>.ics`), so a dot is never kept.
 */
export function slugifyEvent(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
