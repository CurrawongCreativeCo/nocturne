import type { BusinessInfoData } from './business-json-ld'

/**
 * Whether Business info has anything a visitor could see. The setup wizard creates the document
 * empty so its Studio screen doesn't open as "New Business info"; an empty one must not draw a blank
 * footer band or turn the Organization into a nameless LocalBusiness. Time zone and business type
 * alone don't count: they show nothing on their own.
 */
export function hasBusinessDetails(info: BusinessInfoData | null | undefined): boolean {
  if (!info) return false
  const { address, geo } = info
  return Boolean(
    info.tradingName ||
    info.legalName ||
    info.phone ||
    info.publicEmail ||
    address?.street ||
    address?.suburb ||
    address?.state ||
    address?.postcode ||
    geo?.lat != null ||
    geo?.lng != null ||
    info.openingHours?.length ||
    info.specialHours?.length ||
    info.serviceAreas?.length ||
    info.socialLinks?.length ||
    info.priceRange,
  )
}
