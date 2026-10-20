import { stegaClean } from 'next-sanity'

import type { LinkArrowStyle } from '@/lib/sanity/link-arrow-options'

/** More links than this and visitors stop reading: Studio warns (it never blocks publishing). */
export const LINK_LIST_RECOMMENDED_MAX = 12

/** The longest bio the profile block takes: about three lines at text-small on a phone. */
export const PROFILE_BIO_MAX = 160

interface Scheduled {
  visibility?: string | null
  showFrom?: string | null
  showUntil?: string | null
}

/** Whether a link is switched off. Only the exact word "hide" hides: an unset field shows. */
export function isHidden(link: Pick<Scheduled, 'visibility'>): boolean {
  return stegaClean(link.visibility) === 'hide'
}

/** Whether a link has a show-from or show-until date, so the browser must decide if it is due. */
export function isScheduled(link: Scheduled): boolean {
  return Boolean(link.showFrom ?? link.showUntil)
}

/**
 * Whether a link is due at `now` (milliseconds): from `showFrom` (inclusive) up to `showUntil`
 * (exclusive). A missing or unparseable date leaves that side open, and a hidden link is never due.
 */
export function isLinkVisible(link: Scheduled, now: number): boolean {
  if (isHidden(link)) return false
  const from = link.showFrom ? Date.parse(stegaClean(link.showFrom)) : NaN
  const until = link.showUntil ? Date.parse(stegaClean(link.showUntil)) : NaN
  return !(now < from) && !(now >= until)
}

/**
 * The `_key` of the one link shown large, or undefined. Only one link can be featured: the first
 * one marked, in the editor's order, among the links being drawn. Any later ones are shown
 * normally, and Studio warns about them.
 */
export function featuredKey(
  links: readonly (Scheduled & { _key: string; featured?: boolean | null })[],
): string | undefined {
  return links.find((link) => link.featured === true && !isHidden(link))?._key
}

/** One heading and the links under it. `heading` is undefined for links with no group. */
export interface LinkGroup<T> {
  heading: string | undefined
  links: T[]
}

/**
 * Splits links into groups, in the order each group first appears. Links with no group that sit
 * before the first group form a heading-less group at the top; a heading-less link after a heading
 * joins the group above it, as it reads on the page. The same heading used twice is one group.
 */
export function groupLinks<T extends { group?: string | null }>(
  links: readonly T[],
): LinkGroup<T>[] {
  const groups: LinkGroup<T>[] = []
  for (const link of links) {
    const heading = link.group ? stegaClean(link.group).trim() || undefined : undefined
    const target =
      heading === undefined
        ? groups[groups.length - 1]
        : groups.find((group) => group.heading === heading)
    if (target) target.links.push(link)
    else groups.push({ heading, links: [link] })
  }
  return groups
}

export interface Utm {
  source?: string | null
  medium?: string | null
  campaign?: string | null
}

/**
 * Adds UTM tags to a web address. Only http(s) addresses change (never mailto:, tel:, or a path
 * on this site), and a tag already in the address wins, so a deliberate one is never overwritten.
 * Anything that isn't an address is returned as it came.
 */
export function withUtm(url: string, utm: Utm): string {
  const tags = (
    [
      ['utm_source', utm.source],
      ['utm_medium', utm.medium],
      ['utm_campaign', utm.campaign],
    ] as const
  ).flatMap(([name, value]) => {
    const clean = value ? stegaClean(value).trim() : ''
    return clean ? [[name, clean] as const] : []
  })
  if (tags.length === 0) return url

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return url
  for (const [name, value] of tags) {
    if (!parsed.searchParams.has(name)) parsed.searchParams.set(name, value)
  }
  return parsed.toString()
}

/** Heading elements for the section, so the page keeps one <h1> (PageContent supplies it) and an unbroken outline. */
export interface LinkListHeadings {
  /** The profile's name, or the section title when there is no profile. */
  top: 'h2'
  /** The section title beside a profile, one level down. */
  title: 'h2' | 'h3'
  /** Group headings: one level under whatever heading leads the section. */
  group: 'h2' | 'h3'
}

export function headingLevels({
  hasProfileName,
  hasTitle,
}: {
  hasProfileName: boolean
  hasTitle: boolean
}): LinkListHeadings {
  return {
    top: 'h2',
    title: hasProfileName ? 'h3' : 'h2',
    group: hasProfileName || hasTitle ? 'h3' : 'h2',
  }
}

/**
 * The indicator a layout draws while Arrow style is unset. Glass rows and Editorial always had an
 * arrow, so they get the chevron (Glass rows switched off with the older "Arrow on each row" get
 * none); Minimal and Cards never had one and stay without; Compact pills have no room for one.
 */
export function defaultLinkArrow({
  layout,
  rowStyle,
  showArrows,
}: {
  layout: string | null | undefined
  rowStyle?: string | null
  showArrows?: boolean | null
}): LinkArrowStyle {
  const variant = stegaClean(layout) ?? 'stacked'
  if (variant === 'editorial') return 'chevron'
  if (variant === 'stacked' && stegaClean(rowStyle) === 'glass') {
    return showArrows === false ? 'none' : 'chevron'
  }
  return 'none'
}

/** Compact pills draw no indicator, so the choice is not offered there. */
export const usesArrow = (layout: string | null | undefined) => stegaClean(layout) !== 'compact'

/**
 * The container a layout draws its link icons in while none is chosen: Glass rows a round badge,
 * Cards a rounded tile, Minimal and Compact the bare icon. Editorial draws no icons.
 */
export function ownIconShape(
  layout: string | null | undefined,
  rowStyle: string | null | undefined,
): 'plain' | 'circle' | 'rounded' {
  const clean = stegaClean(layout) || 'stacked'
  if (clean === 'stacked' && stegaClean(rowStyle) === 'glass') return 'circle'
  return clean === 'cards' ? 'rounded' : 'plain'
}
