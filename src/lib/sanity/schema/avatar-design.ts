import { defineField, type ConditionalPropertyCallback } from 'sanity'

import {
  AVATAR_RINGS,
  AVATAR_RING_TITLES,
  PROFILE_IMAGE_SIZES,
  PROFILE_IMAGE_SIZE_TITLES,
} from '../profile-image-options'
import { hiddenFromClients } from '../roles'
import { builtBy } from './capability-marker'
import { themeColourField } from './theme-colour'

const radio = <T extends string>(values: readonly T[], titles: Record<T, string>) => ({
  list: values.map((value) => ({ value, title: titles[value] })),
  layout: 'radio' as const,
  direction: 'horizontal' as const,
})

/**
 * A small portrait's size and optional ring (README, "Image design"): the testimonials' avatar and
 * the team list's portrait, drawn by `ProfileImage`. Agency only, in the Design tab. Empty is Medium
 * with no ring, the picture the layout always drew. Larger pictures use `imageDesignField` instead,
 * never both on one picture.
 */
export function avatarDesignField({
  name,
  title,
  description,
  hidden,
}: {
  name: string
  title: string
  description: string
  hidden?: ConditionalPropertyCallback
}) {
  const noRing: ConditionalPropertyCallback = ({ parent }) =>
    ((parent as { ring?: string } | undefined)?.ring ?? 'none') !== 'line'
  const field = defineField({
    name,
    title,
    type: 'object',
    group: 'design',
    description,
    options: { collapsible: true, collapsed: true },
    hidden: (context) => hiddenFromClients(context) || (hidden ? hidden(context) : false),
    fields: [
      defineField({
        name: 'size',
        title: 'Size',
        type: 'string',
        description: 'Medium is the layout’s own size.',
        options: radio(PROFILE_IMAGE_SIZES, PROFILE_IMAGE_SIZE_TITLES),
      }),
      defineField({
        name: 'ring',
        title: 'Ring',
        type: 'string',
        description: 'A thin ring around the picture, with a small see-through gap.',
        options: radio(AVATAR_RINGS, AVATAR_RING_TITLES),
      }),
      themeColourField({
        name: 'ringColour',
        title: 'Ring colour',
        usage: 'graphic',
        inherits: 'Primary',
        choices: ['ink', 'accent', 'accent-2', 'highlight'],
        hidden: noRing,
      }),
    ],
  })
  return builtBy('avatarDesignField', field)
}
