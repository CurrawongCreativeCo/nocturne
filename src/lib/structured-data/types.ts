/** A JSON-LD node as parsed from a page, or as a builder returns it. */
export type JsonLdNode = Record<string, unknown>

/** Where a JSON-LD value came from: a Sanity document (its published `_id`) and a field path in it. */
export interface Source {
  doc: string
  field: string
}

/**
 * JSON-LD property path ("address.streetAddress", "mainEntity[0].name") -> the field that owns the
 * value. Builders return it beside the node; it is used by tests and checks and is never rendered.
 */
export type Provenance = Record<string, Source>

/** What every node builder returns. */
export interface Built {
  node: JsonLdNode
  provenance: Provenance
}
