import type { LocationBusiness } from '@/types/business'

type Place = Pick<LocationBusiness, 'address' | 'geo'>

/** The address as lines for display: the street (when there is one), then "Suburb STATE 2000". */
export function addressLines(address: Place['address']): string[] {
  const locality = [address?.suburb, address?.state, address?.postcode].filter(Boolean).join(' ')
  return [address?.street, locality].filter((line): line is string => Boolean(line))
}

/**
 * What Google Maps is asked to find. Coordinates win when the agency entered them (an exact pin);
 * otherwise the address in full. A business with neither has nothing to point at, so null.
 */
export function mapQuery({ address, geo }: Place): string | null {
  if (typeof geo?.lat === 'number' && typeof geo.lng === 'number') return `${geo.lat},${geo.lng}`
  const lines = addressLines(address)
  return lines.length > 0 ? [...lines, 'Australia'].join(', ') : null
}

/** Google Maps directions to the place, opened in a new tab (a plain link: nothing loads from Google until it is followed). */
export function directionsUrl(place: Place): string | null {
  const query = mapQuery(place)
  return query
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`
    : null
}

/** The keyless Google Maps embed for the optional interactive map; only ever used as an iframe `src` after a click. */
export function embedUrl(place: Place): string | null {
  const query = mapQuery(place)
  return query
    ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`
    : null
}
