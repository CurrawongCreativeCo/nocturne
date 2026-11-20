import {
  copyEdge,
  edgeProblems,
  newKey,
  type EdgeDesign,
  type EdgeValue,
} from './composed-edge-editor'

/**
 * Named site designs for the Section edge editor (composable section edges, Task 2). A design is an
 * independent copy of an edge, stored as `designSettings.edgeDesigns`: the site's existing Design settings
 * document, which only agency staff can edit (`designSettings` is an agency-only type, so the list needs no
 * new permission). Saving copies the section's edge in; applying copies a design's settings into a section with
 * fresh array keys. Nothing is linked afterwards: editing a design never changes a section that used it, and
 * editing that section never changes the design. The public site never reads this list, only Studio does.
 */

export const EDGE_DESIGN_NAME_MAX = 60

/** The slice of a Studio client this needs, so Studio and the tests pass their own. */
export interface DesignClient {
  fetch: <T>(query: string, params?: Record<string, unknown>) => Promise<T>
  transaction: () => DesignTransaction
}
interface DesignTransaction {
  createIfNotExists: (document: Record<string, unknown>) => DesignTransaction
  patch: (id: string, build: (patch: DesignPatch) => DesignPatch) => DesignTransaction
  commit: () => Promise<unknown>
}
interface DesignPatch {
  setIfMissing: (values: Record<string, unknown>) => DesignPatch
  insert: (at: 'after', selector: string, items: unknown[]) => DesignPatch
  unset: (paths: string[]) => DesignPatch
  set: (values: Record<string, unknown>) => DesignPatch
}

/** Why a design could not be saved or applied, in words for the editor. */
export class EdgeDesignError extends Error {}

const DRAFT = 'drafts.designSettings'
const PUBLISHED = 'designSettings'

// The draft first, so a design saved a moment ago is there before anyone publishes Brand colours.
const LIST = `coalesce(*[_id == "${DRAFT}"][0].edgeDesigns, *[_id == "${PUBLISHED}"][0].edgeDesigns, [])`

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** A stored design as the list shows it: every entry with a key, whatever state its name and settings are in. */
export interface ListedDesign {
  _key: string
  /** What the picker and the buttons call it: the name, or a plain stand-in for an empty or over-long one. */
  label: string
  /** The settings draw, so the design can be applied. A design that is not applicable can still be renamed or deleted. */
  applicable: boolean
  design: EdgeDesign
}

/** The words for a name that is empty or too long to show (hand-edited or imported data). */
export function designLabel(name: unknown): string {
  const text = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : ''
  if (!text) return '(unnamed design)'
  return text.length > EDGE_DESIGN_NAME_MAX ? `${text.slice(0, EDGE_DESIGN_NAME_MAX)}…` : text
}

/**
 * Every stored design, so a hidden entry whose name fails its (warning-only) rules can still be found, renamed or
 * deleted from the editor: that is how a warning in Brand colours is recovered. One whose settings no longer draw
 * is listed but cannot be applied.
 */
export function listDesigns(list: unknown): ListedDesign[] {
  if (!Array.isArray(list)) return []
  return (list as unknown[]).flatMap((item) => {
    if (!isRecord(item) || typeof item._key !== 'string') return []
    const design = item as unknown as EdgeDesign
    const applicable = isRecord(item.edge) && edgeProblems(item.edge).length === 0
    const label = designLabel(item.name)
    return [
      {
        _key: item._key,
        label: applicable ? label : `${label} (cannot be applied)`,
        applicable,
        design,
      },
    ]
  })
}

export async function fetchEdgeDesigns(client: DesignClient): Promise<ListedDesign[]> {
  return listDesigns(await client.fetch<unknown>(LIST))
}

/** The name as saved, or why it cannot be used. */
export function checkDesignName(
  name: string,
  existing: readonly { _key: string; name: string }[],
  exceptKey?: string,
): string {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  if (!trimmed) throw new EdgeDesignError('Give the design a name.')
  if (trimmed.length > EDGE_DESIGN_NAME_MAX)
    throw new EdgeDesignError(`Use ${String(EDGE_DESIGN_NAME_MAX)} characters or fewer.`)
  const clash = existing.find(
    (design) => design._key !== exceptKey && design.name.toLowerCase() === trimmed.toLowerCase(),
  )
  if (clash)
    throw new EdgeDesignError(
      `A design called “${clash.name}” already exists. Choose another name.`,
    )
  return trimmed
}

/**
 * Every name in the stored list as it is now, drafts first, including designs the picker would not offer (one that
 * no longer draws still owns its name). Read at the moment of saving or renaming: the dropdown's list is a cache,
 * and another editor may have added a design since it loaded.
 */
async function storedNames(client: DesignClient): Promise<{ _key: string; name: string }[]> {
  const list = await client.fetch<unknown>(LIST)
  if (!Array.isArray(list)) return []
  return (list as unknown[]).filter(
    (item): item is { _key: string; name: string } =>
      isRecord(item) && typeof item._key === 'string' && typeof item.name === 'string',
  )
}

/** Make sure the draft of Design settings exists (copied from the published one), then run `change` on it. */
async function onDraft(client: DesignClient, change: (patch: DesignPatch) => DesignPatch) {
  const published = await client.fetch<Record<string, unknown> | null>(
    `*[_id == "${PUBLISHED}"][0]`,
  )
  const base: Record<string, unknown> = published
    ? { ...published, _id: DRAFT }
    : { _id: DRAFT, _type: 'designSettings' }
  const { _rev: _r, _updatedAt: _u, _createdAt: _c, ...seed } = base
  await client
    .transaction()
    .createIfNotExists(seed)
    .patch(DRAFT, (patch) => change(patch.setIfMissing({ edgeDesigns: [] })))
    .commit()
}

/** Save the edge as a new design. The stored copy is independent of the section's value (fresh keys). */
export async function saveEdgeDesign(
  client: DesignClient,
  name: string,
  edge: EdgeValue,
): Promise<EdgeDesign> {
  if (edgeProblems(edge).length > 0)
    throw new EdgeDesignError('Fix the problems in this edge before saving it as a design.')
  const design: EdgeDesign = {
    _key: newKey(),
    _type: 'edgeDesign',
    name: checkDesignName(name, await storedNames(client)),
    edge: copyEdge(edge),
  }
  await onDraft(client, (patch) => patch.insert('after', 'edgeDesigns[-1]', [design]))
  return design
}

/**
 * Rename a design. Only its name changes: the key, the settings and every section copy made from it stay as they
 * are (a section keeps no reference to the design). The name is checked against the list as stored now.
 */
export async function renameEdgeDesign(
  client: DesignClient,
  key: string,
  name: string,
): Promise<string> {
  const stored = await storedNames(client)
  if (!stored.some((design) => design._key === key))
    throw new EdgeDesignError(
      'That design is no longer in the list. Reload the designs and try again.',
    )
  const next = checkDesignName(name, stored, key)
  await onDraft(client, (patch) => patch.set({ [`edgeDesigns[_key=="${key}"].name`]: next }))
  return next
}

export async function deleteEdgeDesign(client: DesignClient, key: string): Promise<void> {
  await onDraft(client, (patch) => patch.unset([`edgeDesigns[_key=="${key}"]`]))
}

/** What applying a design puts in the section: a copy with its own keys, never the design's own array members. */
export function applyEdgeDesign(design: EdgeDesign): EdgeValue {
  return copyEdge(design.edge)
}
