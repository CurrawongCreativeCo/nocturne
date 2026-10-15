import {
  DAYS,
  upcomingSpecialHours,
  weeklyRanges,
  type HoursEntry,
  type SpecialHoursEntry,
} from '@/lib/opening-hours'

import { parseAuPhone } from './phone'

/** The business info fields structured data reads (the shape SETTINGS_QUERY returns, nulls included). */
export interface BusinessInfoData {
  tradingName?: string | null
  legalName?: string | null
  phone?: string | null
  publicEmail?: string | null
  address?: {
    street?: string | null
    suburb?: string | null
    state?: string | null
    postcode?: string | null
  } | null
  businessType?: string | null
  businessTypeOther?: string | null
  geo?: { lat?: number | null; lng?: number | null } | null
  openingHours?: readonly HoursEntry[] | null
  specialHours?: readonly SpecialHoursEntry[] | null
  serviceAreas?: readonly string[] | null
  socialLinks?: readonly { url?: string | null }[] | null
  priceRange?: string | null
}

interface BuildOptions {
  /** The site's home URL; the node keeps the Organization's `@id` so other nodes still point at it. */
  url: string
  id: string
  /** Fallback name when the business info has no trading name. */
  name: string
  logo?: string
  /** Today in the business's time zone ("YYYY-MM-DD"): special days before it are left out. */
  today: string
}

const TYPE_NAME = /^[A-Z][A-Za-z]+$/

/** The schema.org type to emit: the chosen subtype, or the typed one for "Other". Unusable values fall back. */
export function businessSchemaType(info: BusinessInfoData): string {
  const { businessType, businessTypeOther } = info
  const chosen = businessType === 'Other' ? businessTypeOther : businessType
  return chosen && TYPE_NAME.test(chosen) && chosen !== 'Other' ? chosen : 'LocalBusiness'
}

const clean = (object: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  )

/**
 * The LocalBusiness node for the JSON-LD graph. It replaces the plain Organization (a LocalBusiness
 * is one) and keeps its `@id`. Only fields the editor filled in are emitted: search engines treat
 * blank properties as errors.
 */
export function buildLocalBusinessJsonLd(info: BusinessInfoData, options: BuildOptions) {
  const { address, geo } = info
  const phone = info.phone ? parseAuPhone(info.phone) : null
  const hasAddress = Boolean(address?.suburb || address?.street)
  const sameAs = (info.socialLinks ?? []).flatMap(({ url }) => (url ? [url] : []))
  const areas = (info.serviceAreas ?? []).filter(Boolean)

  const regular = weeklyRanges(info.openingHours).map(({ days, opens, closes }) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: days.map((day) => DAYS.find(({ value }) => value === day)?.long),
    opens,
    closes,
  }))
  // schema.org marks a closed day as a dated specification that opens and closes at midnight.
  const special = upcomingSpecialHours(info.specialHours, options.today, Infinity).map(
    ({ date, closed, opens, closes }) => ({
      '@type': 'OpeningHoursSpecification',
      opens: closed ? '00:00' : opens,
      closes: closed ? '00:00' : closes,
      validFrom: date,
      validThrough: date,
    }),
  )
  const specification = [...regular, ...special]

  return clean({
    '@type': businessSchemaType(info),
    '@id': options.id,
    name: info.tradingName || options.name,
    legalName: info.legalName,
    url: options.url,
    logo: options.logo,
    telephone: phone?.telephone,
    email: info.publicEmail,
    address: hasAddress
      ? clean({
          '@type': 'PostalAddress',
          streetAddress: address?.street,
          addressLocality: address?.suburb,
          addressRegion: address?.state,
          postalCode: address?.postcode,
          addressCountry: 'AU',
        })
      : undefined,
    geo:
      typeof geo?.lat === 'number' && typeof geo.lng === 'number'
        ? { '@type': 'GeoCoordinates', latitude: geo.lat, longitude: geo.lng }
        : undefined,
    openingHoursSpecification: specification.length > 0 ? specification : undefined,
    areaServed: areas.length > 0 ? areas.map((name) => ({ '@type': 'Place', name })) : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    priceRange: info.priceRange,
  })
}
