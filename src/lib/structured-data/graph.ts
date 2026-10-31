import type { Built, JsonLdNode, Provenance } from './types'

/** The `@graph` document for a page. Provenance stays behind: it is never rendered. */
export function graph(...built: (Built | null | undefined | false)[]): {
  '@context': 'https://schema.org'
  '@graph': JsonLdNode[]
} {
  return {
    '@context': 'https://schema.org',
    '@graph': built.flatMap((item) => (item ? [item.node] : [])),
  }
}

/** Drops properties an editor left empty: search engines treat blank properties as errors. */
export const clean = (object: Record<string, unknown>): JsonLdNode =>
  Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  )

/** The value at a property path such as "address.streetAddress" or "mainEntity[0].name". */
export function valueAt(node: unknown, path: string): unknown {
  let current: unknown = node
  for (const part of path.match(/[^.[\]]+/g) ?? []) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/**
 * Provenance for the properties a node actually has: `fields` maps a property path to the field in
 * `doc` that owns it, and paths the node left out (an empty optional field) are dropped.
 */
export function trace(node: JsonLdNode, doc: string, fields: Record<string, string>): Provenance {
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([path]) => valueAt(node, path) !== undefined)
      .map(([path, field]) => [path, { doc, field }]),
  )
}
