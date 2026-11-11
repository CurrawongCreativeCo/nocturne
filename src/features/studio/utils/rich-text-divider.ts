/**
 * What the Rich text body's divider guard needs to know, apart from the editor (task 151). The agency adds
 * and styles a divider; a client may move or delete one that is there. A drag-and-drop is a delete followed
 * by an insert of the same block, so the guard has to tell that insert from a new divider: it records the
 * dividers when a drag begins and allows only an insert that is exactly one of them, unchanged.
 */

/** The block type the guard protects. */
export const DIVIDER_TYPE = 'decorativeDivider'

interface BlockLike {
  _type?: string
  _key?: string
}

export const isDividerBlock = (block: BlockLike): boolean => block._type === DIVIDER_TYPE

/** A block as text, with its keys in a fixed order, so two copies of one divider always compare equal. */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, inner: unknown) =>
    inner && typeof inner === 'object' && !Array.isArray(inner)
      ? Object.fromEntries(
          Object.entries(inner as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)),
        )
      : inner,
  )
}

export interface MoveRecord {
  /** A drag began: remember the dividers as they are now. */
  begin: (blocks: readonly BlockLike[] | null | undefined) => void
  /** The drag is over: forget them, so nothing later (a paste) can reuse the allowance. */
  end: () => void
  /** This divider is exactly one that was there when the drag began. */
  isMove: (block: BlockLike) => boolean
  /** This is a divider and not one being moved: a new one, however it arrived. */
  isNew: (block: BlockLike) => boolean
}

export function createMoveRecord(): MoveRecord {
  let record = new Map<string, string>()
  const isMove = (block: BlockLike) =>
    isDividerBlock(block) &&
    block._key !== undefined &&
    record.get(block._key) === stableJson(block)
  return {
    begin: (blocks) => {
      record = new Map(
        (blocks ?? []).flatMap((block) =>
          isDividerBlock(block) && block._key !== undefined
            ? ([[block._key, stableJson(block)]] as const)
            : [],
        ),
      )
    },
    end: () => {
      record = new Map()
    },
    isMove,
    isNew: (block) => isDividerBlock(block) && !isMove(block),
  }
}

/** The text a blocked attempt shows (Australian English). */
export const DIVIDER_BLOCKED_TITLE = 'Dividers are added by Currawong.'
export const DIVIDER_BLOCKED_DESCRIPTION = 'You can move or delete an existing one.'

/** What a client sees in place of the divider's own fields, which are agency only. */
export const DIVIDER_CLIENT_NOTE =
  'Currawong sets how this divider looks. You can move it or delete it, but not change it.'
