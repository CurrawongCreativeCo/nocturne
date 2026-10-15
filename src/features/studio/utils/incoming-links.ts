/**
 * Which menus and documents link to a page, for the delete confirmation. Reuses the content
 * health link detection, so a link counts here exactly when Content health counts it.
 */
import { collectLinkTargets, resolveVersions } from '../content-health/utils/detect'

interface Titled {
  _id: string
  title?: string | null
}

export interface LinkSources {
  pages: (Titled & { pageBuilder?: unknown })[]
  sharedSections: (Titled & { section?: unknown })[]
  navigation: { _id: string; headerNav?: unknown; headerCta?: unknown; footerNav?: unknown }[]
}

export interface IncomingLinks {
  /** Menus in Navigation, e.g. "Header menu". */
  menus: string[]
  /** Other pages, and shared sections (which pages embed), that link to the page. */
  documents: { id: string; title: string; kind: 'page' | 'sharedSection' }[]
}

const MENU_FIELDS = [
  ['headerNav', 'Header menu'],
  ['headerCta', 'Header button'],
  ['footerNav', 'Footer menu'],
] as const

/** Drafts count: the link is in the content editors see, and it goes live when they publish. */
export function findIncomingLinks(sources: LinkSources, pageId: string): IncomingLinks {
  const links = (content: unknown) => collectLinkTargets(content).includes(pageId)
  const navigation = resolveVersions(sources.navigation)[0]?.doc

  return {
    menus: navigation
      ? MENU_FIELDS.filter(([field]) => links(navigation[field])).map(([, label]) => label)
      : [],
    documents: [
      ...resolveVersions(sources.pages)
        .filter(({ id, doc }) => id !== pageId && links(doc.pageBuilder))
        .map(({ id, doc }) => ({ id, title: doc.title || 'Untitled', kind: 'page' as const })),
      ...resolveVersions(sources.sharedSections)
        .filter(({ doc }) => links(doc.section))
        .map(({ id, doc }) => ({
          id,
          title: doc.title || 'Untitled',
          kind: 'sharedSection' as const,
        })),
    ],
  }
}
