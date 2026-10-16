import { stegaClean } from 'next-sanity'

import {
  resolveDestination,
  type BasicLink,
  type LinkData,
} from '@/components/ui/resolve-basic-link'

export type { LinkData }

export type ResolvedLink =
  | BasicLink
  | { kind: 'panel'; panelId: string; title?: string; fallbackHref?: string }
  | { kind: 'booking'; fallbackHref?: string }

/** Only same-site paths and web/mail/phone links are valid fallbacks; anything else is dropped. */
function safeFallback(url: string | null | undefined): string | undefined {
  const value = url ? stegaClean(url).trim() : ''
  return /^(\/(?!\/)|https?:|mailto:|tel:)/i.test(value) ? value : undefined
}

/**
 * Turns a stored link into what to render, or null when it is incomplete (an unfinished draft).
 * Links stored before typed actions have only `internal` or `external`, and resolve as before; an
 * unknown type falls back to its URL, as the old renderer did.
 */
export function resolveLink(link: LinkData | null | undefined): ResolvedLink | null {
  if (!link) return null

  switch (stegaClean(link.linkType)) {
    case 'panel':
      return link.panel?.id
        ? {
            kind: 'panel',
            panelId: stegaClean(link.panel.id),
            title: link.panel.title ? stegaClean(link.panel.title) : undefined,
            fallbackHref: safeFallback(link.fallbackUrl),
          }
        : null
    case 'booking':
      return { kind: 'booking', fallbackHref: safeFallback(link.bookingUrl) }
    default:
      return resolveDestination(link)
  }
}
