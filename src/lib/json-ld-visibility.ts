/**
 * Pure helpers for checking a page's JSON-LD (task 188, extended by task 222). `normaliseText` makes
 * text comparable; `parseJsonLd` reads a page's scripts; `findIdProblems`, `findWebPageProblems`,
 * `findMissingWebPage` and `findUnresolvedReferences` check the graph. What the JSON-LD says is
 * compared with what the page shows by property class in `structured-data/parity.ts`. No DOM and no
 * clock: the end-to-end spec (tests/e2e/structured-data.spec.ts) feeds them the page's text.
 */
import { organizationId, webPageId, websiteId } from '@/lib/structured-data/ids'
import type { JsonLdNode } from '@/lib/structured-data/types'

export type { JsonLdNode }

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '-',
  mdash: '-',
  lsquo: "'",
  rsquo: "'",
  ldquo: '"',
  rdquo: '"',
  hellip: '...',
}

const isRecord = (value: unknown): value is JsonLdNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Lower-cases, decodes HTML entities, folds typographic quotes and dashes to plain ones and collapses
 * all whitespace, so "Mon&nbsp;–&nbsp;Fri" and "mon - fri" compare equal. `innerText` already applies
 * CSS text-transform, hence the case fold.
 */
export function normaliseText(text: string): string {
  return text
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (entity.startsWith('#')) {
        const code =
          entity[1]?.toLowerCase() === 'x'
            ? Number.parseInt(entity.slice(2), 16)
            : Number.parseInt(entity.slice(1), 10)
        return Number.isInteger(code) && code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : match
      }
      return NAMED_ENTITIES[entity.toLowerCase()] ?? match
    })
    .normalize('NFKC')
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐‑‒–—―−]/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** Parses the text of every `application/ld+json` script and flattens `@graph`; bad JSON is reported, not thrown. */
export function parseJsonLd(scripts: readonly string[]): { nodes: JsonLdNode[]; errors: string[] } {
  const nodes: JsonLdNode[] = []
  const errors: string[] = []
  scripts.forEach((script, index) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(script)
    } catch {
      errors.push(`JSON-LD script ${index + 1} is not valid JSON`)
      return
    }
    for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
      if (!isRecord(item)) continue
      const graph = item['@graph']
      if (Array.isArray(graph)) nodes.push(...graph.filter(isRecord))
      else nodes.push(item)
    }
  })
  return { nodes, errors }
}

/** Every node that defines something (more than a bare `{ "@id": … }` reference) and has an `@id`. */
const definitions = (nodes: readonly JsonLdNode[]) =>
  nodes.filter((node) => typeof node['@id'] === 'string' && Object.keys(node).length > 1)

/**
 * `@id` rules over a set of pages (path -> nodes). Within one page an `@id` may be defined once.
 * Across pages one entity may be described in full on its own page and shorter elsewhere (a byline's
 * Person), and the site nodes repeat, so only a property the two definitions share must agree: two
 * different things sharing an `@id` would merge into one entity.
 */
export function findIdProblems(pages: Readonly<Record<string, readonly JsonLdNode[]>>): string[] {
  const problems: string[] = []
  const seen = new Map<string, { path: string; node: JsonLdNode }>()

  for (const [path, nodes] of Object.entries(pages)) {
    const onThisPage = new Set<string>()
    for (const node of definitions(nodes)) {
      const id = node['@id'] as string
      if (onThisPage.has(id)) problems.push(`${path}: "${id}" is defined twice on the page`)
      onThisPage.add(id)

      const earlier = seen.get(id)
      if (!earlier) {
        seen.set(id, { path, node })
        continue
      }
      for (const [key, value] of Object.entries(node)) {
        const other = earlier.node[key]
        if (other !== undefined && JSON.stringify(other) !== JSON.stringify(value)) {
          problems.push(`${path}: "${id}" has a different ${key} from ${earlier.path}`)
        }
      }
    }
  }
  return problems
}

