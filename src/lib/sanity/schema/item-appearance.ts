import { defineField, type ConditionalPropertyCallback } from 'sanity'

import { hiddenFromClients } from '@/lib/sanity/roles'
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

/**
 * How a family draws its items, when more than one way is a setting and not a layout (FAQ's Divided list
 * or Cards): stored on the section, unset is the first, which is what the family always drew. Agency only.
 * Each value is its own look and needs its own evidence (capability-evidence.ts, cardFamilyEvidence's `look`).
 */
export function itemStyleField<T extends string>({
  values,
  titles,
  description,
}: {
  values: readonly [T, ...T[]]
  titles: Record<T, string>
  description: string
}) {
  const field = defineField({
    name: 'itemStyle',
    title: 'Item style',
    type: 'string',
    group: 'design',
    description,
    hidden: hiddenFromClients,
    options: {
      list: values.map((value) => ({ value, title: titles[value] })),
      layout: 'radio',
      direction: 'horizontal',
    },
  })
  return builtBy('itemStyleField', field)
}

/** Hides what only applies once the item is customised. */
export const notCustomised: ConditionalPropertyCallback = ({ parent }) =>
  (parent as { appearance?: string } | undefined)?.appearance !== 'custom'
