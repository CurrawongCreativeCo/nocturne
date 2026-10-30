/**
 * The shared slot registry (README, "Adding a slot block"; design engine architecture, §4). A slot is
 * a place in a section family where an editor may add one approved block; a block is a small piece of
 * supporting content (a statistics bar, a video) that fits any slot it is allowed in. This file is the
 * Studio-safe half: names, titles and rules, with no React. The components are in `render-slot.tsx`,
 * keyed by the same block types, so the type checker fails until both halves exist.
 */

/**
 * Every slot a family offers. `hero.supporting` is in use; the `split` ones are reserved for the Split
 * family (architecture §4) so a block can already say it will fit there.
 */
export const SLOTS = {
  'hero.supporting': {
    title: 'Extra content under the heading',
    /** Most blocks the slot holds. */
    max: 1,
  },
  'split.media': {
    title: 'Media',
    max: 1,
  },
  'split.supporting': {
    title: 'Extra content',
    max: 1,
  },
} as const

export type SlotName = keyof typeof SLOTS

export interface SlotBlockDefinition {
  /** The Sanity object type the block is stored as (`_type`). */
  schemaType: string
  /** With an article, for the slot's description: "a statistics bar". */
  noun: string
  /** The slots that accept this block. */
  allowedIn: readonly SlotName[]
  /**
   * Clients may change what the block holds (the content fields). Which fields count is classified in
   * `CLIENT_EDITABLE_FIELDS` (lib/sanity/client-editable.ts); layout fields are always the agency's.
   */
  clientEditable: boolean
}

/**
 * Block type -> its rules, in the order the insert menu lists them. The stored `_type` of every block
 * is its key, and every block is a Sanity type of the same name.
 */
export const SLOT_BLOCKS = {
  statsBar: {
    schemaType: 'statsBar',
    noun: 'a statistics bar',
    allowedIn: ['hero.supporting'],
    clientEditable: true,
  },
  badgeRow: {
    schemaType: 'badgeRow',
    noun: 'a row of badges',
    allowedIn: ['hero.supporting'],
    clientEditable: true,
  },
  logoRow: {
    schemaType: 'logoRow',
    noun: 'a row of logos',
    allowedIn: ['hero.supporting'],
    clientEditable: true,
  },
  launchDate: {
    schemaType: 'launchDate',
    noun: 'a launch date',
    allowedIn: ['hero.supporting'],
    clientEditable: true,
  },
  slotVideo: {
    schemaType: 'slotVideo',
    noun: 'a video',
    allowedIn: ['hero.supporting', 'split.media', 'split.supporting'],
    clientEditable: true,
  },
} as const satisfies Record<string, SlotBlockDefinition>

export type SlotBlockType = keyof typeof SLOT_BLOCKS

/** The blocks a slot accepts, in menu order. */
export function blocksForSlot(slot: SlotName): SlotBlockType[] {
  return (Object.keys(SLOT_BLOCKS) as SlotBlockType[]).filter((type) =>
    (SLOT_BLOCKS[type].allowedIn as readonly SlotName[]).includes(slot),
  )
}

/** Where a block's insert-menu picture lives: `public/slot-previews/<type>.svg`. */
export const slotPreviewUrl = (type: string) => `/slot-previews/${type}.svg`
