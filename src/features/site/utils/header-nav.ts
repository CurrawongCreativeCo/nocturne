import { resolveLink, type LinkData } from '@/components/ui/resolve-link'

/** Most links a header dropdown holds; more than this is hard to scan. */
export const MAX_SUB_LINKS = 8

export interface HeaderLink {
  key: string
  label: string
  link: LinkData
}

export interface HeaderNavEntry {
  key: string
  label: string
  /** Null when the entry only opens its dropdown. */
  link: LinkData | null
  /** Empty for a plain link. */
  children: HeaderLink[]
}

interface RawLink {
  _key?: unknown
  label?: unknown
  link?: LinkData | null
  children?: unknown
}

const isRecord = (value: unknown): value is RawLink =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const label = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

function toLink(item: RawLink, index: number): HeaderLink | null {
  const text = label(item.label)
  if (!text || !item.link || !resolveLink(item.link)) return null
  return {
    key: typeof item._key === 'string' ? item._key : String(index),
    label: text,
    link: item.link,
  }
}

/**
 * The header menu as the site draws it. Entries without a label, or with neither a working link nor
 * a working sub-link, are left out (unfinished drafts, data from older schemas). Sub-links are one
 * level deep and at most MAX_SUB_LINKS; anything nested inside them is ignored.
 */
export function toHeaderNav(items: unknown): HeaderNavEntry[] {
  if (!Array.isArray(items)) return []
  return items.flatMap((item, index): HeaderNavEntry[] => {
    if (!isRecord(item)) return []
    const text = label(item.label)
    const link = item.link && resolveLink(item.link) ? item.link : null
    const children = (Array.isArray(item.children) ? item.children : [])
      .flatMap((child, i) => (isRecord(child) ? [toLink(child, i)] : []))
      .filter((child) => child !== null)
      .slice(0, MAX_SUB_LINKS)
    if (!text || (!link && children.length === 0)) return []
    const key = typeof item._key === 'string' ? item._key : String(index)
    return [{ key, label: text, link, children }]
  })
}
