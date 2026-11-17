import { cacheLife } from 'next/cache'
import type { ReactNode } from 'react'

import { getToday } from '@/lib/get-today'
import { DEFAULT_TIME_ZONE } from '@/lib/opening-hours'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { cleanBusiness, FooterView } from './footer-view'
import { getSettings } from '../api/get-settings'

/** `extra` is a slot after the links (the route passes the cookie settings button; features can't import each other). */
export async function SiteFooter({ extra, ...mode }: FetchMode & { extra?: ReactNode }) {
  const [settings, year] = await Promise.all([getSettings(mode), currentYear()])
  // The hours are read against today's date, in the business's time zone.
  // Read as data, not shown as typed, so draft mode's invisible click-to-edit characters would break it.
  const business = cleanBusiness(settings?.business)
  const timeZone = business?.timeZone ?? DEFAULT_TIME_ZONE
  const today = business?.specialHours?.length ? await getToday(timeZone) : ''
  return <FooterView settings={settings} year={year} today={today} extra={extra} />
}

export async function DraftSiteFooter({ extra }: { extra?: ReactNode }) {
  return <SiteFooter {...await getDraftFetchMode()} extra={extra} />
}

/** Cached because Cache Components forbids reading the clock during prerender. */
// eslint-disable-next-line @typescript-eslint/require-await -- 'use cache' functions must be async
async function currentYear() {
  'use cache'
  cacheLife('days')
  return new Date().getFullYear()
}
