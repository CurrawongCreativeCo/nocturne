/** An event's `location` as the queries return it. */
export interface EventLocation {
  kind?: string | null
  name?: string | null
  address?: string | null
  url?: string | null
}

const oneLine = (text: string) => text.replace(/\s*\n\s*/g, ', ').trim()

/**
 * Where, as one line for a calendar entry: "The Studio, 12 Rose St, Newtown NSW 2042", or the
 * joining link for an online event ("Online" when it has none). Null when there is nothing to say.
 */
export function locationText(location: EventLocation | null | undefined): string | null {
  if (!location) return null
  if (location.kind === 'online') return location.url || 'Online'
  const parts = [location.name, location.address && oneLine(location.address)].filter(
    (part): part is string => !!part,
  )
  return parts.length > 0 ? parts.join(', ') : null
}

/** A Google Maps search for a venue's address (or name), or null for an online event or no place. */
export function directionsUrl(location: EventLocation | null | undefined): string | null {
  if (!location || location.kind === 'online') return null
  const query = [location.name, location.address && oneLine(location.address)]
    .filter((part): part is string => !!part)
    .join(', ')
  return query
    ? `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query })}`
    : null
}
