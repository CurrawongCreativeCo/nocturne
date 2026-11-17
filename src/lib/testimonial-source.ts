import { stegaClean } from 'next-sanity'

/**
 * Where a manual testimonial came from (task 156, owner decision D3). Client-controlled, and shown as
 * plain words only: never a badge, an aggregate or review structured data. A "Google review" entry is a
 * copy the client chose to publish, dated and never presented as current; live Google reviews are task
 * 277's. "Other" says nothing useful to a visitor, so it is stored but not drawn.
 */
export const TESTIMONIAL_SOURCES = [
  { value: 'client-feedback', title: 'Client feedback' },
  { value: 'email', title: 'Email' },
  { value: 'survey', title: 'Survey' },
  { value: 'google-review', title: 'Google review' },
  { value: 'other', title: 'Other' },
] as const

/** The words a card shows for a stored source, if any. */
export function testimonialSourceLabel(source: string | null | undefined): string | undefined {
  const clean = stegaClean(source)
  if (clean === 'other') return undefined
  return TESTIMONIAL_SOURCES.find(({ value }) => value === clean)?.title
}

/** A stored rating, only when it is one of the five whole stars. */
export function testimonialRating(rating: number | null | undefined): number | undefined {
  return typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5
    ? rating
    : undefined
}

/** A stored `YYYY-MM-DD`, or undefined for anything else. */
export function testimonialDate(date: string | null | undefined): string | undefined {
  const clean = stegaClean(date)
  return clean && /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : undefined
}

/** Studio's warning on the permission confirmation: a warning, never a block. */
export function permissionWarning(confirmed: boolean | null | undefined): string | true {
  return confirmed === true
    ? true
    : 'Confirm you have permission to publish this before it goes live.'
}

/** Studio's warning on the date: a copied Google review must never read as current. */
export function sourceDateWarning(
  source: string | null | undefined,
  date: string | null | undefined,
): string | true {
  return source === 'google-review' && !date
    ? 'A Google review copied here needs its date, so it is never read as current.'
    : true
}
