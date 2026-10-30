import { defineArrayMember, defineField } from 'sanity'

import { isClientView } from '@/lib/sanity/roles'

import { blocksForSlot, SLOT_BLOCKS, SLOTS, slotPreviewUrl, type SlotName } from './registry'

interface Options {
  /** The stored field name. Renaming it would orphan existing content. */
  name: string
  slot: SlotName
}

/** "a, b or c" for the slot's description. */
function orList(items: string[]) {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`
}

/**
 * The array field for a slot (README, "Adding a slot block"): the blocks the registry allows in it,
 * the insert menu with a picture for each, and the one-item rule. The agency adds or removes the
 * block and clients edit what is in it, so a client sees the field only once it has something in it.
 */
export function slotField({ name, slot }: Options) {
  const { title, max }: { title: string; max: number } = SLOTS[slot]
  const types = blocksForSlot(slot)
  const nouns = types.map((type) => SLOT_BLOCKS[type].noun)
  const capitalised = orList(nouns).replace(/^./, (first) => first.toUpperCase())

  return defineField({
    name,
    title,
    description: `${capitalised}. ${max === 1 ? 'One at most.' : `Up to ${String(max)}.`}`,
    type: 'array',
    of: types.map((type) => defineArrayMember({ type: SLOT_BLOCKS[type].schemaType })),
    // A client cannot add one, so an empty slot would be a field with nothing to do.
    hidden: ({ currentUser, value }) =>
      isClientView(currentUser) && !(value as unknown[] | undefined)?.length,
    validation: (rule) => rule.max(max),
    options: {
      slot: true,
      insertMenu: {
        // Thumbnails live in public/slot-previews/<typeName>.svg.
        views: [{ name: 'grid', previewImageUrl: slotPreviewUrl }, { name: 'list' }],
      },
    },
  })
}
