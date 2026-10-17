import type { ResolvedLink } from '@/components/ui/resolve-link'

/**
 * The absolute address a registration button leads to, for the event's `offers` in structured data.
 * A page or a path becomes a full URL on this site; a website stays as it is. A section of the
 * page, or a panel or booking button with no fallback link, has no address of its own: null.
 */
export function registrationUrl(resolved: ResolvedLink | null, siteOrigin: string): string | null {
  if (!resolved) return null
  switch (resolved.kind) {
    case 'page':
    case 'external':
      return absolute(resolved.href, siteOrigin)
    case 'panel':
    case 'booking':
      return resolved.fallbackHref ? absolute(resolved.fallbackHref, siteOrigin) : null
    default:
      return null
  }
}

function absolute(href: string, siteOrigin: string): string | null {
  try {
    const url = new URL(href, siteOrigin)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}
