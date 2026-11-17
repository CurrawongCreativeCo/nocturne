import { cacheLife } from 'next/cache'

import { localMoment } from '@/lib/opening-hours'

/**
 * Today's date ("YYYY-MM-DD") in a time zone, for hiding special days that have passed. Cached
 * because Cache Components forbids reading the clock during prerender; the entry lives about an
 * hour, so a past holiday can linger on the page for up to that long.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- 'use cache' functions must be async
export async function getToday(timeZone: string): Promise<string> {
  'use cache'
  cacheLife('hours')
  return localMoment(new Date(), timeZone).date
}
