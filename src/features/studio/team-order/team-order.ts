/**
 * Pure logic behind the Team list's drag ordering: who comes first, what a move does, and which
 * documents need their `order` rewritten. No Studio imports, so it can be unit tested.
 * `components/team-order-pane.tsx` does the reading and writing.
 */

/** A team member as the list needs them: one row per person, however many versions exist. */
export interface TeamRow {
  /** The published id ("teamMember-ann"), whether or not a published version exists yet. */
  id: string
  name: string
  role: string | null
  order: number | null
  hasPublished: boolean
  hasDraft: boolean
}

/** A document version as the list query returns it (`raw` perspective: drafts beside published). */
export interface TeamDoc {
  _id: string
  name?: string | null
  role?: string | null
  order?: number | null
}

const DRAFT_PREFIX = 'drafts.'

/**
 * One row per person. A draft's name, role and order win over the published version's (it is what
 * the editor last saw). Members without an `order` come last, then by name: the same order the
 * site uses (`order(coalesce(order, 999999) asc, name asc)`).
 */
export function toRows(docs: readonly TeamDoc[]): TeamRow[] {
  const rows = new Map<string, TeamRow>()
  for (const doc of docs) {
    const isDraft = doc._id.startsWith(DRAFT_PREFIX)
    const id = isDraft ? doc._id.slice(DRAFT_PREFIX.length) : doc._id
    const existing = rows.get(id)
    const row: TeamRow = {
      id,
      name: doc.name?.trim() ? doc.name : 'Untitled',
      role: doc.role?.trim() ? doc.role : null,
      order: doc.order ?? null,
      hasPublished: (existing?.hasPublished ?? false) || !isDraft,
      hasDraft: (existing?.hasDraft ?? false) || isDraft,
    }
    // Keep the draft's fields when both versions arrive, in either order.
    rows.set(id, existing?.hasDraft && !isDraft ? { ...existing, hasPublished: true } : row)
  }
  return [...rows.values()].sort(
    (a, b) =>
      (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
      a.name.localeCompare(b.name),
  )
}

/** A copy of `list` with the item at `from` moved to `to`. Out-of-range moves return it unchanged. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  if (from === to || from < 0 || to < 0 || from >= next.length || to >= next.length) return next
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item as T)
  return next
}

export interface OrderWrite {
  /** The document ids to patch: the published one and/or the draft, whichever exist. */
  ids: string[]
  order: number
}

/**
 * The writes that make `rows` (already in the wanted order) numbered 1, 2, 3… Only members whose
 * number changes are included, so moving one person rewrites as few documents as it can.
 */
export function orderWrites(rows: readonly TeamRow[]): OrderWrite[] {
  return rows.flatMap((row, index) => {
    const order = index + 1
    if (row.order === order) return []
    const ids = [
      ...(row.hasPublished ? [row.id] : []),
      ...(row.hasDraft ? [`${DRAFT_PREFIX}${row.id}`] : []),
    ]
    return ids.length > 0 ? [{ ids, order }] : []
  })
}
