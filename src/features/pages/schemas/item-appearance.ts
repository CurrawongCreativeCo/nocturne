import { defineField, type ConditionalPropertyCallback } from 'sanity'

import { builtBy } from '@/lib/sanity/schema/capability-marker'

/**
 * The switch in an item's own Appearance (task 156): "Use the section's design" or "Customise this card".
 * One shared builder for every family with item-level design (a pricing plan's, a Link list link's), so
 * the choice that decides inheritance is the same field everywhere and its stored value is the same
 * `appearance: 'custom'`. Unset follows the section; the item keeps what it saved while switched off.
 * resolveItemCardDesign (lib/sanity/card-design.ts) applies it on the page.
 */
export function itemAppearanceField({
  inheritLabel,
  customLabel = 'Customise this card',
}: {
  /** The first button: what unset means ("Use the Link list design"). */
  inheritLabel: string
  customLabel?: string
}) {
  const field = defineField({
    name: 'appearance',
    title: 'Design',
    type: 'string',
    options: {
      list: [{ value: 'custom', title: customLabel }],
      layout: 'radio',
      direction: 'horizontal',
      inheritable: inheritLabel,
    },
  })
  return builtBy('itemAppearanceField', field)
}

/** Hides what only applies once the item is customised. */
export const notCustomised: ConditionalPropertyCallback = ({ parent }) =>
  (parent as { appearance?: string } | undefined)?.appearance !== 'custom'
