/**
 * Which sections set their own spacing, for the note under Density on Brand colours (task 216b). A
 * section that chose Compact or Spacious keeps it whatever the site's Density is; one left on Default
 * (stored as `default`, or nothing) follows it, so only the first two are counted. Reads the same
 * documents as Content health, drafts included (the content editors see). Pure, so it is unit tested;
 * the component only fetches and draws.
 */
import { resolveVersions } from '../content-health/utils/detect'

interface Titled {
  _id: string
  title?: string | null
}

export interface SpacingSources {
  pages: (Titled & { pageBuilder?: unknown })[]
  sharedSections: (Titled & { section?: unknown })[]
}

export interface SpacingOverride {
  key: string
  /** What the editor calls it: the section's title, or its kind. */
  label: string
  spacing: 'compact' | 'spacious'
  /** Where it is in the document, as a Studio intent's `path` (a page builder item, or a shared section). */
  path: string
}

export interface SpacingUsageDocument {
  id: string
  type: 'page' | 'sharedSection'
  title: string
  sections: SpacingOverride[]
}

const OWN_SPACINGS = ['compact', 'spacious'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** "pricingTable" becomes "Pricing table", for a section with no title. */
const kindOf = (type: unknown) =>
  typeof type === 'string' && type
    ? type
        .replace(/([a-z])([A-Z])/g, (_, a: string, b: string) => `${a} ${b.toLowerCase()}`)
        .replace(/^./, (c) => c.toUpperCase())
    : 'Section'

function overrideOf(section: unknown, path: string): SpacingOverride | null {
  if (!isRecord(section) || !isRecord(section.style)) return null
  const chosen = section.style.spacing
  const own = OWN_SPACINGS.find((value) => value === chosen)
  if (!own) return null
  const key = typeof section._key === 'string' ? section._key : ''
  const title =
    typeof section.title === 'string' && section.title.trim() ? section.title.trim() : ''
  return { key, label: title || kindOf(section._type), spacing: own, path }
}

export function findSpacingOverrides(sources: SpacingSources): SpacingUsageDocument[] {
  const pages = resolveVersions(sources.pages).map(({ id, doc }) => ({
    id,
    type: 'page' as const,
    title: doc.title || 'Untitled',
    sections: (Array.isArray(doc.pageBuilder) ? doc.pageBuilder : []).flatMap((item: unknown) => {
      const key = isRecord(item) && typeof item._key === 'string' ? item._key : ''
      const found = overrideOf(item, `pageBuilder[_key==${JSON.stringify(key)}]`)
      return found ? [found] : []
    }),
  }))
  const shared = resolveVersions(sources.sharedSections).map(({ id, doc }) => {
    const found = overrideOf(doc.section, 'section')
    return {
      id,
      type: 'sharedSection' as const,
      title: doc.title || 'Untitled',
      sections: found ? [found] : [],
    }
  })
  return [...pages, ...shared].filter((document) => document.sections.length > 0)
}

export const countOverrides = (documents: readonly SpacingUsageDocument[]) =>
  documents.reduce((total, document) => total + document.sections.length, 0)

/** "3 sections set their own spacing" (or "1 section sets its own spacing"). */
export function describeSpacingCount(count: number): string {
  if (count === 0) return 'No section sets its own spacing: every section follows Density.'
  return count === 1
    ? '1 section sets its own spacing and keeps it whatever Density is.'
    : `${count} sections set their own spacing and keep it whatever Density is.`
}
