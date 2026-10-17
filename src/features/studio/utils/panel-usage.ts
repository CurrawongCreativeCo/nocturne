/**
 * Which buttons and links open a panel, for the note at the top of the panel's form. Reads the same
 * documents as Content health (drafts count: the button is in the content editors see). Pure, so it
 * is unit tested; the component only fetches and draws.
 */
import { collectPanelTargets, resolveVersions } from '../content-health/utils/detect'

interface Titled {
  _id: string
  title?: string | null
}

export interface PanelUsageSources {
  pages: (Titled & { pageBuilder?: unknown })[]
  sharedSections: (Titled & { section?: unknown })[]
  navigation: { _id: string; headerNav?: unknown; headerCta?: unknown; footerNav?: unknown }[]
}

export interface PanelOpeners {
  /** Labels of the buttons (call to action) that open the panel. */
  buttons: string[]
  /** Links inside rich text that open it. */
  textLinks: number
}

export interface PanelUsage {
  documents: (PanelOpeners & { id: string; title: string; kind: 'page' | 'sharedSection' })[]
  /** Menus in Navigation, e.g. "Header menu". Panels only open from page content, so these use their fallback link. */
  menus: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const opensPanel = (link: unknown, panelId: string) =>
  isRecord(link) && link.linkType === 'panel' && isRecord(link.panel) && link.panel._ref === panelId

/** The buttons and rich-text links inside `value` that open the panel. */
export function collectPanelOpeners(value: unknown, panelId: string): PanelOpeners {
  const found: PanelOpeners = { buttons: [], textLinks: 0 }
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (!isRecord(node)) return
    if (node._type === 'cta' && opensPanel(node.link, panelId)) {
      found.buttons.push(
        typeof node.label === 'string' && node.label ? node.label : 'Untitled button',
      )
      return
    }
    if (node._type === 'link') {
      if (opensPanel(node, panelId)) found.textLinks += 1
      return
    }
    Object.values(node).forEach(walk)
  }
  walk(value)
  return found
}

const MENU_FIELDS = [
  ['headerNav', 'Header menu'],
  ['headerCta', 'Header button'],
  ['footerNav', 'Footer menu'],
] as const

export function findPanelUsage(sources: PanelUsageSources, panelId: string): PanelUsage {
  const navigation = resolveVersions(sources.navigation)[0]?.doc
  const used = (openers: PanelOpeners) => openers.buttons.length > 0 || openers.textLinks > 0

  return {
    menus: navigation
      ? MENU_FIELDS.filter(([field]) =>
          collectPanelTargets(navigation[field]).includes(panelId),
        ).map(([, label]) => label)
      : [],
    documents: [
      ...resolveVersions(sources.pages).map(({ id, doc }) => ({
        id,
        title: doc.title || 'Untitled',
        kind: 'page' as const,
        ...collectPanelOpeners(doc.pageBuilder, panelId),
      })),
      ...resolveVersions(sources.sharedSections).map(({ id, doc }) => ({
        id,
        title: doc.title || 'Untitled',
        kind: 'sharedSection' as const,
        ...collectPanelOpeners(doc.section, panelId),
      })),
    ].filter(used),
  }
}

/** One line per place, as the note shows them: `Home: “Open enquiry”, “Get a quote” and 2 links in text`. */
export function describeUsage(usage: PanelUsage): string[] {
  const documents = usage.documents.map((document) => {
    const parts = document.buttons.map((label) => `“${label}”`)
    const where =
      document.kind === 'sharedSection' ? `${document.title} (shared section)` : document.title
    const links =
      document.textLinks > 0
        ? `${document.textLinks} ${document.textLinks === 1 ? 'link' : 'links'} in text`
        : ''
    return `${where}: ${[parts.join(', '), links].filter(Boolean).join(' and ')}`
  })
  return [
    ...documents,
    ...usage.menus.map((menu) => `${menu} (a menu: opens its fallback link instead)`),
  ]
}
