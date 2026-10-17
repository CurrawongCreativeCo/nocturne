import type { SpecialHoursRow } from '@/lib/opening-hours'

import type { SETTINGS_QUERY_RESULT } from './sanity.types'

/** The Business info singleton as `SETTINGS_QUERY` projects it. */
export type BusinessInfo = NonNullable<NonNullable<SETTINGS_QUERY_RESULT>['business']>

/**
 * Business info as a page section needs it, resolved by the route (a section can't import the site
 * feature). Already cleaned of Visual Editing markers, because hours, phone numbers and the time
 * zone are read as data. `specialDays` holds the upcoming special days (it needs today's date).
 */
export type LocationBusiness = Pick<
  BusinessInfo,
  | 'tradingName'
  | 'phone'
  | 'publicEmail'
  | 'address'
  | 'geo'
  | 'openingHours'
  | 'specialHours'
  | 'socialLinks'
> & {
  timeZone: string
  /** For a `tel:` link, or null when the phone number is empty or not a number we can dial. */
  phoneHref: string | null
  specialDays: SpecialHoursRow[]
}