const isType = (node: JsonLdNode, type: string) => {
  const own = node['@type']
  return own === type || (Array.isArray(own) && own.includes(type))
}

const referencesId = (value: unknown, id: string): boolean =>
  Array.isArray(value)
    ? value.some((item) => referencesId(item, id))
    : isRecord(value) && value['@id'] === id

/** Every WebPage node, wherever it nests (an Article's `mainEntityOfPage` is one). */
function webPages(value: unknown, found: JsonLdNode[] = []): JsonLdNode[] {
  if (Array.isArray(value)) value.forEach((item) => webPages(item, found))
  else if (isRecord(value)) {
    if (isType(value, 'WebPage')) found.push(value)
    Object.values(value).forEach((child) => webPages(child, found))
  }
  return found
}

/**
 * Each WebPage must be `isPartOf` the site's WebSite and name the Organization as its `publisher`;
 * both ids are the site's own (`<origin>/#website`, `<origin>/#organization`).
 */
export function findWebPageProblems(nodes: readonly JsonLdNode[], origin: string): string[] {
  const website = websiteId(origin)
  const organization = organizationId(origin)
  const problems: string[] = []

  for (const page of webPages(nodes)) {
    const label = `WebPage ${typeof page['@id'] === 'string' ? page['@id'] : '(no @id)'}`
    if (!referencesId(page.isPartOf, website)) {
      problems.push(`${label} does not reference ${website} in isPartOf`)
    }
    if (!referencesId(page.publisher, organization)) {
      problems.push(`${label} does not reference ${organization} as publisher`)
    }
  }
  return problems
}

/** Every page describes itself: a WebPage node keyed by its own URL (`pageUrl` is absolute). */
export function findMissingWebPage(nodes: readonly JsonLdNode[], pageUrl: string): string[] {
  const id = webPageId(pageUrl)
  return nodes.some((node) => node['@id'] === id && isType(node, 'WebPage'))
    ? []
    : [`no WebPage node with the @id ${id}`]
}

/** A bare `{ "@id": … }` reference, wherever it nests. */
function references(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((item) => references(item, found))
  else if (isRecord(value)) {
    const keys = Object.keys(value)
    if (keys.length === 1 && keys[0] === '@id' && typeof value['@id'] === 'string') {
      found.push(value['@id'])
    } else Object.values(value).forEach((child) => references(child, found))
  }
  return found
}

/**
 * Graph integrity: every `@id` a page's nodes refer to must be defined by a node on the page or by
 * the site graph (the nodes every page carries). `siteGraph` is the set of those `@id`s.
 */
export function findUnresolvedReferences(
  nodes: readonly JsonLdNode[],
  siteGraph: ReadonlySet<string>,
): string[] {
  const defined = new Set(definitions(nodes).map((node) => node['@id'] as string))
  return [...new Set(references(nodes))]
    .filter((id) => !defined.has(id) && !siteGraph.has(id))
    .map((id) => `"${id}" is referenced but no node on the page or in the site graph defines it`)
}

/** The `@id`s of the nodes defined on every one of these pages: the site graph. */
export function siteGraphIds(pages: readonly (readonly JsonLdNode[])[]): Set<string> {
  const [first, ...rest] = pages.map(
    (nodes) => new Set(definitions(nodes).map((node) => node['@id'] as string)),
  )
  return new Set([...(first ?? [])].filter((id) => rest.every((other) => other.has(id))))
}

/** Draft and release-version ids (`drafts.*`, `versions.*`) must never appear in an `@id`, defined or referenced. */
export function findDraftIds(nodes: readonly JsonLdNode[]): string[] {
  const ids = new Set<string>()
  const walk = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(walk)
    else if (isRecord(value)) {
      if (typeof value['@id'] === 'string') ids.add(value['@id'])
      Object.values(value).forEach(walk)
    }
  }
  walk(nodes)
  return [...ids]
    .filter((id) => /(^|[#/-])(drafts|versions)\./.test(id))
    .map((id) => `"${id}" contains a draft or release-version id`)
}
