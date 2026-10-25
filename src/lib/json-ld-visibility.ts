/**
 * Pure helpers for checking that a page's JSON-LD describes what visitors can see (Google requires
 * it). `collectCheckableStrings` lists the strings worth checking (names, addresses, opening hours,
 * FAQ questions and answers), `normaliseText` makes them comparable with the page's text, and
 * `findHiddenStrings` / `findIdProblems` / `findWebPageProblems` report what fails. No DOM and no
 * clock: the end-to-end spec (tests/e2e/structured-data.spec.ts) feeds them `document.body.innerText`.
 */
import { formatTime, isTime } from '@/lib/opening-hours'

export type JsonLdNode = Record<string, unknown>

/** One string from the JSON-LD and where it came from, e.g. "Organization.address.streetAddress". */
export interface CheckableString {
  property: string
  value: string
}

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

const nodeLabel = (node: JsonLdNode) => {
  const type = node['@type']
  return Array.isArray(type) ? type.join('/') : typeof type === 'string' ? type : 'Thing'
}

/** Not shown on the page: service areas are a description of reach, not a list visitors read. */
const SKIPPED_KEYS = new Set(['areaServed'])
const ADDRESS_PARTS = ['streetAddress', 'addressLocality', 'addressRegion', 'postalCode'] as const

/** Free text split into the lines and comma-separated parts that are shown separately ("1 Rose St, Newtown"). */
const textParts = (text: string, splitOnCommas: boolean) =>
  text
    .split(splitOnCommas ? /[\n,]+/ : /\n+/)
    .map((part) => part.trim())
    .filter(Boolean)

/**
 * The strings in the JSON-LD that a visitor should be able to find on the page:
 * - `name` and `headline` anywhere (organisation, person, event, place, breadcrumb, FAQ question),
 * - address parts (a plain-text address is split at commas and line breaks),
 * - the open and close times of the weekly opening hours, formatted as the page shows them ("5:30 pm"),
 * - each line of an FAQ answer.
 * Dated special days, `legalName`, `description`, links, dates and `areaServed` are not checked.
 */
export function collectCheckableStrings(nodes: readonly JsonLdNode[]): CheckableString[] {
  const found: CheckableString[] = []

  const add = (path: string[], value: unknown, splitOnCommas = false) => {
    if (typeof value !== 'string') return
    for (const part of textParts(value, splitOnCommas)) {
      found.push({ property: path.join('.'), value: part })
    }
  }

  const walk = (value: unknown, path: string[]) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        walk(item, [...path.slice(0, -1), `${path.at(-1)}[${index}]`])
      })
      return
    }
    if (!isRecord(value)) return

    for (const [key, child] of Object.entries(value)) {
      if (key.startsWith('@') || SKIPPED_KEYS.has(key)) continue
      const childPath = [...path, key]

      if (key === 'name' || key === 'headline') add(childPath, child)
      else if (key === 'text' && path.at(-1)?.startsWith('acceptedAnswer')) add(childPath, child)
      else if (key === 'address' && typeof child === 'string') add(childPath, child, true)
      else if (key === 'address' && isRecord(child)) {
        for (const part of ADDRESS_PARTS) add([...childPath, part], child[part])
      } else if (key === 'openingHoursSpecification') {
        const specs = Array.isArray(child) ? child : [child]
        specs.forEach((spec, index) => {
          if (!isRecord(spec) || spec.validFrom || spec.validThrough) return
          for (const field of ['opens', 'closes'] as const) {
            const time = spec[field]
            if (isTime(typeof time === 'string' ? time : null)) {
              add(
                [...childPath.slice(0, -1), `${key}[${index}]`, field],
                formatTime(time as string),
              )
            }
          }
        })
      } else walk(child, childPath)
    }
  }

  for (const node of nodes) walk(node, [nodeLabel(node)])
  return found
}

/** The strings that don't appear in the page text; `pageText` is raw (`document.body.innerText`). */
export function findHiddenStrings(
  strings: readonly CheckableString[],
  pageText: string,
): CheckableString[] {
  const visible = normaliseText(pageText)
  return strings.filter(({ value }) => {
    const wanted = normaliseText(value)
    return wanted !== '' && !visible.includes(wanted)
  })
}

/** Every node that defines something (more than a bare `{ "@id": … }` reference) and has an `@id`. */
const definitions = (nodes: readonly JsonLdNode[]) =>
  nodes.filter((node) => typeof node['@id'] === 'string' && Object.keys(node).length > 1)

/**
 * `@id` rules over a set of pages (path -> nodes). Within one page an `@id` may be defined once.
 * Across pages the same `@id` is allowed only when the definition is identical (the Organization and
 * WebSite repeat on every page); two different things sharing an `@id` would merge into one entity.
 */
export function findIdProblems(pages: Readonly<Record<string, readonly JsonLdNode[]>>): string[] {
  const problems: string[] = []
  const seen = new Map<string, { path: string; json: string }>()

  for (const [path, nodes] of Object.entries(pages)) {
    const onThisPage = new Set<string>()
    for (const node of definitions(nodes)) {
      const id = node['@id'] as string
      if (onThisPage.has(id)) problems.push(`${path}: "${id}" is defined twice on the page`)
      onThisPage.add(id)

      const json = JSON.stringify(node)
      const earlier = seen.get(id)
      if (!earlier) seen.set(id, { path, json })
      else if (earlier.json !== json) {
        problems.push(`${path}: "${id}" is defined differently from ${earlier.path}`)
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
  const websiteId = `${origin}/#website`
  const organizationId = `${origin}/#organization`
  const problems: string[] = []

  for (const page of webPages(nodes)) {
    const label = `WebPage ${typeof page['@id'] === 'string' ? page['@id'] : '(no @id)'}`
    if (!referencesId(page.isPartOf, websiteId)) {
      problems.push(`${label} does not reference ${websiteId} in isPartOf`)
    }
    if (!referencesId(page.publisher, organizationId)) {
      problems.push(`${label} does not reference ${organizationId} as publisher`)
    }
  }
  return problems
}
