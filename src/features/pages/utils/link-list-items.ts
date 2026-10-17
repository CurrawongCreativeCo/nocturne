import { stegaClean } from 'next-sanity'

import { resolveLink, type LinkData, type ResolvedLink } from '@/components/ui/resolve-link'

import {
  featuredKey,
  groupLinks,
  isLinkVisible,
  isScheduled,
  withUtm,
  type LinkGroup,
} from './link-list'

/** The fields of a stored link that the list reads (the section's query projects exactly these). */
export interface StoredLink {
  _key: string
  label?: string | null
  description?: string | null
  icon?: string | null
  featured?: boolean | null
  group?: string | null
  showFrom?: string | null
  showUntil?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  link?: LinkData | null
}

/** A link ready to draw: its destination resolved, UTM tags added, and where it sits. */
export interface PreparedLink<T extends StoredLink> {
  item: T
  label: string
  /** The link to render with `SanityLink`: the stored one, with tracking tags on a website's address. */
  link: LinkData
  kind: ResolvedLink['kind']
  scheduled: boolean
  group: string | undefined
}

/**
 * Turns the section's stored links into what the layouts draw. A link with no label, or whose
 * destination is unfinished (an incomplete draft), is left out rather than drawn as an empty button.
 * Order is the editor's. Hidden links never arrive (the query leaves them out); scheduled ones do, and
 * `drawableLinks` decides which are due.
 */
export function prepareLinks<T extends StoredLink>(
  links: readonly T[] | null | undefined,
): PreparedLink<T>[] {
  const usable = (links ?? []).flatMap((item) => {
    const label = item.label ? stegaClean(item.label).trim() : ''
    const resolved = resolveLink(item.link)
    return label && item.link && resolved ? [{ item, label, resolved, link: item.link }] : []
  })

  return usable.map(({ item, label, resolved, link }) => ({
    item,
    label,
    // Tags go on a website's address only, and are added here so every layout gets them.
    link:
      resolved.kind === 'external' && link.url
        ? { ...link, url: withUtm(stegaClean(link.url), taggingOf(item)) }
        : link,
    kind: resolved.kind,
    scheduled: isScheduled(item),
    group: item.group ? stegaClean(item.group).trim() || undefined : undefined,
  }))
}

const taggingOf = (item: StoredLink) => ({
  source: item.utmSource,
  medium: item.utmMedium,
  campaign: item.utmCampaign,
})

/** A link being drawn: where it sits among the links on the page, and whether it is the large one. */
export interface DrawnLink<T extends StoredLink> extends PreparedLink<T> {
  /** The one link shown large (see `featuredKey`). */
  large: boolean
  /** 1-based place among the links drawn, across groups, for analytics. */
  position: number
}

/**
 * The links to draw now. With `now` (milliseconds), those that are due: a scheduled link outside its
 * window is left out. Without it, the clock is unknown (the prerendered page), so scheduled links are
 * left out and the rest drawn. Which link is large, and every link's place, follow what is drawn.
 */
export function drawableLinks<T extends StoredLink>(
  links: readonly PreparedLink<T>[],
  now?: number,
): DrawnLink<T>[] {
  const due = links.filter((link) =>
    now === undefined ? !link.scheduled : isLinkVisible(link.item, now),
  )
  const large = featuredKey(due.map(({ item }) => item))
  return due.map((link, index) => ({
    ...link,
    large: link.item._key === large,
    position: index + 1,
  }))
}

/** Drawn links in groups, in order. */
export function groupDrawn<T extends StoredLink>(
  links: readonly DrawnLink<T>[],
): LinkGroup<DrawnLink<T>>[] {
  return groupLinks(links)
}

/**
 * What a click on a link tells analytics (`link_click`): the label, the kind of destination, whether
 * it leaves the site, its place and group, and for another website its address without the query
 * string (so UTM tags and tokens are never sent).
 */
export function linkTrackProps<T extends StoredLink>(
  link: DrawnLink<T>,
): Record<string, string | number | boolean> {
  const props: Record<string, string | number | boolean> = {
    label: link.label,
    kind: link.kind,
    outbound: link.kind === 'external',
    position: link.position,
  }
  if (link.group) props.group = link.group
  if (link.kind === 'external' && link.link.url) {
    try {
      const { origin, pathname, protocol } = new URL(stegaClean(link.link.url))
      if (protocol === 'https:' || protocol === 'http:') props.url = `${origin}${pathname}`
    } catch {
      // Not an address (a mailto: or tel: link has one, but nothing worth reporting).
    }
  }
  return props
}

export interface SocialProfile {
  _key: string
  platform?: string | null
  url?: string | null
}

/**
 * The social icons to show. `business` (also what an unset choice means) reads the profiles in
 * Business info, `custom` the section's own set, `none` shows nothing. Only https addresses are
 * drawn, so a hand-edited document can't put a `javascript:` link in the page.
 */
export function resolveSocials(
  source: string | null | undefined,
  custom: readonly SocialProfile[] | null | undefined,
  business: readonly SocialProfile[] | null | undefined,
): (SocialProfile & { url: string })[] {
  const choice = stegaClean(source)
  const list = choice === 'none' ? [] : choice === 'custom' ? custom : business
  return (list ?? []).flatMap((profile) => {
    const url = profile.url ? stegaClean(profile.url).trim() : ''
    return /^https:\/\//i.test(url) ? [{ ...profile, url }] : []
  })
}
