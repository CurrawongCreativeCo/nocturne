import { stegaClean } from 'next-sanity'

import { DEFAULT_TIME_ZONE, upcomingSpecialHours } from '@/lib/opening-hours'
import type { FetchMode } from '@/lib/sanity/live'
import type { LocationBusiness } from '@/types/business'

import { getSettings } from './get-settings'
import { getToday } from './get-today'
import { parseAuPhone } from '../utils/phone'

/**
 * Business info for a page's Location and Link list sections (the social icons). It reads the settings result the footer already
 * fetched (same cache entry), so a page with a Location section costs no extra Sanity request.
 */
export async function getLocationBusiness(mode: FetchMode): Promise<LocationBusiness | null> {
  const settings = await getSettings(mode)
  if (!settings?.business) return null

  // Hours, phone and time zone are read as data, so draft mode's click-to-edit characters would break them.
  const business = stegaClean(settings.business)
  const timeZone = business.timeZone ?? DEFAULT_TIME_ZONE
  const today = business.specialHours?.length ? await getToday(timeZone) : ''
  return {
    tradingName: business.tradingName,
    phone: business.phone,
    publicEmail: business.publicEmail,
    address: business.address,
    geo: business.geo,
    openingHours: business.openingHours,
    specialHours: business.specialHours,
    socialLinks: business.socialLinks,
    timeZone,
    phoneHref: (business.phone && parseAuPhone(business.phone)?.href) || null,
    specialDays: upcomingSpecialHours(business.specialHours, today),
  }
}
